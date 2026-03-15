import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { isDeliveryEnabled, printLabel } from "@/lib/komerce-delivery";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orderNo: string }> }
) {
  const { orderNo } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const enabled = await isDeliveryEnabled(supabase);
  if (!enabled) {
    return NextResponse.json(
      { error: "Fitur pengiriman otomatis belum diaktifkan" },
      { status: 403 }
    );
  }

  try {
    const result = await printLabel(orderNo);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[delivery/label]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal print label" },
      { status: 500 }
    );
  }
}
