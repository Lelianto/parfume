import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/Navbar";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Wangiverse - Split Parfum Premium",
  description:
    "Platform split parfum original premium. Nikmati wangi mewah dengan harga terjangkau.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
      </head>
      <body>
        <Navbar />
        <main className="min-h-[calc(100vh-72px)]">{children}</main>
      </body>
    </html>
  );
}
