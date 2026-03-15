import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { isPaymentEnabled, parseWebhookPayload } from "@/lib/komerce-payment";

export async function POST(request: Request) {
  const supabase = await createClient();

  const enabled = await isPaymentEnabled(supabase);
  if (!enabled) {
    return NextResponse.json(
      { error: "Fitur pembayaran otomatis belum diaktifkan" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const payload = parseWebhookPayload(body);

    if (!payload) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    if (payload.status === "paid" || payload.status === "success") {
      // Auto-update order status from pending_payment to paid
      const { error } = await supabase
        .from("orders")
        .update({ status: "paid" })
        .eq("id", payload.order_id)
        .eq("status", "pending_payment");

      if (error) {
        console.error("[payment/webhook] update error:", error.message);
        return NextResponse.json(
          { error: "Gagal update status order" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[payment/webhook]", err);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
