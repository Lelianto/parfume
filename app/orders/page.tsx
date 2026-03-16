import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { OrdersClient } from "./OrdersClient";
import type { Order } from "@/types/database";

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

  // Fetch buyer orders
  const { data: buyerOrders } = await supabase
    .from("orders")
    .select("*, split:splits(*, perfume:perfumes(*))")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

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
      sellerOrders={sellerOrders}
      hasSplits={splitIds.length > 0}
    />
  );
}
