import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: balance } = await supabase
    .from("seller_balances")
    .select("*")
    .eq("user_id", user.id)
    .single();

  // Return zero balance if no record yet
  return NextResponse.json({
    balance: balance ?? {
      user_id: user.id,
      balance: 0,
      total_earned: 0,
      total_withdrawn: 0,
      updated_at: new Date().toISOString(),
    },
  });
}
