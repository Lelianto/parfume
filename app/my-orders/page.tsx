import { redirect } from "next/navigation";

export default function MyOrdersPage() {
  redirect("/orders?tab=purchases");
}
