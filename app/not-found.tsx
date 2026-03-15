import Link from "next/link";
import { Droplets } from "lucide-react";

export default function NotFound() {
  return (
    <div className="relative flex min-h-[calc(100vh-72px)] flex-col items-center justify-center px-4 text-center">
      {/* Glow */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-[400px] w-[400px] rounded-full bg-gold-400/[0.04] blur-[120px]" />
      </div>

      <div className="relative">
        {/* Icon */}
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl border border-gold-700/20 bg-gold-400/5">
          <Droplets size={36} className="text-gold-400/60" />
        </div>

        {/* 404 */}
        <p className="mt-8 font-display text-[96px] font-bold leading-none tracking-[-0.04em] text-gold-900/40">
          404
        </p>

        <h1 className="mt-2 font-display text-2xl font-bold text-gold-100">
          Halaman tidak ditemukan
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-gold-200/40">
          Halaman yang kamu cari mungkin sudah dihapus, dipindah, atau tidak pernah ada.
        </p>

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="btn-gold rounded-xl px-8 py-3 text-sm font-semibold text-surface-400"
          >
            Jelajahi Split
          </Link>
          <Link
            href="/my-orders"
            className="rounded-xl border border-gold-900/30 px-8 py-3 text-sm font-medium text-gold-200/60 transition-colors hover:border-gold-700/40 hover:text-gold-200"
          >
            Pesanan Saya
          </Link>
        </div>
      </div>
    </div>
  );
}
