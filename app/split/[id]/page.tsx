import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { SplitDetailClient } from "./SplitDetailClient";
import type { Split, Order, Review } from "@/types/database";

export const revalidate = 0;

export default async function SplitDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: split } = await supabase
    .from("splits")
    .select("*, perfume:perfumes(*), creator:users!splits_created_by_fkey(*), variants:split_variants(*)")
    .eq("id", id)
    .single();

  if (!split) notFound();

  const { data: reviews } = await supabase
    .from("reviews")
    .select("*, user:users(*)")
    .eq("split_id", id)
    .order("created_at", { ascending: false });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Check if current user has an order for this split
  let hasOrder = false;
  let hasCompletedOrder = false;
  let hasReviewed = false;
  const isCreator = user?.id === split.created_by;

  if (user) {
    const { data: userOrders } = await supabase
      .from("orders")
      .select("id, status")
      .eq("split_id", id)
      .eq("user_id", user.id);
    hasOrder = (userOrders?.length ?? 0) > 0;
    hasCompletedOrder = userOrders?.some((o) => o.status === "completed") ?? false;

    const { count: reviewCount } = await supabase
      .from("reviews")
      .select("id", { count: "exact", head: true })
      .eq("split_id", id)
      .eq("user_id", user.id);
    hasReviewed = (reviewCount ?? 0) > 0;
  }

  // Fetch orders for seller panel
  let splitOrders: (Order & { user?: { name: string; avatar_url: string | null } })[] = [];
  if (isCreator) {
    const { data: ordersData } = await supabase
      .from("orders")
      .select("*, user:users(name, avatar_url)")
      .eq("split_id", id)
      .order("created_at", { ascending: true });
    splitOrders = (ordersData ?? []) as unknown as typeof splitOrders;
  }

  return (
    <SplitDetailClient
      split={split as unknown as Split}
      reviews={(reviews ?? []) as unknown as Review[]}
      isLoggedIn={!!user}
      hasOrder={hasOrder}
      canReview={hasCompletedOrder && !hasReviewed}
      isCreator={isCreator}
      orders={splitOrders}
    />
  );
}
