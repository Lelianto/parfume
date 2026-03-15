import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  // Validate cron secret
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");

  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();

  // 1. Cancel expired pending_payment orders
  const { data: cancelledCount } = await supabase.rpc("cancel_expired_orders");

  // 2. Auto-complete shipped orders past deadline
  const { data: completedCount } = await supabase.rpc("auto_complete_orders");

  return NextResponse.json({
    cancelled: cancelledCount ?? 0,
    completed: completedCount ?? 0,
  });
}
