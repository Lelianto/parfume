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

  // Verify admin
  const { count } = await supabase
    .from("admin_users")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  if (!count || count === 0) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Fetch order
  const { data: order } = await supabase
    .from("orders")
    .select("id, status, disbursement_status")
    .eq("id", orderId)
    .single();

  if (!order) {
    return NextResponse.json({ error: "Order tidak ditemukan" }, { status: 404 });
  }

  if (order.status !== "completed") {
    return NextResponse.json({ error: "Order belum selesai" }, { status: 400 });
  }

  if (order.disbursement_status !== "pending") {
    return NextResponse.json({ error: "Order tidak dalam status menunggu pencairan" }, { status: 400 });
  }

  const { error: updateError } = await supabase
    .from("orders")
    .update({
      disbursement_status: "disbursed",
      disbursed_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  if (updateError) {
    return NextResponse.json({ error: "Gagal update: " + updateError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
