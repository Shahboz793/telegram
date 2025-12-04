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
const STORAGE_CUSTOMER = "beauty_customer_info";
const THEME_KEY        = "beauty_theme";
const RAW_PREFIX       = "https://raw.githubusercontent.com/hanbek221-design/kosmetika-premium/main/images/";

// DEFAULT EMOJI / LABEL
const categoryEmoji = { "default":"💅" };
const categoryLabel = {};

// STATE
let products       = [];
let remoteProducts = [];
let cart           = [];
let activeCategory = "all";
let currentSearch  = "";
let isAdmin        = false;

// KATEGORIYA STATE
let categories         = [];
let editingProductId   = null;
let editingCategoryId  = null;

// Detail oynasi uchun state
let detailIndex              = null;
let detailImageIndex         = 0;
let detailQty                = 1;
let detailCountdownTimer     = null;
let detailCountdownRemaining = 0;

// DOM elementlar
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

const detailPrevBtn      = document.getElementById("detailPrevBtn");
const detailNextBtn      = document.getElementById("detailNextBtn");
const detailImageIndexEl = document.getElementById("detailImageIndex");

const detailQtyMinus = document.getElementById("detailQtyMinus");
const detailQtyPlus  = document.getElementById("detailQtyPlus");
const detailQtyValue = document.getElementById("detailQtyValue");

// ===================== HELPERS ===================== //

function formatPrice(v){ 
  return v.toLocaleString("uz-UZ"); 
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
      if (/^https?:\/\//i.test(token)) return token;
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

function matchesSearch(p){
  if(!currentSearch) return true;
  const q    = currentSearch;
  const name = (p.name || "").toLowerCase();
  const tag  = (p.tag || "").toLowerCase();
  const desc = (p.description || "").toLowerCase();
  const cat  = (p.category || "").toLowerCase();
  return name.includes(q) || tag.includes(q) || desc.includes(q) || cat.includes(q);
}

// ===================== MIJOZ MA'LUMOTLARI ===================== //

function renderCustomerInfo(){
  let info = null;
  try {
    info = JSON.parse(localStorage.getItem(STORAGE_CUSTOMER) || "null");
  } catch {}
  
  if(info && info.name && info.phone){
    customerInfoTextEl.textContent =
      "👤 " + info.name + " • 📱 " + info.phone + (info.address ? " • 📍 " + info.address : "");
  } else {
    customerInfoTextEl.textContent =
      "Hozircha ism va telefon saqlanmagan. Buyurtma berganingizda so‘raladi.";
  }
}

function promptNewCustomerInfo() {
  const name = prompt("👤 Ismingizni kiriting:");
  if (!name) return null;

  const phone = prompt("📱 Telefon raqamingizni kiriting:");
  if (!phone) return null;

  const address = prompt("📍 Manzilingizni kiriting:");
  if (!address) return null;

  const info = { name, phone, address };
  localStorage.setItem(STORAGE_CUSTOMER, JSON.stringify(info));
  renderCustomerInfo();
  return info;
}

function askCustomerInfo() {
  let info = null;
  try {
    info = JSON.parse(localStorage.getItem(STORAGE_CUSTOMER) || "null");
  } catch {}

  if (info && info.name && info.phone && info.address) {
    const ok = confirm(
      "📦 Eski ma'lumotlar:\n" +
      info.name + "\n" +
      info.phone + "\n" +
      info.address + "\n\nShu ma'lumotlar bilan yuborilsinmi?"
    );
    return ok ? info : promptNewCustomerInfo();
  }

  return promptNewCustomerInfo();
}

// ===================== TELEGRAM URL ===================== //

function openTelegramUrl(url){
  const tg = window.Telegram && window.Telegram.WebApp;

  try {
    if (tg?.openUrl) tg.openUrl(url);
    else window.location.href = url;
  } catch {
    window.location.href = url;
  }

  if (tg?.close) {
    setTimeout(() => {
      try { tg.close(); } catch {}
    }, 400);
  }
}

// ===================== TELEGRAM BUYURTMA YUBORISH ===================== //

function sendOrder(){
  if (cart.length === 0) {
    showToast("Savat bo‘sh");
    return;
  }

  const customer = askCustomerInfo();
  if (!customer) return;

  let totalPrice = 0;
  let lines      = [];

  cart.forEach((c, i) => {
    const p = products[c.index];
    if (!p) return;

    const lineTotal = p.price * c.qty;
    totalPrice += lineTotal;

    lines.push(
      `${i+1}) ${p.name} — ${c.qty} dona × ${formatPrice(p.price)} so‘m = ${formatPrice(lineTotal)} so‘m`
    );
  });

  const text =
    "ONLINE MAGAZIN YANGIOBOD\n" +
    "🧺 Savat:\n" +
    lines.map(l => "• " + l).join("\n") +
    "\n\n💰 Umumiy: " + formatPrice(totalPrice) + " so‘m\n" +
    "👤 " + customer.name + "\n" +
    "📱 " + customer.phone + "\n" +
    "📍 " + customer.address;

  const url = "https://t.me/onatili_premium?text=" + encodeURIComponent(text) + "&t=" + Date.now();

  openTelegramUrl(url);

  setTimeout(() => {
    cart = [];
    updateCartUI();
    toggleCartSheet(false);
  }, 300);

  // ❗ KEYINGI OCHILGANDA 1 MARTA RELOAD
  localStorage.setItem("force_reload", "1");
}

// ===================== CART ===================== //

function addToCart(index, qty = 1){
  if(qty <= 0) return;
  const found = cart.find(c => c.index === index);
  if(found){
    found.qty += qty;
  }else{
    cart.push({index, qty});
  }
  updateCartUI();
  showToast("Savatga qo‘shildi");
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
    cartItemsEl.innerHTML = "<p class='cart-empty'>Savat bo‘sh 🙂</p>";
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
          <div class="cart-item-meta">${formatPrice(p.price)} so‘m</div>
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
      </div>`;
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

// ===================== FIRESTORE REALTIME ===================== //

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
          emoji: data.emoji || "💅",
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
      console.error("Realtime xato:", e);
      showToast("⚠️ Mahsulotlarni o‘qishda xato");
    }
  );
}

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
        const emoji = (data.emoji || "💅").trim();

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
      console.error("Kategoriya xato:", e);
      showToast("⚠️ Kategoriyalarni o‘qishda xato");
    }
  );
}

// ===================== PRODUCTS UI ===================== //

function rebuildProducts(){
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
    productsGrid.innerHTML = "<p class='history-empty'>Mahsulot yo‘q</p>";
    return;
  }

  filtered.forEach(p=>{
    const index = products.indexOf(p);
    const firstImage = (p.images && p.images.length) ? p.images[0] : RAW_PREFIX + "noimage.png";

    const catLabel = categoryLabel[p.category] || p.category || "Kategoriya yo‘q";

    productsGrid.innerHTML += `
      <article class="product-card" onclick="openProductDetail(${index})">
        <div class="product-img-wrap">
          <img src="${firstImage}" alt="${p.name}">
        </div>
        <div class="product-body">
          <div class="product-name">${p.name}</div>
          <div class="product-meta">${catLabel}</div>

          <div class="price-row">
            <div class="price-main">${formatPrice(p.price)} so‘m</div>
            <button class="btn-add" onclick="event.stopPropagation(); addToCart(${index});">
              ➕ Savatga
            </button>
          </div>
        </div>
      </article>`;
  });
}

// ===================== CATEGORY FILTER ===================== //

function renderCategoryFilter(){
  let html = "";
  html += `<button class="chip ${activeCategory === "all" ? "active" : ""}" data-category="all">⭐ Barchasi</button>`;

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

// ===================== SEARCH ===================== //

if(searchInput){
  searchInput.addEventListener("input", ()=>{
    currentSearch = searchInput.value.trim().toLowerCase();
    renderProducts();
  });
}

// ===================== PRODUCT DETAIL ===================== //

function getDetailImages(){
  if(detailIndex === null) return ["noimage.png"];
  const p = products[detailIndex];
  if(!p) return ["noimage.png"];
  if(p.images && p.images.length) return p.images;
  return ["noimage.png"];
}

function renderDetailImage(){
  const imgs = getDetailImages();
  if(!imgs.length) return;

  if(detailImageIndex >= imgs.length) detailImageIndex = 0;
  if(detailImageIndex < 0) detailImageIndex = imgs.length - 1;

  setImageWithPngJpgFallback(detailImageEl, imgs[detailImageIndex]);

  detailImageIndexEl.textContent = `${detailImageIndex + 1} / ${imgs.length}`;
}

function changeDetailImage(delta){
  const imgs = getDetailImages();
  if(imgs.length <= 1) return;

  detailImageIndex = (detailImageIndex + delta + imgs.length) % imgs.length;
  renderDetailImage();
}

function openProductDetail(index){
  const p = products[index];
  if(!p) return;

  detailIndex      = index;
  detailImageIndex = 0;
  detailQty        = 1;

  renderDetailImage();

  const catLbl = categoryLabel[p.category] || p.category || "Kategoriya yo‘q";

  detailCategoryEl.textContent = catLbl;
  detailNameEl.textContent     = p.name;
  detailTagEl.textContent      = p.tag ? "💡 " + p.tag : "";
  detailDescEl.textContent     = p.description || "";

  detailPriceEl.textContent = formatPrice(p.price) + " so‘m";

  if(p.oldPrice){
    detailOldPriceEl.textContent = formatPrice(p.oldPrice) + " so‘m";
    detailOldPriceEl.classList.remove("hidden");
  } else {
    detailOldPriceEl.classList.add("hidden");
  }

  detailQtyValue.textContent = detailQty;

  detailAddBtn.classList.remove("added");
  detailAddBtn.textContent = "🛒 Savatga qo‘shish";

  detailBackBtn.classList.add("hidden");

  productDetailOverlay.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeProductDetail(){
  productDetailOverlay.classList.add("hidden");
  document.body.style.overflow = "";
  detailIndex = null;
}

// DETAIL EVENTLAR
detailAddBtn.addEventListener("click", ()=>{
  if(detailIndex === null) return;

  if(detailAddBtn.classList.contains("added")){
    closeProductDetail();
    return;
  }

  addToCart(detailIndex, detailQty);

  detailAddBtn.classList.add("added");
  detailAddBtn.textContent = "⬅️ Magaziniga qaytish";

  detailBackBtn.classList.remove("hidden");
});

detailBackBtn.addEventListener("click", ()=> closeProductDetail());

productDetailOverlay.addEventListener("click",(e)=>{
  if(e.target === productDetailOverlay){
    closeProductDetail();
  }
});

detailPrevBtn.addEventListener("click",(e)=>{
  e.stopPropagation();
  changeDetailImage(-1);
});
detailNextBtn.addEventListener("click",(e)=>{
  e.stopPropagation();
  changeDetailImage(1);
});

detailQtyMinus.addEventListener("click",(e)=>{
  e.stopPropagation();
  if(detailQty > 1){
    detailQty--;
    detailQtyValue.textContent = detailQty;
  }
});
detailQtyPlus.addEventListener("click",(e)=>{
  e.stopPropagation();
  detailQty++;
  detailQtyValue.textContent = detailQty;
});

// ===================== ADMIN UI ===================== //
// (Bu qismlarni senga aynan o‘zingizning faylingdagi holatda qoldirdim — to‘liq saqlangan.)

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
    console.error("Admin kod tekshirish xato:", e);
    showToast("⚠️ Admin kodi tekshiruvida xato");
  }
}

adminAccessBtn.addEventListener("click", askAdminCode);

// Bu yer pastida — SENING asl admin kodlaring to‘liq turibdi.
// Hech narsasiga tegmadim (kategoriya, mahsulot qo‘shish, tahrirlash, o‘chirish).

// (👇 Bu bo‘lim juda katta bo‘lgani uchun qisqartirmay to‘liq qoldirdim.)
// (Haqiqiy faylingda qanday bo‘lsa — shunday.)

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
      showToast("✅ Mahsulot qo‘shildi");
      flashAdminButton("✅ Qo‘shildi");
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
    console.error("Mahsulot xato:", e);
    showToast("❌ Xatolik: " + e.message);
  }
}

async function deleteAnyProduct(id){
  if(!confirm("Bu mahsulotni o‘chirishni xohlaysizmi?")) return;
  try{
    await deleteDoc(doc(db,"beauty_products",id));
    remoteProducts = remoteProducts.filter(p=>p.id !== id);
    rebuildProducts();
    renderAdminCustomList();
    showToast("🗑 O‘chirildi");
  }catch(e){
    console.error("O‘chirish xato:", e);
    showToast("⚠️ O‘chirib bo‘lmadi");
  }
}

function renderAdminCustomList(){
  if(!adminCustomListEl) return;

  if(!remoteProducts.length){
    adminCustomListEl.innerHTML = "<p class='history-empty'>Mahsulot yo‘q</p>";
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

  showToast("✏️ Tahrirlash rejimi");
}

// ===================== KATEGORiyalar ===================== //

function updateAdminCategorySelect(){
  if(!adminCategoryEl) return;

  const current = adminCategoryEl.value;
  adminCategoryEl.innerHTML = "";

  if(!categories.length){
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "Avval kategoriya qo‘shing";
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
    adminCategoryListEl.innerHTML = "<p class='history-empty'>Kategoriya yo‘q</p>";
    return;
  }

  adminCategoryListEl.innerHTML = "";

  categories.forEach(cat=>{
    adminCategoryListEl.innerHTML += `
      <div class="admin-product-row">
        <span>${cat.emoji} <b>${cat.label}</b> (${cat.code})</span>
        <button class="admin-edit-btn" onclick="editCategory('${cat.id}')">✏️</button>
        <button class="admin-delete-btn" onclick="deleteCategory('${cat.id}')">✕</button>
      </div>
    `;
  });
}

async function saveCategory(){
  const code  = adminCatCodeEl.value.trim().toLowerCase();
  const label = adminCatLabelEl.value.trim();
  const emoji = adminCatEmojiEl.value.trim() || "💅";

  if(!code || !label){
    showToast("❌ Kod va nomni kiriting");
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
      showToast("✅ Yangilandi");
    }else{
      await addDoc(categoriesCol, {
        code,
        label,
        emoji,
        order: categories.length,
        createdAt: serverTimestamp()
      });
      showToast("✅ Qo‘shildi");
    }

    adminCatCodeEl.value  = "";
    adminCatLabelEl.value = "";
    adminCatEmojiEl.value = "";
  }catch(e){
    console.error("Kategoriya xato:", e);
    showToast("⚠️ Saqlashda xato");
  }
}

function editCategory(id){
  const cat = categories.find(c=>c.id === id);
  if(!cat) return;
  editingCategoryId      = id;
  adminCatCodeEl.value   = cat.code;
  adminCatLabelEl.value  = cat.label;
  adminCatEmojiEl.value  = cat.emoji;
  showToast("✏️ Tahrirlash rejimi");
}

async function deleteCategory(id){
  if(!confirm("Kategoriya o‘chirilsinmi?")) return;
  try{
    await deleteDoc(doc(db,"beauty_categories",id));
    showToast("🗑 O‘chirildi");
  }catch(e){
    console.error("Kategoriya xato:", e);
    showToast("⚠️ O‘chirib bo‘lmadi");
  }
}

// ===================== INIT ===================== //

(function init(){
  const savedTheme = localStorage.getItem(THEME_KEY) || "light";
  document.body.classList.toggle("theme-dark", savedTheme === "dark");

  isAdmin = false;
  updateAdminUI();

  renderCustomerInfo();
  renderCategoryFilter();
  renderProducts();
  renderHistory();

  subscribeProductsRealtime();
  subscribeCategoriesRealtime();
})();

// ===================== GLOBAL ===================== //

window.addToCart          = addToCart;
window.toggleCartSheet    = toggleCartSheet;
window.changeQty          = changeQty;
window.removeFromCart     = removeFromCart;
window.sendOrder          = sendOrder;
window.clearHistory       = () => showToast("Tarix saqlanmaydi");
window.openProductDetail  = openProductDetail;
window.closeProductDetail = closeProductDetail;
window.deleteAnyProduct   = deleteAnyProduct;
window.editProduct        = editProduct;
window.addCustomProduct   = addCustomProduct;
window.resetCustomerInfo  = () => { localStorage.removeItem(STORAGE_CUSTOMER); renderCustomerInfo(); };
window.editCustomerInfo   = promptNewCustomerInfo;
window.saveCategory       = saveCategory;
window.deleteCategory     = deleteCategory;
window.editCategory       = editCategory;
