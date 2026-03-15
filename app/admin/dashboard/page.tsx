import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AdminDashboardClient } from "./AdminDashboardClient";
import type { Order, Split, PlatformSettings } from "@/types/database";

export const revalidate = 0;

export interface AdminOrder extends Order {
  split: Split & { creator?: { name: string; email: string; bank_name: string | null; bank_account_number: string | null; bank_account_name: string | null } };
  user?: { name: string; avatar_url: string | null; email: string };
}

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/admin/login");

  // Verify admin
  const { count } = await supabase
    .from("admin_users")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  if (!count || count === 0) redirect("/admin/login?error=not_admin");

  const [{ data: orders }, { data: platformSettings }] = await Promise.all([
    supabase
      .from("orders")
      .select("*, split:splits(*, perfume:perfumes(*), creator:users!splits_created_by_fkey(name, email, bank_name, bank_account_number, bank_account_name)), user:users(name, avatar_url, email)")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("platform_settings")
      .select("*")
      .eq("id", 1)
      .single(),
  ]);

  return (
    <AdminDashboardClient
      orders={(orders ?? []) as unknown as AdminOrder[]}
      platformSettings={platformSettings as unknown as PlatformSettings | null}
    />
  );
}
