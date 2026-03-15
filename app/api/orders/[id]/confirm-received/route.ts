import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(
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

  // Fetch order with split info to get seller ID
  const { data: order } = await supabase
    .from("orders")
    .select("*, split:splits(created_by)")
    .eq("id", orderId)
    .eq("user_id", user.id)
    .single();

  if (!order) {
    return NextResponse.json({ error: "Order tidak ditemukan" }, { status: 404 });
  }

  if (order.status !== "shipped") {
    return NextResponse.json({ error: "Order bukan dalam status dikirim" }, { status: 400 });
  }

  // Update order status to completed
  const { error: updateError } = await supabase
    .from("orders")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      disbursement_status: "credited",
    })
    .eq("id", orderId);

  if (updateError) {
    return NextResponse.json({ error: "Gagal update order: " + updateError.message }, { status: 500 });
  }

  // Auto-credit seller balance
  const sellerId = (order.split as unknown as { created_by: string })?.created_by;
  if (sellerId) {
    await supabase.rpc("credit_seller_balance", {
      p_order_id: orderId,
      p_seller_id: sellerId,
      p_amount: order.total_price,
    });
  }

  return NextResponse.json({ success: true });
}
