import { redirect } from "next/navigation";

export default function SellerBalancePage() {
  redirect("/profile?tab=balance");
}
