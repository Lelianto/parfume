import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { SplitGrid } from "@/components/SplitGrid";
import { Bookmark, Droplets } from "lucide-react";
import type { Split } from "@/types/database";

export const revalidate = 0;

export default async function WishlistPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirectTo=/wishlist");

  const { data: wishlists } = await supabase
    .from("wishlists")
    .select("split_id, split:splits(*, perfume:perfumes(*), variants:split_variants(*))")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const splits = (wishlists ?? [])
    .map((w) => w.split)
    .filter((s): s is Split => !!s && !!s.perfume && !s.is_hidden);

  const wishlistedIds = splits.map((s) => s.id);

  return (
    <div className="mx-auto max-w-[1410px] px-4 pb-8 pt-20 sm:px-8 md:pt-8">
      <div className="flex items-center gap-3">
        <Bookmark size={22} className="text-gold-400" />
        <h1 className="font-display text-2xl font-bold text-gold-100">Wishlist Saya</h1>
      </div>
      <p className="mt-1 text-sm text-gold-200/40">Split yang kamu simpan untuk dibeli nanti.</p>

      {splits.length === 0 ? (
        <div className="mt-12 rounded-2xl border border-dashed border-gold-900/30 py-20 text-center">
          <Droplets size={48} className="mx-auto text-gold-800/30" />
          <p className="mt-4 text-gold-200/50">Wishlist kamu masih kosong.</p>
          <p className="mt-1 text-sm text-gold-200/30">
            Tekan ikon bookmark di card parfum untuk menyimpannya.
          </p>
          <Link
            href="/"
            className="btn-gold mt-6 inline-block rounded-lg px-6 py-2.5 text-sm font-medium text-surface-400"
          >
            Jelajahi Split
          </Link>
        </div>
      ) : (
        <SplitGrid splits={splits} isLoggedIn={true} wishlistedIds={wishlistedIds} />
      )}
    </div>
  );
}
