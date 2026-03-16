import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const ALLOWED_COURIERS = new Set([
  "jne", "jnt", "sicepat", "anteraja", "lion", "sap", "pos", "ide", "tiki", "ninja",
]);

export async function PATCH(
  request: Request,
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

  const body = await request.json();
  const { shipping_courier, shipping_service, shipping_cost } = body;

  if (!shipping_courier || !shipping_service || shipping_cost == null) {
    return NextResponse.json({ error: "Data kurir tidak lengkap" }, { status: 400 });
  }

  if (!ALLOWED_COURIERS.has(shipping_courier)) {
    return NextResponse.json({ error: "Kurir tidak didukung" }, { status: 400 });
  }

  if (typeof shipping_service !== "string" || shipping_service.length > 100) {
    return NextResponse.json({ error: "Nama layanan tidak valid" }, { status: 400 });
  }

  if (typeof shipping_cost !== "number" || shipping_cost <= 0) {
    return NextResponse.json({ error: "Ongkir tidak valid" }, { status: 400 });
  }

  // Fetch group
  const { data: group } = await supabase
    .from("order_groups")
    .select("id, user_id, status")
    .eq("id", groupId)
    .eq("user_id", user.id)
    .single();

  if (!group) {
    return NextResponse.json({ error: "Order group tidak ditemukan" }, { status: 404 });
  }

  if (group.status !== "pending_payment") {
    return NextResponse.json(
      { error: "Kurir hanya bisa dipilih saat menunggu pembayaran" },
      { status: 400 }
    );
  }

  const roundedCost = Math.round(shipping_cost);

  // Update group
  const { error: updateError } = await supabase
    .from("order_groups")
    .update({
      shipping_courier,
      shipping_service,
      shipping_cost: roundedCost,
    })
    .eq("id", groupId);

  if (updateError) {
    return NextResponse.json(
      { error: "Gagal menyimpan pilihan kurir: " + updateError.message },
      { status: 500 }
    );
  }

  // Also update individual orders with shared shipping info
  const { data: orders } = await supabase
    .from("orders")
    .select("id, total_price")
    .eq("order_group_id", groupId);

  if (orders && orders.length > 0) {
    // Split shipping cost proportionally across orders
    const totalProductPrice = orders.reduce((s, o) => s + o.total_price, 0);
    let distributedCost = 0;

    for (let i = 0; i < orders.length; i++) {
      const isLast = i === orders.length - 1;
      const proportion = isLast
        ? roundedCost - distributedCost
        : Math.round((orders[i].total_price / totalProductPrice) * roundedCost);

      distributedCost += proportion;

      await supabase
        .from("orders")
        .update({
          shipping_courier,
          shipping_service,
          shipping_cost: proportion,
        })
        .eq("id", orders[i].id);
    }
  }

  return NextResponse.json({ success: true });
}
