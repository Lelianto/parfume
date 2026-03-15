import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SellerOrdersClient } from "./SellerOrdersClient";
import type { Order, Split } from "@/types/database";

export const revalidate = 0;

export interface SellerOrder extends Order {
  split: Split;
  user?: { name: string; avatar_url: string | null };
}

export default async function SellerOrdersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirectTo=/seller/orders");

  // Fetch all splits by this seller
  const { data: splits } = await supabase
    .from("splits")
    .select("id")
    .eq("created_by", user.id);

  const splitIds = (splits ?? []).map((s) => s.id);

  if (splitIds.length === 0) {
    return <SellerOrdersClient orders={[]} />;
  }

  // Fetch all orders for those splits
  const { data: orders } = await supabase
    .from("orders")
    .select("*, split:splits(*, perfume:perfumes(*)), user:users(name, avatar_url)")
    .in("split_id", splitIds)
    .order("created_at", { ascending: false });

  return (
    <SellerOrdersClient
      orders={(orders ?? []) as unknown as SellerOrder[]}
    />
  );
}
