import { redirect } from "next/navigation";

export default function SellerOrdersPage() {
  redirect("/orders?tab=sales");
}
