import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: checkoutId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch checkout
  const { data: checkout } = await supabase
    .from("checkouts")
    .select("*")
    .eq("id", checkoutId)
    .eq("user_id", user.id)
    .single();

  if (!checkout) {
    return NextResponse.json({ error: "Checkout tidak ditemukan" }, { status: 404 });
  }

  if (checkout.status !== "pending_payment") {
    return NextResponse.json({ error: "Checkout bukan dalam status menunggu pembayaran" }, { status: 400 });
  }

  if (checkout.payment_deadline && new Date(checkout.payment_deadline) < new Date()) {
    return NextResponse.json({ error: "Batas waktu pembayaran sudah lewat" }, { status: 400 });
  }

  // Check all groups have shipping selected
  const { data: groups } = await supabase
    .from("order_groups")
    .select("id, shipping_courier, shipping_cost")
    .eq("checkout_id", checkoutId);

  const allShippingChosen = groups?.every(g => g.shipping_courier && g.shipping_cost > 0);
  if (!allShippingChosen) {
    return NextResponse.json({ error: "Pilih kurir pengiriman untuk semua toko terlebih dahulu" }, { status: 400 });
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
  const path = `checkout_${checkoutId}/payment_proof_${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("payment_proofs")
    .upload(path, file, { upsert: true });

  if (uploadError) {
    return NextResponse.json({ error: "Gagal upload file: " + uploadError.message }, { status: 500 });
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("payment_proofs").getPublicUrl(path);

  // Update checkout
  await supabase
    .from("checkouts")
    .update({
      payment_proof_url: publicUrl,
      status: "paid",
    })
    .eq("id", checkoutId);

  // Update all order groups
  for (const g of groups ?? []) {
    await supabase
      .from("order_groups")
      .update({
        payment_proof_url: publicUrl,
        status: "paid",
      })
      .eq("id", g.id);

    // Update all orders in this group
    await supabase
      .from("orders")
      .update({
        payment_proof_url: publicUrl,
        status: "paid",
      })
      .eq("order_group_id", g.id)
      .eq("status", "pending_payment");
  }

  return NextResponse.json({ success: true, payment_proof_url: publicUrl });
}
