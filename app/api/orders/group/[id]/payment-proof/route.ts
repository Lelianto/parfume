import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(
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

  // Fetch order group
  const { data: group } = await supabase
    .from("order_groups")
    .select("*")
    .eq("id", groupId)
    .eq("user_id", user.id)
    .single();

  if (!group) {
    return NextResponse.json({ error: "Order group tidak ditemukan" }, { status: 404 });
  }

  if (group.status !== "pending_payment") {
    return NextResponse.json({ error: "Order bukan dalam status menunggu pembayaran" }, { status: 400 });
  }

  if (group.payment_deadline && new Date(group.payment_deadline) < new Date()) {
    return NextResponse.json({ error: "Batas waktu pembayaran sudah lewat" }, { status: 400 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "File bukti bayar wajib diunggah" }, { status: 400 });
  }

  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: "Format file harus JPG, PNG, atau WebP" }, { status: 400 });
  }

  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "Ukuran file maksimal 5MB" }, { status: 400 });
  }

  const ext = file.name.split(".").pop() || "jpg";
  const path = `group_${groupId}/payment_proof_${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("payment_proofs")
    .upload(path, file, { upsert: true });

  if (uploadError) {
    return NextResponse.json({ error: "Gagal upload file: " + uploadError.message }, { status: 500 });
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("payment_proofs").getPublicUrl(path);

  // Update group
  await supabase
    .from("order_groups")
    .update({
      payment_proof_url: publicUrl,
      status: "paid",
    })
    .eq("id", groupId);

  // Update all orders in this group
  await supabase
    .from("orders")
    .update({
      payment_proof_url: publicUrl,
      status: "paid",
    })
    .eq("order_group_id", groupId)
    .eq("status", "pending_payment");

  return NextResponse.json({ success: true, payment_proof_url: publicUrl });
}
