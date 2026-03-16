import Link from "next/link";
import Image from "next/image";
import { ProgressBar } from "./ProgressBar";
import { SplitStatusBadge } from "./StatusBadge";
import { WishlistButton } from "./WishlistButton";
import type { Split } from "@/types/database";
import { Droplets, Star } from "lucide-react";
import { formatRupiah } from "@/lib/utils";

interface SplitCardProps {
  split: Split;
  isLoggedIn?: boolean;
  wishlisted?: boolean;
}

export function SplitCard({ split, isLoggedIn = false, wishlisted = false }: SplitCardProps) {
  const variants = split.variants ?? [];
  const sortedVariants = [...variants].sort((a, b) => a.size_ml - b.size_ml);
  const hasVariants = sortedVariants.length > 0;

  const totalSold = hasVariants ? variants.reduce((s, v) => s + v.sold, 0) : split.filled_slots;
  const totalStock = hasVariants ? variants.reduce((s, v) => s + v.stock, 0) : split.total_slots;
  const minPrice = hasVariants ? Math.min(...variants.map((v) => v.price)) : split.price_per_slot;
  const maxPrice = hasVariants ? Math.max(...variants.map((v) => v.price)) : split.price_per_slot;

  const hasRating = split.avg_rating != null && (split.review_count ?? 0) > 0;

  return (
    <Link href={`/split/${split.id}`}>
      <div className="card-hover group flex h-full flex-col overflow-hidden rounded-[1.25rem] border border-gold-900/20 bg-surface-200/70">
        {/* Image */}
        <div className="relative aspect-[4/5] overflow-hidden bg-surface-300">
          {split.bottle_photo_url ? (
            <Image
              src={split.bottle_photo_url}
              alt={split.perfume?.name ?? "Parfum"}
              fill
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-gold-800/20">
              <Droplets size={44} />
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-surface-400/60 to-transparent" />

          {/* Top-right: wishlist + status */}
          <div className="absolute right-3 top-3 flex items-center gap-1.5">
            <WishlistButton
              splitId={split.id}
              initialWishlisted={wishlisted}
              isLoggedIn={isLoggedIn}
            />
            <SplitStatusBadge status={split.status} />
          </div>

          {/* Rating badge — bottom left of image */}
          {hasRating && (
            <div className="absolute bottom-3 left-3 flex items-center gap-1 rounded-lg bg-black/60 px-2 py-1 backdrop-blur-sm">
              <Star size={11} className="fill-gold-400 text-gold-400" />
              <span className="text-[11px] font-semibold text-gold-200">
                {split.avg_rating!.toFixed(1)}
              </span>
              <span className="text-[10px] text-gold-200/50">
                ({split.review_count})
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col p-3 sm:p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-gold-400/60 sm:text-[11px]">
            {split.perfume?.brand}
          </p>
          <h3 className="mt-0.5 line-clamp-2 font-display text-sm font-semibold leading-snug text-gold-100 sm:mt-1 sm:text-[1.1rem]">
            {split.perfume?.name}
            {split.perfume?.variant && (
              <span className="text-gold-200/50"> — {split.perfume.variant}</span>
            )}
          </h3>

          {/* Concentration badge */}
          {split.perfume?.concentration && (
            <span className="mt-1.5 inline-block rounded-full bg-gold-400/10 px-2 py-0.5 text-[10px] font-semibold text-gold-400">
              {split.perfume.concentration}
            </span>
          )}

          {/* Size pills */}
          {hasVariants && (
            <div className="mt-2 flex flex-wrap gap-1">
              {sortedVariants.map((v) => (
                <span
                  key={v.id}
                  className="rounded-md bg-surface-300 px-1.5 py-0.5 text-[10px] font-medium text-gold-200/50 ring-1 ring-gold-900/15"
                >
                  {v.size_ml}ml
                </span>
              ))}
            </div>
          )}

          {!hasVariants && (
            <p className="mt-1.5 text-xs text-gold-200/30">
              {split.split_size_ml}ml / {split.bottle_size_ml}ml
            </p>
          )}

          <div className="mt-3 sm:mt-4">
            <ProgressBar filled={totalSold} total={totalStock} size="sm" />
          </div>

          <div className="mt-auto pt-3 sm:pt-4">
            {hasVariants && minPrice !== maxPrice ? (
              <>
                <p className="font-display text-base font-bold tracking-tight text-gold-400 sm:text-xl">
                  {formatRupiah(minPrice)}
                </p>
                <p className="mt-0.5 text-[10px] text-gold-200/25 sm:text-[11px]">
                  {sortedVariants[0].size_ml}ml — {sortedVariants[sortedVariants.length - 1].size_ml}ml
                </p>
              </>
            ) : (
              <>
                <p className="font-display text-base font-bold tracking-tight text-gold-400 sm:text-xl">
                  {formatRupiah(minPrice)}
                </p>
                <p className="mt-0.5 text-[10px] text-gold-200/25 sm:text-[11px]">
                  {hasVariants ? `per ${sortedVariants[0].size_ml}ml` : "per slot"}
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
