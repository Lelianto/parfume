import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { OrdersClient } from "./OrdersClient";
import type { Order } from "@/types/database";

export const revalidate = 0;

export interface SellerOrder extends Order {
  user?: { name: string; avatar_url: string | null };
}

export interface BuyerOrder extends Order {
  seller?: { name: string; avatar_url: string | null; store_city: string | null } | null;
  checkout_id?: string | null;
}

export default async function OrdersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirectTo=/orders");

  // Fetch ALL buyer orders (including those in groups/checkouts)
  const { data: allBuyerOrders } = await supabase
    .from("orders")
    .select(
      `*, split:splits(*, perfume:perfumes(*)), variant:split_variants(*)`
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  // Fetch sellers for each order (via splits.created_by)
  const creatorIds = [...new Set((allBuyerOrders ?? []).map((o) => o.split?.created_by).filter(Boolean))];
  const sellersMap: Record<string, { name: string; avatar_url: string | null; store_city: string | null }> = {};
  if (creatorIds.length > 0) {
    const { data: sellers } = await supabase
      .from("users")
      .select("id, name, avatar_url, store_city")
      .in("id", creatorIds);
    for (const s of sellers ?? []) sellersMap[s.id] = s;
  }

  // Fetch order_group info to get checkout_id for linking
  const groupIds = [...new Set((allBuyerOrders ?? []).map((o) => o.order_group_id).filter(Boolean))];
  const groupCheckoutMap: Record<string, string | null> = {};
  if (groupIds.length > 0) {
    const { data: groups } = await supabase
      .from("order_groups")
      .select("id, checkout_id")
      .in("id", groupIds);
    for (const g of groups ?? []) groupCheckoutMap[g.id] = g.checkout_id ?? null;
  }

  const buyerOrders: BuyerOrder[] = (allBuyerOrders ?? []).map((o) => ({
    ...(o as unknown as Order),
    seller: o.split?.created_by ? sellersMap[o.split.created_by] ?? null : null,
    checkout_id: o.order_group_id ? groupCheckoutMap[o.order_group_id] ?? null : null,
    order_group_id: o.order_group_id ?? null,
  }));

  // Fetch seller splits
  const { data: splits } = await supabase
    .from("splits")
    .select("id")
    .eq("created_by", user.id);

  const splitIds = (splits ?? []).map((s) => s.id);

  let sellerOrders: SellerOrder[] = [];
  if (splitIds.length > 0) {
    const { data: sOrders } = await supabase
      .from("orders")
      .select("*, split:splits(*, perfume:perfumes(*)), variant:split_variants(*), user:users(name, avatar_url)")
      .in("split_id", splitIds)
      .order("created_at", { ascending: false });
    sellerOrders = (sOrders ?? []) as unknown as SellerOrder[];
  }

  return (
    <OrdersClient
      buyerOrders={buyerOrders}
      sellerOrders={sellerOrders}
      hasSplits={splitIds.length > 0}
    />
  );
}
