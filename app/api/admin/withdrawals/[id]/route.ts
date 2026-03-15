import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: withdrawalId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify admin
  const { count } = await supabase
    .from("admin_users")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  if (!count || count === 0) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { action, admin_note } = body as { action: string; admin_note?: string };

  // Fetch withdrawal
  const { data: withdrawal } = await supabase
    .from("withdrawals")
    .select("*")
    .eq("id", withdrawalId)
    .single();

  if (!withdrawal) {
    return NextResponse.json({ error: "Penarikan tidak ditemukan" }, { status: 404 });
  }

  if (action === "approve") {
    if (withdrawal.status !== "pending") {
      return NextResponse.json({ error: "Penarikan bukan dalam status pending" }, { status: 400 });
    }

    const { error } = await supabase
      .from("withdrawals")
      .update({
        status: "approved",
        processed_at: new Date().toISOString(),
      })
      .eq("id", withdrawalId);

    if (error) {
      return NextResponse.json({ error: "Gagal approve: " + error.message }, { status: 500 });
    }
  } else if (action === "complete") {
    if (withdrawal.status !== "approved") {
      return NextResponse.json({ error: "Penarikan belum di-approve" }, { status: 400 });
    }

    // Fetch current balance
    const { data: balance } = await supabase
      .from("seller_balances")
      .select("balance, total_withdrawn")
      .eq("user_id", withdrawal.user_id)
      .single();

    if (!balance || balance.balance < withdrawal.amount) {
      return NextResponse.json({ error: "Saldo seller tidak mencukupi" }, { status: 400 });
    }

    // Deduct balance and increment total_withdrawn
    const { error: balanceError } = await supabase
      .from("seller_balances")
      .update({
        balance: balance.balance - withdrawal.amount,
        total_withdrawn: (balance.total_withdrawn || 0) + withdrawal.amount,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", withdrawal.user_id);

    if (balanceError) {
      return NextResponse.json({ error: "Gagal update saldo: " + balanceError.message }, { status: 500 });
    }

    const { error: withdrawalError } = await supabase
      .from("withdrawals")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", withdrawalId);

    if (withdrawalError) {
      return NextResponse.json({ error: "Gagal complete: " + withdrawalError.message }, { status: 500 });
    }
  } else if (action === "reject") {
    if (withdrawal.status !== "pending") {
      return NextResponse.json({ error: "Penarikan bukan dalam status pending" }, { status: 400 });
    }

    const { error } = await supabase
      .from("withdrawals")
      .update({
        status: "rejected",
        admin_note: admin_note || null,
        processed_at: new Date().toISOString(),
      })
      .eq("id", withdrawalId);

    if (error) {
      return NextResponse.json({ error: "Gagal reject: " + error.message }, { status: 500 });
    }
  } else {
    return NextResponse.json({ error: "Action tidak valid" }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
