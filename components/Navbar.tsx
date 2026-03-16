"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { motion, AnimatePresence } from "framer-motion";
import {
  LogOut,
  Package,
  PlusCircle,
  Store,
  Compass,
  LogIn,
  Droplets,
  ArrowLeft,
  UserCircle,
  Bookmark,
  ShoppingCart,
} from "lucide-react";
import { CartButton } from "@/components/CartButton";
import { setCartUserId } from "@/lib/cart";

export function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [supabase] = useState(() => createClient());
  const pathname = usePathname();
  const isAdminPage = pathname.startsWith("/admin");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setCartUserId(data.user?.id ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setCartUserId(session?.user?.id ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  async function handleLogin() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setUser(null);
    window.location.href = "/";
  }

  const navItems = user && !isAdminPage
    ? [
        { href: "/", label: "Jelajahi", icon: Compass },
        { href: "/create-split", label: "Buat Split", icon: PlusCircle },
        { href: "/wishlist", label: "Wishlist", icon: Bookmark },
        { href: "/cart", label: "Keranjang", icon: ShoppingCart },
        { href: "/orders", label: "Pesanan", icon: Package },
        { href: `/seller/${user.id}`, label: "Toko Saya", icon: Store },
        { href: "/profile", label: "Profil", icon: UserCircle },
      ]
    : [
        { href: "/", label: "Jelajahi", icon: Compass },
      ];

  return (
    <>
      {/* Desktop Navbar */}
      <nav className="sticky top-0 z-50 hidden border-b border-gold-900/30 bg-surface-400/90 backdrop-blur-xl md:block">
        <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between px-4">
          <Link href="/" className="font-display text-2xl font-bold tracking-wide text-gold-400">
            wangiverse
          </Link>

          <div className="flex items-center gap-1">
            {[
              { href: "/", label: "Jelajahi" },
              ...(user && !isAdminPage
                ? [
                    { href: "/create-split", label: "Buat Split" },
                    { href: "/wishlist", label: "Wishlist" },
                    { href: "/orders", label: "Pesanan" },
                    { href: `/seller/${user.id}`, label: "Toko Saya" },
                    { href: "/profile", label: "Profil" },
                  ]
                : []),
            ].map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-gold-400/15 text-gold-400"
                      : "text-gold-200/70 hover:bg-gold-900/30 hover:text-gold-400"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
            {user ? (
              <div className="flex items-center gap-3">
                <CartButton />
                {user.user_metadata?.avatar_url && (
                  <Image
                    src={user.user_metadata.avatar_url}
                    alt="Avatar"
                    width={32}
                    height={32}
                    className="rounded-full ring-1 ring-gold-700/50"
                  />
                )}
                <span className="text-sm font-medium text-gold-200">
                  {user.user_metadata?.full_name?.split(" ")[0]}
                </span>
                <button
                  onClick={handleLogout}
                  className="rounded-lg p-2 text-gold-200/50 transition-colors hover:bg-gold-900/30 hover:text-gold-400"
                >
                  <LogOut size={18} />
                </button>
              </div>
            ) : (
              <button
                onClick={handleLogin}
                className="btn-gold rounded-lg px-5 py-2.5 text-sm font-semibold text-surface-400"
              >
                Masuk
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile: Floating Logo + Back Button */}
      <div className="fixed left-4 top-4 z-[100] flex items-center gap-2 md:hidden">
        {pathname !== "/" && (
          <button
            onClick={() => window.history.back()}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-gold-700/20 bg-surface-400/80 shadow-lg backdrop-blur-xl transition-colors hover:border-gold-700/40"
          >
            <ArrowLeft size={16} className="text-gold-200/70" />
          </button>
        )}
        <Link
          href="/"
          className="flex items-center gap-1.5 rounded-full border border-gold-700/20 bg-surface-400/80 px-4 py-2 shadow-lg backdrop-blur-xl"
        >
          <Droplets size={16} className="text-gold-400" />
          <span className="font-display text-sm font-bold tracking-wide text-gold-400">
            wangiverse
          </span>
        </Link>
      </div>

      {/* Mobile: Floating Action Button */}
      <div className="md:hidden">
        <motion.button
          drag
          dragMomentum={false}
          whileTap={{ scale: 0.9 }}
          onClick={() => setMenuOpen(!menuOpen)}
          animate={{
            boxShadow: menuOpen
              ? "0 0 20px rgba(212, 175, 55, 0.4)"
              : [
                  "0 0 0px rgba(212, 175, 55, 0)",
                  "0 0 15px rgba(212, 175, 55, 0.3)",
                  "0 0 0px rgba(212, 175, 55, 0)",
                ],
          }}
          transition={{
            boxShadow: {
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
            },
          }}
          className={`fixed bottom-24 right-5 z-[150] flex h-14 w-14 touch-none items-center justify-center rounded-full border-2 shadow-2xl backdrop-blur-xl transition-colors ${
            menuOpen
              ? "border-gold-400 bg-surface-300/90"
              : "border-gold-700/30 bg-surface-400/80"
          }`}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold-400/10">
            <div className="h-6 w-6 animate-pulse rounded-full bg-gold-400/80" />
          </div>
        </motion.button>

        <AnimatePresence>
          {menuOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMenuOpen(false)}
                className="fixed inset-0 z-[105] bg-black/50 backdrop-blur-sm"
              />

              {/* Menu Panel */}
              <motion.div
                initial={{ scale: 0, opacity: 0, y: 100, x: 50 }}
                animate={{ scale: 1, opacity: 1, y: 0, x: 0 }}
                exit={{ scale: 0, opacity: 0, y: 100, x: 50 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="fixed bottom-40 right-5 z-[110] min-w-[250px] rounded-3xl border border-gold-700/20 bg-surface-300/95 p-5 shadow-2xl backdrop-blur-xl"
              >
                {/* User info */}
                {user && (
                  <div className="mb-4 flex items-center gap-3 border-b border-gold-900/15 pb-4">
                    {user.user_metadata?.avatar_url ? (
                      <Image
                        src={user.user_metadata.avatar_url}
                        alt="Avatar"
                        width={36}
                        height={36}
                        className="rounded-full ring-1 ring-gold-700/30"
                      />
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gold-400/10 ring-1 ring-gold-700/30">
                        <Droplets size={16} className="text-gold-400" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gold-100">
                        {user.user_metadata?.full_name || "User"}
                      </p>
                      <p className="truncate text-[11px] text-gold-200/40">
                        {user.email}
                      </p>
                    </div>
                  </div>
                )}

                {/* Nav items grid */}
                <div className="grid grid-cols-2 gap-2.5">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMenuOpen(false)}
                        className={`flex flex-col items-center justify-center gap-2 rounded-2xl p-3.5 transition-all ${
                          isActive
                            ? "bg-gold-400/20 text-gold-400 ring-1 ring-gold-400/30"
                            : "bg-surface-200/60 text-gold-200/50 hover:bg-surface-200 hover:text-gold-200/70"
                        }`}
                      >
                        <Icon size={22} />
                        <span className="text-center text-[10px] font-semibold uppercase tracking-wider">
                          {item.label}
                        </span>
                      </Link>
                    );
                  })}

                  {/* Login / Logout button */}
                  {user ? (
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        handleLogout();
                      }}
                      className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-red-500/10 p-3.5 text-red-400 transition-all hover:bg-red-500/20"
                    >
                      <LogOut size={22} />
                      <span className="text-center text-[10px] font-semibold uppercase tracking-wider">
                        Keluar
                      </span>
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        handleLogin();
                      }}
                      className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-gold-400/15 p-3.5 text-gold-400 transition-all hover:bg-gold-400/25"
                    >
                      <LogIn size={22} />
                      <span className="text-center text-[10px] font-semibold uppercase tracking-wider">
                        Masuk
                      </span>
                    </button>
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
