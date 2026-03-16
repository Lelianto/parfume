import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { OrdersClient } from "./OrdersClient";
import type { Order, OrderGroup } from "@/types/database";

export const revalidate = 0;

export interface SellerOrder extends Order {
  user?: { name: string; avatar_url: string | null };
}

export default async function OrdersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirectTo=/orders");

  // Fetch buyer orders (non-grouped only)
  const { data: buyerOrders } = await supabase
    .from("orders")
    .select("*, split:splits(*, perfume:perfumes(*))")
    .eq("user_id", user.id)
    .is("order_group_id", null)
    .order("created_at", { ascending: false });

  // Fetch order groups
  const { data: rawGroups } = await supabase
    .from("order_groups")
    .select(
      `*, orders:orders(*, split:splits(*, perfume:perfumes(*)), variant:split_variants(*))`
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  // Fetch sellers for groups separately
  const sellerIds = [...new Set((rawGroups ?? []).map((g) => g.seller_id))];
  const sellersMap: Record<string, { name: string; avatar_url: string | null; city: string | null; store_city: string | null }> = {};
  if (sellerIds.length > 0) {
    const { data: sellers } = await supabase
      .from("users")
      .select("id, name, avatar_url, city, store_city")
      .in("id", sellerIds);
    for (const s of sellers ?? []) {
      sellersMap[s.id] = s;
    }
  }
  const orderGroups = (rawGroups ?? []).map((g) => ({
    ...g,
    seller: sellersMap[g.seller_id] ?? null,
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
      .select("*, split:splits(*, perfume:perfumes(*)), user:users(name, avatar_url)")
      .in("split_id", splitIds)
      .order("created_at", { ascending: false });
    sellerOrders = (sOrders ?? []) as unknown as SellerOrder[];
  }

  return (
    <OrdersClient
      buyerOrders={(buyerOrders ?? []) as unknown as Order[]}
      orderGroups={(orderGroups ?? []) as unknown as OrderGroup[]}
      sellerOrders={sellerOrders}
      hasSplits={splitIds.length > 0}
    />
  );
}
