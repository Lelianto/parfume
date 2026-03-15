import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { isPaymentEnabled, checkPaymentStatus } from "@/lib/komerce-payment";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: paymentId } = await params;
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
    const result = await checkPaymentStatus(paymentId);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[payment/status]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal cek status pembayaran" },
      { status: 500 }
    );
  }
}
