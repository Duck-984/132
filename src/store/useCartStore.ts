import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  productId: string;
  name: { ru: string; uz: string };
  price: number;
  image: string;
  quantity: number;
  size?: string;
  color?: { name: string; hex: string };
}

interface CartStore {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (productId: string, size?: string, color?: string) => void;
  updateQuantity: (productId: string, quantity: number, size?: string, color?: string) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) => {
        set((state) => {
          const existingItemIndex = state.items.findIndex(
            (i) =>
              i.productId === item.productId &&
              i.size === item.size &&
              i.color?.hex === item.color?.hex
          );

          if (existingItemIndex > -1) {
            const newItems = [...state.items];
            newItems[existingItemIndex].quantity += item.quantity;
            return { items: newItems };
          }

          if (state.items.length >= 100) return state;
          return { items: [...state.items, item] };
        });
      },

      removeItem: (productId, size, color) => {
        set((state) => ({
          items: state.items.filter(
            (item) =>
              !(
                item.productId === productId &&
                item.size === size &&
                item.color?.hex === color
              )
          ),
        }));
      },

      updateQuantity: (productId, quantity, size, color) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.productId === productId &&
            item.size === size &&
            item.color?.hex === color
              ? { ...item, quantity: Math.max(1, quantity) }
              : item
          ),
        }));
      },

      clearCart: () => {
        set({ items: [] });
      },

      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },

      getTotalPrice: () => {
        return get().items.reduce((total, item) => total + item.price * item.quantity, 0);
      },
    }),
    {
      name: 'cart-storage',
      storage: {
        getItem: (name) => {
          try {
            const str = localStorage.getItem(name);
            return str ? JSON.parse(str) : null;
          } catch { return null; }
        },
        setItem: (name, value) => {
          try {
            localStorage.setItem(name, JSON.stringify(value));
          } catch {
            console.warn('Cart storage full, clearing old items');
            try {
              const parsed = JSON.parse(JSON.stringify(value));
              if (parsed?.state?.items?.length > 10) {
                parsed.state.items = parsed.state.items.slice(-10);
                localStorage.setItem(name, JSON.stringify(parsed));
              }
            } catch { /* storage unavailable */ }
          }
        },
        removeItem: (name) => {
          try { localStorage.removeItem(name); } catch { /* ignore */ }
        },
      },
    }
  )
);
