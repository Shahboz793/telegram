/* ============================================================
   CART.JS — Savat funksiyalari, UI, miqdor boshqaruvi
============================================================ */

import {
  cart,
  products,
  formatPrice
} from "./data.js";

/* DOM ELEMENTS */
let cartSheet = null;
let cartOverlay = null;
let cartItemsEl = null;
let cartCountTopEl = null;
let cartTotalTopEl = null;
let cartSheetTotalEl = null;

/* ============================================================
   INIT
============================================================ */
export function initCartModule() {
  cartSheet = document.getElementById("cartSheet");
  cartOverlay = document.getElementById("cartSheetOverlay");
  cartItemsEl = document.getElementById("cartItems");
  cartCountTopEl = document.getElementById("cartCountTop");
  cartTotalTopEl = document.getElementById("cartTotalTop");
  cartSheetTotalEl = document.getElementById("cartSheetTotal");

  if (cartOverlay) {
    cartOverlay.addEventListener("click", () => toggleCartSheet(false));
  }
}

/* ============================================================
   SAVATGA QO‘SHISH
============================================================ */
export function addToCart(productIndex, qty = 1) {
  if (qty <= 0) return;

  const found = cart.find(c => c.index === productIndex);

  if (found) {
    found.qty += qty;
  } else {
    cart.push({ index: productIndex, qty });
  }

  updateCartUI();

  showToast("Savatga qo‘shildi");
}

/* ============================================================
   CART UI UPDATE
============================================================ */
export function updateCartUI() {
  let totalCount = 0;
  let totalPrice = 0;

  cart.forEach(c => {
    const p = products.find(x => x.id === c.index || x.index === c.index);
    if (!p) return;

    totalCount += c.qty;
    totalPrice += p.price * c.qty;
  });

  if (cartCountTopEl) cartCountTopEl.textContent = totalCount;
  if (cartTotalTopEl) cartTotalTopEl.textContent = `${formatPrice(totalPrice)} so‘m`;

  if (cartSheet && cartSheet.classList.contains("open")) {
    renderCartItems();
  }
}

/* ============================================================
   CART SHEET OPEN/CLOSE
============================================================ */
export function toggleCartSheet(force) {
  if (!cartSheet || !cartOverlay) return;

  const isOpen = cartSheet.classList.contains("open");
  const next = typeof force === "boolean" ? force : !isOpen;

  cartSheet.classList.toggle("open", next);
  cartOverlay.classList.toggle("show", next);

  if (next) renderCartItems();
}

/* ============================================================
   CART ITEMS RENDER
============================================================ */
export function renderCartItems() {
  if (!cartItemsEl) return;

  if (!cart.length) {
    cartItemsEl.innerHTML = `<p class="empty-note">Savat bo‘sh</p>`;
    if (cartSheetTotalEl) cartSheetTotalEl.textContent = "0 so‘m";
    return;
  }

  let html = "";
  let total = 0;

  cart.forEach(c => {
    const p = products.find(x => x.id === c.index || x.index === c.index);
    if (!p) return;

    const lineTotal = p.price * c.qty;
    total += lineTotal;

    html += `
      <div class="cart-item-row">
        <div class="cart-item-main">
          <div class="cart-item-name">${p.name}</div>
          <div class="cart-item-meta">${formatPrice(p.price)} so‘m</div>
        </div>

        <div class="cart-item-actions">
          <div class="qty-control">
            <button onclick="changeQty('${p.id}', -1)">–</button>
            <span>${c.qty}</span>
            <button onclick="changeQty('${p.id}', 1)">+</button>
          </div>
          <div class="cart-line-sum">${formatPrice(lineTotal)} so‘m</div>
          <button class="cart-remove" onclick="removeFromCart('${p.id}')">✕</button>
        </div>
      </div>
    `;
  });

  cartItemsEl.innerHTML = html;
  if (cartSheetTotalEl) cartSheetTotalEl.textContent = `${formatPrice(total)} so‘m`;
}

/* ============================================================
   CHANGE QTY
============================================================ */
export function changeQty(productId, delta) {
  const item = cart.find(c => c.index === productId || c.index === productId);
  if (!item) return;

  item.qty += delta;

  if (item.qty <= 0) {
    removeFromCart(productId);
    return;
  }

  updateCartUI();
  renderCartItems();
}

/* ============================================================
   REMOVE ITEM
============================================================ */
export function removeFromCart(productId) {
  const newCart = cart.filter(c => !(c.index === productId || c.index === productId));
  cart.splice(0, cart.length, ...newCart);

  updateCartUI();
  renderCartItems();
}

/* ============================================================
   GLOBAL EXPORT
============================================================ */
window.addToCart = addToCart;
window.toggleCartSheet = toggleCartSheet;
window.removeFromCart = removeFromCart;
window.changeQty = changeQty;
