import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

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
  const { status: newStatus, shipping_receipt } = body;

  // Fetch order with split
  const { data: order } = await supabase
    .from("orders")
    .select("*, split:splits(*)")
    .eq("id", orderId)
    .single();

  if (!order) {
    return NextResponse.json({ error: "Order tidak ditemukan" }, { status: 404 });
  }

  // Verify caller is the split creator
  if (order.split.created_by !== user.id) {
    return NextResponse.json({ error: "Hanya seller yang bisa mengubah status order" }, { status: 403 });
  }

  // Validate status transitions
  const currentStatus = order.status;
  const updateData: Record<string, unknown> = { status: newStatus };

  if (currentStatus === "paid" && newStatus === "confirmed") {
    // Only admin can verify payments (via /api/admin/orders/[id]/verify)
    return NextResponse.json(
      { error: "Verifikasi pembayaran hanya bisa dilakukan oleh admin" },
      { status: 403 }
    );
  } else if (currentStatus === "confirmed" && newStatus === "decanting") {
    // Non-ready stock only
    if (order.split.is_ready_stock) {
      return NextResponse.json({ error: "Ready stock tidak perlu proses decant" }, { status: 400 });
    }
  } else if (currentStatus === "confirmed" && newStatus === "shipped") {
    if (!shipping_receipt) {
      return NextResponse.json({ error: "Nomor resi wajib diisi" }, { status: 400 });
    }
    updateData.shipping_receipt = shipping_receipt;
    updateData.shipped_at = new Date().toISOString();
    updateData.shipping_deadline = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
  } else if (currentStatus === "decanting" && newStatus === "shipped") {
    if (!shipping_receipt) {
      return NextResponse.json({ error: "Nomor resi wajib diisi" }, { status: 400 });
    }
    updateData.shipping_receipt = shipping_receipt;
    updateData.shipped_at = new Date().toISOString();
    updateData.shipping_deadline = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
  } else {
    return NextResponse.json(
      { error: `Transisi status dari ${currentStatus} ke ${newStatus} tidak diperbolehkan` },
      { status: 400 }
    );
  }

  const { error: updateError } = await supabase
    .from("orders")
    .update(updateData)
    .eq("id", orderId);

  if (updateError) {
    return NextResponse.json({ error: "Gagal update order: " + updateError.message }, { status: 500 });
  }

  // If transitioning to decanting, also update the split status
  if (newStatus === "decanting") {
    await supabase
      .from("splits")
      .update({ status: "decanting" })
      .eq("id", order.split_id);

    // Also update all confirmed orders to decanting
    await supabase
      .from("orders")
      .update({ status: "decanting" })
      .eq("split_id", order.split_id)
      .eq("status", "confirmed");
  }

  return NextResponse.json({ success: true });
}
