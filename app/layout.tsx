import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Navbar } from "@/components/Navbar";

export const dynamic = "force-dynamic";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  icons: { icon: "/icon.svg" },
  title: "Wangiverse - Split Parfum Premium",
  description:
    "Platform split parfum original premium. Nikmati wangi mewah dengan harga terjangkau.",
  metadataBase: new URL("https://wangiverse.com"),
  openGraph: {
    title: "Wangiverse - Split Parfum Premium",
    description: "Platform split parfum original premium. Nikmati wangi mewah dengan harga terjangkau.",
    siteName: "Wangiverse",
    locale: "id_ID",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Wangiverse - Split Parfum Premium",
    description: "Platform split parfum original premium. Nikmati wangi mewah dengan harga terjangkau.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body>
        <Navbar />
        <main className="min-h-[calc(100vh-72px)]">{children}</main>
      </body>
    </html>
  );
}
