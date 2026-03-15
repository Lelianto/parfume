import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const ONGKIR_COURIERS = ["jne", "sicepat", "anteraja", "lion", "sap", "pos", "ide", "tiki"];
const MONTHLY_QUOTA = 480;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: orderId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch order with split → creator (seller)
  const { data: order } = await supabase
    .from("orders")
    .select("status, shipping_city, split:splits(creator:users!splits_created_by_fkey(store_city))")
    .eq("id", orderId)
    .eq("user_id", user.id)
    .single();

  if (!order) {
    return NextResponse.json({ error: "Order tidak ditemukan" }, { status: 404 });
  }

  // Only allow during pending_payment
  if (order.status !== "pending_payment") {
    return NextResponse.json(
      { error: "Cek ongkir hanya tersedia saat menunggu pembayaran" },
      { status: 400 }
    );
  }

  // Origin = seller's store_city, Destination = buyer's shipping_city
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const splitData = order.split as any;
  const origin: string | null = splitData?.creator?.store_city ?? null;
  const destination = order.shipping_city;

  if (!origin) {
    return NextResponse.json(
      { error: "Kota asal belum tersedia. Hubungi seller." },
      { status: 400 }
    );
  }

  if (!destination) {
    return NextResponse.json(
      { error: "Alamat pengiriman belum lengkap." },
      { status: 400 }
    );
  }

  const apiKey = process.env.BINDERBYTE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Shipping cost API belum dikonfigurasi" },
      { status: 500 }
    );
  }

  // Atomic quota reservation
  const { error: quotaError } = await supabase.rpc("reserve_api_quota", {
    p_api_type: "ongkir",
    p_limit: MONTHLY_QUOTA,
  });

  if (quotaError) {
    return NextResponse.json(
      { error: "Kuota cek ongkir bulan ini sudah habis. Hubungi admin." },
      { status: 429 }
    );
  }

  // Default weight 1kg (minimum charge, perfume decants are small)
  const weight = 1;

  const apiUrl = `https://api.binderbyte.com/v1/cost?api_key=${encodeURIComponent(apiKey)}&courier=${ONGKIR_COURIERS.join(",")}&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&weight=${weight}`;

  let apiResponse: Response;
  try {
    apiResponse = await fetch(apiUrl, { next: { revalidate: 0 } });
  } catch {
    return NextResponse.json(
      { error: "Gagal menghubungi layanan ongkir" },
      { status: 502 }
    );
  }

  if (!apiResponse.ok) {
    return NextResponse.json(
      { error: "Layanan ongkir sedang tidak tersedia" },
      { status: 502 }
    );
  }

  const apiData = await apiResponse.json();

  if (apiData.status !== 200) {
    return NextResponse.json(
      { error: apiData.message || "Gagal mengambil data ongkir" },
      { status: 400 }
    );
  }

  return NextResponse.json({
    origin,
    destination,
    weight,
    costs: apiData.data?.costs ?? [],
  });
}
