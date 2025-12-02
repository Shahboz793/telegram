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
  onSnapshot,        // 🔄 REAL-TIME LISTENER
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
const db = getFirestore(app);
const productsCol = collection(db, "beauty_products");

// === YANGI: KATEGORIYALAR KOLLEKSIYASI ===
const categoriesCol = collection(db, "beauty_categories");

// KONSTANTALAR
const STORAGE_HISTORY = "beauty_order_history";
const THEME_KEY = "beauty_theme";
const RAW_PREFIX = "https://raw.githubusercontent.com/hanbek221-design/kosmetika-premium/main/images/";
const STORAGE_CUSTOMER = "beauty_customer_info"; // 👤 ism + telefon + manzil

const categoryEmoji = {
  "pomada":"💄",
  "krem":"🧴",
  "parfyum":"🌸",
  "niqob":"😷",
  "ko‘z":"👁",
  "tana":"🛁",
  "default":"💅"
};

const categoryLabel = {
  "pomada":"Pomada / lab uchun",
  "krem":"Krem / yuz uchun",
  "parfyum":"Parfyum",
  "niqob":"Niqob / mask",
  "ko‘z":"Ko‘z uchun",
  "tana":"Tana / soch parvarishi"
};

// DEFAULT MAHSULOTLAR
const defaultProducts = [
  {
    name:"Mat pomada Nude Lux",
    price:89000,
    oldPrice:109000,
    category:"pomada",
    emoji:"💄",
    tag:"Yangi kolleksiya",
    description:"Mat efektli, kundalik foydalanish uchun mos nude pomada. Lablarni quritmaydi, uzoq vaqt saqlanadi.",
    images:[
      "https://images.pexels.com/photos/3373744/pexels-photo-3373744.jpeg?auto=compress&cs=tinysrgb&w=600"
    ]
  },
  {
    name:"Qizil mat pomada Classic Red",
    price:99000,
    oldPrice:119000,
    category:"pomada",
    emoji:"💋",
    tag:"Best seller",
    description:"Klassik qizil rang, bayram va maxsus tadbirlar uchun juda mos.",
    images:[
      "https://images.pexels.com/photos/947301/pexels-photo-947301.jpeg?auto=compress&cs=tinysrgb&w=600"
    ]
  },
  {
    name:"Gialuronli yuz kremi",
    price:129000,
    oldPrice:149000,
    category:"krem",
    emoji:"🧴",
    tag:"Namlik 24 soat",
    description:"Quruq va normal teri uchun. Kun bo‘yi namlikni ushlab turishga yordam beradi.",
    images:[
      "https://images.pexels.com/photos/3738341/pexels-photo-3738341.jpeg?auto=compress&cs=tinysrgb&w=600"
    ]
  },
  {
    name:"Kunduzgi SPF 50 krem",
    price:139000,
    oldPrice:159000,
    category:"krem",
    emoji:"🌞",
    tag:"Quyoshdan himoya",
    description:"SPF50 bilan kunduzgi krem — quyosh nurlaridan himoya va namlantirish birgalikda.",
    images:[
      "https://images.pexels.com/photos/3738342/pexels-photo-3738342.jpeg?auto=compress&cs=tinysrgb&w=600"
    ]
  },
  {
    name:"Gul hidli ayollar parfyumi",
    price:199000,
    oldPrice:229000,
    category:"parfyum",
    emoji:"🌸",
    tag:"Eng ko‘p yoqadigan",
    description:"Yengil, mayin floral hid. Har kuni foydalanish uchun mos.",
    images:[
      "https://images.pexels.com/photos/965989/pexels-photo-965989.jpeg?auto=compress&cs=tinysrgb&w=600"
    ]
  },
  {
    name:"Maskara Waterproof",
    price:93000,
    oldPrice:109000,
    category:"ko‘z",
    emoji:"💧",
    tag:"Suvga chidamli",
    description:"Suvga chidamli maskara — ko‘z yoshlari va yomg‘irga ham chidamli.",
    images:[
      "https://images.pexels.com/photos/3738367/pexels-photo-3738367.jpeg?auto=compress&cs=tinysrgb&w=600"
    ]
  }
];

// STATE
let products = [];
let remoteProducts = [];
let cart = [];
let activeCategory = "all";
let currentSearch = "";
let isAdmin = false;

// === YANGI: KATEGORIYALAR STATE ===
let categories = [];
let editingCategoryId = null;

// Detail oynasi uchun state
let detailIndex = null;
let detailImageIndex = 0;
let detailQty = 1;
let detailCountdownTimer = null;
let detailCountdownRemaining = 0;

// DOM
const productsGrid = document.getElementById("productsGrid");
const filterBar = document.getElementById("filterBar");
const cartCountTopEl = document.getElementById("cartCountTop");
const cartTotalTopEl = document.getElementById("cartTotalTop");
const toastEl = document.getElementById("toast");
const cartSheet = document.getElementById("cartSheet");
const cartSheetOverlay = document.getElementById("cartSheetOverlay");
const cartItemsEl = document.getElementById("cartItems");
const cartSheetTotalEl = document.getElementById("cartSheetTotal");
const themeToggleBtn = document.getElementById("themeToggleBtn");
const tabsEl = document.getElementById("tabs");
const historyListEl = document.getElementById("historyList");
const adminCustomListEl = document.getElementById("adminCustomList");
const adminAccessBtn = document.getElementById("adminAccessBtn");
const adminTabBtn = document.getElementById("adminTabBtn");
const searchInput = document.getElementById("searchInput");

const productDetailOverlay = document.getElementById("productDetailOverlay");
const detailImageEl = document.getElementById("detailImage");
const detailCategoryEl = document.getElementById("detailCategory");
const detailNameEl = document.getElementById("detailName");
const detailTagEl = document.getElementById("detailTag");
const detailDescEl = document.getElementById("detailDesc");
const detailPriceEl = document.getElementById("detailPrice");
const detailOldPriceEl = document.getElementById("detailOldPrice");
const detailAddBtn = document.getElementById("detailAddBtn");
const detailBackBtn = document.getElementById("detailBackBtn");

// 🖼 Galereya tugmalari + rasm raqami
const detailPrevBtn = document.getElementById("detailPrevBtn");
const detailNextBtn = document.getElementById("detailNextBtn");
const detailImageIndexEl = document.getElementById("detailImageIndex");

// 🔢 Miqdor tugmalari
const detailQtyMinus = document.getElementById("detailQtyMinus");
const detailQtyPlus = document.getElementById("detailQtyPlus");
const detailQtyValue = document.getElementById("detailQtyValue");

// ADMIN FORM DOM (mahsulotlar)
const adminNameEl = document.getElementById("adminName");
const adminCategoryEl = document.getElementById("adminCategory");
const adminPriceBaseEl = document.getElementById("adminPriceBase");
const adminHasDiscountEl = document.getElementById("adminHasDiscount");
const adminPriceDiscountEl = document.getElementById("adminPriceDiscount");
const adminTagEl = document.getElementById("adminTag");
const adminDescriptionEl = document.getElementById("adminDescription");
const adminImagesEl = document.getElementById("adminImages");

// === YANGI: ADMIN KATEGORIYA DOM ELEMENTLAR ===
const adminCatCodeEl = document.getElementById("adminCatCode");     // <input>
const adminCatLabelEl = document.getElementById("adminCatLabel");   // <input>
const adminCatEmojiEl = document.getElementById("adminCatEmoji");   // <input>
const adminCategoryListEl = document.getElementById("adminCategoryList"); // <div>

// HELPERS
function formatPrice(v){ return v.toLocaleString("uz-UZ"); }

function showToast(message){
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

function matchesSearch(p){
  if(!currentSearch) return true;
  const q = currentSearch;
  const name = (p.name || "").toLowerCase();
  const tag = (p.tag || "").toLowerCase();
  const desc = (p.description || "").toLowerCase();
  const cat = (p.category || "").toLowerCase();
  return name.includes(q) || tag.includes(q) || desc.includes(q) || cat.includes(q);
}

// === YANGI: KATEGORIYA LABEL/EMOJI HELPERLAR ===
function getCategoryLabel(code){
  if(!code) return "";
  const found = categories.find(c => c.code === code);
  if(found && (found.label || found.code)) return found.label || found.code;
  return categoryLabel[code] || code;
}

function getCategoryEmoji(code){
  if(!code) return categoryEmoji.default;
  const found = categories.find(c => c.code === code);
  if(found && found.emoji) return found.emoji;
  return categoryEmoji[code] || categoryEmoji.default;
}

// 👤 MIJOZ MA'LUMOTLARI (ISM + TELEFON + MANZIL)
// Yangi ma'lumotni so'rab, saqlaydigan funksiya
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
  return info;
}

// Har safar buyurtma berishda taklif qiluvchi funksiya
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

// Ma'lumotni tozalash
function resetCustomerInfo() {
  localStorage.removeItem(STORAGE_CUSTOMER);
  showToast("👤 Mijoz ma'lumotlari o'chirildi. Keyingi buyurtmada qaytadan kiritasiz.");
}

// 🔄 REAL-TIME: FIRESTORE'DAN MAHSULOTLARNI O‘QISH
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
          category: data.category || "tana",
          emoji: data.emoji || categoryEmoji[data.category] || categoryEmoji.default,
          tag: data.tag || "",
          description: data.description || "",
          images: Array.isArray(data.images) ? data.images : [],
          createdAt: data.createdAt || null
        });
      });
      remoteProducts = list;
      rebuildProducts();        // do‘kondagi kartalar yangilanadi
      renderAdminCustomList();  // admin ro‘yxati yangilanadi
    },
    (e) => {
      console.error("Realtime o‘qishda xato:", e);
      showToast("⚠️ Real-time yangilashda xato: " + (e.message || ""));
    }
  );
}

// === YANGI: KATEGORIYALARNI REAL-TIME O‘QISH ===
function subscribeCategoriesRealtime() {
  onSnapshot(
    categoriesCol,
    (snap) => {
      const list = [];
      snap.forEach((d) => {
        const data = d.data() || {};
        list.push({
          id: d.id,
          code: (data.code || d.id || "").toString(),
          label: data.label || data.name || data.code || d.id,
          emoji: data.emoji || "",
          createdAt: data.createdAt || null,
        });
      });
      categories = list;
      renderCategoryFilter();
      renderCategoryList();
      updateAdminCategorySelect();
      renderProducts();
    },
    (e) => {
      console.error("Realtime o‘qishda xato (categories):", e);
      showToast("⚠️ Kategoriyalarni o‘qishda xato: " + (e.message || ""));
    }
  );
}

// PRODUCTS
function rebuildProducts(){
  products = [...defaultProducts, ...remoteProducts];
  renderProducts();
}

function renderProducts(){
  if(!productsGrid) return;

  productsGrid.innerHTML = "";
  const filtered = products.filter(p =>
    (activeCategory === "all" ? true : p.category === activeCategory) &&
    matchesSearch(p)
  );

  if(!filtered.length){
    productsGrid.innerHTML = "<p class='history-empty'>Bu filtrlarda mahsulot topilmadi.</p>";
    return;
  }

  filtered.forEach(p=>{
    const index = products.indexOf(p);
    const discount = p.oldPrice && p.oldPrice > p.price
      ? (100 - Math.round(p.price*100/p.oldPrice))
      : null;
    const tag = p.tag || "Ommabop mahsulot";
    const firstImage = (p.images && p.images.length) ? p.images[0] : RAW_PREFIX + "noimage.png";

    const catLabel = getCategoryLabel(p.category);
    let imgHtml;
    if (firstImage.startsWith(RAW_PREFIX)) {
      const base = firstImage.replace(/\.(png|jpg|jpeg)$/i, "");
      imgHtml = `<img src="${base}.png" alt="${p.name}" onerror="this.onerror=null;this.src='${base}.jpg';">`;
    } else {
      imgHtml = `<img src="${firstImage}" alt="${p.name}">`;
    }

    productsGrid.innerHTML += `
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
}

// === YANGI: FILTR CHIPLARNI KATEGORIYADAN QURISH ===
function renderCategoryFilter() {
  if (!filterBar) return;

  // Agar Firestore’da kategoriya bo‘lmasa — eski statik variant
  if (!categories.length) {
    filterBar.innerHTML = `
      <button class="chip ${activeCategory === "all" ? "active" : ""}" data-category="all">⭐ Barchasi</button>
      <button class="chip ${activeCategory === "pomada" ? "active" : ""}" data-category="pomada">💄 Pomada</button>
      <button class="chip ${activeCategory === "krem" ? "active" : ""}" data-category="krem">🧴 Kremlar</button>
      <button class="chip ${activeCategory === "parfyum" ? "active" : ""}" data-category="parfyum">🌸 Parfyum</button>
      <button class="chip ${activeCategory === "niqob" ? "active" : ""}" data-category="niqob">😷 Niqob / Mask</button>
      <button class="chip ${activeCategory === "ko‘z" ? "active" : ""}" data-category="ko‘z">👁 Ko‘z uchun</button>
      <button class="chip ${activeCategory === "tana" ? "active" : ""}" data-category="tana">🛁 Tana parvarishi</button>
    `;
    return;
  }

  let html = `
    <button class="chip ${activeCategory === "all" ? "active" : ""}" data-category="all">
      ⭐ Barchasi
    </button>
  `;

  categories
    .slice()
    .sort((a, b) => (a.label || a.code).localeCompare(b.label || b.code))
    .forEach(cat => {
      const emoji = cat.emoji || "📂";
      html += `
        <button class="chip ${activeCategory === cat.code ? "active" : ""}" data-category="${cat.code}">
          ${emoji} ${cat.label || cat.code}
        </button>
      `;
    });

  filterBar.innerHTML = html;
}

// FILTER BAR EVENT
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

// SEARCH
if(searchInput){
  searchInput.addEventListener("input", ()=>{
    currentSearch = searchInput.value.trim().toLowerCase();
    renderProducts();
  });
}

// CART
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
  if(cartCountTopEl) cartCountTopEl.textContent = totalCount;
  if(cartTotalTopEl) cartTotalTopEl.textContent = formatPrice(totalPrice) + " so‘m";
  if(cartSheet && cartSheet.classList.contains("open")){
    renderCartItems();
  }
}

function toggleCartSheet(force){
  if(!cartSheet || !cartSheetOverlay) return;
  const isOpen = cartSheet.classList.contains("open");
  const next = typeof force === "boolean" ? force : !isOpen;
  cartSheet.classList.toggle("open", next);
  cartSheetOverlay.classList.toggle("show", next);
  if(next){
    renderCartItems();
  }
}

function renderCartItems(){
  if(!cartItemsEl || !cartSheetTotalEl) return;

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
    html += `
      <div class="cart-item-row">
        <div class="cart-item-main">
          <div class="cart-item-name">${p.name}</div>
          <div class="cart-item-meta">
            ${formatPrice(p.price)} so‘m • ${getCategoryLabel(p.category)}
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

// 🔁 TELEGRAMGA LINK OCHISH FUNKSIYASI — YANGI VARIANT
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

// HISTORY (LOCAL)
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
  if(!historyListEl) return;
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
    const date = new Date(order.date);
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

// 🔄 YANGI: TELEGRAMGA BUYURTMA — avtomatik chat ochish, savatni tozalash
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
  let lines = [];
  cart.forEach((c, i) => {
    const p = products[c.index];
    if (!p) return;
    const lineTotal = p.price * c.qty;
    totalPrice += lineTotal;
    totalItems += c.qty;
    const catEmoji = getCategoryEmoji(p.category) || p.emoji || categoryEmoji.default;
    const lineText =
      `${i + 1}) ${catEmoji} ${p.name} — ${c.qty} dona × ${formatPrice(p.price)} so‘m = ${formatPrice(lineTotal)} so‘m`;
    lines.push({ line: lineText, product: p });
  });

  const totalStr = formatPrice(totalPrice);

  let text = "";
  text += "💖 BEAUTY STORE — Onlayn buyurtma\n";
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
  const url = `${baseUrl}?text=${encoded}&t=${Date.now()}`;

  // Istasang tarixni qayta yoqib qo‘ysan:
  /*
  const order = {
    date: new Date().toISOString(),
    totalPrice: totalPrice,
    totalFormatted: totalStr + " so‘m",
    totalItems: totalItems,
    items: lines
  };
  saveOrderHistory(order);
  */

  cart = [];
  updateCartUI();
  renderCartItems();
  toggleCartSheet(false);

  openTelegramLink(url);
}

// THEME
function applyTheme(theme){
  document.body.classList.toggle("theme-dark", theme === "dark");
  if(themeToggleBtn){
    themeToggleBtn.textContent = theme === "dark" ? "☀️" : "🌙";
  }
}

function toggleTheme(){
  const current = localStorage.getItem(THEME_KEY) || "light";
  const next = current === "dark" ? "light" : "dark";
  localStorage.setItem(THEME_KEY, next);
  applyTheme(next);
}

if(themeToggleBtn){
  themeToggleBtn.addEventListener("click", toggleTheme);
}

// TABS
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
    const shopPage = document.getElementById("shopPage");
    const historyPage = document.getElementById("historyPage");
    const adminPage = document.getElementById("adminPage");
    if(shopPage) shopPage.classList.add("hidden");
    if(historyPage) historyPage.classList.add("hidden");
    if(adminPage) adminPage.classList.add("hidden");
    const pageEl = document.getElementById(pageId);
    if(pageEl) pageEl.classList.remove("hidden");
    if(pageId === "historyPage"){
      renderHistory();
    }else if(pageId === "adminPage"){
      renderAdminCustomList();
      renderCategoryList();
    }
  });
}

// ADMIN UI
function updateAdminUI(){
  if(!adminTabBtn || !adminAccessBtn) return;
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

// ADMIN LOGIN — FIRESTORE DAGI KOD BILAN
async function askAdminCode(){
  if(isAdmin){
    document.querySelectorAll(".tab-btn").forEach(b=>b.classList.remove("active"));
    adminTabBtn.classList.add("active");
    const shopPage = document.getElementById("shopPage");
    const historyPage = document.getElementById("historyPage");
    const adminPage = document.getElementById("adminPage");
    if(shopPage) shopPage.classList.add("hidden");
    if(historyPage) historyPage.classList.add("hidden");
    if(adminPage) adminPage.classList.remove("hidden");
    renderAdminCustomList();
    renderCategoryList();
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

    const data = snap.data();
    const realCode = String(data.adminCode || data.code || "").trim();

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

// ADMIN HELPER: TUGMANI "FLASH" QILISH
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

let editingProductIdProduct = null; // oldingi editingProductId nomi bilan chalkashmaslik uchun

// ADMIN: FIRESTORE'GA MAHSULOT QO‘SHISH / TAHRIRLASH
async function addCustomProduct(){
  const name = adminNameEl?.value.trim();
  const category = adminCategoryEl?.value;
  const basePrice = parseInt(adminPriceBaseEl?.value || "0", 10);
  const hasDiscount = !!(adminHasDiscountEl && adminHasDiscountEl.checked);
  const discountPriceRaw = adminPriceDiscountEl?.value ? parseInt(adminPriceDiscountEl.value, 10) : null;
  const tag = adminTagEl?.value.trim() || "";
  const description = adminDescriptionEl?.value.trim() || "";

  if(!name || !basePrice || basePrice <= 0){
    showToast("❌ Nomi va narxini to‘g‘ri kiriting.");
    return;
  }

  let price = basePrice;
  let oldPrice = null;
  if(hasDiscount && discountPriceRaw && discountPriceRaw > 0 && discountPriceRaw < basePrice){
    price = discountPriceRaw;
    oldPrice = basePrice;
  }

  let images = normalizeImagesInput(adminImagesEl?.value.trim() || "");
  if(!images.length){
    images = [RAW_PREFIX + "noimage.png"];
  }

  const emoji = getCategoryEmoji(category);
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
    if(editingProductIdProduct){
      await updateDoc(doc(db,"beauty_products",editingProductIdProduct), {
        ...payload,
        updatedAt: serverTimestamp()
      });

      remoteProducts = remoteProducts.map(p =>
        p.id === editingProductIdProduct ? { ...p, ...payload } : p
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

    editingProductIdProduct = null;
    if(adminNameEl) adminNameEl.value = "";
    if(adminPriceBaseEl) adminPriceBaseEl.value = "";
    if(adminPriceDiscountEl) adminPriceDiscountEl.value = "";
    if(adminHasDiscountEl) adminHasDiscountEl.checked = false;
    if(adminTagEl) adminTagEl.value = "";
    if(adminDescriptionEl) adminDescriptionEl.value = "";
    if(adminImagesEl) adminImagesEl.value = "";

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
    adminCustomListEl.innerHTML = "<p class='history-empty'>Hozircha Firestore’da admin qo‘shgan mahsulot yo‘q.</p>";
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

  editingProductIdProduct = id;

  if(adminNameEl) adminNameEl.value = p.name || "";
  if(adminCategoryEl) adminCategoryEl.value = p.category || "pomada";

  if(p.oldPrice && p.oldPrice > p.price){
    if(adminPriceBaseEl) adminPriceBaseEl.value = p.oldPrice;
    if(adminPriceDiscountEl) adminPriceDiscountEl.value = p.price;
    if(adminHasDiscountEl) adminHasDiscountEl.checked = true;
  }else{
    if(adminPriceBaseEl) adminPriceBaseEl.value = p.price;
    if(adminPriceDiscountEl) adminPriceDiscountEl.value = "";
    if(adminHasDiscountEl) adminHasDiscountEl.checked = false;
  }

  if(adminTagEl) adminTagEl.value = p.tag || "";
  if(adminDescriptionEl) adminDescriptionEl.value = p.description || "";
  if(adminImagesEl) adminImagesEl.value = (p.images && p.images.length) ? p.images.join(", ") : "";

  const btn = document.querySelector(".admin-btn");
  if(btn){
    btn.textContent = "💾 Mahsulotni saqlash (tahrirlash)";
  }

  showToast("✏️ Tahrirlash rejimi: formani o‘zgartirib, saqlang");
}

// 🖼 DETAIL GALEREYA FUNKSIYALARI
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

// ⏱ 5 SONIYALI QAYTISH COUNTDOWN
function updateDetailCountdownUI(){
  if(!detailBackBtn) return;
  detailBackBtn.textContent = `◀ Magaziniga qaytish (${detailCountdownRemaining} s)`;
  if(detailCountdownRemaining <= 3){
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
  detailCountdownRemaining = 5;
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

// PRODUCT DETAIL
function openProductDetail(index){
  const p = products[index];
  if(!p) return;
  detailIndex = index;
  detailImageIndex = 0;
  detailQty = 1;
  clearDetailCountdown();

  const catLabel = getCategoryLabel(p.category);

  renderDetailImage();

  if(detailCategoryEl) detailCategoryEl.textContent = catLabel;
  if(detailNameEl) detailNameEl.textContent = p.name;
  if(detailTagEl) detailTagEl.textContent = p.tag ? "💡 " + p.tag : "";
  if(detailDescEl){
    detailDescEl.textContent =
      p.description && p.description.trim().length
        ? p.description
        : "Bu mahsulot sizning go‘zallik rutiningiz uchun mo‘ljallangan. Admin paneldan batafsil tavsif yozib qo‘yishingiz mumkin.";
  }
  if(detailPriceEl) detailPriceEl.textContent = formatPrice(p.price) + " so‘m";
  if(p.oldPrice){
    if(detailOldPriceEl){
      detailOldPriceEl.textContent = formatPrice(p.oldPrice) + " so‘m";
      detailOldPriceEl.classList.remove("hidden");
    }
  }else{
    if(detailOldPriceEl){
      detailOldPriceEl.classList.add("hidden");
    }
  }

  if(detailQtyValue){
    detailQtyValue.textContent = detailQty;
  }

  if(detailAddBtn){
    detailAddBtn.classList.remove("added");
    detailAddBtn.textContent = "🛒 Savatga qo‘shish";
  }

  if(detailBackBtn){
    detailBackBtn.classList.add("hidden");
    detailBackBtn.style.color = "";
    detailBackBtn.textContent = "◀ Magaziniga qaytish";
  }

  if(productDetailOverlay){
    productDetailOverlay.classList.remove("hidden");
  }
  document.body.style.overflow = "hidden";
}

function closeProductDetail(){
  clearDetailCountdown();
  if(productDetailOverlay){
    productDetailOverlay.classList.add("hidden");
  }
  document.body.style.overflow = "";
  detailIndex = null;
}

// DETAIL EVENTLAR
if(detailAddBtn){
  detailAddBtn.addEventListener("click", ()=>{
    if(detailIndex === null) return;
    addToCart(detailIndex, detailQty);
    detailAddBtn.classList.add("added");
    detailAddBtn.textContent = "✅ Savatga qo‘shildi";
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

// 🖼 GALEREYA TUGMALARI EVENTLARI
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

// 🔢 MIQDOR TUGMALARI
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

// === YANGI: ADMIN KATEGORIYA LISTI, SAQLASH, O‘CHIRISH ===
function renderCategoryList() {
  if (!adminCategoryListEl) return;
  if (!categories.length) {
    adminCategoryListEl.innerHTML =
      "<p class='history-empty'>Hozircha kategoriya yo‘q. Yangi kategoriya qo‘shing.</p>";
    return;
  }
  adminCategoryListEl.innerHTML = "";
  categories
    .slice()
    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
    .forEach((cat) => {
      const label = cat.label || cat.code;
      const emoji = cat.emoji || "📂";
      adminCategoryListEl.innerHTML += `
        <div class="admin-product-row admin-cat-row">
          <span>${emoji} ${label}</span>
          <span class="admin-cat-code">${cat.code}</span>
          <button class="admin-edit-btn" onclick="editCategory('${cat.id}')">✏️</button>
          <button class="admin-delete-btn" onclick="deleteCategory('${cat.id}')">✕</button>
        </div>
      `;
    });
}

async function saveCategory() {
  if (!adminCatCodeEl || !adminCatLabelEl) {
    alert("Kategoriya formasi HTML da yo‘q. Avval index.html ga qo‘shing.");
    return;
  }

  const codeRaw = adminCatCodeEl.value || "";
  const labelRaw = adminCatLabelEl.value || "";
  const emojiRaw = adminCatEmojiEl?.value || "";

  const code = codeRaw.trim().toLowerCase();
  const label = labelRaw.trim();
  const emoji = emojiRaw.trim();

  if (!code || !label) {
    showToast("❌ Kategoriya kodi va nomini to‘liq kiriting.");
    return;
  }

  if (!/^[a-z0-9_-]+$/.test(code)) {
    alert("Kategoriya kodi faqat lotin harflari, raqamlar, - va _ bo‘lsin.");
    return;
  }

  const existingByCode = categories.find((c) => c.code === code);
  const targetId = editingCategoryId || (existingByCode ? existingByCode.id : null);

  const payload = { code, label, emoji };

  try {
    if (targetId) {
      await updateDoc(doc(db, "beauty_categories", targetId), {
        ...payload,
        updatedAt: serverTimestamp(),
      });
      showToast("✅ Kategoriya yangilandi");
    } else {
      await addDoc(categoriesCol, {
        ...payload,
        createdAt: serverTimestamp(),
      });
      showToast("✅ Kategoriya qo‘shildi");
    }

    editingCategoryId = null;
    adminCatCodeEl.value = "";
    adminCatLabelEl.value = "";
    if (adminCatEmojiEl) adminCatEmojiEl.value = "";
  } catch (e) {
    console.error("Kategoriya saqlashda xato:", e);
    showToast("❌ Kategoriya saqlashda xato: " + (e.message || ""));
  }
}

function editCategory(id) {
  const cat = categories.find((c) => c.id === id);
  if (!cat || !adminCatCodeEl || !adminCatLabelEl) return;

  editingCategoryId = id;
  adminCatCodeEl.value = cat.code || "";
  adminCatLabelEl.value = cat.label || "";
  if (adminCatEmojiEl) adminCatEmojiEl.value = cat.emoji || "";
  showToast("✏️ Kategoriya tahrirlash rejimi");
}

async function deleteCategory(id) {
  if (!confirm("Bu kategoriyani o‘chirishni xohlaysizmi?")) return;
  try {
    await deleteDoc(doc(db, "beauty_categories", id));
    showToast("🗑 Kategoriya o‘chirildi");
  } catch (e) {
    console.error("Kategoriya o‘chirishda xato:", e);
    showToast("⚠️ Kategoriya o‘chirishda xato: " + (e.message || ""));
  }
}

// ADMIN: KATEGORIYALARDAN SELECT TO‘LDIRISH
function updateAdminCategorySelect() {
  if (!adminCategoryEl) return;
  if (!categories.length) {
    // Firestore bo‘sh bo‘lsa, index.html dagi static optionlar o‘z holicha qoladi
    return;
  }
  const current = adminCategoryEl.value;
  adminCategoryEl.innerHTML = "";
  categories
    .slice()
    .sort((a, b) => (a.label || a.code).localeCompare(b.label || b.code))
    .forEach(cat => {
      const opt = document.createElement("option");
      opt.value = cat.code;
      opt.textContent = (cat.emoji || "📂") + " " + (cat.label || cat.code);
      adminCategoryEl.appendChild(opt);
    });
  if (current) {
    adminCategoryEl.value = current;
  }
}

// INIT
(function init(){
  const savedTheme = localStorage.getItem(THEME_KEY) || "light";
  applyTheme(savedTheme);
  isAdmin = false;
  updateAdminUI();
  rebuildProducts();
  renderHistory();

  // 🔄 REAL-TIME FIRESTORE
  subscribeProductsRealtime();
  subscribeCategoriesRealtime();   // === YANGI ===

  // Agar kategoriyalar hali bo‘lmasa, fallback statik chiplar
  renderCategoryFilter();
})();

// GLOBAL FUNCTIONS (onclick uchun)
window.addToCart = addToCart;
window.toggleCartSheet = toggleCartSheet;
window.changeQty = changeQty;
window.removeFromCart = removeFromCart;
window.sendOrder = sendOrder;
window.clearHistory = clearHistory;
window.openProductDetail = openProductDetail;
window.closeProductDetail = closeProductDetail;
window.deleteAnyProduct = deleteAnyProduct;
window.editProduct = editProduct;
window.addCustomProduct = addCustomProduct;
window.resetCustomerInfo = resetCustomerInfo;

// === YANGI: KATEGORIYA FUNKSIYALARI GLOBAL ===
window.saveCategory = saveCategory;
window.editCategory = editCategory;
window.deleteCategory = deleteCategory;
