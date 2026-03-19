import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { CheckoutDetailClient } from "./CheckoutDetailClient";

export const revalidate = 0;

export default async function CheckoutDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirectTo=/checkout/" + id);

  // Fetch checkout with order groups and orders
  const { data: checkout } = await supabase
    .from("checkouts")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!checkout) notFound();

  // Fetch order groups for this checkout
  const { data: rawGroups } = await supabase
    .from("order_groups")
    .select(
      `*, orders:orders(*, split:splits(*, perfume:perfumes(*)), variant:split_variants(*))`
    )
    .eq("checkout_id", id)
    .order("created_at", { ascending: true });

  // Fetch sellers
  const sellerIds = [...new Set((rawGroups ?? []).map((g) => g.seller_id))];
  const sellersMap: Record<string, { id: string; name: string; avatar_url: string | null; city: string | null; store_city: string | null; whatsapp: string | null }> = {};
  if (sellerIds.length > 0) {
    const { data: sellers } = await supabase
      .from("users")
      .select("id, name, avatar_url, city, store_city, whatsapp")
      .in("id", sellerIds);
    for (const s of sellers ?? []) {
      sellersMap[s.id] = s;
    }
  }

  const orderGroups = (rawGroups ?? []).map((g) => ({
    ...g,
    seller: sellersMap[g.seller_id] ?? null,
  }));

  // Platform settings
  const { data: platformSettings } = await supabase
    .from("platform_settings")
    .select("*")
    .eq("id", 1)
    .single();

  return (
    <CheckoutDetailClient
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      checkout={checkout as any}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      orderGroups={orderGroups as any}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      platformSettings={platformSettings as any}
    />
  );
}
