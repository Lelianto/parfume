"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bookmark } from "lucide-react";

interface WishlistButtonProps {
  splitId: string;
  initialWishlisted: boolean;
  isLoggedIn: boolean;
}

export function WishlistButton({ splitId, initialWishlisted, isLoggedIn }: WishlistButtonProps) {
  const [wishlisted, setWishlisted] = useState(initialWishlisted);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleToggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (!isLoggedIn) {
      router.push("/login?redirectTo=/");
      return;
    }

    setLoading(true);
    setWishlisted((prev) => !prev);

    try {
      const res = await fetch("/api/wishlist", {
        method: wishlisted ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ split_id: splitId }),
      });
      if (!res.ok) setWishlisted((prev) => !prev);
    } catch {
      setWishlisted((prev) => !prev);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      aria-label={wishlisted ? "Hapus dari wishlist" : "Tambah ke wishlist"}
      className={`flex h-8 w-8 items-center justify-center rounded-full backdrop-blur-sm transition-all ${
        wishlisted
          ? "bg-gold-400/90 text-surface-400"
          : "bg-black/40 text-gold-200/70 hover:bg-black/60 hover:text-gold-400"
      }`}
    >
      <Bookmark size={15} className={wishlisted ? "fill-current" : ""} />
    </button>
  );
}
