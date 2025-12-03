/* ============================================================
   APP.JS — UI boshqaruv, detail modal, theme, routing
============================================================ */

import {
  products,
  setImageWithPngJpgFallback,
  RAW_PREFIX,
  formatPrice
} from "./data.js";

import {
  initProductsModule,
  rebuildProducts
} from "./products.js";

import {
  initCategoriesModule
} from "./categories.js";

import {
  initCartModule,
  addToCart
} from "./cart.js";

import {
  sendOrder
} from "./orders.js";

import {
  initAdminModule
} from "./admin.js";

/* ------------------------------------------------------------
   GLOBAL DOM ELEMENTS
------------------------------------------------------------ */
let detailModal = null;
let detailImg = null;
let detailName = null;
let detailPrice = null;
let detailOldPrice = null;
let detailDesc = null;
let detailTag = null;
let detailCat = null;
let detailAddBtn = null;
let detailBackBtn = null;
let detailQtyMinus = null;
let detailQtyPlus = null;
let detailQtyValue = null;

let tabsEl = null;

let customerInfoTextEl = null;

let themeBtn = null;

/* STATE */
let detailIndex = null;
let detailQty = 1;
let detailImageIndex = 0;

/* ============================================================
   INIT APP
============================================================ */
export function initApp() {
  // DETAIL DOM
  detailModal = document.getElementById("productDetailOverlay");
  detailImg = document.getElementById("detailImage");
  detailName = document.getElementById("detailName");
  detailPrice = document.getElementById("detailPrice");
  detailOldPrice = document.getElementById("detailOldPrice");
  detailDesc = document.getElementById("detailDesc");
  detailTag = document.getElementById("detailTag");
  detailCat = document.getElementById("detailCategory");
  detailAddBtn = document.getElementById("detailAddBtn");
  detailBackBtn = document.getElementById("detailBackBtn");

  detailQtyMinus = document.getElementById("detailQtyMinus");
  detailQtyPlus = document.getElementById("detailQtyPlus");
  detailQtyValue = document.getElementById("detailQtyValue");

  tabsEl = document.getElementById("tabs");

  customerInfoTextEl = document.getElementById("customerInfoText");
  themeBtn = document.getElementById("themeToggleBtn");

  // INIT MODULES
  initProductsModule();
  initCategoriesModule();
  initCartModule();
  initAdminModule();

  // THEME
  initTheme();

  // DETAIL HANDLERS
  initDetailControls();

  // TABS
  initTabs();
}

/* ============================================================
   THEME SYSTEM
============================================================ */
function initTheme() {
  let t = localStorage.getItem("theme") || "dark";
  applyTheme(t);

  if (themeBtn) {
    themeBtn.addEventListener("click", () => {
      let cur = localStorage.getItem("theme") || "dark";
      let next = cur === "dark" ? "light" : "dark";
      applyTheme(next);
      localStorage.setItem("theme", next);
    });
  }
}

function applyTheme(t) {
  document.body.setAttribute("data-theme", t);
}

/* ============================================================
   DETAIL MODAL FUNCTIONS
============================================================ */
export function openProductDetail(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;

  detailIndex = id;
  detailQty = 1;
  detailImageIndex = 0;

  // image
  const imgs = p.images && p.images.length ? p.images : [RAW_PREFIX + "noimage.png"];
  setImageWithPngJpgFallback(detailImg, imgs[0]);

  detailName.textContent = p.name;
  detailCat.textContent = window.categoryLabel?.[p.category] || p.category || "";
  detailTag.textContent = p.tag ? "💡 " + p.tag : "";
  detailDesc.textContent = p.description || "";

  detailPrice.textContent = formatPrice(p.price) + " so‘m";

  if (p.oldPrice && p.oldPrice > p.price) {
    detailOldPrice.classList.remove("hidden");
    detailOldPrice.textContent = formatPrice(p.oldPrice) + " so‘m";
  } else {
    detailOldPrice.classList.add("hidden");
  }

  detailQtyValue.textContent = "1";

  detailModal.classList.add("open");
  document.body.style.overflow = "hidden";
}

export function closeProductDetail() {
  detailModal.classList.remove("open");
  document.body.style.overflow = "";
  detailIndex = null;
}

/* ------------------------------------------------------------
   DETAIL CONTROLS INIT
------------------------------------------------------------ */
function initDetailControls() {
  if (!detailModal) return;

  detailModal.addEventListener("click", e => {
    if (e.target === detailModal) closeProductDetail();
  });

  if (detailQtyMinus) {
    detailQtyMinus.addEventListener("click", () => {
      if (detailQty > 1) {
        detailQty--;
        detailQtyValue.textContent = detailQty;
      }
    });
  }

  if (detailQtyPlus) {
    detailQtyPlus.addEventListener("click", () => {
      detailQty++;
      detailQtyValue.textContent = detailQty;
    });
  }

  if (detailAddBtn) {
    detailAddBtn.addEventListener("click", () => {
      if (!detailIndex) return;
      addToCart(detailIndex, detailQty);
      closeProductDetail();
    });
  }

  if (detailBackBtn) {
    detailBackBtn.addEventListener("click", closeProductDetail);
  }
}

/* ============================================================
   TABS (Routing)
============================================================ */
function initTabs() {
  if (!tabsEl) return;

  tabsEl.addEventListener("click", e => {
    const btn = e.target.closest(".tab-btn");
    if (!btn) return;

    const page = btn.dataset.page;

    document.querySelectorAll(".page").forEach(p => p.classList.add("hidden"));
    document.getElementById(page).classList.remove("hidden");

    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
  });
}

/* ============================================================
   CUSTOMER INFO: DISPLAY REAL-TIME
============================================================ */
export function updateCustomerInfoText() {
  let raw = localStorage.getItem("beauty_customer_info");
  if (!raw) {
    customerInfoTextEl.textContent = "Ism va ma’lumotlar kiritilmagan";
    return;
  }

  try {
    const info = JSON.parse(raw);
    customerInfoTextEl.textContent =
      `${info.name} • ${info.phone} • ${info.address}`;
  } catch {
    customerInfoTextEl.textContent = "Ma’lumotlarni o‘qib bo‘lmadi";
  }
}

/* ============================================================
   GLOBAL EXPORT
============================================================ */
window.openProductDetail = openProductDetail;
window.closeProductDetail = closeProductDetail;
