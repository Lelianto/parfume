import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { OrderGroupDetailClient } from "./OrderGroupDetailClient";

export const revalidate = 0;

export default async function OrderGroupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirectTo=/order-group/" + id);

  const [{ data: group }, { data: platformSettings }] = await Promise.all([
    supabase
      .from("order_groups")
      .select(
        `*, seller:users!order_groups_seller_id_fkey(*),
         orders:orders(*, split:splits(*, perfume:perfumes(*)), variant:split_variants(*))`
      )
      .eq("id", id)
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("platform_settings")
      .select("*")
      .eq("id", 1)
      .single(),
  ]);

  if (!group) notFound();

  return (
    <OrderGroupDetailClient
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      group={group as any}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      platformSettings={platformSettings as any}
    />
  );
}
