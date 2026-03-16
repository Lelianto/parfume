import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(
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

  // Verify admin
  const { count } = await supabase
    .from("admin_users")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  if (!count || count === 0) {
    return NextResponse.json({ error: "Hanya admin yang bisa melakukan verifikasi" }, { status: 403 });
  }

  const body = await request.json();
  const { action, reason } = body; // "confirm" or "reject"

  if (!action || !["confirm", "reject"].includes(action)) {
    return NextResponse.json({ error: "Action harus 'confirm' atau 'reject'" }, { status: 400 });
  }

  // Fetch order
  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single();

  if (!order) {
    return NextResponse.json({ error: "Order tidak ditemukan" }, { status: 404 });
  }

  if (order.status !== "paid") {
    return NextResponse.json(
      { error: `Order status '${order.status}' tidak bisa diverifikasi. Hanya order 'paid' yang bisa.` },
      { status: 400 }
    );
  }

  if (action === "confirm") {
    const { error: updateError } = await supabase
      .from("orders")
      .update({
        status: "confirmed",
        confirmed_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    if (updateError) {
      return NextResponse.json({ error: "Gagal konfirmasi: " + updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, status: "confirmed" });
  }

  if (action === "reject") {
    const { error: updateError } = await supabase
      .from("orders")
      .update({
        status: "rejected",
        reject_reason: reason || null,
      })
      .eq("id", orderId);

    if (updateError) {
      return NextResponse.json({ error: "Gagal menolak: " + updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, status: "rejected" });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
