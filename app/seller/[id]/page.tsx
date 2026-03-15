import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { SplitCard } from "@/components/SplitCard";
import type { Split, User } from "@/types/database";
import { ArrowLeft, MapPin, Star, Package, EyeOff } from "lucide-react";

export const revalidate = 0;

export default async function SellerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch seller profile
  const { data: seller } = await supabase
    .from("users")
    .select("*")
    .eq("id", id)
    .single();

  if (!seller) notFound();

  // Fetch seller's splits with variants
  const { data: splits } = await supabase
    .from("splits")
    .select("*, perfume:perfumes(*), variants:split_variants(*)")
    .eq("created_by", id)
    .order("created_at", { ascending: false });

  const allSellerSplits = (splits ?? []) as unknown as Split[];

  // Check if current user is the seller (to show hidden splits)
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();
  const isOwner = currentUser?.id === id;

  const sellerSplits = isOwner
    ? allSellerSplits
    : allSellerSplits.filter((s) => !s.is_hidden);

  // Aggregate reviews for this seller's splits
  const splitIds = sellerSplits.map((s) => s.id);
  let avgRating = 0;
  let totalReviews = 0;

  if (splitIds.length > 0) {
    const { data: reviews } = await supabase
      .from("reviews")
      .select("rating")
      .in("split_id", splitIds);

    if (reviews && reviews.length > 0) {
      totalReviews = reviews.length;
      avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews;
    }
  }

  const sellerUser = seller as unknown as User;

  return (
    <div className="mx-auto max-w-[1410px] px-4 pb-8 pt-20 sm:px-8 md:pt-8">
      <Link
        href="/"
        className="mb-8 hidden items-center gap-1.5 text-sm text-gold-200/40 transition-colors hover:text-gold-400 md:inline-flex"
      >
        <ArrowLeft size={16} /> Kembali
      </Link>

      {/* Seller Profile Header */}
      <div className="rounded-2xl border border-gold-900/20 bg-surface-200/60 p-6 sm:p-8">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
          {sellerUser.avatar_url && (
            <Image
              src={sellerUser.avatar_url}
              alt={sellerUser.name}
              width={80}
              height={80}
              className="rounded-full ring-2 ring-gold-700/30"
            />
          )}
          <div className="flex-1 text-center sm:text-left">
            <h1 className="font-display text-2xl font-bold text-gold-100">
              {sellerUser.name}
            </h1>
            {sellerUser.city && (
              <p className="mt-1 flex items-center justify-center gap-1 text-sm text-gold-200/40 sm:justify-start">
                <MapPin size={14} /> {sellerUser.city}
              </p>
            )}
            {sellerUser.bio && (
              <p className="mt-3 text-sm leading-relaxed text-gold-200/50">
                {sellerUser.bio}
              </p>
            )}

            {/* Stats */}
            <div className="mt-4 flex items-center justify-center gap-6 sm:justify-start">
              <div className="flex items-center gap-1.5 text-sm">
                <Package size={15} className="text-gold-400/60" />
                <span className="font-semibold text-gold-100">{sellerSplits.length}</span>
                <span className="text-gold-200/40">split</span>
              </div>
              {totalReviews > 0 && (
                <div className="flex items-center gap-1.5 text-sm">
                  <Star size={15} className="text-gold-400/60" />
                  <span className="font-semibold text-gold-100">{avgRating.toFixed(1)}</span>
                  <span className="text-gold-200/40">({totalReviews} review)</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Seller's Splits */}
      <div className="mt-10">
        <h2 className="font-display text-xl font-bold text-gold-100">
          Listing dari {sellerUser.name.split(" ")[0]}
        </h2>

        {sellerSplits.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-gold-900/25 py-16 text-center">
            <Package size={44} className="mx-auto text-gold-800/30" />
            <p className="mt-4 text-gold-200/40">Belum ada listing.</p>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
            {sellerSplits.map((split) => (
              <div key={split.id} className="relative">
                {isOwner && split.is_hidden && (
                  <div className="absolute left-3 top-3 z-10 flex items-center gap-1 rounded-lg bg-orange-500/90 px-2 py-1 text-[10px] font-semibold text-white">
                    <EyeOff size={10} /> Disembunyikan
                  </div>
                )}
                <div className={split.is_hidden ? "opacity-50" : ""}>
                  <SplitCard split={split} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
