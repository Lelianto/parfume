import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { SellerOrderDetailClient } from "./SellerOrderDetailClient";
import type { Order, Split } from "@/types/database";

export const revalidate = 0;

export default async function SellerOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirectTo=/seller/orders");

  // Fetch order with split, perfume, and buyer info
  const { data: order } = await supabase
    .from("orders")
    .select("*, split:splits(*, perfume:perfumes(*)), user:users(name, avatar_url, email, whatsapp, city)")
    .eq("id", id)
    .single();

  if (!order) notFound();

  // Verify the current user is the split creator (seller)
  if (order.split.created_by !== user.id) notFound();

  return (
    <SellerOrderDetailClient
      order={order as unknown as Order & { split: Split; user?: { name: string; avatar_url: string | null; email: string; whatsapp: string | null; city: string | null } }}
    />
  );
}
