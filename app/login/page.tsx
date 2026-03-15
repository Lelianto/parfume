"use client";

import { createClient } from "@/lib/supabase/client";
import { Droplets } from "lucide-react";

export default function LoginPage() {
  async function handleLogin() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  return (
    <div className="relative flex min-h-[calc(100vh-72px)] items-center justify-center px-4">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-[400px] w-[400px] rounded-full bg-gold-400/5 blur-[100px]" />
      </div>

      <div className="relative w-full max-w-sm text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-gold-700/30 bg-gold-400/10">
          <Droplets size={28} className="text-gold-400" />
        </div>
        <h1 className="mt-6 font-display text-3xl font-bold text-gold-100">
          Masuk ke wangiverse
        </h1>
        <p className="mt-2 text-sm text-gold-200/40">
          Gabung split parfum premium dengan harga terjangkau
        </p>
        <button
          onClick={handleLogin}
          className="mt-8 flex w-full items-center justify-center gap-3 rounded-xl border border-gold-900/40 bg-surface-200 px-4 py-3.5 text-sm font-medium text-gold-100 transition-all hover:border-gold-700/50 hover:bg-surface-50"
        >
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Masuk dengan Google
        </button>
      </div>
    </div>
  );
}
