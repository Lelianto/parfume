"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { getCartCount } from "@/lib/cart";

export function CartButton() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    setCount(getCartCount());

    function handleUpdate() {
      setCount(getCartCount());
    }

    window.addEventListener("cart-updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("cart-updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  if (count === 0) return null;

  return (
    <Link
      href="/cart"
      className="relative rounded-lg p-2 text-gold-200/50 transition-colors hover:bg-gold-900/30 hover:text-gold-400"
    >
      <ShoppingCart size={20} />
      <span className="absolute -right-0.5 -top-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-gold-400 px-1 text-[10px] font-bold text-surface-400">
        {count}
      </span>
    </Link>
  );
}
