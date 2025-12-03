/* ============================================================
   PRODUCTS.JS — Realtime mahsulotlar, render, search, detail
============================================================ */

import {
  db, products, remoteProducts, categories,
  productsCol, formatPrice,
  setImageWithPngJpgFallback
} from "./data.js";

import { onSnapshot } from "./data.js";
import { openProductDetail } from "./app.js";

export let productsGrid = null;
export let searchInput = null;

/* ============================================================
   1. INIT DOM ELEMENTS
============================================================ */
export function initProductsModule() {
  productsGrid = document.getElementById("productsGrid");
  searchInput = document.getElementById("searchInput");

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      window.currentSearch = searchInput.value.trim().toLowerCase();
      renderProducts();
    });
  }

  subscribeProductsRealtime();
}

/* ============================================================
   2. REALTIME FIRESTORE LISTENER
============================================================ */
function subscribeProductsRealtime() {
  onSnapshot(
    productsCol,
    snap => {
      const list = [];

      snap.forEach(d => {
        const data = d.data();
        list.push({
          id: d.id,
          name: data.name || "",
          price: data.price || 0,
          oldPrice: data.oldPrice || null,
          category: data.category || "",
          tag: data.tag || "",
          description: data.description || "",
          emoji: data.emoji || "💅",
          images: Array.isArray(data.images) ? data.images : [],
          stock: data.stock ?? 999,
          createdAt: data.createdAt || null
        });
      });

      remoteProducts.splice(0, remoteProducts.length, ...list);
      rebuildProducts();
    },
    e => {
      console.error("Products realtime error:", e);
    }
  );
}

/* ============================================================
   3. REBUILD PRODUCTS LIST
============================================================ */
export function rebuildProducts() {
  products.splice(0, products.length, ...remoteProducts);
  renderProducts();
}

/* ============================================================
   4. FILTER + SEARCH + RENDER
============================================================ */
export function renderProducts() {
  if (!productsGrid) return;

  productsGrid.innerHTML = "";

  const filtered = products.filter(p => {
    const byCat =
      window.activeCategory === "all"
        ? true
        : p.category === window.activeCategory;

    const q = window.currentSearch || "";
    const s =
      p.name.toLowerCase() +
      " " +
      p.tag.toLowerCase() +
      " " +
      p.description.toLowerCase();

    return byCat && s.includes(q);
  });

  if (!filtered.length) {
    productsGrid.innerHTML = `
      <p class="empty-note">Hozircha mahsulot yo‘q</p>
    `;
    return;
  }

  filtered.forEach(p => renderProductCard(p));
}

/* ============================================================
   5. RENDER SINGLE PRODUCT CARD
============================================================ */
function renderProductCard(p) {
  const container = document.createElement("article");
  container.className = "product-card";

  container.addEventListener("click", () => openProductDetail(p.id));

  const imgWrap = document.createElement("div");
  imgWrap.className = "product-img-wrap";

  const img = document.createElement("img");
  img.alt = p.name;

  const first = (p.images && p.images.length)
    ? p.images[0]
    : RAW_PREFIX + "noimage.png";

  setImageWithPngJpgFallback(img, first);
  imgWrap.appendChild(img);

  const body = document.createElement("div");
  body.className = "product-body";

  const nameEl = document.createElement("div");
  nameEl.className = "product-name";
  nameEl.textContent = p.name;

  const metaEl = document.createElement("div");
  metaEl.className = "product-meta";
  metaEl.textContent =
    (window.categoryLabel?.[p.category] || p.category || "Kategoriya") +
    " • " +
    (p.tag || "Ommabop");

  const priceRow = document.createElement("div");
  priceRow.className = "price-row";

  const priceMain = document.createElement("div");
  priceMain.className = "price-main";
  priceMain.textContent = formatPrice(p.price) + " so‘m";

  priceRow.appendChild(priceMain);

  // old price if discount
  if (p.oldPrice && p.oldPrice > p.price) {
    const oldEl = document.createElement("div");
    oldEl.className = "price-old";
    oldEl.textContent = formatPrice(p.oldPrice) + " so‘m";
    priceRow.appendChild(oldEl);
  }

  body.appendChild(nameEl);
  body.appendChild(metaEl);
  body.appendChild(priceRow);

  container.appendChild(imgWrap);
  container.appendChild(body);

  productsGrid.appendChild(container);
}
