# Wangiverse — Perfume Split E-Commerce Platform

Wangiverse adalah platform e-commerce untuk **perfume splitting** — sebuah konsep di mana satu botol parfum original dibagi (decant) ke dalam beberapa ukuran kecil yang lebih terjangkau. Platform ini menghubungkan **seller** yang memiliki parfum original dengan **buyer** yang ingin mencoba berbagai wangi tanpa membeli botol penuh.

> **Live:** [wangiverse-505068814357.asia-southeast1.run.app](https://wangiverse-505068814357.asia-southeast1.run.app)

---

## Daftar Isi

- [Tech Stack](#tech-stack)
- [Arsitektur](#arsitektur)
- [Fitur Utama](#fitur-utama)
- [Struktur Project](#struktur-project)
- [Database Schema](#database-schema)
- [API Routes](#api-routes)
- [Integrasi Pihak Ketiga](#integrasi-pihak-ketiga)
- [Alur Bisnis](#alur-bisnis)
- [Environment Variables](#environment-variables)
- [Setup & Development](#setup--development)
- [Deployment](#deployment)
- [Migrations](#migrations)

---

## Tech Stack

| Layer | Teknologi |
|-------|-----------|
| **Framework** | Next.js 15.3 (App Router, Turbopack) |
| **Language** | TypeScript 5.8 |
| **UI** | React 19, Tailwind CSS 4 |
| **Icons** | Lucide React |
| **Animation** | Framer Motion |
| **Rich Text** | Tiptap (link, placeholder, font-size) |
| **Sanitization** | DOMPurify |
| **Theming** | next-themes (dark/light mode) |
| **Auth & DB** | Supabase (Auth, PostgreSQL, Storage, RLS) |
| **Shipping** | RajaOngkir v2 API |
| **Payment** | Komerce Payment API (VA, QRIS) — feature toggle |
| **Delivery** | Komerce Delivery API — feature toggle |
| **Deployment** | GCP Cloud Run + Cloud Build |
| **Container** | Docker (Node 22 Alpine, multi-stage) |

---

## Arsitektur

```
┌─────────────────────────────────────────────────┐
│                    Client                        │
│  Next.js App Router (Server + Client Components) │
└──────────────────┬──────────────────────────────┘
                   │
         ┌─────────┼─────────┐
         ▼         ▼         ▼
   ┌──────────┐ ┌──────┐ ┌──────────┐
   │ Supabase │ │ API  │ │ Storage  │
   │   Auth   │ │Routes│ │ (Images) │
   └──────────┘ └──┬───┘ └──────────┘
                   │
         ┌─────────┼──────────┬──────────┐
         ▼         ▼          ▼          ▼
   ┌──────────┐ ┌──────────┐ ┌────────┐ ┌────────┐
   │ Supabase │ │RajaOngkir│ │Komerce │ │Komerce │
   │PostgreSQL│ │ Shipping │ │Payment │ │Delivery│
   │  + RLS   │ │ & Track  │ │VA/QRIS │ │Shipment│
   └──────────┘ └──────────┘ └────────┘ └────────┘
```

### Pola Desain

- **Server Components** — Default untuk semua page, data fetching di server
- **Client Components** — Hanya untuk interaktivitas (form, modal, state)
- **Row-Level Security (RLS)** — Semua tabel dilindungi, user hanya akses data sendiri
- **Escrow System** — Pembayaran ditahan hingga buyer konfirmasi terima
- **Dual Cart Persistence** — localStorage (responsif) + Database (cross-device sync)
- **Feature Toggles** — Komerce payment & delivery bisa di-enable/disable via `platform_features`
- **Caching** — Tracking AWB di-cache 3 jam di database, quota 500 call/bulan

---

## Fitur Utama

### Untuk Buyer

| Fitur | Deskripsi |
|-------|-----------|
| **Browse & Discover** | Jelajahi parfum dengan filter brand, harga, konsentrasi, scent family, gender, tipe brand |
| **Full-Text Search** | Cari parfum berdasarkan nama, brand, atau deskripsi |
| **Split Detail** | Galeri foto (max 4 + batch code), video decant inline, info fragrance notes, review |
| **Photo Lightbox** | Zoom foto produk & batch code dalam popup fullscreen |
| **Wishlist** | Simpan parfum favorit untuk dibeli nanti |
| **Shopping Cart** | Keranjang belanja dengan pengelompokan per seller, sync antar perangkat |
| **Multi-Seller Checkout** | Checkout beberapa seller sekaligus dalam 1 pembayaran (ala Shopee/Tokopedia) |
| **Pilih Kurir & Ongkir** | Pilih dari JNE, J&T, SiCepat, AnterAja, dll. via RajaOngkir |
| **Payment** | Transfer manual (upload bukti) atau otomatis via VA/QRIS |
| **Order Tracking** | Lacak pengiriman real-time dengan UI Shopee-style (step indicator + timeline) |
| **Auto-Fetch Tracking** | Status pengiriman otomatis dimuat saat buka halaman pesanan |
| **Konfirmasi Terima** | Konfirmasi pesanan diterima, atau otomatis selesai 2 hari setelah dikirim |
| **Review & Rating** | Beri rating 1-5 bintang + komentar setelah pesanan selesai |
| **Pesan Ulang** | Button reorder langsung dari halaman pesanan |
| **Rekomendasi Produk** | Lihat produk lain dari seller yang sama |

### Untuk Seller

| Fitur | Deskripsi |
|-------|-----------|
| **Buat Split** | Wizard 3 langkah: info parfum, konfigurasi variant, foto & autentikasi |
| **Multi-Photo Upload** | Upload hingga 4 foto produk + 1 foto batch code + 1 video decant |
| **Variant Management** | Buat variant ukuran (5ml, 10ml, dst.) dengan harga & stok masing-masing |
| **Rich Text Description** | Editor deskripsi dengan formatting (bold, italic, link, font size) |
| **Fragrance Notes** | Input top, middle, base notes untuk setiap parfum |
| **Order Management** | Dashboard pesanan masuk dengan filter status |
| **Konfirmasi & Kirim** | Konfirmasi pesanan → proses decant → input resi → kirim |
| **Balance & Withdrawal** | Pantau saldo, total pendapatan, dan ajukan penarikan dana |
| **Profil Toko** | Halaman toko publik dengan rating dan daftar produk |

### Untuk Admin

| Fitur | Deskripsi |
|-------|-----------|
| **Payment Verification** | Verifikasi bukti transfer dari buyer |
| **Withdrawal Management** | Approve/reject permintaan penarikan dana seller |
| **Platform Settings** | Atur rekening bank platform, fee, dll. |
| **Form Options** | Kelola dropdown brand, konsentrasi, scent family |
| **RajaOngkir Import** | Import data kota dari RajaOngkir untuk lookup ongkir |

### Sistem & Infrastruktur

| Fitur | Deskripsi |
|-------|-----------|
| **Cron Auto-Complete** | Otomatis selesaikan pesanan yang sudah dikirim 2+ hari |
| **Cron Cancel Expired** | Otomatis batalkan pesanan yang belum dibayar setelah deadline |
| **Tracking Cache** | Cache hasil tracking 3 jam, quota 500 call/bulan |
| **Escrow** | Dana ditahan hingga buyer konfirmasi, baru masuk saldo seller |
| **RLS Security** | Row-Level Security di semua tabel database |
| **OAuth** | Login via Google/GitHub |

---

## Struktur Project

```
parfume/
├── app/
│   ├── layout.tsx                    # Root layout (Navbar, ThemeProvider)
│   ├── page.tsx                      # Homepage (hero, listings)
│   ├── globals.css                   # Global styles & Tailwind
│   │
│   ├── login/                        # OAuth login page
│   ├── profile/                      # User profile editor
│   ├── cart/                         # Shopping cart
│   │   ├── page.tsx                  # Server: fetch cart data
│   │   └── CartClient.tsx            # Client: cart UI & interactions
│   ├── wishlist/                     # Saved parfums
│   │
│   ├── create-split/                 # Seller: buat listing baru
│   ├── edit-split/[id]/             # Seller: edit listing
│   ├── split/[id]/                   # Split detail page
│   │   ├── page.tsx                  # Server: fetch split data
│   │   ├── SplitDetailClient.tsx     # Client: galeri, review, add-to-cart
│   │   └── opengraph-image/          # Dynamic OG image
│   │
│   ├── checkout/[id]/               # Multi-seller checkout detail
│   ├── order-group/[id]/            # Single-seller order group (legacy)
│   ├── orders/                       # Unified orders page (buyer + seller tabs)
│   │   ├── page.tsx                  # Server: fetch all orders
│   │   └── OrdersClient.tsx          # Client: tabs, filters, order cards
│   ├── my-orders/                    # Buyer order list (legacy)
│   │   └── [id]/                     # Order detail + tracking + payment
│   │
│   ├── seller/
│   │   ├── [id]/                     # Public seller profile
│   │   ├── orders/                   # Seller incoming orders
│   │   │   └── [id]/                 # Seller order detail (konfirmasi, input resi)
│   │   └── balance/                  # Saldo & withdrawal
│   │
│   ├── admin/
│   │   ├── login/                    # Admin authentication
│   │   ├── dashboard/                # Admin panel
│   │   └── form-options/             # Manage dropdown options
│   │
│   └── api/
│       ├── auth/callback/            # OAuth callback handler
│       ├── address/                   # Province/city/district lookup
│       ├── cart/                      # Cart CRUD (GET, POST, PATCH, DELETE)
│       ├── checkout/                  # Create multi-seller checkout
│       │   └── [id]/payment-proof/   # Upload bukti bayar checkout
│       ├── orders/
│       │   ├── group/                # Create order group
│       │   │   └── [id]/             # Shipping cost & choice, payment proof
│       │   └── [id]/
│       │       ├── status/           # Update order status (seller)
│       │       ├── shipping-cost/    # Get ongkir options
│       │       ├── shipping-choice/  # Select courier
│       │       ├── payment-proof/    # Upload bukti bayar
│       │       └── confirm-received/ # Buyer confirms receipt
│       ├── payment/                   # Komerce: create VA/QRIS, status, webhook
│       ├── delivery/                  # Komerce: shipment, pickup, label
│       ├── tracking/[awb]/           # AWB tracking (cached, RajaOngkir)
│       ├── splits/[id]/             # Update split
│       ├── wishlist/                  # Wishlist CRUD
│       ├── seller/
│       │   ├── balance/              # Get seller balance
│       │   └── withdrawals/          # Request withdrawal
│       ├── admin/                     # Admin operations
│       │   ├── orders/[id]/verify/   # Verify payment
│       │   ├── orders/[id]/disburse/ # Process payout
│       │   ├── withdrawals/          # Manage withdrawals
│       │   ├── form-options/         # Manage dropdowns
│       │   ├── settings/             # Platform settings
│       │   ├── seed-form-options/    # Seed initial data
│       │   └── seed-rajaongkir/      # Import city data
│       └── cron/orders/              # Scheduled: auto-complete & cancel expired
│
├── components/
│   ├── Navbar.tsx                    # Navigation bar
│   ├── ThemeProvider.tsx             # Dark/light mode
│   ├── ThemeToggle.tsx               # Theme toggle button
│   ├── SearchFilter.tsx              # Advanced search filters
│   ├── HomeListings.tsx              # Homepage grid
│   ├── SplitCard.tsx                 # Product card
│   ├── SplitGrid.tsx                 # Grid layout
│   ├── JoinSplitModal.tsx            # Add to cart modal
│   ├── AddToCartModal.tsx            # Quick add modal
│   ├── CartButton.tsx                # Cart action button
│   ├── ReviewList.tsx                # Reviews display
│   ├── FragranceNotes.tsx            # Top/middle/base notes
│   ├── RichTextEditor.tsx            # Tiptap editor
│   ├── RichTextDisplay.tsx           # Safe HTML render
│   ├── TagInput.tsx                  # Tag/array input
│   ├── ComboBox.tsx                  # Searchable dropdown
│   ├── StatusBadge.tsx               # Order status badges
│   ├── OrderTimeline.tsx             # Order lifecycle timeline
│   ├── TrackingTimeline.tsx          # Shipping tracking (Shopee-style)
│   ├── MiniOrderProgress.tsx         # Compact order progress
│   ├── ProgressBar.tsx               # Generic progress bar
│   └── WishlistButton.tsx            # Wishlist toggle
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts                 # Browser Supabase client
│   │   ├── server.ts                 # Server Supabase client (cookies)
│   │   └── middleware.ts             # Session refresh helper
│   ├── cart.ts                       # Cart state management
│   ├── rajaongkir.ts                 # RajaOngkir v2 API wrapper
│   ├── komerce-payment.ts            # Komerce payment (VA, QRIS)
│   ├── komerce-delivery.ts           # Komerce delivery (shipment, pickup)
│   ├── tracking.ts                   # Courier detection & tracking URLs
│   ├── sanitize.ts                   # HTML sanitization
│   ├── tiptap-font-size.ts           # Custom Tiptap extension
│   └── utils.ts                      # formatRupiah, formatDate, etc.
│
├── types/
│   └── database.ts                   # All TypeScript interfaces & types
│
├── supabase/
│   └── migrations/                   # 27 SQL migration files
│
├── public/                           # Static assets
├── middleware.ts                      # Next.js middleware (session refresh)
├── next.config.ts                    # Next.js config (standalone, images)
├── tailwind.config.ts                # Tailwind CSS config
├── tsconfig.json                     # TypeScript config
├── Dockerfile                        # Multi-stage Docker build
├── cloudbuild.yaml                   # GCP Cloud Build config
├── package.json                      # Dependencies
└── CLAUDE.md                         # AI assistant instructions
```

---

## Database Schema

### Entity Relationship

```
┌──────────┐    ┌──────────┐    ┌──────────────┐
│  users   │───<│  splits   │───<│split_variants│
└──────────┘    └──────────┘    └──────────────┘
     │               │
     │               ├──────<┌──────────┐
     │               │       │ reviews  │
     │               │       └──────────┘
     │               │
     ├──────<┌──────────┐    ┌──────────────┐
     │       │  orders  │───>│ order_groups  │
     │       └──────────┘    └──────┬───────┘
     │                              │
     │       ┌──────────┐           │
     ├──────<│ wishlist  │    ┌─────┴──────┐
     │       └──────────┘    │  checkouts  │
     │                       └────────────┘
     │
     ├──────<┌────────────────┐
     │       │seller_balances │
     │       └────────────────┘
     │
     └──────<┌──────────────┐
             │ withdrawals  │
             └──────────────┘
```

### Tipe Data Utama

| Type | Values |
|------|--------|
| `SplitStatus` | `open`, `full`, `decanting`, `shipped`, `completed` |
| `OrderStatus` | `pending_payment`, `paid`, `pending`, `confirmed`, `decanting`, `shipped`, `completed`, `cancelled`, `rejected` |
| `Concentration` | `EDP`, `EDT`, `Parfum`, `EDC`, `Cologne` |
| `ScentFamily` | `Woody`, `Floral`, `Oriental`, `Fresh`, `Citrus`, `Aquatic`, `Gourmand`, `Aromatic`, `Chypre`, `Fougere` |
| `WithdrawalStatus` | `pending`, `approved`, `rejected`, `completed` |

### Tabel Utama

| Tabel | Deskripsi |
|-------|-----------|
| `users` | Profil user (nama, avatar, bio, WhatsApp, alamat, bank, lokasi toko) |
| `perfumes` | Data parfum (brand, nama, konsentrasi, gender, scent family, notes) |
| `splits` | Listing split (bottle size, batch code, foto, video, status, harga) |
| `split_variants` | Variant ukuran per split (size, price, stock, sold) |
| `orders` | Order individual (user, split, qty, status, shipping, payment proof) |
| `order_groups` | Batch order dari seller yang sama (shared shipping address) |
| `checkouts` | Parent transaksi multi-seller (1 payment, banyak seller) |
| `reviews` | Review & rating (1-5 bintang, 1 per user per split) |
| `wishlist` | Parfum favorit per user |
| `seller_balances` | Saldo seller (balance, total_earned, total_withdrawn) |
| `withdrawals` | Permintaan penarikan dana |
| `tracking_cache` | Cache hasil tracking AWB (3 jam TTL) |
| `api_usage` | Tracking quota API (500 call/bulan) |
| `rajaongkir_cities` | Cache data kota RajaOngkir |
| `admin_users` | Daftar admin |
| `platform_settings` | Settings platform (bank, fee, feature toggles) |
| `platform_features` | Feature flags (payment_api, delivery_api) |
| `form_options` | Dropdown options (brand, konsentrasi, dll.) |
| `cart_items` | Persistent cart (7 hari TTL) |

---

## API Routes

### Authentication
| Method | Route | Deskripsi |
|--------|-------|-----------|
| `POST` | `/api/auth/callback` | OAuth callback handler |

### Cart
| Method | Route | Deskripsi |
|--------|-------|-----------|
| `GET` | `/api/cart` | Ambil cart items user |
| `POST` | `/api/cart` | Tambah item ke cart |
| `PATCH` | `/api/cart` | Update quantity |
| `DELETE` | `/api/cart` | Hapus item dari cart |

### Checkout & Orders
| Method | Route | Deskripsi |
|--------|-------|-----------|
| `POST` | `/api/checkout` | Buat checkout multi-seller |
| `POST` | `/api/checkout/[id]/payment-proof` | Upload bukti bayar checkout |
| `POST` | `/api/orders/group` | Buat order group (legacy) |
| `GET` | `/api/orders/group/[id]/shipping-cost` | Get opsi ongkir |
| `PATCH` | `/api/orders/group/[id]/shipping-choice` | Pilih kurir |
| `POST` | `/api/orders/group/[id]/payment-proof` | Upload bukti bayar |
| `GET` | `/api/orders/[id]/shipping-cost` | Get opsi ongkir per order |
| `PATCH` | `/api/orders/[id]/shipping-choice` | Pilih kurir per order |
| `PATCH` | `/api/orders/[id]/status` | Update status (seller) |
| `POST` | `/api/orders/[id]/payment-proof` | Upload bukti bayar |
| `POST` | `/api/orders/[id]/confirm-received` | Konfirmasi terima (buyer) |

### Tracking & Shipping
| Method | Route | Deskripsi |
|--------|-------|-----------|
| `GET` | `/api/tracking/[awb]` | Tracking resi (cached 3 jam) |
| `GET` | `/api/address` | Lookup provinsi/kota/kecamatan |

### Payment (Komerce — Feature Toggle)
| Method | Route | Deskripsi |
|--------|-------|-----------|
| `POST` | `/api/payment/create` | Buat VA atau QRIS |
| `GET` | `/api/payment/status/[id]` | Cek status pembayaran |
| `POST` | `/api/payment/webhook` | Webhook auto-update |

### Delivery (Komerce — Feature Toggle)
| Method | Route | Deskripsi |
|--------|-------|-----------|
| `POST` | `/api/delivery/create` | Buat shipment |
| `POST` | `/api/delivery/pickup` | Request pickup |
| `GET` | `/api/delivery/[orderNo]` | Status pengiriman |
| `GET` | `/api/delivery/[orderNo]/label` | Print label |

### Seller
| Method | Route | Deskripsi |
|--------|-------|-----------|
| `GET` | `/api/seller/balance` | Get saldo seller |
| `POST` | `/api/seller/withdrawals` | Ajukan penarikan |

### Wishlist
| Method | Route | Deskripsi |
|--------|-------|-----------|
| `GET` | `/api/wishlist` | List wishlist |
| `POST` | `/api/wishlist` | Tambah ke wishlist |
| `DELETE` | `/api/wishlist` | Hapus dari wishlist |

### Admin
| Method | Route | Deskripsi |
|--------|-------|-----------|
| `POST` | `/api/admin/orders/[id]/verify` | Verifikasi pembayaran |
| `POST` | `/api/admin/orders/[id]/disburse` | Proses payout ke seller |
| `GET/POST` | `/api/admin/withdrawals` | Kelola withdrawal |
| `PATCH` | `/api/admin/withdrawals/[id]` | Update status withdrawal |
| `GET/POST` | `/api/admin/form-options` | Kelola dropdown |
| `POST` | `/api/admin/settings` | Update platform settings |
| `POST` | `/api/admin/seed-form-options` | Seed data awal |
| `POST` | `/api/admin/seed-rajaongkir` | Import data kota |

### Cron
| Method | Route | Deskripsi |
|--------|-------|-----------|
| `GET` | `/api/cron/orders?secret=xxx` | Auto-complete & cancel expired |

---

## Integrasi Pihak Ketiga

### Supabase
- **Auth** — OAuth login (Google, GitHub), session management via cookies
- **PostgreSQL** — Database utama dengan Row-Level Security (RLS) di semua tabel
- **Storage** — Upload foto produk, batch code, avatar, bukti bayar, video decant
- **Realtime** — (available, belum digunakan)

### RajaOngkir v2
- **Base URL:** `https://rajaongkir.komerce.id/api/v1`
- **Fitur:** Kalkulasi ongkir, lookup destinasi (village-level), tracking AWB
- **Kurir:** JNE, J&T, SiCepat, AnterAja, Pos Indonesia, TIKI, Ninja Xpress, Wahana, Lion Parcel, JET, REX, ID Express, SAP, RPX
- **Quota:** 500 call/bulan (tracked di `api_usage` table)
- **Cache:** Tracking di-cache 3 jam di `tracking_cache` table

### Komerce Payment (Feature Toggle)
- **Base URL:** `https://api.collaborator.komerce.id`
- **Metode:** Virtual Account (BCA, BNI, Mandiri, BRI) + QRIS
- **Deadline:** 1 jam untuk pembayaran
- **Webhook:** Auto-update status saat pembayaran berhasil

### Komerce Delivery (Feature Toggle)
- **Base URL:** `https://api.collaborator.komerce.id`
- **Fitur:** Buat shipment, request pickup kurir, print label, cancel order
- **Status:** Disabled by default, enable via `platform_features`

---

## Alur Bisnis

### Alur Pembelian (Buyer Flow)

```
1. Browse & Search parfum
   ↓
2. Lihat detail split (foto, variant, review, notes)
   ↓
3. Pilih variant & jumlah → Tambah ke Cart
   ↓
4. Cart: review items (dikelompokkan per seller)
   ↓
5. Checkout → checkout_multi_seller() RPC:
   ├── Buat Checkout (parent)
   ├── Buat OrderGroup per seller
   └── Buat Order per item
   ↓
6. Status: pending_payment (deadline 1 jam)
   ├── Pilih kurir & ongkir (RajaOngkir)
   ├── Transfer ke rekening Wangiverse (escrow)
   └── Upload bukti transfer
   ↓
7. Status: paid → Admin verifikasi
   ↓
8. Status: confirmed → Seller siapkan pesanan
   ↓
9. Status: decanting → Seller proses decant
   ↓
10. Status: shipped → Seller input resi
    ├── Auto-fetch tracking (Shopee-style UI)
    ├── Step indicator: Diambil → Transit → Tiba → Diantar → Terkirim
    └── Cache tracking 3 jam
    ↓
11. Status: completed
    ├── Buyer konfirmasi terima, ATAU
    └── Auto-complete 2 hari setelah dikirim
    ↓
12. Saldo seller bertambah → Seller bisa withdrawal
```

### Alur Penjualan (Seller Flow)

```
1. Buat Split (wizard 3 langkah):
   ├── Step 1: Info parfum (brand, nama, konsentrasi, gender, scent family)
   ├── Step 2: Konfigurasi (bottle size, batch code, variant, harga, stok)
   └── Step 3: Foto (max 4 produk + 1 batch code), video, deskripsi, notes
   ↓
2. Split live → Buyer mulai beli
   ↓
3. Order masuk → Dashboard seller
   ↓
4. Confirmed → Klik "Siapkan Pesanan" → Status: decanting
   ↓
5. Selesai decant → Input resi → Klik "Kirim Pesanan" → Status: shipped
   ↓
6. Buyer terima → Status: completed → Saldo bertambah
   ↓
7. Ajukan withdrawal → Admin approve → Transfer manual
```

### Sistem Escrow

```
Buyer bayar → Dana masuk ke rekening Wangiverse (escrow)
                    ↓
        Buyer konfirmasi terima / auto-complete
                    ↓
        credit_seller_balance() → Saldo seller +
                    ↓
        Seller ajukan withdrawal → Admin approve
                    ↓
        Admin transfer manual ke rekening seller
```

### Cart & Checkout Hierarchy

```
Cart
 └── Dikelompokkan per Seller
      ↓
Checkout (multi-seller, 1 pembayaran)
 ├── OrderGroup (Seller A)
 │    ├── Order (Item 1)
 │    └── Order (Item 2)
 └── OrderGroup (Seller B)
      └── Order (Item 3)
```

---

## Environment Variables

Buat file `.env.local` di root project:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Supabase Service Role (server-side only)
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# RajaOngkir v2
RAJAONGKIR_API_KEY=your_api_key

# Komerce (optional, feature toggle)
KOMERCE_PAYMENT_API_KEY=your_api_key
KOMERCE_DELIVERY_API_KEY=your_api_key

# Cron Job Secret
CRON_SECRET=random_secret_string
```

**Build-time variables** (dibutuhkan saat Docker build):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**Runtime variables** (di Cloud Run):
- `SUPABASE_SERVICE_ROLE_KEY`
- `RAJAONGKIR_API_KEY`
- `KOMERCE_PAYMENT_API_KEY`
- `KOMERCE_DELIVERY_API_KEY`
- `CRON_SECRET`

---

## Setup & Development

### Prerequisites

- Node.js 22+
- npm
- Supabase project (atau Supabase CLI untuk lokal)
- RajaOngkir API key

### Install

```bash
# Clone repository
git clone https://github.com/Lelianto/parfume.git
cd parfume

# Install dependencies
npm install

# Setup environment
cp .env.example .env.local
# Edit .env.local dengan credentials Anda
```

### Database Setup

Jalankan semua migration secara berurutan di Supabase SQL Editor:

```bash
# Jika menggunakan Supabase CLI
supabase db push

# Atau jalankan manual di SQL Editor
# supabase/migrations/001_initial_schema.sql
# supabase/migrations/002_payment_flow.sql
# ... hingga 027_split_photo_urls.sql
```

Seed data awal:

```bash
# Seed form options (brand, konsentrasi, dll.)
curl -X POST http://localhost:3000/api/admin/seed-form-options

# Import data kota RajaOngkir
curl -X POST http://localhost:3000/api/admin/seed-rajaongkir
```

### Development Server

```bash
npm run dev
# → http://localhost:3000 (Turbopack enabled)
```

### Build & Test

```bash
npm run build   # Production build
npm run start   # Start production server
npm run lint    # ESLint check
```

---

## Deployment

### GCP Cloud Run (Production)

#### 1. Build Docker Image via Cloud Build

```bash
gcloud builds submit \
  --config=cloudbuild.yaml \
  --substitutions="_NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co,_NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ..." \
  --region=asia-southeast1
```

#### 2. Deploy ke Cloud Run

```bash
gcloud run deploy wangiverse \
  --region=asia-southeast1 \
  --image=asia-southeast1-docker.pkg.dev/PROJECT_ID/cloud-run-source-deploy/wangiverse:latest \
  --allow-unauthenticated \
  --set-env-vars="SUPABASE_SERVICE_ROLE_KEY=eyJ...,RAJAONGKIR_API_KEY=xxx,CRON_SECRET=xxx"
```

#### 3. Setup Cron Job

Gunakan Cloud Scheduler atau external cron untuk memanggil:

```
GET https://your-service.run.app/api/cron/orders?secret=YOUR_CRON_SECRET
```

Rekomendasi: setiap 15 menit.

### Docker Lokal

```bash
docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ... \
  -t wangiverse .

docker run -p 3000:3000 \
  -e SUPABASE_SERVICE_ROLE_KEY=eyJ... \
  -e RAJAONGKIR_API_KEY=xxx \
  wangiverse
```

---

## Migrations

| # | File | Deskripsi |
|---|------|-----------|
| 001 | `initial_schema.sql` | Tabel inti: users, perfumes, splits, orders, reviews + RLS |
| 002 | `payment_flow.sql` | Workflow pembayaran, deadline, bukti bayar |
| 003 | `split_variants.sql` | Variant ukuran/harga/stok per split |
| 004 | `search_filter.sql` | Full-text search & filter capabilities |
| 005 | `seller_profile.sql` | Field profil seller (bio, WhatsApp, dll.) |
| 006 | `fragrance_notes.sql` | Top, middle, base notes |
| 007 | `split_visibility.sql` | Flag hidden/visible untuk split |
| 008 | `admin_users.sql` | Tabel admin & access control |
| 009 | `admin_orders_policy.sql` | RLS policies untuk admin |
| 010 | `shipping_address.sql` | Alamat pengiriman standar |
| 011 | `perfume_variant.sql` | Variant naming pada parfum |
| 012 | `store_address.sql` | Lokasi toko seller (RajaOngkir city ID) |
| 013 | `order_status_webhook.sql` | Trigger update status |
| 014 | `seller_bank_account.sql` | Detail bank untuk payout seller |
| 015 | `wishlist.sql` | Tabel wishlist & policies |
| 016 | `escrow_system.sql` | Sistem escrow & disbursement |
| 017 | `seller_balance.sql` | Saldo seller & withdrawal |
| 018 | `tracking_cache.sql` | Cache tracking AWB + quota management |
| 019 | `rajaongkir.sql` | Cache data kota RajaOngkir |
| 020 | `order_reject_reason.sql` | Alasan penolakan order |
| 021 | `rejected_status.sql` | Status rejected untuk order |
| 022 | `perfume_metadata.sql` | Metadata tambahan parfum |
| 023 | `order_groups.sql` | Batch order per seller + RPC `join_split_batch` |
| 024 | `cart_items.sql` | Persistent cart (7 hari TTL) |
| 025 | `allow_purchase_when_stock_available.sql` | Relaksasi validasi stok |
| 026 | `checkouts.sql` | Multi-seller checkout + RPC `checkout_multi_seller` |
| 027 | `split_photo_urls.sql` | Array foto produk (max 4) |

---

## Key RPCs (Stored Procedures)

| RPC | Deskripsi |
|-----|-----------|
| `checkout_multi_seller(user_id, seller_groups)` | Atomic: buat checkout + order groups + orders |
| `join_split_batch(user_id, seller_id, items)` | Buat order group + orders untuk 1 seller (legacy) |
| `cancel_expired_orders()` | Batalkan order yang lewat deadline pembayaran |
| `auto_complete_orders()` | Selesaikan order shipped 2+ hari + credit saldo |
| `credit_seller_balance(order_id, seller_id, amount)` | Tambah saldo seller |
| `reserve_api_quota(api_type, limit)` | Cek & reserve quota API bulanan |
| `upsert_tracking_cache(awb, courier, result)` | Simpan/update cache tracking |

---

## Kurir yang Didukung

| Kurir | Kode | Ongkir | Tracking | Auto-Detect AWB |
|-------|------|--------|----------|-----------------|
| JNE | `jne` | ✅ | ✅ | ✅ |
| J&T Express | `jnt` | ✅ | ✅ | ✅ |
| SiCepat | `sicepat` | ✅ | ✅ | ✅ |
| AnterAja | `anteraja` | ✅ | ✅ | ✅ |
| Pos Indonesia | `pos` | ✅ | ✅ | ✅ |
| TIKI | `tiki` | ✅ | ✅ | ✅ |
| Ninja Xpress | `ninja` | ✅ | ✅ | ✅ |
| Lion Parcel | `lion` | ✅ | ✅ | ❌ |
| SAP Express | `sap` | ✅ | ✅ | ❌ |
| JET Express | `jet` | ✅ | ✅ | ❌ |
| REX Express | `rex` | ✅ | ✅ | ❌ |
| ID Express | `ide` | ✅ | ✅ | ❌ |
| RPX | `rpx` | ✅ | ✅ | ❌ |

---

## Security

- **Row-Level Security (RLS)** — Semua tabel database dilindungi. User hanya bisa akses data sendiri.
- **OAuth** — Login via provider terpercaya (Google, GitHub), tidak menyimpan password.
- **Session Middleware** — Refresh session di setiap request via cookies.
- **HTML Sanitization** — DOMPurify untuk rich text content, mencegah XSS.
- **Input Validation** — AWB pattern check, file type validation, courier allowlist.
- **Quota Management** — API tracking dibatasi 500 call/bulan untuk mencegah abuse.
- **Admin Separation** — Admin routes dilindungi dengan tabel `admin_users` terpisah.
- **Escrow** — Dana buyer ditahan, bukan langsung ke seller, melindungi kedua pihak.

---

## License

Private project — All rights reserved.

---

*Built with Next.js, Supabase, and deployed on GCP Cloud Run.*
