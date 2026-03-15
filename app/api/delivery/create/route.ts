import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { isDeliveryEnabled, createShipmentOrder } from "@/lib/komerce-delivery";

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check feature toggle
  const enabled = await isDeliveryEnabled(supabase);
  if (!enabled) {
    return NextResponse.json(
      { error: "Fitur pengiriman otomatis belum diaktifkan" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const result = await createShipmentOrder(body);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[delivery/create]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal membuat pengiriman" },
      { status: 500 }
    );
  }
}
