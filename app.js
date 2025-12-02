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

// KONSTANTALAR
const STORAGE_HISTORY = "beauty_order_history";
const THEME_KEY = "beauty_theme";
const RAW_PREFIX = "https://raw.githubusercontent.com/hanbek221-design/kosmetika-premium/main/images/";

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

// ADMIN FORM DOM
const adminNameEl = document.getElementById("adminName");
const adminCategoryEl = document.getElementById("adminCategory");
const adminPriceBaseEl = document.getElementById("adminPriceBase");
const adminHasDiscountEl = document.getElementById("adminHasDiscount");
const adminPriceDiscountEl = document.getElementById("adminPriceDiscount");
const adminTagEl = document.getElementById("adminTag");
const adminDescriptionEl = document.getElementById("adminDescription");
const adminImagesEl = document.getElementById("adminImages");

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

// 🔄 REAL-TIME: FIRESTORE'DAN UZLUKSIZ O‘QISH
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

// PRODUCTS
function rebuildProducts(){
  products = [...defaultProducts, ...remoteProducts];
  renderProducts();
}

function renderProducts(){
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
            ${(categoryLabel[p.category] || p.category)} • ${tag}
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

// FILTER BAR
filterBar.addEventListener("click", (e)=>{
  const btn = e.target.closest(".chip");
  if(!btn) return;
  document.querySelectorAll(".chip").forEach(c=>c.classList.remove("active"));
  btn.classList.add("active");
  activeCategory = btn.dataset.category;
  renderProducts();
});

// SEARCH
searchInput.addEventListener("input", ()=>{
  currentSearch = searchInput.value.trim().toLowerCase();
  renderProducts();
});

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
  cartCountTopEl.textContent = totalCount;
  cartTotalTopEl.textContent = formatPrice(totalPrice) + " so‘m";
  if(cartSheet.classList.contains("open")){
    renderCartItems();
  }
}

function toggleCartSheet(force){
  const isOpen = cartSheet.classList.contains("open");
  const next = typeof force === "boolean" ? force : !isOpen;
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
    html += `
      <div class="cart-item-row">
        <div class="cart-item-main">
          <div class="cart-item-name">${p.name}</div>
          <div class="cart-item-meta">
            ${formatPrice(p.price)} so‘m • ${(categoryLabel[p.category] || p.category)}
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

function openTelegramLink(url){
  const tg = window.Telegram && window.Telegram.WebApp;
  try{
    if(tg && typeof tg.openTelegramLink === "function"){
      tg.openTelegramLink(url);
    }else{
      window.open(url, "_blank");
    }
  }catch(e){
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

// TELEGRAMGA BUYURTMA
function sendOrder(){
  if(cart.length === 0){
    showToast("Savat bo‘sh. Avval mahsulot tanlang 🙂");
    return;
  }
  let totalPrice = 0;
  let totalItems = 0;
  let lines = [];
  cart.forEach((c, i)=>{
    const p = products[c.index];
    if(!p) return;
    const lineTotal = p.price * c.qty;
    totalPrice += lineTotal;
    totalItems += c.qty;
    const catEmoji = categoryEmoji[p.category] || p.emoji || categoryEmoji.default;
    const lineText =
      `${i+1}) ${catEmoji} ${p.name} — ${c.qty} dona × ${formatPrice(p.price)} so‘m = ${formatPrice(lineTotal)} so‘m`;
    lines.push({line: lineText, product: p});
  });
  const totalStr = formatPrice(totalPrice);
  let text = "";
  text += "💖 BEAUTY STORE — Onlayn buyurtma\n";
  text += "━━━━━━━━━━━━━━━━━━━━\n";
  text += "🧺 Savatimdagi mahsulotlar:\n\n";
  lines.forEach(l=>{
    text += "• " + l.line + "\n";
  });
  text += "\n💰 Umumiy summa: " + totalStr + " so‘m\n";
  text += "📦 Buyurtma turi: Kosmetika mahsulotlari\n";
  text += "━━━━━━━━━━━━━━━━━━━━\n";
  text += "📱 Telefon raqamim: _______\n";
  text += "📍 Manzilim: _______\n";
  text += "✍️ Iltimos, ushbu ma'lumotlarni to‘ldirib, xabarni yuboring.\n";

  const encoded = encodeURIComponent(text);
  const url = "https://t.me/onatili_premium?text=" + encoded + "&t=" + Date.now();
  const order = {
    date: new Date().toISOString(),
    totalPrice: totalPrice,
    totalFormatted: totalStr + " so‘m",
    totalItems: totalItems,
    items: lines
  };
  saveOrderHistory(order);
  openTelegramLink(url);
  cart = [];
  updateCartUI();
  renderCartItems();
  toggleCartSheet(false);
  showToast("✅ Buyurtma matni Telegramga tayyorlandi.");
}

// THEME
function applyTheme(theme){
  document.body.classList.toggle("theme-dark", theme === "dark");
  themeToggleBtn.textContent = theme === "dark" ? "☀️" : "🌙";
}
function toggleTheme(){
  const current = localStorage.getItem(THEME_KEY) || "light";
  const next = current === "dark" ? "light" : "dark";
  localStorage.setItem(THEME_KEY, next);
  applyTheme(next);
}
themeToggleBtn.addEventListener("click", toggleTheme);

// TABS
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
  }
});

// ADMIN UI
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

// ADMIN LOGIN — FIRESTORE DAGI KOD BILAN
async function askAdminCode(){
  if(isAdmin){
    document.querySelectorAll(".tab-btn").forEach(b=>b.classList.remove("active"));
    adminTabBtn.classList.add("active");
    document.getElementById("shopPage").classList.add("hidden");
    document.getElementById("historyPage").classList.add("hidden");
    document.getElementById("adminPage").classList.remove("hidden");
    renderAdminCustomList();
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
adminAccessBtn.addEventListener("click", askAdminCode);

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

let editingProductId = null;

// ADMIN: FIRESTORE'GA MAHSULOT QO‘SHISH / TAHRIRLASH
async function addCustomProduct(){
  const name = adminNameEl.value.trim();
  const category = adminCategoryEl.value;
  const basePrice = parseInt(adminPriceBaseEl.value, 10);
  const hasDiscount = adminHasDiscountEl.checked;
  const discountPriceRaw = adminPriceDiscountEl.value ? parseInt(adminPriceDiscountEl.value, 10) : null;
  const tag = adminTagEl.value.trim();
  const description = adminDescriptionEl.value.trim();

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

  let images = normalizeImagesInput(adminImagesEl.value.trim());
  if(!images.length){
    images = [RAW_PREFIX + "noimage.png"];
  }

  const emoji = categoryEmoji[category] || categoryEmoji.default;
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
      // ✏️ TAHRIRLASH
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
      // ➕ YANGI MAHSULOT
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

    // Formani tozalash
    editingProductId = null;
    adminNameEl.value = "";
    adminPriceBaseEl.value = "";
    adminPriceDiscountEl.value = "";
    adminHasDiscountEl.checked = false;
    adminTagEl.value = "";
    adminDescriptionEl.value = "";
    adminImagesEl.value = "";

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

  editingProductId = id;

  adminNameEl.value = p.name || "";
  adminCategoryEl.value = p.category || "pomada";

  if(p.oldPrice && p.oldPrice > p.price){
    adminPriceBaseEl.value = p.oldPrice;
    adminPriceDiscountEl.value = p.price;
    adminHasDiscountEl.checked = true;
  }else{
    adminPriceBaseEl.value = p.price;
    adminPriceDiscountEl.value = "";
    adminHasDiscountEl.checked = false;
  }

  adminTagEl.value = p.tag || "";
  adminDescriptionEl.value = p.description || "";
  adminImagesEl.value = (p.images && p.images.length) ? p.images.join(", ") : "";

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
    detailBackBtn.style.color = "#ef4444"; // qizil
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

  const catLabel = categoryLabel[p.category] || p.category;

  renderDetailImage();

  detailCategoryEl.textContent = catLabel;
  detailNameEl.textContent = p.name;
  detailTagEl.textContent = p.tag ? "💡 " + p.tag : "";
  detailDescEl.textContent =
    p.description && p.description.trim().length
      ? p.description
      : "Bu mahsulot sizning go‘zallik rutiningiz uchun mo‘ljallangan. Admin paneldan batafsil tavsif yozib qo‘yishingiz mumkin.";
  detailPriceEl.textContent = formatPrice(p.price) + " so‘m";
  if(p.oldPrice){
    detailOldPriceEl.textContent = formatPrice(p.oldPrice) + " so‘m";
    detailOldPriceEl.classList.remove("hidden");
  }else{
    detailOldPriceEl.classList.add("hidden");
  }

  // Miqdor 1 dan boshlanadi
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
    addToCart(detailIndex, detailQty);
    detailAddBtn.classList.add("added");
    detailAddBtn.textContent = "✅ Savatga qo‘shildi";
    if(detailBackBtn){
      detailBackBtn.classList.remove("hidden");
    }
    // ⏱ 5 soniyali countdown
    startDetailCountdown();
  });
}

if(detailBackBtn){
  detailBackBtn.addEventListener("click", ()=>{
    // Foydalanuvchi o‘zi bosib chiqmoqchi bo‘lsa ham, countdown tozalanadi
    closeProductDetail();
  });
}

productDetailOverlay.addEventListener("click",(e)=>{
  if(e.target === productDetailOverlay){
    closeProductDetail();
  }
});

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

// INIT
(function init(){
  const savedTheme = localStorage.getItem(THEME_KEY) || "light";
  applyTheme(savedTheme);
  isAdmin = false;
  updateAdminUI();
  rebuildProducts();          // faqat default mahsulotlar
  renderHistory();
  subscribeProductsRealtime(); // 🔄 REAL-TIME FIRESTORE
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
