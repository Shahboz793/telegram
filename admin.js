/* ============================================================
   ADMIN.JS — Admin panel, mahsulot qo‘shish, tahrirlash, stock
============================================================ */

import {
  db, products, categories,
  productsCol, categoryLabel,
  normalizeImagesInput, RAW_PREFIX
} from "./data.js";

import {
  addDoc, updateDoc, deleteDoc,
  doc, serverTimestamp, onSnapshot
} from "./data.js";

import { rebuildProducts } from "./products.js";

/* DOM ELEMENTS */
let adminBtn = null;
let adminPanel = null;
let adminAccessBtn = null;

let adminProductList = null;

let adminNameEl = null;
let adminPriceEl = null;
let adminDiscountEl = null;
let adminCategoryEl = null;
let adminImagesEl = null;
let adminDescEl = null;
let adminStockEl = null;

let adminSaveBtn = null;

let editingProductId = null;

/* ============================================================
   INIT
============================================================ */
export function initAdminModule() {
  adminBtn = document.getElementById("adminTabBtn");
  adminPanel = document.getElementById("adminPage");
  adminAccessBtn = document.getElementById("adminAccessBtn");

  adminProductList = document.getElementById("adminProductList");

  adminNameEl = document.getElementById("adminName");
  adminPriceEl = document.getElementById("adminPrice");
  adminDiscountEl = document.getElementById("adminDiscount");
  adminCategoryEl = document.getElementById("adminCategory");
  adminImagesEl = document.getElementById("adminImages");
  adminDescEl = document.getElementById("adminDescription");
  adminStockEl = document.getElementById("adminStock");

  adminSaveBtn = document.getElementById("adminProductSave");

  if (adminSaveBtn) {
    adminSaveBtn.addEventListener("click", saveProduct);
  }

  subscribeProductsForAdmin();
}

/* ============================================================
   REALTIME ADMIN LISTENER
============================================================ */
function subscribeProductsForAdmin() {
  onSnapshot(productsCol, snap => {
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
        images: data.images || [],
        emoji: data.emoji || "💅",
        stock: data.stock ?? 999
      });
    });

    renderAdminProductList(list);
  });
}

/* ============================================================
   ADMIN PRODUCT LIST RENDER
============================================================ */
function renderAdminProductList(list) {
  if (!adminProductList) return;

  if (!list.length) {
    adminProductList.innerHTML = `<p class="empty-note">Mahsulot yo‘q</p>`;
    return;
  }

  adminProductList.innerHTML = "";

  list.forEach(p => {
    adminProductList.innerHTML += `
      <div class="admin-product-row">
        <span><b>${p.name}</b> — ${p.stock} dona • ${p.category}</span>
        <button onclick="editProduct('${p.id}')" class="admin-edit-btn">✏️</button>
        <button onclick="deleteProduct('${p.id}')" class="admin-delete-btn">✕</button>
      </div>
    `;
  });
}

/* ============================================================
   ADMIN: SAVE PRODUCT (ADD / EDIT)
============================================================ */
async function saveProduct() {
  const name = adminNameEl.value.trim();
  const price = parseInt(adminPriceEl.value, 10);
  const discount = parseInt(adminDiscountEl.value, 10);
  const category = adminCategoryEl.value;
  const description = adminDescEl.value.trim();
  const stock = parseInt(adminStockEl.value, 10);
  let images = normalizeImagesInput(adminImagesEl.value.trim());

  if (!name || !price || !category) {
    showToast("Iltimos, to‘liq ma’lumot kiriting.");
    return;
  }

  if (!images.length) {
    images = [RAW_PREFIX + "noimage.png"];
  }

  let finalPrice = price;
  let oldPrice = null;

  if (discount && discount > 0 && discount < price) {
    finalPrice = discount;
    oldPrice = price;
  }

  const payload = {
    name,
    price: finalPrice,
    oldPrice,
    category,
    description,
    images,
    emoji: window.categoryEmoji?.[category] || "💅",
    stock: stock || 0,
    updatedAt: serverTimestamp()
  };

  try {
    if (editingProductId) {
      // UPDATE
      await updateDoc(doc(productsCol, editingProductId), payload);
      showToast("Mahsulot yangilandi!");
    } else {
      // ADD
      await addDoc(productsCol, {
        ...payload,
        createdAt: serverTimestamp()
      });
      showToast("Mahsulot qo‘shildi!");
    }

    resetAdminForm();
  } catch (e) {
    console.error(e);
    showToast("Xatolik: " + e.message);
  }
}

/* ============================================================
   ADMIN: EDIT PRODUCT
============================================================ */
export function editProduct(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;

  editingProductId = id;

  adminNameEl.value = p.name;
  adminPriceEl.value = p.oldPrice || p.price;
  adminDiscountEl.value = p.oldPrice ? p.price : "";
  adminCategoryEl.value = p.category;
  adminDescEl.value = p.description;
  adminImagesEl.value = p.images.join(", ");
  adminStockEl.value = p.stock ?? 0;

  showToast("Tahrirlash rejimi");
}

/* ============================================================
   ADMIN: DELETE PRODUCT
============================================================ */
export async function deleteProduct(id) {
  if (!confirm("Rostdan ham o‘chirasizmi?")) return;

  try {
    await deleteDoc(doc(productsCol, id));
    showToast("Mahsulot o‘chirildi");
  } catch (e) {
    console.error(e);
    showToast("Xato: " + e.message);
  }
}

/* ============================================================
   RESET FORM
============================================================ */
function resetAdminForm() {
  editingProductId = null;

  adminNameEl.value = "";
  adminPriceEl.value = "";
  adminDiscountEl.value = "";
  adminCategoryEl.value = "";
  adminDescEl.value = "";
  adminImagesEl.value = "";
  adminStockEl.value = "";
}

/* ============================================================
   EXPORT to GLOBAL
============================================================ */
window.editProduct = editProduct;
window.deleteProduct = deleteProduct;
