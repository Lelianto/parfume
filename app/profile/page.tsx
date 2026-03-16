import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ProfileClient } from "./ProfileClient";
import type { SellerBalance, Withdrawal } from "@/types/database";

export const revalidate = 0;

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirectTo=/profile");
  }

  const [profileResult, balanceResult, withdrawalsResult] = await Promise.all([
    supabase.from("users").select("*").eq("id", user.id).single(),
    supabase.from("seller_balances").select("*").eq("user_id", user.id).maybeSingle(),
    supabase
      .from("withdrawals")
      .select("*")
      .eq("user_id", user.id)
      .order("requested_at", { ascending: false }),
  ]);

  if (!profileResult.data) {
    redirect("/login");
  }

  // Check if user has any splits (to show balance tab)
  const { count } = await supabase
    .from("splits")
    .select("id", { count: "exact", head: true })
    .eq("created_by", user.id);

  const balance: SellerBalance = (balanceResult.data as unknown as SellerBalance) ?? {
    user_id: user.id,
    balance: 0,
    total_earned: 0,
    total_withdrawn: 0,
    updated_at: new Date().toISOString(),
  };

  const withdrawals = (withdrawalsResult.data ?? []) as unknown as Withdrawal[];

  return (
    <ProfileClient
      profile={profileResult.data}
      balance={balance}
      withdrawals={withdrawals}
      hasSplits={(count ?? 0) > 0}
    />
  );
}
