/* =========================================
   FIREBASE INIT
========================================= */
import { 
  initializeApp 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";

import {
  getFirestore,
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDVidcgjpUxkg88bxXfIFzmsFydv0rMMao",
  authDomain: "shahboz-5d0a3.firebaseapp.com",
  projectId: "shahboz-5d0a3",
  storageBucket: "shahboz-5d0a3.firebasestorage.app",
  messagingSenderId: "352024095535",
  appId: "1:352024095535:web:3f495ac74cdd40f5c54fda",
  measurementId: "G-J8KFW5ED77"
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

/* =========================================
   COLLECTIONS
========================================= */
const productsCol   = collection(db, "beauty_products");
const categoriesCol = collection(db, "beauty_categories");
const ordersCol     = collection(db, "beauty_orders");   // NEW
const adminSettings = doc(db, "beauty_admin_settings", "security");

/* =========================================
   APP STATE
========================================= */
let products       = [];
let categories     = [];
let cart           = [];
let isAdmin        = false;

let activeCategory = "all";
let searchQuery    = "";

let customerInfo   = null;   // {name, phone, address}
let currentUserId  = null;   // buyurtmalarni o'zlashtirish uchun

/* =========================================
   UI ELEMENTS
========================================= */
const productsGrid  = document.getElementById("productsGrid");
const filterBar     = document.getElementById("filterBar");
const searchInput   = document.getElementById("searchInput");
const customerInfoTextEl = document.getElementById("customerInfoText");

const cartCountTopEl = document.getElementById("cartCountTop");
const cartSheet      = document.getElementById("cartSheet");
const cartOverlay    = document.getElementById("cartSheetOverlay");
const cartItemsEl    = document.getElementById("cartItems");
const cartSheetTotalEl = document.getElementById("cartSheetTotal");

const tabsEl        = document.getElementById("tabs");
const ordersListEl  = document.getElementById("ordersList");

const adminTabBtn   = document.getElementById("adminTabBtn");
const adminAccessBtn= document.getElementById("adminAccessBtn");
const adminOrdersListEl = document.getElementById("adminOrdersList");

/* PRODUCT DETAIL */
const productDetailOverlay = document.getElementById("productDetailOverlay");
const detailImageEl        = document.getElementById("detailImage");
const detailNameEl         = document.getElementById("detailName");
const detailCategoryEl     = document.getElementById("detailCategory");
const detailTagEl          = document.getElementById("detailTag");
const detailDescEl         = document.getElementById("detailDesc");
const detailPriceEl        = document.getElementById("detailPrice");
const detailOldPriceEl     = document.getElementById("detailOldPrice");
const detailBackBtn        = document.getElementById("detailBackBtn");
const detailAddBtn         = document.getElementById("detailAddBtn");
const detailPrevBtn        = document.getElementById("detailPrevBtn");
const detailNextBtn        = document.getElementById("detailNextBtn");
const detailImageIndexEl   = document.getElementById("detailImageIndex");
const detailQtyMinus       = document.getElementById("detailQtyMinus");
const detailQtyPlus        = document.getElementById("detailQtyPlus");
const detailQtyValue       = document.getElementById("detailQtyValue");

/* AUDIO */
const sNewOrder    = document.getElementById("soundNewOrder");
const sConfirmed   = document.getElementById("soundConfirmed");
const sCourier     = document.getElementById("soundCourier");
const sDelivered   = document.getElementById("soundDelivered");
const sRejected    = document.getElementById("soundRejected");
const sUserConfirm = document.getElementById("soundCustomerConfirm");

/* =========================================
   AUDIO HELPERS
========================================= */
function play(sound) {
  try { sound.currentTime = 0; sound.play(); } catch (e) {}
}

/* =========================================
   TOAST
========================================= */
const toastEl = document.getElementById("toast");

function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  setTimeout(() => toastEl.classList.remove("show"), 1500);
}

/* =========================================
   THEME
========================================= */
const themeKey = "beauty_theme";

function applyTheme(t) {
  document.body.classList.toggle("theme-dark", t === "dark");
}

function toggleTheme() {
  const current = localStorage.getItem(themeKey) || "dark";
  const next = current === "dark" ? "light" : "dark";
  localStorage.setItem(themeKey, next);
  applyTheme(next);
}

document.getElementById("themeToggleBtn")?.addEventListener("click", toggleTheme);

/* =========================================
   CUSTOMER INFO
========================================= */
const STORAGE_CUSTOMER = "beauty_customer_info";

function loadCustomerInfo() {
  try {
    customerInfo = JSON.parse(localStorage.getItem(STORAGE_CUSTOMER) || "null");
  } catch (_) {
    customerInfo = null;
  }
}

function saveCustomerInfo() {
  localStorage.setItem(STORAGE_CUSTOMER, JSON.stringify(customerInfo));
}

function promptCustomerInfo() {
  const name = prompt("Ismingiz:");
  if (!name) return null;

  const phone = prompt("Telefon:");
  if (!phone) return null;

  const address = prompt("Manzil:");
  if (!address) return null;

  const info = { name, phone, address };
  customerInfo = info;
  saveCustomerInfo();
  renderCustomerInfo();
  return info;
}

function getCustomerInfo() {
  if (!customerInfo) return promptCustomerInfo();
  return customerInfo;
}

function renderCustomerInfo() {
  if (!customerInfo) {
    customerInfoTextEl.textContent = "Ism va telefon hali kiritilmagan.";
  } else {
    customerInfoTextEl.textContent =
      `👤 ${customerInfo.name} • 📱 ${customerInfo.phone} • 📍 ${customerInfo.address}`;
  }
}

/* =========================================
   PRODUCTS + CATEGORIES REALTIME
========================================= */
function subscribeProducts() {
  onSnapshot(productsCol, snap => {
    products = [];
    snap.forEach(d => {
      const data = d.data();
      products.push({
        id: d.id,
        name: data.name,
        price: data.price,
        oldPrice: data.oldPrice || null,
        category: data.category,
        tag: data.tag || "",
        description: data.description || "",
        images: data.images || []
      });
    });
    renderProducts();
  });
}

function subscribeCategories() {
  onSnapshot(categoriesCol, snap => {
    categories = [];
    snap.forEach(d => {
      const data = d.data();
      categories.push({
        id: d.id,
        code: data.code,
        label: data.label,
        emoji: data.emoji
      });
    });
    renderCategoryBar();
  });
}

/* =========================================
   CATEGORY BAR RENDER
========================================= */
function renderCategoryBar() {
  let html = "";
  html += `<button class="chip ${activeCategory==="all"?"active":""}" data-code="all">⭐ Barchasi</button>`;

  categories.forEach(c => {
    html += `<button class="chip ${activeCategory===c.code?"active":""}" data-code="${c.code}">
               ${c.emoji} ${c.label}
             </button>`;
  });

  filterBar.innerHTML = html;

  filterBar.querySelectorAll("button").forEach(btn => {
    btn.addEventListener("click", () => {
      activeCategory = btn.dataset.code;
      renderProducts();
    });
  });
}

/* =========================================
   PRODUCTS RENDER
========================================= */
function renderProducts() {
  let list = products;

  if (activeCategory !== "all")
    list = list.filter(p => p.category === activeCategory);

  if (searchQuery)
    list = list.filter(p => 
      p.name.toLowerCase().includes(searchQuery) ||
      p.tag.toLowerCase().includes(searchQuery)
    );

  if (!list.length) {
    productsGrid.innerHTML = `<p style="padding:20px;text-align:center;color:#94a3b8;">
      Mahsulot topilmadi
    </p>`;
    return;
  }

  let html = "";
  list.forEach((p, i) => {
    const firstImg = p.images?.[0] || "";
    html += `
    <div class="product-card" onclick="openProductDetail(${i})">
      <div class="product-img-wrap">
        <img src="${firstImg}" />
      </div>
      <div class="product-body">
        <div class="product-name">${p.name}</div>
        <div class="product-meta">${p.category} • ${p.tag}</div>
        <div class="price-row">
          <div>
            <div class="price-main">${p.price} so‘m</div>
            ${p.oldPrice ? `<div class="price-old">${p.oldPrice} so‘m</div>` : ""}
          </div>
          <button class="btn-add" onclick="event.stopPropagation(); addToCart(${i});">
            ➕ Savatga
          </button>
        </div>
      </div>
    </div>`;
  });

  productsGrid.innerHTML = html;
}

/* =========================================
   SEARCH INPUT
========================================= */
if (searchInput) {
  searchInput.addEventListener("input", () => {
    searchQuery = searchInput.value.trim().toLowerCase();
    renderProducts();
  });
}

/* =========================================
   START INIT
========================================= */
(function init() {
  const savedTheme = localStorage.getItem(themeKey) || "dark";
  applyTheme(savedTheme);

  loadCustomerInfo();
  renderCustomerInfo();

  subscribeProducts();
  subscribeCategories();
})();
/* =========================================
   SAVAT TIZIMI
========================================= */
function addToCart(index) {
  const p = products[index];
  if (!p) return;

  const found = cart.find(c => c.id === p.id);
  if (found) {
    found.qty++;
  } else {
    cart.push({ id: p.id, qty: 1 });
  }
  updateCartUI();
  showToast("Savatga qo‘shildi!");
}

function changeQty(productId, delta) {
  const item = cart.find(c => c.id === productId);
  if (!item) return;

  item.qty += delta;
  if (item.qty <= 0) {
    cart = cart.filter(c => c.id !== productId);
  }
  updateCartUI();
}

function removeFromCart(productId) {
  cart = cart.filter(c => c.id !== productId);
  updateCartUI();
}

function calculateCartTotals() {
  let totalQty = 0;
  let totalSum = 0;

  cart.forEach(c => {
    const p = products.find(p => p.id === c.id);
    if (!p) return;
    totalQty += c.qty;
    totalSum += p.price * c.qty;
  });

  return { totalQty, totalSum };
}

function updateCartUI() {
  const { totalQty, totalSum } = calculateCartTotals();
  cartCountTopEl.textContent = totalQty;
  cartSheetTotalEl.textContent = `${totalSum.toLocaleString()} so‘m`;

  renderCartItems();
}

/* =========================================
   CART SHEET
========================================= */
function toggleCartSheet(force = null) {
  const isOpen = cartSheet.classList.contains("open");
  const next = force !== null ? force : !isOpen;

  cartSheet.classList.toggle("open", next);
  cartOverlay.classList.toggle("show", next);
}

cartOverlay.addEventListener("click", () => toggleCartSheet(false));

function renderCartItems() {
  if (!cart.length) {
    cartItemsEl.innerHTML = `<p class="cart-empty">Savat bo‘sh 🙂</p>`;
    return;
  }

  let html = "";

  cart.forEach(item => {
    const p = products.find(pp => pp.id === item.id);
    if (!p) return;

    html += `
    <div class="cart-item-row">
      <div class="cart-item-main">
        <div class="cart-item-name">${p.name}</div>
        <div class="cart-item-meta">${p.price} so‘m</div>
      </div>

      <div class="cart-item-actions">
        <div class="qty-control">
          <button onclick="changeQty('${item.id}', -1)">-</button>
          <span>${item.qty}</span>
          <button onclick="changeQty('${item.id}', 1)">+</button>
        </div>

        <div class="cart-item-total">${(p.price * item.qty).toLocaleString()} so‘m</div>

        <button class="cart-remove" onclick="removeFromCart('${item.id}')">✕</button>
      </div>
    </div>`;
  });

  cartItemsEl.innerHTML = html;
}

/* =========================================
   PRODUCT DETAIL — OVERLAY
========================================= */
let detailIndex = null;
let detailQty = 1;
let detailImageIndex = 0;

function openProductDetail(i) {
  detailIndex = i;
  detailQty = 1;
  detailImageIndex = 0;

  const p = products[i];
  if (!p) return;

  renderDetailImage();
  detailNameEl.textContent = p.name;
  detailCategoryEl.textContent = p.category;
  detailTagEl.textContent = p.tag;
  detailDescEl.textContent = p.description || "Tavsif mavjud emas";

  detailPriceEl.textContent = `${p.price.toLocaleString()} so‘m`;

  if (p.oldPrice) {
    detailOldPriceEl.classList.remove("hidden");
    detailOldPriceEl.textContent = `${p.oldPrice.toLocaleString()} so‘m`;
  } else {
    detailOldPriceEl.classList.add("hidden");
  }

  detailQtyValue.textContent = "1";
  detailAddBtn.textContent = "🛒 Savatga qo‘shish";
  detailAddBtn.classList.remove("added");

  productDetailOverlay.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeProductDetail() {
  productDetailOverlay.classList.add("hidden");
  document.body.style.overflow = "";
}

productDetailOverlay.addEventListener("click", e => {
  if (e.target === productDetailOverlay) closeProductDetail();
});

/* =========================================
   DETAIL GALLERY
========================================= */
function getDetailImages() {
  const p = products[detailIndex];
  return p?.images?.length ? p.images : [];
}

function renderDetailImage() {
  const imgs = getDetailImages();
  if (!imgs.length) return;

  if (detailImageIndex < 0) detailImageIndex = imgs.length - 1;
  if (detailImageIndex >= imgs.length) detailImageIndex = 0;

  detailImageEl.src = imgs[detailImageIndex];
  detailImageIndexEl.textContent = `${detailImageIndex + 1} / ${imgs.length}`;
}

detailPrevBtn.addEventListener("click", e => {
  e.stopPropagation();
  detailImageIndex--;
  renderDetailImage();
});

detailNextBtn.addEventListener("click", e => {
  e.stopPropagation();
  detailImageIndex++;
  renderDetailImage();
});

/* =========================================
   DETAIL QTY
========================================= */
detailQtyMinus.addEventListener("click", e => {
  e.stopPropagation();
  if (detailQty > 1) {
    detailQty--;
    detailQtyValue.textContent = detailQty;
  }
});

detailQtyPlus.addEventListener("click", e => {
  e.stopPropagation();
  detailQty++;
  detailQtyValue.textContent = detailQty;
});

/* =========================================
   DETAIL — ADD TO CART
========================================= */
detailAddBtn.addEventListener("click", () => {
  const p = products[detailIndex];
  if (!p) return;

  // Allaqachon qo‘shilgan bo‘lsa → magazinga qaytish
  if (detailAddBtn.classList.contains("added")) {
    closeProductDetail();
    return;
  }

  const found = cart.find(c => c.id === p.id);
  if (found) found.qty += detailQty;
  else cart.push({ id: p.id, qty: detailQty });

  updateCartUI();

  detailAddBtn.classList.add("added");
  detailAddBtn.textContent = "⬅️ Magaziniga qaytish";
});

/* =========================================
   BUYURTMA YARATISH (MIJOZ)
========================================= */
async function sendOrder() {
  if (!cart.length) {
    showToast("Savat bo‘sh");
    return;
  }

  const info = getCustomerInfo();
  if (!info) {
    showToast("Ma'lumot to‘liq emas");
    return;
  }

  const orderItems = cart.map(c => {
    const p = products.find(pp => pp.id === c.id);
    if (!p) return null;

    return {
      productId: p.id,
      name: p.name,
      price: p.price,
      qty: c.qty
    };
  }).filter(Boolean);

  // umumiy summa
  const total = orderItems.reduce((a, c) => a + c.price * c.qty, 0);

  try {
    const docRef = await addDoc(ordersCol, {
      userId: currentUserId,
      customer: info,
      items: orderItems,
      total,
      status: "pending",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      deliverTime: null,
      payment: "unpaid"
    });

    showToast("Buyurtma yuborildi!");
    play(sNewOrder);

    cart = [];
    updateCartUI();
    toggleCartSheet(false);

  } catch (e) {
    console.error(e);
    showToast("Xatolik: buyurtma yuborilmadi");
  }
}

/* =========================================
   MIJOZ BUYURTMALARI REAL-TIME
========================================= */
function subscribeMyOrders() {
  if (!currentUserId) return;

  const q = onSnapshot(ordersCol, snap => {
    let list = [];
    snap.forEach(d => {
      const data = d.data();
      if (data.userId === currentUserId) {
        list.push({
          id: d.id,
          ...data
        });
      }
    });

    renderMyOrders(list);
  });
}

function renderMyOrders(list) {
  if (!list.length) {
    ordersListEl.innerHTML = `<p style="text-align:center;color:#94a3b8;padding:20px">
      Buyurtmalar yo‘q
    </p>`;
    return;
  }

  let html = "";

  list.sort((a,b) => b.createdAt?.seconds - a.createdAt?.seconds);

  list.forEach(o => {
    let statusColor = "status-pending";
    if (o.status === "confirmed") statusColor = "status-confirmed";
    if (o.status === "courier")   statusColor = "status-courier";
    if (o.status === "delivered") statusColor = "status-delivered";
    if (o.status === "finished")  statusColor = "status-delivered";
    if (o.status === "rejected")  statusColor = "status-rejected";

    html += `
    <div class="order-card ${o.status === "finished" ? "order-completed" : ""}">
      <div><b>№${o.id.slice(-5)}</b> — ${o.total.toLocaleString()} so‘m</div>

      <div class="order-status ${statusColor}">
        ${renderStatusText(o.status)}
      </div>

      <div style="margin-top:10px;font-size:13px;color:#94a3b8">
        ${o.items.length} ta mahsulot
      </div>

      ${o.status === "delivered" ? `
        <button class="confirm-btn" onclick="confirmReceived('${o.id}')">
          Tasdiqlayman — buyurtma oldim
        </button>
      ` : ""}
    </div>`;
  });

  ordersListEl.innerHTML = html;
}

function renderStatusText(s) {
  return {
    pending: "⏳ Admin tasdiqlashi kutilmoqda",
    confirmed: "🧾 Buyurtma tasdiqlandi",
    courier: "🚚 Kuryer yo‘lda",
    delivered: "📦 Yetkazib berildi — mijoz tasdiqlashi kerak",
    finished: "✅ Buyurtma yakunlandi",
    rejected: "❌ Bekor qilindi"
  }[s] || "Holat noma'lum";
}

async function confirmReceived(id) {
  try {
    await updateDoc(doc(db,"beauty_orders",id), {
      status: "finished",
      updatedAt: serverTimestamp()
    });

    play(sUserConfirm);
    showToast("Rahmat! Buyurtma yakunlandi.");

  } catch (e) {
    console.error(e);
  }
}
/* =========================================
   ADMIN LOGIN
========================================= */
adminAccessBtn?.addEventListener("click", async () => {
  const code = prompt("Admin kodi:");
  if (!code) return;

  try {
    const snap = await getDoc(adminSettings);
    const data = snap.data();

    if (data?.code === code) {
      isAdmin = true;
      showToast("Admin rejimiga o'tildi");
      adminTabBtn.classList.remove("hidden");
      tabsEl.querySelector("[data-page='adminPage']").click();
      subscribeAdminOrders();
    } else {
      showToast("Noto‘g‘ri kod");
    }
  } catch (e) {
    console.error(e);
  }
});

/* =========================================
   ADMIN ORDERS REAL-TIME LISTENER
========================================= */
function subscribeAdminOrders() {
  onSnapshot(ordersCol, snap => {
    let list = [];
    snap.forEach(d => {
      list.push({
        id: d.id,
        ...d.data()
      });
    });

    list.sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds);

    renderAdminOrders(list);
  });
}

/* =========================================
   ADMIN RENDER BUYURTMALAR
========================================= */
function renderAdminOrders(list) {
  if (!list.length) {
    adminOrdersListEl.innerHTML = `<p style="text-align:center;padding:20px;color:#94a3b8">
      Buyurtmalar yo‘q
    </p>`;
    return;
  }

  let html = "";

  list.forEach(o => {
    let statusColor = "status-pending";
    if (o.status === "confirmed") statusColor = "status-confirmed";
    if (o.status === "courier")   statusColor = "status-courier";
    if (o.status === "delivered") statusColor = "status-delivered";
    if (o.status === "finished")  statusColor = "status-delivered";
    if (o.status === "rejected")  statusColor = "status-rejected";

    html += `
      <div class="order-card admin-order ${o.status === "finished" ? "order-completed" : ""}">
        
        <div class="order-head">
          <div><b>№${o.id.slice(-5)}</b></div>
          <div>${o.total.toLocaleString()} so‘m</div>
        </div>

        <div class="order-customer">
          👤 ${o.customer.name}<br>
          📱 ${o.customer.phone}<br>
          📍 ${o.customer.address}
        </div>

        <div class="order-status ${statusColor}">
          ${renderStatusText(o.status)}
        </div>

        <div class="order-items">
          ${renderAdminOrderItems(o.items)}
        </div>

        <div class="order-actions">
          ${renderAdminButtons(o)}
        </div>
      </div>
    `;
  });

  adminOrdersListEl.innerHTML = html;
}

/* =========================================
   ADMIN ORDER ITEMS
========================================= */
function renderAdminOrderItems(items) {
  return items.map(i => `
    <div class="admin-item-row">
      <div>${i.name}</div>
      <div>${i.qty} × ${i.price}</div>
    </div>
  `).join("");
}

/* =========================================
   ADMIN STATUS BUTTONS
========================================= */
function renderAdminButtons(o) {
  if (o.status === "pending") {
    return `
      <button class="btn-ok" onclick="adminConfirm('${o.id}')">Tasdiqlash</button>
      <button class="btn-reject" onclick="adminReject('${o.id}')">Bekor qilish</button>
    `;
  }

  if (o.status === "confirmed") {
    return `
      <button class="btn-ok" onclick="adminCourier('${o.id}')">Kuryerga berish</button>
    `;
  }

  if (o.status === "courier") {
    return `
      <button class="btn-delivered" onclick="adminDelivered('${o.id}')">Yetkazildi</button>
    `;
  }

  if (o.status === "delivered") {
    return `
      <p class="wait-text">Mijoz tasdiqlashi kutilmoqda...</p>
    `;
  }

  if (o.status === "finished") {
    return `
      <p class="done-text">Buyurtma yakunlandi</p>
    `;
  }

  if (o.status === "rejected") {
    return `
      <p class="reject-text">Bekor qilingan</p>
    `;
  }

  return "";
}

/* =========================================
   ADMIN STATUS FUNKSIYALAR
========================================= */

async function adminConfirm(id) {
  await updateOrderStatus(id, "confirmed");
  play(sConfirmed);
}

async function adminCourier(id) {
  await updateOrderStatus(id, "courier");
  play(sCourier);

  const time = prompt("Kuryer necha daqiqada yetkazadi?");
  if (time) {
    await updateDoc(doc(db,"beauty_orders",id), {
      deliverTime: time
    });
  }
}

async function adminDelivered(id) {
  await updateOrderStatus(id, "delivered");
  play(sDelivered);
}

async function adminReject(id) {
  await updateOrderStatus(id, "rejected");
  play(sRejected);
}

async function updateOrderStatus(id, status) {
  try {
    await updateDoc(doc(db,"beauty_orders",id), {
      status,
      updatedAt: serverTimestamp()
    });
  } catch (e) {
    console.error(e);
  }
}

/* =========================================
   ADMIN MAHSULOT QO‘SHISH
========================================= */
async function addCustomProduct() {
  const name = document.getElementById("adminName").value.trim();
  const priceBase = Number(document.getElementById("adminPriceBase").value);
  const hasDiscount = document.getElementById("adminHasDiscount").checked;
  const priceDiscount = Number(document.getElementById("adminPriceDiscount").value);
  const category = document.getElementById("adminCategory").value.trim();
  const tag = document.getElementById("adminTag").value.trim();
  const description = document.getElementById("adminDescription").value.trim();
  const imagesRaw = document.getElementById("adminImages").value.trim();

  if (!name || !priceBase || !category) {
    showToast("Maydonlar to‘liq emas");
    return;
  }

  const imgs = imagesRaw.split(",").map(a => a.trim()).filter(Boolean);

  try {
    await addDoc(productsCol, {
      name,
      price: hasDiscount ? priceDiscount : priceBase,
      oldPrice: hasDiscount ? priceBase : null,
      category,
      tag,
      description,
      images: imgs
    });
    showToast("Mahsulot qo‘shildi!");
  } catch (e) {
    console.error(e);
  }
}

/* =========================================
   ADMIN CATEGORY CRUD
========================================= */
async function saveCategory() {
  const code = document.getElementById("adminCatCode").value.trim();
  const label = document.getElementById("adminCatLabel").value.trim();
  const emoji = document.getElementById("adminCatEmoji").value.trim();

  if (!code || !label) {
    showToast("Maydonlar to‘liq emas");
    return;
  }

  try {
    await addDoc(categoriesCol, { code, label, emoji });
    showToast("Kategoriya qo‘shildi!");
  } catch (e) {
    console.error(e);
  }
}
/* =========================================
   CUSTOMER REAL-TIME LISTENER
========================================= */
let customerOrdersUnsub = null;

function subscribeCustomerOrders() {
  if (!userId) {
    console.warn("userId yo‘q — buyurtma kuzatilmaydi");
    return;
  }

  if (customerOrdersUnsub) customerOrdersUnsub();

  customerOrdersUnsub = onSnapshot(
    query(ordersCol, where("userId", "==", userId)),
    snap => {
      let list = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));

      list.sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds);

      renderCustomerOrders(list);
      checkCustomerAlerts(list);
    }
  );
}

/* =========================================
   CUSTOMER RENDER ORDERS
========================================= */
function renderCustomerOrders(list) {
  if (!customerOrdersListEl) return;

  if (!list.length) {
    customerOrdersListEl.innerHTML = `
      <p class="empty-info">
        Hozircha buyurtma yo‘q.
      </p>`;
    return;
  }

  let html = "";

  list.forEach(o => {
    let statusColor = "status-pending";
    if (o.status === "confirmed") statusColor = "status-confirmed";
    if (o.status === "courier")   statusColor = "status-courier";
    if (o.status === "delivered") statusColor = "status-delivered";
    if (o.status === "finished")  statusColor = "status-delivered";
    if (o.status === "rejected")  statusColor = "status-rejected";

    html += `
      <div class="order-card">
        <div class="order-head">
          <div><b>№${o.id.slice(-5)}</b></div>
          <div>${o.total?.toLocaleString()} so‘m</div>
        </div>

        <div class="order-status ${statusColor}">
          ${renderStatusText(o.status)}
        </div>

        <div class="order-items">
          ${o.items.map(it => `
            <div class="order-item">
              <span>${it.name}</span>
              <span>${it.qty} × ${it.price}</span>
            </div>
          `).join("")}
        </div>

        ${o.status === "delivered" ? `
          <button class="btn-ok" onclick="customerFinish('${o.id}')">
            Buyurtmani qabul qildim
          </button>
        ` : ""}

        ${o.status === "finished" ? `
          <p class="order-completed-text">
            Buyurtma yakunlangan
          </p>
        ` : ""}
      </div>
    `;
  });

  customerOrdersListEl.innerHTML = html;
}

/* =========================================
   CUSTOMER CLICK: FINISH ORDER
========================================= */
async function customerFinish(id) {
  try {
    await updateDoc(doc(db, "beauty_orders", id), {
      status: "finished",
      updatedAt: serverTimestamp()
    });
    play(sDelivered);
    showToast("Rahmat! Buyurtma yakunlandi");
  } catch (e) {
    console.error(e);
  }
}

/* =========================================
   CUSTOMER ALERT (SOUND & NOTIFICATION)
========================================= */
let lastSeenStatus = {};

function checkCustomerAlerts(list) {
  list.forEach(o => {
    const prev = lastSeenStatus[o.id];
    if (prev && prev !== o.status) {
      play(statusSound(o.status)); 
    }
    lastSeenStatus[o.id] = o.status;
  });
}

function statusSound(st) {
  if (st === "confirmed") return sConfirmed;
  if (st === "courier")   return sCourier;
  if (st === "delivered") return sDelivered;
  if (st === "rejected")  return sRejected;
  return sNew;
}

/* =========================================
   TAB NAVIGATION
========================================= */
tabsEl?.addEventListener("click", (e) => {
  const btn = e.target.closest(".tab-btn");
  if (!btn) return;

  const page = btn.dataset.page;

  // Admin bo‘limiga faqat admin kira oladi
  if (page === "adminPage" && !isAdmin) {
    showToast("Admin kodini kiriting");
    return;
  }

  document.querySelectorAll(".tab-btn").forEach(t => t.classList.remove("active"));
  btn.classList.add("active");

  document.querySelectorAll(".page").forEach(p => p.classList.add("hidden"));
  document.getElementById(page).classList.remove("hidden");

  if (page === "customerOrdersPage") {
    subscribeCustomerOrders();
  }
});

/* =========================================
   TELEGRAM WebApp BACK / CLOSE EVENTS
========================================= */
if (tg) {
  tg.onEvent("backButtonClicked", () => {
    closeProductDetail();
  });
  tg.BackButton.show();
}

/* =========================================
   BODY SCROLL LOCK HELPERS
========================================= */
function lockBody() {
  document.body.style.overflow = "hidden";
}
function unlockBody() {
  document.body.style.overflow = "";
}

/* =========================================
   WINDOW EXPORT (GLOBAL)
========================================= */
window.sendOrder = sendOrder;
window.openProductDetail = openProductDetail;
window.closeProductDetail = closeProductDetail;

window.adminConfirm = adminConfirm;
window.adminReject = adminReject;
window.adminCourier = adminCourier;
window.adminDelivered = adminDelivered;

window.addCustomProduct = addCustomProduct;
window.saveCategory = saveCategory;
window.customerFinish = customerFinish;

/* =========================================
   INIT — START SYSTEM
========================================= */
(function init() {
  applyTheme(localStorage.getItem(THEME_KEY) || "light");
  renderCustomerInfo();
  renderCategoryFilter();
  renderProducts();

  subscribeProductsRealtime();
  subscribeCategoriesRealtime();

  userId = localStorage.getItem("beautyUserId");
  if (!userId) {
    userId = "U" + Math.random().toString(36).slice(2);
    localStorage.setItem("beautyUserId", userId);
  }

  subscribeCustomerOrders();
})();
