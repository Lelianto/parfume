import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { isPaymentEnabled, createPayment } from "@/lib/komerce-payment";

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const enabled = await isPaymentEnabled(supabase);
  if (!enabled) {
    return NextResponse.json(
      { error: "Fitur pembayaran otomatis belum diaktifkan" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { orderId, amount, method, customerName, customerEmail } = body;

    if (!orderId || !amount || !method) {
      return NextResponse.json({ error: "Data pembayaran tidak lengkap" }, { status: 400 });
    }

    const result = await createPayment({
      orderId,
      amount,
      method,
      customerName: customerName || user.email || "",
      customerEmail: customerEmail || user.email || "",
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("[payment/create]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal membuat pembayaran" },
      { status: 500 }
    );
  }
}
