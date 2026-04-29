import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { api } from '../utils/api';

const CartContext = createContext();
const GUEST_CART_KEY = 'guest_cart';

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);

  const hasToken = () => Boolean(localStorage.getItem('auth_token'));
  const isAuthError = (error) => {
    const msg = (error?.message || '').toLowerCase();
    return msg.includes('invalid token') || msg.includes('401') || msg.includes('unauthorized');
  };
  const clearAuthToken = () => {
    try {
      localStorage.removeItem('auth_token');
    } catch {}
  };
  const readGuestCart = useCallback(() => {
    try {
      const raw = localStorage.getItem(GUEST_CART_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, []);
  const writeGuestCart = useCallback((items) => {
    try {
      localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
    } catch {}
  }, []);

  const mapServerCartToUI = useCallback((data) => {
    const items = data?.items || [];
    return items.map((i) => {
      const p = i.product || {};
      const price = typeof p.price === 'number'
        ? p.price
        : (typeof p.mrp === 'number' ? Math.round(p.mrp - (p.mrp * (p.discountPercent || 0) / 100)) : 0);
      return {
        id: p._id, // used by UI and for remove
        name: p.title,
        image: p.images?.image1,
        material: p.product_info?.SareeMaterial,
        work: p.product_info?.IncludedComponents,
        brand: p.product_info?.brand,
        color: p.product_info?.KurtiColor || p.product_info?.SareeColor,
        price,
        originalPrice: p.mrp,
        quantity: i.quantity || 1,
      };
    });
  }, []);

  const loadCart = useCallback(async () => {
    if (!hasToken()) {
      setCart(readGuestCart());
      return;
    }
    try {
      const data = await api.getCart();
      setCart(mapServerCartToUI(data));
    } catch (error) {
      if (isAuthError(error)) {
        clearAuthToken();
        setCart(readGuestCart());
        return;
      }
      throw error;
    }
  }, [mapServerCartToUI, readGuestCart]);

  const addToCart = useCallback(async (productIdOrObj, quantity = 1, size = null) => {
    // Accept either productId or a product object
    let productId = productIdOrObj;
    let productObj = null;
    if (typeof productIdOrObj === 'object' && productIdOrObj) {
      productId = productIdOrObj._id || productIdOrObj.id;
      productObj = productIdOrObj;
    }
    if (!productId) return;
    if (!hasToken()) {
      const list = readGuestCart();
      const existingIndex = list.findIndex((item) => item.id === productId);
      if (existingIndex >= 0) {
        list[existingIndex] = {
          ...list[existingIndex],
          quantity: (list[existingIndex].quantity || 1) + quantity,
        };
      } else {
        const price = typeof productObj?.price === 'number'
          ? productObj.price
          : (typeof productObj?.mrp === 'number'
            ? Math.round(productObj.mrp - (productObj.mrp * (productObj.discountPercent || 0) / 100))
            : 0);
        list.push({
          id: productId,
          name: productObj?.title || productObj?.name || 'Product',
          image: productObj?.images?.image1 || productObj?.image || '',
          material: productObj?.product_info?.SareeMaterial || '',
          work: productObj?.product_info?.IncludedComponents || '',
          brand: productObj?.product_info?.brand || '',
          color: productObj?.product_info?.KurtiColor || productObj?.product_info?.SareeColor || productObj?.product_info?.tshirtColor || '',
          price,
          originalPrice: productObj?.mrp || price,
          quantity,
          size: size || null,
        });
      }
      writeGuestCart(list);
      setCart(list);
      return;
    }
    try {
      await api.addToCart({ productId, quantity, size });
      await loadCart();
    } catch (error) {
      if (!isAuthError(error)) throw error;
      clearAuthToken();
      const list = readGuestCart();
      const existingIndex = list.findIndex((item) => item.id === productId);
      if (existingIndex >= 0) {
        list[existingIndex] = {
          ...list[existingIndex],
          quantity: (list[existingIndex].quantity || 1) + quantity,
        };
      } else {
        const price = typeof productObj?.price === 'number'
          ? productObj.price
          : (typeof productObj?.mrp === 'number'
            ? Math.round(productObj.mrp - (productObj.mrp * (productObj.discountPercent || 0) / 100))
            : 0);
        list.push({
          id: productId,
          name: productObj?.title || productObj?.name || 'Product',
          image: productObj?.images?.image1 || productObj?.image || '',
          material: productObj?.product_info?.SareeMaterial || '',
          work: productObj?.product_info?.IncludedComponents || '',
          brand: productObj?.product_info?.brand || '',
          color: productObj?.product_info?.KurtiColor || productObj?.product_info?.SareeColor || productObj?.product_info?.tshirtColor || '',
          price,
          originalPrice: productObj?.mrp || price,
          quantity,
          size: size || null,
        });
      }
      writeGuestCart(list);
      setCart(list);
    }
  }, [loadCart, readGuestCart, writeGuestCart]);

  const removeFromCart = useCallback(async (productId) => {
    if (!hasToken()) {
      const next = readGuestCart().filter((item) => item.id !== productId);
      writeGuestCart(next);
      setCart(next);
      return;
    }
    await api.removeFromCart(productId);
    await loadCart();
  }, [loadCart, readGuestCart, writeGuestCart]);

  const updateQuantity = useCallback(async (productId, newQuantity) => {
    if (!hasToken()) {
      if (newQuantity < 1) {
        await removeFromCart(productId);
        return;
      }
      const next = readGuestCart().map((item) => (
        item.id === productId ? { ...item, quantity: newQuantity } : item
      ));
      writeGuestCart(next);
      setCart(next);
      return;
    }
    if (newQuantity < 1) {
      await removeFromCart(productId);
      return;
    }
    const current = cart.find(i => i.id === productId)?.quantity || 0;
    const delta = newQuantity - current;
    if (delta === 0) return;
    if (delta > 0) {
      await api.addToCart({ productId, quantity: delta });
      await loadCart();
    } else {
      // Simulate decrement: remove then add desired quantity
      await api.removeFromCart(productId);
      await api.addToCart({ productId, quantity: newQuantity });
      await loadCart();
    }
  }, [removeFromCart, cart, loadCart, readGuestCart, writeGuestCart]);

  const clearCart = useCallback(async () => {
    if (!hasToken()) {
      writeGuestCart([]);
      setCart([]);
      return;
    }
    // No dedicated clear endpoint; remove each item
    for (const item of cart) {
      await api.removeFromCart(item.id);
    }
    await loadCart();
  }, [cart, loadCart, writeGuestCart]);

  const cartTotal = cart.reduce((total, item) => total + ((item.price || 0) * (item.quantity || 1)), 0);
  const cartCount = cart.reduce((total, item) => total + (item.quantity || 1), 0);

  useEffect(() => {
    loadCart();
    const onStorage = (e) => {
      if (!e || e.key === 'auth_token') loadCart();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [loadCart]);

  // Also reload on route changes to reflect auth changes in the same tab
  useEffect(() => {
    loadCart();
  }, [location.pathname, loadCart]);

  return (
    <CartContext.Provider value={{
      cart,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      cartTotal,
      cartCount,
      loadCart,
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
