import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { calculateCost, findDestinationId } from "@/lib/rajaongkir";

const COURIERS = "jne:jnt:sicepat:anteraja:pos"; // colon-separated, 1 API call
const MONTHLY_QUOTA = 500;

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

  // Fetch order with seller info
  const { data: order } = await supabase
    .from("orders")
    .select(
      `status,
       shipping_city, shipping_district, shipping_village, shipping_city_id,
       split:splits(creator:users!splits_created_by_fkey(store_city, store_city_id))`
    )
    .eq("id", orderId)
    .eq("user_id", user.id)
    .single();

  if (!order) {
    return NextResponse.json({ error: "Order tidak ditemukan" }, { status: 404 });
  }

  if (order.status !== "pending_payment") {
    return NextResponse.json(
      { error: "Cek ongkir hanya tersedia saat menunggu pembayaran" },
      { status: 400 }
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const splitData = order.split as any;
  const sellerCity: string | null = splitData?.creator?.store_city ?? null;
  const buyerCity = order.shipping_city;

  if (!sellerCity) {
    return NextResponse.json(
      { error: "Kota asal belum tersedia. Hubungi seller." },
      { status: 400 }
    );
  }

  if (!buyerCity) {
    return NextResponse.json(
      { error: "Alamat pengiriman belum lengkap." },
      { status: 400 }
    );
  }

  if (!process.env.RAJAONGKIR_API_KEY) {
    return NextResponse.json(
      { error: "Shipping cost API belum dikonfigurasi" },
      { status: 500 }
    );
  }

  // Resolve RajaOngkir destination IDs (subdistrict-level)
  let originId: number | null = splitData?.creator?.store_city_id ?? null;
  let destinationId: number | null = order.shipping_city_id ?? null;

  // Fallback: lookup via search API if IDs not stored
  if (!originId) {
    originId = await findDestinationId("", "", sellerCity, supabase);
  }
  if (!destinationId) {
    destinationId = await findDestinationId(
      order.shipping_village ?? "",
      order.shipping_district ?? "",
      buyerCity,
      supabase
    );
  }

  if (!originId) {
    return NextResponse.json(
      { error: `Kota asal "${sellerCity}" tidak ditemukan di RajaOngkir. Minta seller update profil.` },
      { status: 400 }
    );
  }

  if (!destinationId) {
    return NextResponse.json(
      { error: `Kota tujuan "${buyerCity}" tidak ditemukan di RajaOngkir. Update alamat di profil.` },
      { status: 400 }
    );
  }

  // Try quota reservation (don't block if RPC fails)
  const { error: quotaError } = await supabase.rpc("reserve_api_quota", {
    p_api_type: "ongkir",
    p_limit: MONTHLY_QUOTA,
  });

  if (quotaError) {
    const isQuotaExceeded = quotaError.message?.includes("quota exceeded");
    if (isQuotaExceeded) {
      return NextResponse.json(
        { error: "Kuota cek ongkir bulan ini sudah habis. Hubungi admin." },
        { status: 429 }
      );
    }
    console.error("reserve_api_quota RPC error (ongkir):", quotaError.message);
  }

  const weight = 1000; // 1kg in grams (RajaOngkir v2 uses grams)

  // Single API call with all couriers (colon-separated)
  const costItems = await calculateCost(originId, destinationId, weight, COURIERS);

  if (costItems.length === 0) {
    return NextResponse.json(
      { error: "Tidak ada layanan kurir yang tersedia untuk rute ini" },
      { status: 400 }
    );
  }

  // Map to existing UI format
  const costs = costItems.map((item) => ({
    code: item.code,
    name: item.name,
    service: item.service,
    type: item.description,
    price: item.cost,
    estimated: item.etd,
  }));

  return NextResponse.json({
    origin: sellerCity,
    destination: buyerCity,
    weight: 1,
    costs,
  });
}
