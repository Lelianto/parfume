import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { detectCourier, BINDERBYTE_COURIERS } from "@/lib/tracking";

const CACHE_MAX_AGE_MS = 3 * 60 * 60 * 1000; // 3 hours
const MONTHLY_QUOTA = 480;
const AWB_PATTERN = /^[A-Za-z0-9\-]{4,30}$/;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ awb: string }> }
) {
  const { awb } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Validate AWB format
  if (!AWB_PATTERN.test(awb)) {
    return NextResponse.json(
      { error: "Format nomor resi tidak valid" },
      { status: 400 }
    );
  }

  // Determine courier
  const url = new URL(request.url);
  const courierParam = url.searchParams.get("courier");
  const courier = courierParam || detectCourier(awb);

  if (!courier || !(courier in BINDERBYTE_COURIERS)) {
    return NextResponse.json(
      { error: "Kurir tidak dikenali. Silakan pilih kurir secara manual." },
      { status: 400 }
    );
  }

  // Check cache
  const { data: cached } = await supabase
    .from("tracking_cache")
    .select("*")
    .eq("awb", awb)
    .eq("courier", courier)
    .single();

  if (cached) {
    const age = Date.now() - new Date(cached.fetched_at).getTime();
    if (age < CACHE_MAX_AGE_MS) {
      return NextResponse.json({
        data: cached.result,
        cached: true,
        fetched_at: cached.fetched_at,
      });
    }
  }

  // Atomic quota reservation — prevents TOCTOU race
  const { error: quotaError } = await supabase.rpc("reserve_api_quota", {
    p_api_type: "tracking",
    p_limit: MONTHLY_QUOTA,
  });

  if (quotaError) {
    return NextResponse.json(
      { error: "Kuota tracking bulan ini sudah habis. Silakan lacak langsung di situs kurir." },
      { status: 429 }
    );
  }

  // Call BinderByte API
  const apiKey = process.env.BINDERBYTE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Tracking API belum dikonfigurasi" },
      { status: 500 }
    );
  }

  const apiUrl = `https://api.binderbyte.com/v1/track?api_key=${encodeURIComponent(apiKey)}&courier=${encodeURIComponent(courier)}&awb=${encodeURIComponent(awb)}`;

  let apiResponse: Response;
  try {
    apiResponse = await fetch(apiUrl, { next: { revalidate: 0 } });
  } catch {
    return NextResponse.json(
      { error: "Gagal menghubungi layanan tracking" },
      { status: 502 }
    );
  }

  if (!apiResponse.ok) {
    return NextResponse.json(
      { error: "Layanan tracking sedang tidak tersedia" },
      { status: 502 }
    );
  }

  const apiData = await apiResponse.json();

  if (apiData.status !== 200) {
    return NextResponse.json(
      { error: apiData.message || "Resi tidak ditemukan" },
      { status: 404 }
    );
  }

  const result = apiData.data;

  // Save to cache
  await supabase.rpc("upsert_tracking_cache", {
    p_awb: awb,
    p_courier: courier,
    p_result: result,
  });

  return NextResponse.json({
    data: result,
    cached: false,
    fetched_at: new Date().toISOString(),
  });
}
