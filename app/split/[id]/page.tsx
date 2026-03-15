import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { SplitDetailClient } from "./SplitDetailClient";
import type { Split, Order, Review } from "@/types/database";
import type { Metadata } from "next";

export const revalidate = 0;

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();

  const { data: split } = await supabase
    .from("splits")
    .select("*, perfume:perfumes(*), variants:split_variants(*)")
    .eq("id", id)
    .single();

  if (!split?.perfume) return { title: "Split Parfum — Wangiverse" };

  const perfume = split.perfume;
  const variants = split.variants ?? [];
  const minPrice = variants.length > 0
    ? Math.min(...variants.map((v: { price: number }) => v.price))
    : split.price_per_slot;
  const totalSold = variants.reduce((s: number, v: { sold: number }) => s + v.sold, 0);
  const totalStock = variants.reduce((s: number, v: { stock: number }) => s + v.stock, 0);
  const slotsLeft = totalStock - totalSold;

  const title = `${perfume.brand} ${perfume.name} — Split di Wangiverse`;
  const description = `Split parfum ${perfume.brand} ${perfume.name}${perfume.concentration ? ` ${perfume.concentration}` : ""}. Mulai dari Rp${minPrice.toLocaleString("id-ID")}. ${slotsLeft > 0 ? `${slotsLeft} slot tersisa.` : "Slot habis."} Parfum original 100% autentik.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      siteName: "Wangiverse",
      locale: "id_ID",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function SplitDetailPage({ params }: Props) {
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
