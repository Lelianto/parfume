import type { Split, SplitVariant, Perfume, User } from "@/types/database";

export interface CartItem {
  splitId: string;
  variantId: string;
  quantity: number;
  // Snapshot data for display (may be stale)
  sizeMl: number;
  price: number;
  stock: number;
  sold: number;
  perfumeBrand: string;
  perfumeName: string;
  perfumeVariant: string | null;
  bottlePhotoUrl: string | null;
  sellerId: string;
  sellerName: string;
  sellerAvatarUrl: string | null;
  sellerCity: string | null;
}

export interface CartSellerGroup {
  sellerId: string;
  sellerName: string;
  sellerAvatarUrl: string | null;
  sellerCity: string | null;
  items: CartItem[];
  totalPrice: number;
}

const CART_KEY_PREFIX = "wangiverse_cart_";
let currentUserId: string | null = null;

export function setCartUserId(userId: string | null) {
  const changed = currentUserId !== userId;
  currentUserId = userId;
  if (changed && typeof window !== "undefined") {
    window.dispatchEvent(new Event("cart-updated"));
  }
}

function getCartKey(): string | null {
  if (!currentUserId) return null;
  return CART_KEY_PREFIX + currentUserId;
}

function getCartItems(): CartItem[] {
  if (typeof window === "undefined") return [];
  const key = getCartKey();
  if (!key) return [];
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCartItems(items: CartItem[]) {
  if (typeof window === "undefined") return;
  const key = getCartKey();
  if (!key) return;
  localStorage.setItem(key, JSON.stringify(items));
  window.dispatchEvent(new Event("cart-updated"));
}

export function addToCart(
  split: Split & { perfume?: Perfume; creator?: User },
  variant: SplitVariant,
  quantity: number
) {
  const items = getCartItems();
  const existing = items.find(
    (i) => i.splitId === split.id && i.variantId === variant.id
  );

  if (existing) {
    existing.quantity += quantity;
    // Cap at available stock
    const available = variant.stock - variant.sold;
    if (existing.quantity > available) existing.quantity = available;
  } else {
    items.push({
      splitId: split.id,
      variantId: variant.id,
      quantity,
      sizeMl: variant.size_ml,
      price: variant.price,
      stock: variant.stock,
      sold: variant.sold,
      perfumeBrand: split.perfume?.brand ?? "",
      perfumeName: split.perfume?.name ?? "",
      perfumeVariant: split.perfume?.variant ?? null,
      bottlePhotoUrl: split.bottle_photo_url,
      sellerId: split.created_by,
      sellerName: split.creator?.name ?? "Seller",
      sellerAvatarUrl: split.creator?.avatar_url ?? null,
      sellerCity: split.creator?.store_city ?? split.creator?.city ?? null,
    });
  }

  saveCartItems(items);
}

export function removeFromCart(splitId: string, variantId: string) {
  const items = getCartItems().filter(
    (i) => !(i.splitId === splitId && i.variantId === variantId)
  );
  saveCartItems(items);
}

export function updateCartQuantity(
  splitId: string,
  variantId: string,
  quantity: number
) {
  const items = getCartItems();
  const item = items.find(
    (i) => i.splitId === splitId && i.variantId === variantId
  );
  if (item) {
    item.quantity = Math.max(1, quantity);
  }
  saveCartItems(items);
}

export function clearCartForSeller(sellerId: string) {
  const items = getCartItems().filter((i) => i.sellerId !== sellerId);
  saveCartItems(items);
}

export function clearCartForSellers(sellerIds: string[]) {
  const idSet = new Set(sellerIds);
  const items = getCartItems().filter((i) => !idSet.has(i.sellerId));
  saveCartItems(items);
}

export function clearCart() {
  saveCartItems([]);
}

export function getCart(): CartItem[] {
  return getCartItems();
}

export function getCartCount(): number {
  return getCartItems().length;
}

export function getCartGroupedBySeller(): CartSellerGroup[] {
  const items = getCartItems();
  const groups = new Map<string, CartSellerGroup>();

  for (const item of items) {
    let group = groups.get(item.sellerId);
    if (!group) {
      group = {
        sellerId: item.sellerId,
        sellerName: item.sellerName,
        sellerAvatarUrl: item.sellerAvatarUrl,
        sellerCity: item.sellerCity,
        items: [],
        totalPrice: 0,
      };
      groups.set(item.sellerId, group);
    }
    group.items.push(item);
    group.totalPrice += item.price * item.quantity;
  }

  return Array.from(groups.values());
}
