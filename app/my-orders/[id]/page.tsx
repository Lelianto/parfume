import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { OrderDetailClient } from "./OrderDetailClient";
import type { Order, Split, User, PlatformSettings } from "@/types/database";

export const revalidate = 0;

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirectTo=/my-orders");

  const [{ data: order }, { data: platformSettings }] = await Promise.all([
    supabase
      .from("orders")
      .select("*, split:splits(*, perfume:perfumes(*), creator:users!splits_created_by_fkey(*))")
      .eq("id", id)
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("platform_settings")
      .select("*")
      .eq("id", 1)
      .single(),
  ]);

  if (!order) notFound();

  return (
    <OrderDetailClient
      order={order as unknown as Order & { split: Split & { creator?: User } }}
      platformSettings={platformSettings as unknown as PlatformSettings | null}
    />
  );
}
