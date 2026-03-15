import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { detectCourier, SUPPORTED_COURIERS } from "@/lib/tracking";
import { trackWaybill } from "@/lib/rajaongkir";

const CACHE_MAX_AGE_MS = 3 * 60 * 60 * 1000; // 3 hours
const MONTHLY_QUOTA = 500;
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

  if (!AWB_PATTERN.test(awb)) {
    return NextResponse.json(
      { error: "Format nomor resi tidak valid" },
      { status: 400 }
    );
  }

  const url = new URL(request.url);
  const courierParam = url.searchParams.get("courier");
  const courier = courierParam || detectCourier(awb);

  if (!courier || !(courier in SUPPORTED_COURIERS)) {
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

  // Quota reservation
  const { error: quotaError } = await supabase.rpc("reserve_api_quota", {
    p_api_type: "tracking",
    p_limit: MONTHLY_QUOTA,
  });

  if (quotaError) {
    const isQuotaExceeded = quotaError.message?.includes("quota exceeded");
    if (isQuotaExceeded) {
      return NextResponse.json(
        { error: "Kuota tracking bulan ini sudah habis. Silakan lacak langsung di situs kurir." },
        { status: 429 }
      );
    }
    console.error("reserve_api_quota RPC error (tracking):", quotaError.message);
  }

  if (!process.env.RAJAONGKIR_API_KEY) {
    return NextResponse.json(
      { error: "Tracking API belum dikonfigurasi" },
      { status: 500 }
    );
  }

  // Call RajaOngkir waybill API
  const result = await trackWaybill(awb, courier);

  if (!result) {
    return NextResponse.json(
      { error: "Resi tidak ditemukan atau kurir tidak mendukung tracking" },
      { status: 404 }
    );
  }

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
