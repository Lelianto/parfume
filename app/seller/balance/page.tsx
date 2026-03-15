import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SellerBalanceClient } from "./SellerBalanceClient";
import type { SellerBalance, Withdrawal } from "@/types/database";

export const revalidate = 0;

export default async function SellerBalancePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirectTo=/seller/balance");

  const [balanceResult, withdrawalsResult, profileResult] = await Promise.all([
    supabase
      .from("seller_balances")
      .select("*")
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("withdrawals")
      .select("*")
      .eq("user_id", user.id)
      .order("requested_at", { ascending: false }),
    supabase
      .from("users")
      .select("bank_name, bank_account_number, bank_account_name")
      .eq("id", user.id)
      .single(),
  ]);

  const balance: SellerBalance = (balanceResult.data as unknown as SellerBalance) ?? {
    user_id: user.id,
    balance: 0,
    total_earned: 0,
    total_withdrawn: 0,
    updated_at: new Date().toISOString(),
  };

  const withdrawals = (withdrawalsResult.data ?? []) as unknown as Withdrawal[];
  const bankInfo = profileResult.data as { bank_name: string | null; bank_account_number: string | null; bank_account_name: string | null } | null;

  return (
    <SellerBalanceClient
      balance={balance}
      withdrawals={withdrawals}
      bankInfo={bankInfo}
    />
  );
}
