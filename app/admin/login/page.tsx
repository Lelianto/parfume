"use client";

import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ShieldCheck } from "lucide-react";
import { Suspense } from "react";

function AdminLoginContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const supabase = createClient();

  async function handleLogin() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?redirectTo=/admin/dashboard` },
    });
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gold-400/10">
            <ShieldCheck size={28} className="text-gold-400" />
          </div>
          <h1 className="mt-4 font-display text-2xl font-bold text-gold-100">Admin Panel</h1>
          <p className="mt-1 text-sm text-gold-200/40">Wangiverse Administration</p>
        </div>

        {error === "not_admin" && (
          <div className="mt-6 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-center text-sm text-red-400">
            Akun ini tidak memiliki akses admin.
          </div>
        )}

        <button
          onClick={handleLogin}
          className="btn-gold mt-8 w-full rounded-xl py-3.5 text-sm font-semibold text-surface-400"
        >
          Masuk dengan Google
        </button>

        <p className="mt-4 text-center text-xs text-gold-200/25">
          Hanya akun yang terdaftar sebagai admin yang dapat mengakses.
        </p>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense>
      <AdminLoginContent />
    </Suspense>
  );
}
