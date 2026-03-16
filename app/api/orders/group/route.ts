import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { seller_id, items, address } = body;

  if (!seller_id || !items?.length || !address) {
    return NextResponse.json(
      { error: "Data tidak lengkap" },
      { status: 400 }
    );
  }

  // Validate address fields
  const requiredFields = ["name", "phone", "province", "city", "district", "village", "postal_code", "address"];
  for (const field of requiredFields) {
    if (!address[field]?.trim()) {
      return NextResponse.json(
        { error: `Field alamat "${field}" wajib diisi` },
        { status: 400 }
      );
    }
  }

  // Validate items
  for (const item of items) {
    if (!item.variant_id || !item.quantity || item.quantity < 1) {
      return NextResponse.json(
        { error: "Item tidak valid" },
        { status: 400 }
      );
    }
  }

  // Call batch RPC
  const { data: groupId, error: rpcError } = await supabase.rpc(
    "join_split_batch",
    {
      p_user_id: user.id,
      p_seller_id: seller_id,
      p_items: items,
    }
  );

  if (rpcError) {
    return NextResponse.json(
      { error: rpcError.message },
      { status: 400 }
    );
  }

  // Lookup RajaOngkir destination ID
  let shippingCityId: number | null = null;
  if (address.village && address.city) {
    const villageNorm = address.village.toUpperCase();
    const cityNorm = address.city
      .replace(/^(kota|kabupaten|kab\.?)\s+/i, "")
      .toUpperCase();
    const { data: match } = await supabase
      .from("rajaongkir_cities")
      .select("id")
      .ilike("subdistrict_name", villageNorm)
      .ilike("city_name", `%${cityNorm}%`)
      .limit(1)
      .maybeSingle();
    shippingCityId = match?.id ?? null;
  }

  // Update group with shipping address
  await supabase
    .from("order_groups")
    .update({
      shipping_name: address.name,
      shipping_phone: address.phone,
      shipping_province: address.province,
      shipping_city: address.city,
      shipping_district: address.district,
      shipping_village: address.village,
      shipping_postal_code: address.postal_code,
      shipping_address: address.address,
      shipping_city_id: shippingCityId,
    })
    .eq("id", groupId);

  // Also update individual orders with the same address
  await supabase
    .from("orders")
    .update({
      shipping_name: address.name,
      shipping_phone: address.phone,
      shipping_province: address.province,
      shipping_city: address.city,
      shipping_district: address.district,
      shipping_village: address.village,
      shipping_postal_code: address.postal_code,
      shipping_address: address.address,
      shipping_city_id: shippingCityId,
    })
    .eq("order_group_id", groupId);

  return NextResponse.json({ success: true, group_id: groupId });
}
