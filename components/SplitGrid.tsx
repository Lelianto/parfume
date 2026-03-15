"use client";

import { useState } from "react";
import { SplitCard } from "./SplitCard";
import { Droplets } from "lucide-react";
import type { Split } from "@/types/database";

const PAGE_SIZE = 8;

// Skeleton card — mirrors SplitCard structure
function SplitCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-[1.25rem] border border-gold-900/20 bg-surface-200/70">
      {/* Image skeleton */}
      <div className="aspect-[4/5] animate-pulse bg-surface-300" />
      {/* Content skeleton */}
      <div className="p-3 sm:p-5">
        <div className="h-2.5 w-16 animate-pulse rounded-full bg-gold-900/30" />
        <div className="mt-2 h-4 w-3/4 animate-pulse rounded-full bg-gold-900/20" />
        <div className="mt-1 h-4 w-1/2 animate-pulse rounded-full bg-gold-900/20" />
        <div className="mt-3 h-2 w-full animate-pulse rounded-full bg-gold-900/15" />
        <div className="mt-4 h-5 w-24 animate-pulse rounded-full bg-gold-900/25" />
        <div className="mt-1 h-2.5 w-16 animate-pulse rounded-full bg-gold-900/15" />
      </div>
    </div>
  );
}

interface SplitGridProps {
  splits: Split[];
  isLoggedIn?: boolean;
  wishlistedIds?: string[];
  loading?: boolean;
}

export function SplitGrid({
  splits,
  isLoggedIn = false,
  wishlistedIds = [],
  loading = false,
}: SplitGridProps) {
  const [visible, setVisible] = useState(PAGE_SIZE);

  // Show skeletons while loading
  if (loading) {
    return (
      <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <SplitCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (splits.length === 0) {
    return (
      <div className="mt-10 rounded-2xl border border-dashed border-gold-900/25 py-20 text-center">
        <Droplets size={44} className="mx-auto text-gold-800/30" />
        <p className="mt-4 text-gold-200/40">Belum ada split tersedia.</p>
        <p className="mt-1 text-sm text-gold-200/25">Jadilah yang pertama membuat split!</p>
      </div>
    );
  }

  const shown = splits.slice(0, visible);
  const hasMore = visible < splits.length;

  return (
    <>
      <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
        {shown.map((split) => (
          <SplitCard
            key={split.id}
            split={split}
            isLoggedIn={isLoggedIn}
            wishlisted={wishlistedIds.includes(split.id)}
          />
        ))}
      </div>

      {hasMore && (
        <div className="mt-8 text-center">
          <button
            onClick={() => setVisible((v) => v + PAGE_SIZE)}
            className="inline-flex items-center gap-2 rounded-xl border border-gold-700/30 bg-gold-400/5 px-8 py-3 text-sm font-medium text-gold-400 transition-colors hover:bg-gold-400/10"
          >
            Muat Lebih Banyak
          </button>
          <p className="mt-2 text-xs text-gold-200/30">
            Menampilkan {shown.length} dari {splits.length} produk
          </p>
        </div>
      )}
    </>
  );
}
