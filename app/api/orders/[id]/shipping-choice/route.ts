import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const ALLOWED_COURIERS = new Set([
  "jne", "jnt", "sicepat", "anteraja", "lion", "sap", "pos", "ide", "tiki", "ninja",
]);

export async function PATCH(
  request: Request,
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

  const body = await request.json();
  const { shipping_courier, shipping_service, shipping_cost } = body;

  if (!shipping_courier || !shipping_service || shipping_cost == null) {
    return NextResponse.json(
      { error: "Data kurir tidak lengkap" },
      { status: 400 }
    );
  }

  // Allowlist validation
  if (!ALLOWED_COURIERS.has(shipping_courier)) {
    return NextResponse.json(
      { error: "Kurir tidak didukung" },
      { status: 400 }
    );
  }

  if (typeof shipping_service !== "string" || shipping_service.length > 100) {
    return NextResponse.json(
      { error: "Nama layanan tidak valid" },
      { status: 400 }
    );
  }

  if (typeof shipping_cost !== "number" || shipping_cost <= 0) {
    return NextResponse.json(
      { error: "Ongkir tidak valid" },
      { status: 400 }
    );
  }

  // Fetch order — must belong to this user and be pending_payment
  const { data: order } = await supabase
    .from("orders")
    .select("id, user_id, status")
    .eq("id", orderId)
    .eq("user_id", user.id)
    .single();

  if (!order) {
    return NextResponse.json({ error: "Order tidak ditemukan" }, { status: 404 });
  }

  if (order.status !== "pending_payment") {
    return NextResponse.json(
      { error: "Kurir hanya bisa dipilih saat menunggu pembayaran" },
      { status: 400 }
    );
  }

  const { error: updateError } = await supabase
    .from("orders")
    .update({
      shipping_courier,
      shipping_service,
      shipping_cost: Math.round(shipping_cost),
    })
    .eq("id", orderId);

  if (updateError) {
    return NextResponse.json(
      { error: "Gagal menyimpan pilihan kurir: " + updateError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
