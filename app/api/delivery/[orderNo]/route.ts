import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { isDeliveryEnabled, getOrderDetail, cancelOrder } from "@/lib/komerce-delivery";

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
    const result = await getOrderDetail(orderNo);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[delivery/detail]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal mengambil detail" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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
    const result = await cancelOrder(orderNo);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[delivery/cancel]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal membatalkan pengiriman" },
      { status: 500 }
    );
  }
}
