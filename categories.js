/* ============================================================
   CATEGORIES.JS — Realtime kategoriyalar, filter bar, admin panel
============================================================ */

import {
  categories,
  categoriesCol,
  db,
  formatPrice
} from "./data.js";

import {
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp
} from "./data.js";

import { rebuildProducts } from "./products.js";

/* DOM ELEMENTS */
let filterBar = null;
let adminCategoryListEl = null;
let adminCatCodeEl = null;
let adminCatLabelEl = null;
let adminCatEmojiEl = null;

/* ============================================================
   INIT
============================================================ */
export function initCategoriesModule() {
  filterBar = document.getElementById("filterBar");
  adminCategoryListEl = document.getElementById("adminCategoryList");
  adminCatCodeEl = document.getElementById("adminCatCode");
  adminCatLabelEl = document.getElementById("adminCatLabel");
  adminCatEmojiEl = document.getElementById("adminCatEmoji");

  subscribeCategoriesRealtime();
  initFilterBarEvents();
}

/* ============================================================
   REALTIME FIRESTORE LISTENER
============================================================ */
function subscribeCategoriesRealtime() {
  onSnapshot(
    categoriesCol,
    snap => {
      const list = [];
      window.categoryLabel = {};
      window.categoryEmoji = {};

      snap.forEach(d => {
        const data = d.data();
        const code = (data.code || "").trim().toLowerCase();
        if (!code) return;

        const label = data.label || code;
        const emoji = data.emoji || "💅";

        window.categoryLabel[code] = label;
        window.categoryEmoji[code] = emoji;

        list.push({
          id: d.id,
          code,
          label,
          emoji,
          order: data.order ?? 0
        });
      });

      list.sort((a, b) => a.order - b.order);

      categories.splice(0, categories.length, ...list);

      renderCategoryFilter();
      renderCategoryAdminList();
      rebuildProducts();
    },
    e => console.error("Category realtime error:", e)
  );
}

/* ============================================================
   FILTER BAR RENDER
============================================================ */
function renderCategoryFilter() {
  if (!filterBar) return;

  let html = "";

  html += `
    <button class="chip ${window.activeCategory === "all" ? "active" : ""}"
            data-cat="all">
      ⭐ Barchasi
    </button>
  `;

  categories.forEach(cat => {
    html += `
      <button class="chip ${window.activeCategory === cat.code ? "active" : ""}"
              data-cat="${cat.code}">
        ${cat.emoji} ${cat.label}
      </button>
    `;
  });

  filterBar.innerHTML = html;
}

/* ============================================================
   FILTER BAR CLICKS
============================================================ */
function initFilterBarEvents() {
  if (!filterBar) return;

  filterBar.addEventListener("click", e => {
    const btn = e.target.closest(".chip");
    if (!btn) return;

    document.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
    btn.classList.add("active");

    window.activeCategory = btn.dataset.cat;
    rebuildProducts();
  });
}

/* ============================================================
   ADMIN: CATEGORY LIST RENDER
============================================================ */
function renderCategoryAdminList() {
  if (!adminCategoryListEl) return;

  if (!categories.length) {
    adminCategoryListEl.innerHTML = `
      <p class="empty-note">Hozircha kategoriya yo‘q</p>
    `;
    return;
  }

  adminCategoryListEl.innerHTML = "";

  categories.forEach(cat => {
    adminCategoryListEl.innerHTML += `
      <div class="admin-cat-row">
        <span>${cat.emoji} <b>${cat.label}</b> <small>(${cat.code})</small></span>
        <button onclick="editCategory('${cat.id}')" class="admin-edit-btn">✏️</button>
        <button onclick="deleteCategory('${cat.id}')" class="admin-delete-btn">✕</button>
      </div>
    `;
  });
}

/* ============================================================
   ADMIN: CATEGORY SAVE
============================================================ */
export async function saveCategory() {
  const code = adminCatCodeEl.value.trim().toLowerCase();
  const label = adminCatLabelEl.value.trim();
  const emoji = adminCatEmojiEl.value.trim() || "💅";

  if (!code || !label) {
    showToast("Kod va nomni kiriting.");
    return;
  }

  // mavjudmi?
  const found = categories.find(c => c.code === code);

  try {
    if (found) {
      // UPDATE
      await updateDoc(doc(categoriesCol, found.id), {
        code,
        label,
        emoji,
        updatedAt: serverTimestamp()
      });
      showToast("Kategoriya yangilandi!");
    } else {
      // ADD
      await addDoc(categoriesCol, {
        code,
        label,
        emoji,
        order: categories.length,
        createdAt: serverTimestamp()
      });
      showToast("Kategoriya qo‘shildi!");
    }

    adminCatCodeEl.value = "";
    adminCatLabelEl.value = "";
    adminCatEmojiEl.value = "";
  } catch (e) {
    console.error("Category save error:", e);
    showToast("Xatolik: " + e.message);
  }
}

/* ============================================================
   ADMIN: EDIT CATEGORY
============================================================ */
export function editCategory(id) {
  const cat = categories.find(c => c.id === id);
  if (!cat) return;

  adminCatCodeEl.value = cat.code;
  adminCatLabelEl.value = cat.label;
  adminCatEmojiEl.value = cat.emoji;

  showToast("Tahrirlash rejimi");
}

/* ============================================================
   ADMIN: DELETE CATEGORY
============================================================ */
export async function deleteCategory(id) {
  if (!confirm("Rostdan ham o‘chirasizmi?")) return;

  try {
    await deleteDoc(doc(categoriesCol, id));
    showToast("Kategoriya o‘chirildi");
  } catch (e) {
    console.error(e);
    showToast("Xato: " + e.message);
  }
}

/* ============================================================
   EXPORT to GLOBAL
============================================================ */
window.saveCategory = saveCategory;
window.editCategory = editCategory;
window.deleteCategory = deleteCategory;
