// FIREBASE MODULLARI CDN ORQALI
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  getDoc,
  updateDoc,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// SENING KONFIGING
const firebaseConfig = {
  apiKey: "AIzaSyDVidcgjpUxkg88bxXfIFzmsFydv0rMMao",
  authDomain: "shahboz-5d0a3.firebaseapp.com",
  projectId: "shahboz-5d0a3",
  storageBucket: "shahboz-5d0a3.firebasestorage.app",
  messagingSenderId: "352024095535",
  appId: "1:352024095535:web:3f495ac74cdd40f5c54fda",
  measurementId: "G-J8KFW5ED77"
};

// INIT
const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

// 🔥 KOLLEKSIYALAR
const productsCol   = collection(db, "beauty_products");
const categoriesCol = collection(db, "beauty_categories");

// KONSTANTALAR
const STORAGE_HISTORY  = "beauty_order_history";
const STORAGE_CUSTOMER = "beauty_customer_info"; // 👤 ism + telefon + manzil
const THEME_KEY        = "beauty_theme";
const RAW_PREFIX       = "https://raw.githubusercontent.com/hanbek221-design/kosmetika-premium/main/images/";

// DEFAULT EMOJI / LABEL (fallback uchun)
const categoryEmoji = {
  "default":"💅"
};
const categoryLabel = {};

// 🔥 DEFAULT MAHSULOTLARINI OLIB TASHLADIK – HAMMASINI O‘ZING QO‘SHASAN
const defaultProducts = []; // [ ] – hech narsa yo‘q

// STATE
let products       = [];
let remoteProducts = [];
let cart           = [];
let activeCategory = "all";
let currentSearch  = "";
let isAdmin        = false;

// 🆕 KATEGORIYA STATE
let categories         = [];   // Firestore’dan kelgan
let editingProductId   = null;
let editingCategoryId  = null;

// Detail oynasi uchun state
let detailIndex              = null;
let detailImageIndex         = 0;
let detailQty                = 1;
let detailCountdownTimer     = null;
let detailCountdownRemaining = 0;

// DOM
const productsGrid         = document.getElementById("productsGrid");
const filterBar            = document.getElementById("filterBar");
const cartCountTopEl       = document.getElementById("cartCountTop");
const cartTotalTopEl       = document.getElementById("cartTotalTop");
const toastEl              = document.getElementById("toast");
const cartSheet            = document.getElementById("cartSheet");
const cartSheetOverlay     = document.getElementById("cartSheetOverlay");
const cartItemsEl          = document.getElementById("cartItems");
const cartSheetTotalEl     = document.getElementById("cartSheetTotal");
const themeToggleBtn       = document.getElementById("themeToggleBtn");
const tabsEl               = document.getElementById("tabs");
const historyListEl        = document.getElementById("historyList");
const adminCustomListEl    = document.getElementById("adminCustomList");
const adminAccessBtn       = document.getElementById("adminAccessBtn");
const adminTabBtn          = document.getElementById("adminTabBtn");
const searchInput          = document.getElementById("searchInput");
const customerInfoTextEl   = document.getElementById("customerInfoText");

const productDetailOverlay = document.getElementById("productDetailOverlay");
const detailImageEl        = document.getElementById("detailImage");
const detailCategoryEl     = document.getElementById("detailCategory");
const detailNameEl         = document.getElementById("detailName");
const detailTagEl          = document.getElementById("detailTag");
const detailDescEl         = document.getElementById("detailDesc");
const detailPriceEl        = document.getElementById("detailPrice");
const detailOldPriceEl     = document.getElementById("detailOldPrice");
const detailAddBtn         = document.getElementById("detailAddBtn");
const detailBackBtn        = document.getElementById("detailBackBtn");

// Galereya tugmalari + rasm raqami
const detailPrevBtn      = document.getElementById("detailPrevBtn");
const detailNextBtn      = document.getElementById("detailNextBtn");
const detailImageIndexEl = document.getElementById("detailImageIndex");

// Miqdor tugmalari
const detailQtyMinus = document.getElementById("detailQtyMinus");
const detailQtyPlus  = document.getElementById("detailQtyPlus");
const detailQtyValue = document.getElementById("detailQtyValue");

// ADMIN FORM DOM (mahsulot)
const adminNameEl          = document.getElementById("adminName");
const adminCategoryEl      = document.getElementById("adminCategory");
const adminPriceBaseEl     = document.getElementById("adminPriceBase");
const adminHasDiscountEl   = document.getElementById("adminHasDiscount");
const adminPriceDiscountEl = document.getElementById("adminPriceDiscount");
const adminTagEl           = document.getElementById("adminTag");
const adminDescriptionEl   = document.getElementById("adminDescription");
const adminImagesEl        = document.getElementById("adminImages");

// ADMIN FORM DOM (kategoriyalar)
const adminCatCodeEl      = document.getElementById("adminCatCode");
const adminCatLabelEl     = document.getElementById("adminCatLabel");
const adminCatEmojiEl     = document.getElementById("adminCatEmoji");
const adminCategoryListEl = document.getElementById("adminCategoryList");

// HELPERS
function formatPrice(v){ 
  return Number(v || 0).toLocaleString("uz-UZ"); 
}

function showToast(message){
  if(!toastEl) return;
  toastEl.textContent = message;
  toastEl.classList.add("show");
  setTimeout(()=> toastEl.classList.remove("show"), 1500);
}

function normalizeImagesInput(raw) {
  if (!raw) return [];
  return raw
    .split(",")
    .map(s => s.trim())
    .filter(Boolean)
    .map(token => {
      if (/^https?:\/\//i.test(token)) {
        return token;
      }
      const name = token.replace(/\.(png|jpg|jpeg)$/i, "");
      return RAW_PREFIX + name + ".png";
    });
}

function setImageWithPngJpgFallback(imgElement, url) {
  if (!imgElement) return;
  if (!url) {
    imgElement.onerror = null;
    imgElement.src = RAW_PREFIX + "noimage.png";
    return;
  }
  if (url.startsWith(RAW_PREFIX)) {
    const base = url.replace(/\.(png|jpg|jpeg)$/i, "");
    imgElement.onerror = function(){
      this.onerror = null;
      this.src = base + ".jpg";
    };
    imgElement.src = base + ".png";
  } else {
    imgElement.onerror = null;
    imgElement.src = url;
  }
}

// 🔵 RASM PRELOAD (detail ochilganda hamma rasmlar yuklanadi)
function preloadProductImages(p) {
  if (!p || !p.images || !p.images.length) return;
  p.images.forEach(url => {
    const img = new Image();
    if (url.startsWith(RAW_PREFIX)) {
      const base = url.replace(/\.(png|jpg|jpeg)$/i, "");
      img.onerror = function(){
        this.onerror = null;
        this.src = base + ".jpg";
      };
      img.src = base + ".png";
    } else {
      img.src = url;
    }
  });
}

function matchesSearch(p){
  if(!currentSearch) return true;
  const q    = currentSearch;
  const name = (p.name || "").toLowerCase();
  const tag  = (p.tag || "").toLowerCase();
  const desc = (p.description || "").toLowerCase();
  const cat  = (p.category || "").toLowerCase();
  return name.includes(q) || tag.includes(q) || desc.includes(q) || cat.includes(q);
}

/* ===================== 👤 MIJOZ MA'LUMOTLARI ===================== */
function renderCustomerInfo(){
  if(!customerInfoTextEl) return;
  let info = null;
  try {
    info = JSON.parse(localStorage.getItem(STORAGE_CUSTOMER) || "null");
  } catch (e) {
    info = null;
  }
  if(info && info.name && info.phone){
    customerInfoTextEl.textContent =
      "👤 " + info.name + " • 📱 " + info.phone + (info.address ? " • 📍 " + info.address : "");
  } else {
    customerInfoTextEl.textContent =
      "Hozircha ism va telefon saqlanmagan. Buyurtma berganingizda so‘raladi.";
  }
}

function promptNewCustomerInfo() {
  const name = prompt("👤 Ismingizni kiriting (masalan, Shahboz):");
  if (!name) return null;
  const phone = prompt("📱 Telefon raqamingizni kiriting (masalan, +99890 123 45 67):");
  if (!phone) return null;
  const address = prompt("📍 Manzilingizni kiriting (shahar, tuman, ko'cha, uy):");
  if (!address) return null;
  const info = {
    name: name.trim(),
    phone: phone.trim(),
    address: address.trim()
  };
  localStorage.setItem(STORAGE_CUSTOMER, JSON.stringify(info));
  renderCustomerInfo();
  return info;
}

function askCustomerInfo() {
  let info = null;
  try {
    info = JSON.parse(localStorage.getItem(STORAGE_CUSTOMER) || "null");
  } catch (e) {
    info = null;
  }
  if (info && info.name && info.phone && info.address) {
    const ok = confirm(
      "📦 Oldingi buyurtma ma'lumotlari:\n\n" +
      "👤 Ism: " + info.name + "\n" +
      "📱 Telefon: " + info.phone + "\n" +
      "📍 Manzil: " + info.address + "\n\n" +
      "Shu ma'lumotlar bilan yuborilsinmi?\n\n" +
      "OK — Ha, shu ma'lumotlar bilan\n" +
      "Cancel — Yangi ma'lumot kiritaman"
    );
    if (ok) {
      return info;
    } else {
      return promptNewCustomerInfo();
    }
  }
  return promptNewCustomerInfo();
}

function resetCustomerInfo() {
  localStorage.removeItem(STORAGE_CUSTOMER);
  renderCustomerInfo();
  showToast("👤 Mijoz ma'lumotlari o'chirildi. Keyingi buyurtmada qaytadan kiritasiz.");
}

// Headerdagi ✏️ tugma uchun
function editCustomerInfo(){
  promptNewCustomerInfo();
}

/* ===================== 🔄 REAL-TIME FIRESTORE: MAHSULOTLAR ===================== */
function subscribeProductsRealtime(){
  onSnapshot(
    productsCol,
    (snap) => {
      const list = [];
      snap.forEach(d => {
        const data = d.data();
        list.push({
          id: d.id,
          fromFirebase: true,
          name: data.name || "",
          price: data.price || 0,
          oldPrice: data.oldPrice || null,
          category: data.category || "",
          emoji: data.emoji || categoryEmoji[data.category] || categoryEmoji.default,
          tag: data.tag || "",
          description: data.description || "",
          images: Array.isArray(data.images) ? data.images : [],
          createdAt: data.createdAt || null
        });
      });
      remoteProducts = list;
      rebuildProducts();
      renderAdminCustomList();
    },
    (e) => {
      console.error("Realtime mahsulotlarni o‘qishda xato:", e);
      showToast("⚠️ Mahsulotlarni o‘qishda xato: " + (e.message || ""));
    }
  );
}

/* ===================== 🔄 REAL-TIME FIRESTORE: KATEGORIYALAR ===================== */
function subscribeCategoriesRealtime(){
  onSnapshot(
    categoriesCol,
    (snap) => {
      const list = [];
      snap.forEach(d => {
        const data = d.data() || {};
        const code = (data.code || "").trim().toLowerCase();
        if (!code) return;
        const label = (data.label || code).trim();
        const emoji = (data.emoji || "💅").trim() || "💅";
        list.push({
          id: d.id,
          code,
          label,
          emoji,
          order: data.order ?? 0
        });
        categoryEmoji[code] = emoji;
        categoryLabel[code] = label;
      });
      list.sort((a,b) => (a.order || 0) - (b.order || 0));
      categories = list;
      renderCategoryFilter();
      updateAdminCategorySelect();
      renderCategoryAdminList();
    },
    (e) => {
      console.error("Realtime kategoriyalarni o‘qishda xato:", e);
      showToast("⚠️ Kategoriyalarni o‘qishda xato: " + (e.message || ""));
    }
  );
}

/* ===================== PRODUCTS UI ===================== */
function rebuildProducts(){
  // faqat Firestore’dan kelgan mahsulotlar
  products = [...remoteProducts];
  renderProducts();
}

function renderProducts(){
  productsGrid.innerHTML = "";
  const filtered = products.filter(p =>
    (activeCategory === "all" ? true : p.category === activeCategory) &&
    matchesSearch(p)
  );
  if(!filtered.length){
    productsGrid.innerHTML = "<p class='history-empty'>Hozircha mahsulot qo‘shilmagan.</p>";
    return;
  }

  let html = "";
  filtered.forEach(p=>{
    const index = products.indexOf(p);
    const discount = p.oldPrice && p.oldPrice > p.price
      ? (100 - Math.round(p.price*100/p.oldPrice))
      : null;
    const tag = p.tag || "Ommabop mahsulot";
    const firstImage = (p.images && p.images.length) ? p.images[0] : RAW_PREFIX + "noimage.png";
    let imgHtml;
    if (firstImage.startsWith(RAW_PREFIX)) {
      const base = firstImage.replace(/\.(png|jpg|jpeg)$/i, "");
      imgHtml = `<img loading="lazy" src="${base}.png" alt="${p.name}" onerror="this.onerror=null;this.src='${base}.jpg';">`;
    } else {
      imgHtml = `<img loading="lazy" src="${firstImage}" alt="${p.name}">`;
    }
    const catLabel = categoryLabel[p.category] || p.category || "Kategoriya yo‘q";
    html += `
      <article class="product-card" onclick="openProductDetail(${index})">
        <div class="product-img-wrap">
          ${imgHtml}
          <div class="product-img-tag">
            <span>Beauty</span><span>Pro</span>
          </div>
          ${discount ? `<div class="product-sale">-${discount}%</div>` : ``}
        </div>
        <div class="product-body">
          <div class="product-name">${p.name}</div>
          <div class="product-meta">
            ${catLabel} • ${tag}
          </div>
          <div class="tag-mini">
            💡 ${tag}
          </div>
          <div class="price-row">
            <div>
              <div class="price-main">${formatPrice(p.price)} so‘m</div>
              ${p.oldPrice ? `<div class="price-old">${formatPrice(p.oldPrice)} so‘m</div>` : ``}
            </div>
            <button class="btn-add" onclick="event.stopPropagation(); addToCart(${index});">
              ➕ Savatga
            </button>
          </div>
        </div>
      </article>
    `;
  });

  productsGrid.innerHTML = html;
}

/* ===================== KATEGORIYA FILTR KNOPKALARI ===================== */
function renderCategoryFilter(){
  if(!filterBar) return;
  let html = "";
  html += `<button class="chip ${activeCategory === "all" ? "active" : ""}" data-category="all">⭐ Barchasi</button>`;
  // faqat Firestore’dan kelgan kategoriyalar
  categories.forEach(cat=>{
    html += `
      <button class="chip ${activeCategory === cat.code ? "active" : ""}" data-category="${cat.code}">
        ${cat.emoji} ${cat.label}
      </button>
    `;
  });
  filterBar.innerHTML = html;
}

if(filterBar){
  filterBar.addEventListener("click", (e)=>{
    const btn = e.target.closest(".chip");
    if(!btn) return;
    document.querySelectorAll(".chip").forEach(c=>c.classList.remove("active"));
    btn.classList.add("active");
    activeCategory = btn.dataset.category;
    renderProducts();
  });
}

/* ===================== SEARCH (debounce bilan) ===================== */
let searchTimeout = null;
if(searchInput){
  searchInput.addEventListener("input", ()=>{
    clearTimeout(searchTimeout);
    const value = searchInput.value.trim().toLowerCase();
    searchTimeout = setTimeout(()=>{
      currentSearch = value;
      renderProducts();
    }, 200); // 200ms – telefon uchun yetarli tez
  });
}

/* ===================== CART ===================== */
function addToCart(index, qty = 1){
  if(qty <= 0) return;
  const found = cart.find(c => c.index === index);
  if(found){
    found.qty += qty;
  }else{
    cart.push({index, qty});
  }
  updateCartUI();
  showToast("Savatga qo‘shildi, yana mahsulot tanlaysizmi?");
}

function updateCartUI(){
  let totalCount = 0;
  let totalPrice = 0;
  cart.forEach(c=>{
    const p = products[c.index];
    if(!p) return;
    totalCount += c.qty;
    totalPrice += p.price * c.qty;
  });
  cartCountTopEl.textContent = totalCount;
  cartTotalTopEl.textContent = formatPrice(totalPrice) + " so‘m";
  if(cartSheet.classList.contains("open")){
    renderCartItems();
  }
}

function toggleCartSheet(force){
  const isOpen = cartSheet.classList.contains("open");
  const next   = typeof force === "boolean" ? force : !isOpen;
  cartSheet.classList.toggle("open", next);
  cartSheetOverlay.classList.toggle("show", next);
  if(next){
    renderCartItems();
  }
}

function renderCartItems(){
  if(cart.length === 0){
    cartItemsEl.innerHTML = "<p class='cart-empty'>Savat hozircha bo‘sh 🙂</p>";
    cartSheetTotalEl.textContent = "0 so‘m";
    return;
  }
  let html = "";
  let total = 0;
  cart.forEach(c=>{
    const p = products[c.index];
    if(!p) return;
    const lineTotal = p.price * c.qty;
    total += lineTotal;
    const catLabel = categoryLabel[p.category] || p.category || "Kategoriya yo‘q";
    html += `
      <div class="cart-item-row">
        <div class="cart-item-main">
          <div class="cart-item-name">${p.name}</div>
          <div class="cart-item-meta">
            ${formatPrice(p.price)} so‘m • ${catLabel}
          </div>
        </div>
        <div class="cart-item-actions">
          <div class="qty-control">
            <button onclick="changeQty(${c.index}, -1)">-</button>
            <span>${c.qty}</span>
            <button onclick="changeQty(${c.index}, 1)">+</button>
          </div>
          <div class="cart-item-total">${formatPrice(lineTotal)} so‘m</div>
          <button class="cart-remove" onclick="removeFromCart(${c.index})">✕</button>
        </div>
      </div>
    `;
  });
  cartItemsEl.innerHTML = html;
  cartSheetTotalEl.textContent = formatPrice(total) + " so‘m";
}

function changeQty(productIndex, delta){
  const item = cart.find(c => c.index === productIndex);
  if(!item) return;
  item.qty += delta;
  if(item.qty <= 0){
    cart = cart.filter(c=>c.index !== productIndex);
  }
  updateCartUI();
  renderCartItems();
}

function removeFromCart(productIndex){
  cart = cart.filter(c=>c.index !== productIndex);
  updateCartUI();
  renderCartItems();
}

// Telegram link
function openTelegramLink(url){
  const tg = window.Telegram && window.Telegram.WebApp;
  try {
    if (tg && typeof tg.openTelegramLink === "function") {
      tg.openTelegramLink(url);
    } else {
      window.location.href = url;
    }
  } catch (e) {
    window.location.href = url;
  }
}

/* ===================== HISTORY (LOCAL) ===================== */
function saveOrderHistory(order){
  let list = [];
  try{
    list = JSON.parse(localStorage.getItem(STORAGE_HISTORY) || "[]");
  }catch(e){}
  list.unshift(order);
  localStorage.setItem(STORAGE_HISTORY, JSON.stringify(list));
  renderHistory();
}

function renderHistory(){
  let list = [];
  try{
    list = JSON.parse(localStorage.getItem(STORAGE_HISTORY) || "[]");
  }catch(e){}
  if(!list.length){
    historyListEl.innerHTML = "<p class='history-empty'>Hozircha buyurtmalar tarixi bo‘sh.</p>";
    return;
  }
  historyListEl.innerHTML = "";
  list.forEach((order, idx)=>{
    const date    = new Date(order.date);
    const dateStr = date.toLocaleString("uz-UZ");
    let itemsHtml = "";
    order.items.forEach(it=>{
      itemsHtml += `<li>${it.line}</li>`;
    });
    historyListEl.innerHTML += `
      <div class="order-card">
        <div class="order-head">
          <strong>Buyurtma #${list.length - idx}</strong>
          <span>${order.totalFormatted}</span>
        </div>
        <div class="order-meta">
          📅 ${dateStr} • 🧺 ${order.totalItems} ta mahsulot
        </div>
        <div>Mahsulotlar:</div>
        <ul class="order-items">
          ${itemsHtml}
        </ul>
      </div>
    `;
  });
}

function clearHistory(){
  if(confirm("Buyurtmalar tarixini tozalashni xohlaysizmi?")){
    localStorage.removeItem(STORAGE_HISTORY);
    renderHistory();
  }
}

/* ===================== TELEGRAMGA BUYURTMA ===================== */
function sendOrder(){
  if (cart.length === 0) {
    showToast("Savat bo‘sh. Avval mahsulot tanlang 🙂");
    return;
  }
  const customer = askCustomerInfo();
  if (!customer) {
    showToast("❌ Ism, telefon yoki manzil kiritilmagani uchun buyurtma matni tayyorlanmadi.");
    return;
  }
  let totalPrice = 0;
  let totalItems = 0;
  let lines      = [];
  cart.forEach((c, i) => {
    const p = products[c.index];
    if (!p) return;
    const lineTotal = p.price * c.qty;
    totalPrice += lineTotal;
    totalItems += c.qty;
    const catEmj = categoryEmoji[p.category] || "💅";
    const lineText =
      `${i + 1}) ${catEmj} ${p.name} — ${c.qty} dona × ${formatPrice(p.price)} so‘m = ${formatPrice(lineTotal)} so‘m`;
    lines.push({ line: lineText, product: p });
  });
  const totalStr = formatPrice(totalPrice);
  let text = "";
  text += "ONLINE MAGAZIN YANGIOBOD  — Onlayn buyurtma\n";
  text += "━━━━━━━━━━━━━━━━━━━━\n";
  text += "🧺 Savatimdagi mahsulotlar:\n\n";
  lines.forEach(l => {
    text += "• " + l.line + "\n";
  });
  text += "\n💰 Umumiy summa: " + totalStr + " so‘m\n";
  text += "📦 Buyurtma turi: Kosmetika mahsulotlari\n";
  text += "━━━━━━━━━━━━━━━━━━━━\n";
  text += "👤 Ismim: " + customer.name + "\n";
  text += "📱 Telefon raqamim: " + customer.phone + "\n";
  text += "📍 Manzilim: " + customer.address + "\n";
  text += "✍️ Qo‘shimcha izoh: _______\n";
  const encoded = encodeURIComponent(text);
  const baseUrl = "https://t.me/onatili_premium";
  const url     = `${baseUrl}?text=${encoded}&t=${Date.now()}`;

  // 🔥 BUYURTMA TARIXIGA YOZAMIZ
  const order = {
    date: new Date().toISOString(),
    totalPrice: totalPrice,
    totalFormatted: totalStr + " so‘m",
    totalItems: totalItems,
    items: lines
  };
  saveOrderHistory(order);

  // Savatni tozalash
  cart = [];
  updateCartUI();
  renderCartItems();
  toggleCartSheet(false);
  openTelegramLink(url);
}

/* ===================== THEME ===================== */
function applyTheme(theme){
  document.body.classList.toggle("theme-dark", theme === "dark");
  if(themeToggleBtn){
    themeToggleBtn.textContent = theme === "dark" ? "☀️" : "🌙";
  }
}

function toggleTheme(){
  const current = localStorage.getItem(THEME_KEY) || "light";
  const next    = current === "dark" ? "light" : "dark";
  localStorage.setItem(THEME_KEY, next);
  applyTheme(next);
}

if(themeToggleBtn){
  themeToggleBtn.addEventListener("click", toggleTheme);
}

/* ===================== TABS ===================== */
if(tabsEl){
  tabsEl.addEventListener("click", (e)=>{
    const btn = e.target.closest(".tab-btn");
    if(!btn) return;
    const pageId = btn.dataset.page;
    if(pageId === "adminPage" && !isAdmin){
      showToast("👑 Avval admin kodini kiriting.");
      return;
    }
    document.querySelectorAll(".tab-btn").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("shopPage").classList.add("hidden");
    document.getElementById("historyPage").classList.add("hidden");
    document.getElementById("adminPage").classList.add("hidden");
    document.getElementById(pageId).classList.remove("hidden");
    if(pageId === "historyPage"){
      renderHistory();
    }else if(pageId === "adminPage"){
      renderAdminCustomList();
      renderCategoryAdminList();
    }
  });
}

/* ===================== ADMIN UI ===================== */
function updateAdminUI(){
  if(isAdmin){
    adminTabBtn.classList.remove("hidden");
    adminAccessBtn.classList.add("admin-active");
    adminAccessBtn.textContent = "👑 Admin (kirdingiz)";
  }else{
    adminTabBtn.classList.add("hidden");
    adminAccessBtn.classList.remove("admin-active");
    adminAccessBtn.textContent = "👑 Admin uchun";
  }
}

async function askAdminCode(){
  if(isAdmin){
    document.querySelectorAll(".tab-btn").forEach(b=>b.classList.remove("active"));
    adminTabBtn.classList.add("active");
    document.getElementById("shopPage").classList.add("hidden");
    document.getElementById("historyPage").classList.add("hidden");
    document.getElementById("adminPage").classList.remove("hidden");
    renderAdminCustomList();
    renderCategoryAdminList();
    return;
  }
  const code = prompt("Admin uchun kirish kodi:");
  if(code === null) return;
  try{
    const settingsRef = doc(db, "beauty_admin_settings", "security");
    const snap = await getDoc(settingsRef);
    if(!snap.exists()){
      showToast("⚠️ Admin kodi Firestore’da hali sozlanmagan.");
      return;
    }
    const data    = snap.data();
    const realCode= String(data.adminCode || data.code || "").trim();
    if(!realCode){
      showToast("⚠️ Admin kodi noto‘g‘ri sozlangan.");
      return;
    }
    if(code === realCode){
      isAdmin = true;
      updateAdminUI();
      showToast("✅ Admin sifatida kirdingiz");
    }else{
      showToast("❌ Noto‘g‘ri kod");
    }
  }catch(e){
    console.error("Admin kodni tekshirishda xato:", e);
    showToast("⚠️ Admin kodi tekshiruvida xato: " + (e.message || ""));
  }
}

if(adminAccessBtn){
  adminAccessBtn.addEventListener("click", askAdminCode);
}

/* ===================== ADMIN: MAHSULOTLAR ===================== */
function flashAdminButton(text){
  const btn = document.querySelector(".admin-btn");
  if(!btn) return;
  btn.textContent = text;
  btn.classList.add("admin-btn-success");
  setTimeout(()=>{
    btn.classList.remove("admin-btn-success");
    btn.textContent = editingProductId
      ? "💾 Mahsulotni saqlash (tahrirlash)"
      : "➕ Mahsulotni qo‘shish (Firestore)";
  }, 1500);
}

async function addCustomProduct(){
  const name        = adminNameEl.value.trim();
  const category    = adminCategoryEl.value;
  const basePrice   = parseInt(adminPriceBaseEl.value, 10);
  const hasDiscount = adminHasDiscountEl.checked;
  const discountRaw = adminPriceDiscountEl.value ? parseInt(adminPriceDiscountEl.value, 10) : null;
  const tag         = adminTagEl.value.trim();
  const description = adminDescriptionEl.value.trim();

  if(!name || !basePrice || basePrice <= 0){
    showToast("❌ Nomi va narxini to‘g‘ri kiriting.");
    return;
  }
  if(!category){
    showToast("❌ Avval kategoriya tanlang (yoki qo‘shing).");
    return;
  }

  let price    = basePrice;
  let oldPrice = null;
  if(hasDiscount && discountRaw && discountRaw > 0 && discountRaw < basePrice){
    price    = discountRaw;
    oldPrice = basePrice;
  }

  let images = normalizeImagesInput(adminImagesEl.value.trim());
  if(!images.length){
    images = [RAW_PREFIX + "noimage.png"];
  }

  const emoji = categoryEmoji[category] || "💅";
  const payload = {
    name,
    price,
    oldPrice,
    category,
    emoji,
    tag,
    description,
    images,
  };

  try{
    if(editingProductId){
      await updateDoc(doc(db,"beauty_products",editingProductId), {
        ...payload,
        updatedAt: serverTimestamp()
      });
      remoteProducts = remoteProducts.map(p =>
        p.id === editingProductId ? { ...p, ...payload } : p
      );
      rebuildProducts();
      renderAdminCustomList();
      showToast("✅ Mahsulot yangilandi");
      flashAdminButton("✅ Yangilandi");
    }else{
      const docRef = await addDoc(productsCol, {
        ...payload,
        createdAt: serverTimestamp()
      });
      remoteProducts.push({
        id: docRef.id,
        fromFirebase:true,
        ...payload,
        createdAt: { seconds: Date.now()/1000 }
      });
      rebuildProducts();
      renderAdminCustomList();
      showToast("✅ Mahsulot qo‘shildi va katalogda ko‘rinmoqda");
      flashAdminButton("✅ Mahsulot qo‘shildi");
    }
    editingProductId = null;
    adminNameEl.value          = "";
    adminPriceBaseEl.value     = "";
    adminPriceDiscountEl.value = "";
    adminHasDiscountEl.checked = false;
    adminTagEl.value           = "";
    adminDescriptionEl.value   = "";
    adminImagesEl.value        = "";
  }catch(e){
    console.error("Mahsulot yozishda/tahrirlashda xato:", e);
    showToast("❌ Xatolik: " + (e.message || "Firestore bilan ishlashda xato"));
  }
}

async function deleteAnyProduct(id){
  if(!confirm("Bu mahsulotni o‘chirishni xohlaysizmi? Hamma uchun o‘chadi.")) return;
  try{
    await deleteDoc(doc(db,"beauty_products",id));
    remoteProducts = remoteProducts.filter(p=>p.id !== id);
    rebuildProducts();
    renderAdminCustomList();
    showToast("🗑 Mahsulot o‘chirildi");
  }catch(e){
    console.error("O‘chirishda xato:", e);
    showToast("⚠️ Firestore’dan o‘chirishda xato: " + (e.message || ""));
  }
}

function renderAdminCustomList(){
  if(!adminCustomListEl) return;
  if(!remoteProducts.length){
    adminCustomListEl.innerHTML = "<p class='history-empty'>Hozircha Firestore’da mahsulot yo‘q.</p>";
    return;
  }
  adminCustomListEl.innerHTML = "";
  remoteProducts
    .slice()
    .sort((a,b)=> (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
    .forEach(p=>{
      adminCustomListEl.innerHTML += `
        <div class="admin-product-row">
          <span>${p.name}</span>
          <span>${formatPrice(p.price)} so‘m</span>
          <button class="admin-edit-btn" onclick="editProduct('${p.id}')">✏️</button>
          <button class="admin-delete-btn" onclick="deleteAnyProduct('${p.id}')">✕</button>
        </div>
      `;
    });
}

function editProduct(id){
  const p = remoteProducts.find(r => r.id === id);
  if(!p) return;
  editingProductId = id;
  adminNameEl.value     = p.name || "";
  adminCategoryEl.value = p.category || "";
  if(p.oldPrice && p.oldPrice > p.price){
    adminPriceBaseEl.value     = p.oldPrice;
    adminPriceDiscountEl.value = p.price;
    adminHasDiscountEl.checked = true;
  }else{
    adminPriceBaseEl.value     = p.price;
    adminPriceDiscountEl.value = "";
    adminHasDiscountEl.checked = false;
  }
  adminTagEl.value         = p.tag || "";
  adminDescriptionEl.value = p.description || "";
  adminImagesEl.value      = (p.images && p.images.length) ? p.images.join(", ") : "";
  const btn = document.querySelector(".admin-btn");
  if(btn){
    btn.textContent = "💾 Mahsulotni saqlash (tahrirlash)";
  }
  showToast("✏️ Tahrirlash rejimi: formani o‘zgartirib, saqlang");
}

/* ===================== ADMIN: KATEGORIYALAR ===================== */
function updateAdminCategorySelect(){
  if(!adminCategoryEl) return;
  const current = adminCategoryEl.value;
  adminCategoryEl.innerHTML = "";
  if(!categories.length){
    // hali kategoriya yo‘q – placeholder
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "Avval kategoriyani qo‘shing";
    adminCategoryEl.appendChild(opt);
    return;
  }
  categories.forEach(cat=>{
    const opt = document.createElement("option");
    opt.value = cat.code;
    opt.textContent = cat.label;
    adminCategoryEl.appendChild(opt);
  });
  if(current && categories.some(c=>c.code === current)){
    adminCategoryEl.value = current;
  }
}

function renderCategoryAdminList(){
  if(!adminCategoryListEl) return;
  if(!categories.length){
    adminCategoryListEl.innerHTML = "<p class='history-empty'>Hozircha kategoriya qo‘shilmagan.</p>";
    return;
  }
  adminCategoryListEl.innerHTML = "";
  categories.forEach(cat=>{
    adminCategoryListEl.innerHTML += `
      <div class="admin-product-row">
        <span>${cat.emoji} <b>${cat.label}</b> <small>(${cat.code})</small></span>
        <button class="admin-edit-btn" onclick="editCategory('${cat.id}')">✏️</button>
        <button class="admin-delete-btn" onclick="deleteCategory('${cat.id}')">✕</button>
      </div>
    `;
  });
}

async function saveCategory(){
  if(!adminCatCodeEl || !adminCatLabelEl) return;
  const rawCode = adminCatCodeEl.value.trim();
  const code    = rawCode.toLowerCase();
  const label   = adminCatLabelEl.value.trim();
  const emoji   = (adminCatEmojiEl.value.trim() || "💅");
  if(!code || !label){
    showToast("❌ Kategoriya kodi va nomini kiriting.");
    return;
  }
  try{
    const existing = categories.find(c=>c.code === code);
    if(existing){
      await updateDoc(doc(db,"beauty_categories", existing.id), {
        code,
        label,
        emoji,
        updatedAt: serverTimestamp()
      });
      showToast("✅ Kategoriya yangilandi");
    }else{
      await addDoc(categoriesCol, {
        code,
        label,
        emoji,
        order: categories.length,
        createdAt: serverTimestamp()
      });
      showToast("✅ Kategoriya qo‘shildi");
    }
    adminCatCodeEl.value  = "";
    adminCatLabelEl.value = "";
    adminCatEmojiEl.value = "";
  }catch(e){
    console.error("Kategoriya saqlashda xato:", e);
    showToast("⚠️ Kategoriya saqlashda xato: " + (e.message || ""));
  }
}

function editCategory(id){
  const cat = categories.find(c=>c.id === id);
  if(!cat) return;
  editingCategoryId      = id;
  adminCatCodeEl.value   = cat.code;
  adminCatLabelEl.value  = cat.label;
  adminCatEmojiEl.value  = cat.emoji;
  showToast("✏️ Kategoriya tahrirlash rejimi");
}

async function deleteCategory(id){
  if(!confirm("Bu kategoriyani o‘chirishni xohlaysizmi? Hamma uchun o‘chadi.")) return;
  try{
    await deleteDoc(doc(db,"beauty_categories",id));
    showToast("🗑 Kategoriya o‘chirildi");
  }catch(e){
    console.error("Kategoriya o‘chirishda xato:", e);
    showToast("⚠️ Kategoriya o‘chirishda xato: " + (e.message || ""));
  }
}

/* ===================== PRODUCT DETAIL ===================== */
function getDetailImages(){
  if(detailIndex === null) return [RAW_PREFIX + "noimage.png"];
  const p = products[detailIndex];
  if(!p) return [RAW_PREFIX + "noimage.png"];
  if(p.images && p.images.length) return p.images;
  return [RAW_PREFIX + "noimage.png"];
}

function renderDetailImage(){
  if(!detailImageEl) return;
  const imgs = getDetailImages();
  if(!imgs.length) return;
  if(detailImageIndex >= imgs.length) detailImageIndex = 0;
  if(detailImageIndex < 0) detailImageIndex = imgs.length - 1;
  setImageWithPngJpgFallback(detailImageEl, imgs[detailImageIndex]);
  if(detailImageIndexEl){
    detailImageIndexEl.textContent = `${detailImageIndex + 1} / ${imgs.length}`;
  }
}

function changeDetailImage(delta){
  if(detailIndex === null) return;
  const imgs = getDetailImages();
  if(imgs.length <= 1) return;
  detailImageIndex = (detailImageIndex + delta + imgs.length) % imgs.length;
  renderDetailImage();
}

function updateDetailCountdownUI(){
  if(!detailBackBtn) return;
  detailBackBtn.textContent = `◀ Magaziniga qaytish (${detailCountdownRemaining} s)`;
  if(detailCountdownRemaining <= 6){
    detailBackBtn.style.color = "#ef4444";
  } else {
    detailBackBtn.style.color = "";
  }
}

function clearDetailCountdown(){
  if(detailCountdownTimer){
    clearInterval(detailCountdownTimer);
    detailCountdownTimer = null;
  }
  if(detailBackBtn){
    detailBackBtn.style.color = "";
    detailBackBtn.textContent = "◀ Magaziniga qaytish";
  }
}

function startDetailCountdown(){
  if(!detailBackBtn) return;
  clearDetailCountdown();
  detailCountdownRemaining = 12;
  detailBackBtn.classList.remove("hidden");
  updateDetailCountdownUI();
  detailCountdownTimer = setInterval(()=>{
    detailCountdownRemaining--;
    if(detailCountdownRemaining <= 0){
      clearDetailCountdown();
      closeProductDetail();
    }else{
      updateDetailCountdownUI();
    }
  }, 1000);
}

function openProductDetail(index){
  const p = products[index];
  if(!p) return;
  detailIndex      = index;
  detailImageIndex = 0;
  detailQty        = 1;
  clearDetailCountdown();

  // 🔵 Bu yerda hamma rasmlarni fon rejimida preload qilamiz
  preloadProductImages(p);

  const catLbl = categoryLabel[p.category] || p.category || "Kategoriya yo‘q";
  renderDetailImage();
  detailCategoryEl.textContent = catLbl;
  detailNameEl.textContent     = p.name;
  detailTagEl.textContent      = p.tag ? "💡 " + p.tag : "";
  detailDescEl.textContent =
    p.description && p.description.trim().length
      ? p.description
      : "Bu mahsulot sizning go‘zallik rutiningiz uchun mo‘ljallangan.";
  detailPriceEl.textContent = formatPrice(p.price) + " so‘m";
  if(p.oldPrice){
    detailOldPriceEl.textContent = formatPrice(p.oldPrice) + " so‘m";
    detailOldPriceEl.classList.remove("hidden");
  }else{
    detailOldPriceEl.classList.add("hidden");
  }
  if(detailQtyValue){
    detailQtyValue.textContent = detailQty;
  }
  detailAddBtn.classList.remove("added");
  detailAddBtn.textContent = "🛒 Savatga qo‘shish";
  if(detailBackBtn){
    detailBackBtn.classList.add("hidden");
    detailBackBtn.style.color = "";
    detailBackBtn.textContent = "◀ Magaziniga qaytish";
  }
  productDetailOverlay.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeProductDetail(){
  clearDetailCountdown();
  productDetailOverlay.classList.add("hidden");
  document.body.style.overflow = "";
  detailIndex = null;
}

// DETAIL EVENTLAR
if(detailAddBtn){
  detailAddBtn.addEventListener("click", ()=>{
    if(detailIndex === null) return;
    // Agar allaqachon qo‘shilgan bo‘lsa → darhol magazinga qaytish
    if(detailAddBtn.classList.contains("added")){
        closeProductDetail(); // magazinga qaytish
        return;
    }
    // 1-marta bosilganda — savatga qo‘shamiz
    addToCart(detailIndex, detailQty);
    detailAddBtn.classList.add("added");
    detailAddBtn.textContent = "⬅️ Magaziniga qaytish";
    // Endi 2-soniya sanab avtomatik qaytadi
    if(detailBackBtn){
      detailBackBtn.classList.remove("hidden");
    }
    startDetailCountdown();
  });
}

if(detailBackBtn){
  detailBackBtn.addEventListener("click", ()=>{
    closeProductDetail();
  });
}

if(productDetailOverlay){
  productDetailOverlay.addEventListener("click",(e)=>{
    if(e.target === productDetailOverlay){
      closeProductDetail();
    }
  });
}

// GALEREYA TUGMALARI
if(detailPrevBtn){
  detailPrevBtn.addEventListener("click",(e)=>{
    e.stopPropagation();
    changeDetailImage(-1);
  });
}
if(detailNextBtn){
  detailNextBtn.addEventListener("click",(e)=>{
    e.stopPropagation();
    changeDetailImage(1);
  });
}

// MIQDOR TUGMALARI
if(detailQtyMinus){
  detailQtyMinus.addEventListener("click",(e)=>{
    e.stopPropagation();
    if(detailQty > 1){
      detailQty--;
      if(detailQtyValue) detailQtyValue.textContent = detailQty;
    }
  });
}
if(detailQtyPlus){
  detailQtyPlus.addEventListener("click",(e)=>{
    e.stopPropagation();
    detailQty++;
    if(detailQtyValue) detailQtyValue.textContent = detailQty;
  });
}

/* ===================== INIT ===================== */
(function init(){
  const savedTheme = localStorage.getItem(THEME_KEY) || "light";
  applyTheme(savedTheme);
  isAdmin = false;
  updateAdminUI();
  renderCustomerInfo();   // 👤 ism/telefonni chiqarish
  renderCategoryFilter(); // boshida faqat ⭐ Barchasi
  renderProducts();       // hozircha "mahsulot yo‘q" degan yozuv
  renderHistory();
  subscribeProductsRealtime();   // mahsulotlar
  subscribeCategoriesRealtime(); // kategoriyalar
})();

/* ===================== GLOBAL FUNKSIYALAR ===================== */
window.addToCart         = addToCart;
window.toggleCartSheet   = toggleCartSheet;
window.changeQty         = changeQty;
window.removeFromCart    = removeFromCart;
window.sendOrder         = sendOrder;
window.clearHistory      = clearHistory;
window.openProductDetail = openProductDetail;
window.closeProductDetail= closeProductDetail;
window.deleteAnyProduct  = deleteAnyProduct;
window.editProduct       = editProduct;
window.addCustomProduct  = addCustomProduct;
window.resetCustomerInfo = resetCustomerInfo;
window.editCustomerInfo  = editCustomerInfo;
// kategoriya uchun
window.saveCategory      = saveCategory;
window.deleteCategory    = deleteCategory;
window.editCategory      = editCategory;
