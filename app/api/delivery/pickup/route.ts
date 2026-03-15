import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { isDeliveryEnabled, requestPickup } from "@/lib/komerce-delivery";

export async function POST(request: Request) {
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
    const { orderNo } = await request.json();
    if (!orderNo) {
      return NextResponse.json({ error: "orderNo required" }, { status: 400 });
    }
    const result = await requestPickup(orderNo);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[delivery/pickup]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal request pickup" },
      { status: 500 }
    );
  }
}
