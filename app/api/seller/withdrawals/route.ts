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

  const { data: withdrawals, error } = await supabase
    .from("withdrawals")
    .select("*")
    .eq("user_id", user.id)
    .order("requested_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ withdrawals: withdrawals ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const amount = Number(body.amount);

  if (!amount || amount <= 0) {
    return NextResponse.json({ error: "Jumlah penarikan harus lebih dari 0" }, { status: 400 });
  }

  // Check balance
  const { data: balance } = await supabase
    .from("seller_balances")
    .select("balance")
    .eq("user_id", user.id)
    .single();

  if (!balance || balance.balance < amount) {
    return NextResponse.json({ error: "Saldo tidak mencukupi" }, { status: 400 });
  }

  // Check no pending withdrawal
  const { count: pendingCount } = await supabase
    .from("withdrawals")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .in("status", ["pending", "approved"]);

  if (pendingCount && pendingCount > 0) {
    return NextResponse.json(
      { error: "Kamu masih memiliki penarikan yang sedang diproses" },
      { status: 400 }
    );
  }

  // Get seller bank info
  const { data: profile } = await supabase
    .from("users")
    .select("bank_name, bank_account_number, bank_account_name")
    .eq("id", user.id)
    .single();

  if (!profile?.bank_name || !profile?.bank_account_number || !profile?.bank_account_name) {
    return NextResponse.json(
      { error: "Lengkapi info rekening bank di profil terlebih dahulu" },
      { status: 400 }
    );
  }

  // Create withdrawal request
  const { data: withdrawal, error } = await supabase
    .from("withdrawals")
    .insert({
      user_id: user.id,
      amount,
      bank_name: profile.bank_name,
      bank_account_number: profile.bank_account_number,
      bank_account_name: profile.bank_account_name,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "Gagal membuat permintaan penarikan: " + error.message }, { status: 500 });
  }

  return NextResponse.json({ withdrawal });
}
