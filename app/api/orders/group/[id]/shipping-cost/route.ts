import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { calculateCost, findDestinationId } from "@/lib/rajaongkir";

const COURIERS = "jne:jnt:sicepat:anteraja:pos";
const MONTHLY_QUOTA = 500;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: groupId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch order group with seller info
  const { data: group } = await supabase
    .from("order_groups")
    .select(
      `status, shipping_city, shipping_district, shipping_village, shipping_city_id,
       seller:users!order_groups_seller_id_fkey(store_city, store_city_id)`
    )
    .eq("id", groupId)
    .eq("user_id", user.id)
    .single();

  if (!group) {
    return NextResponse.json({ error: "Order group tidak ditemukan" }, { status: 404 });
  }

  if (group.status !== "pending_payment") {
    return NextResponse.json(
      { error: "Cek ongkir hanya tersedia saat menunggu pembayaran" },
      { status: 400 }
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sellerData = group.seller as any;
  const sellerCity: string | null = sellerData?.store_city ?? null;
  const buyerCity = group.shipping_city;

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

  let originId: number | null = sellerData?.store_city_id ?? null;
  let destinationId: number | null = group.shipping_city_id ?? null;

  if (!originId) {
    originId = await findDestinationId("", "", sellerCity, supabase);
  }
  if (!destinationId) {
    destinationId = await findDestinationId(
      group.shipping_village ?? "",
      group.shipping_district ?? "",
      buyerCity,
      supabase
    );
  }

  if (!originId) {
    return NextResponse.json(
      { error: `Kota asal "${sellerCity}" tidak ditemukan di RajaOngkir.` },
      { status: 400 }
    );
  }

  if (!destinationId) {
    return NextResponse.json(
      { error: `Kota tujuan "${buyerCity}" tidak ditemukan di RajaOngkir.` },
      { status: 400 }
    );
  }

  // Quota check
  const { error: quotaError } = await supabase.rpc("reserve_api_quota", {
    p_api_type: "ongkir",
    p_limit: MONTHLY_QUOTA,
  });

  if (quotaError?.message?.includes("quota exceeded")) {
    return NextResponse.json(
      { error: "Kuota cek ongkir bulan ini sudah habis." },
      { status: 429 }
    );
  }

  // Calculate total weight: count items in this group
  const { data: orders } = await supabase
    .from("orders")
    .select("slots_purchased")
    .eq("order_group_id", groupId);

  const totalItems = orders?.reduce((sum, o) => sum + o.slots_purchased, 0) ?? 1;
  // Estimate ~200g per decant item, minimum 1kg
  const weightGrams = Math.max(1000, totalItems * 200);

  const costItems = await calculateCost(originId, destinationId, weightGrams, COURIERS);

  if (costItems.length === 0) {
    return NextResponse.json(
      { error: "Tidak ada layanan kurir yang tersedia untuk rute ini" },
      { status: 400 }
    );
  }

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
    weight: Math.round(weightGrams / 1000 * 10) / 10,
    costs,
  });
}
