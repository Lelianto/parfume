"use client";

import { useState } from "react";
import { SplitCard } from "./SplitCard";
import { Droplets } from "lucide-react";
import type { Split } from "@/types/database";

const PAGE_SIZE = 8;

export function SplitGrid({ splits }: { splits: Split[] }) {
  const [visible, setVisible] = useState(PAGE_SIZE);

  const shown = splits.slice(0, visible);
  const hasMore = visible < splits.length;

  if (splits.length === 0) {
    return (
      <div className="mt-10 rounded-2xl border border-dashed border-gold-900/25 py-20 text-center">
        <Droplets size={44} className="mx-auto text-gold-800/30" />
        <p className="mt-4 text-gold-200/40">Belum ada split tersedia.</p>
        <p className="mt-1 text-sm text-gold-200/25">
          Jadilah yang pertama membuat split!
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
        {shown.map((split) => (
          <SplitCard key={split.id} split={split} />
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
