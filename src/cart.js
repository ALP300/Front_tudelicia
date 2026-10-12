/**
 * Cart Manager for TuDelicia
 */

const CART_KEY = 'tudelicia_cart';

export class CartManager {
  constructor() {
    this.items = this.loadCart();
    this.listeners = [];
  }

  loadCart() {
    try {
      const data = localStorage.getItem(CART_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  saveCart() {
    localStorage.setItem(CART_KEY, JSON.stringify(this.items));
    this.notify();
  }

  subscribe(listener) {
    this.listeners.push(listener);
    listener(this.items);
  }

  notify() {
    this.listeners.forEach(fn => fn(this.items));
  }

  addItem(product, quantity = 1) {
    const existing = this.items.find(item => item.id === product.id);
    if (existing) {
      const newQty = existing.quantity + quantity;
      if (product.stock !== undefined && newQty > product.stock) {
        existing.quantity = product.stock;
        this.saveCart();
        return { success: false, reason: 'stock_limit', item: existing };
      }
      existing.quantity = newQty;
    } else {
      if (product.stock !== undefined && product.stock <= 0) {
        return { success: false, reason: 'out_of_stock' };
      }
      this.items.push({
        id: product.id,
        name: product.name,
        price: product.price,
        imageUrl: product.imageUrl,
        stock: product.stock,
        quantity: Math.min(quantity, product.stock || quantity)
      });
    }
    this.saveCart();
    return { success: true };
  }

  updateQuantity(id, delta) {
    const item = this.items.find(i => i.id === id);
    if (!item) return;

    item.quantity += delta;
    if (item.quantity <= 0) {
      this.removeItem(id);
      return;
    }

    if (item.stock !== undefined && item.quantity > item.stock) {
      item.quantity = item.stock;
    }

    this.saveCart();
  }

  removeItem(id) {
    this.items = this.items.filter(i => i.id !== id);
    this.saveCart();
  }

  clearCart() {
    this.items = [];
    this.saveCart();
  }

  getTotalCount() {
    return this.items.reduce((acc, item) => acc + item.quantity, 0);
  }

  getSubtotal() {
    return this.items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  }
}

export const cart = new CartManager();
