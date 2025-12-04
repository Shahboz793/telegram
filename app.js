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
const STORAGE_CUSTOMER = "beauty_customer_info";
const THEME_KEY        = "beauty_theme";
const RAW_PREFIX       = "https://raw.githubusercontent.com/hanbek221-design/kosmetika-premium/main/images/";

const categoryEmoji = { "default":"💅" };
const categoryLabel = {};

let products       = [];
let remoteProducts = [];
let cart           = [];
let activeCategory = "all";
let currentSearch  = "";
let isAdmin        = false;
let categories     = [];

let detailIndex      = null;
let detailImageIndex = 0;
let detailQty        = 1;

// DOM ELEMENTLAR
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

// DETAIL
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

const detailPrevBtn        = document.getElementById("detailPrevBtn");
const detailNextBtn        = document.getElementById("detailNextBtn");
const detailImageIndexEl   = document.getElementById("detailImageIndex");

const detailQtyMinus = document.getElementById("detailQtyMinus");
const detailQtyPlus  = document.getElementById("detailQtyPlus");
const detailQtyValue = document.getElementById("detailQtyValue");

// ADMIN FORM
const adminNameEl          = document.getElementById("adminName");
const adminCategoryEl      = document.getElementById("adminCategory");
const adminPriceBaseEl     = document.getElementById("adminPriceBase");
const adminHasDiscountEl   = document.getElementById("adminHasDiscount");
const adminPriceDiscountEl = document.getElementById("adminPriceDiscount");
const adminTagEl           = document.getElementById("adminTag");
const adminDescriptionEl   = document.getElementById("adminDescription");
const adminImagesEl        = document.getElementById("adminImages");

const adminCatCodeEl       = document.getElementById("adminCatCode");
const adminCatLabelEl      = document.getElementById("adminCatLabel");
const adminCatEmojiEl      = document.getElementById("adminCatEmoji");
const adminCategoryListEl  = document.getElementById("adminCategoryList");


// ============= HELPERS =============
function formatPrice(v){ return v.toLocaleString("uz-UZ"); }

function showToast(msg){
  if(!toastEl) return;
  toastEl.textContent = msg;
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
      if (/^(http|https):\/\//i.test(token)) return token;
      const name = token.replace(/\.(png|jpg|jpeg)$/i, "");
      return RAW_PREFIX + name + ".png";
    });
}

function setImageWithPngJpgFallback(img, url){
  if(!url){
    img.src = RAW_PREFIX + "noimage.png";
    return;
  }
  if(url.startsWith(RAW_PREFIX)){
    const base = url.replace(/\.(png|jpg|jpeg)$/i, "");
    img.onerror = () => { img.onerror=null; img.src = base + ".jpg"; };
    img.src = base + ".png";
  } else {
    img.src = url;
  }
}


// ============= SEARCH MATCH =============
function matchesSearch(p){
  if(!currentSearch) return true;
  const q = currentSearch;
  return (
    (p.name || "").toLowerCase().includes(q) ||
    (p.tag || "").toLowerCase().includes(q) ||
    (p.description || "").toLowerCase().includes(q) ||
    (p.category || "").toLowerCase().includes(q)
  );
}


// ============= MIJOZ MA’LUMOTLARI =============
function renderCustomerInfo(){
  let info = null;
  try { info = JSON.parse(localStorage.getItem(STORAGE_CUSTOMER)); } catch(e){}
  if(info && info.name){
    customerInfoTextEl.textContent =
      `👤 ${info.name} • 📱 ${info.phone} • 📍 ${info.address}`;
  } else {
    customerInfoTextEl.textContent = "Hozircha ism va telefon saqlanmagan.";
  }
}

function promptNewCustomerInfo(){
  const name = prompt("👤 Ismingiz:");
  if(!name) return null;
  const phone = prompt("📱 Telefon:");
  if(!phone) return null;
  const address = prompt("📍 Manzil:");
  if(!address) return null;

  const info = {name, phone, address};
  localStorage.setItem(STORAGE_CUSTOMER, JSON.stringify(info));
  renderCustomerInfo();
  return info;
}

function askCustomerInfo(){
  let info = null;
  try { info = JSON.parse(localStorage.getItem(STORAGE_CUSTOMER)); } catch(e){}

  if(info && info.name && info.phone && info.address){
    const ok = confirm(
      "📌 Oldingi ma'lumotlar:\n" +
      info.name + "\n" + info.phone + "\n" + info.address +
      "\n\nShu ma'lumotlar ishlatilsinmi?"
    );
    return ok ? info : promptNewCustomerInfo();
  }

  return promptNewCustomerInfo();
}

function resetCustomerInfo(){
  localStorage.removeItem(STORAGE_CUSTOMER);
  renderCustomerInfo();
  showToast("Ma'lumotlar o‘chirildi");
}


// ============= REALTIME PRODUCTS =============
function subscribeProductsRealtime(){
  onSnapshot(productsCol, snap=>{
    const list = [];
    snap.forEach(d=>{
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
  });
}


// ============= REALTIME CATEGORIES =============
function subscribeCategoriesRealtime(){
  onSnapshot(categoriesCol, snap=>{
    const list = [];
    snap.forEach(d=>{
      const data = d.data() || {};
      const code  = (data.code || "").toLowerCase().trim();
      if(!code) return;

      const label = data.label || code;
      const emoji = data.emoji || "💅";

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

    list.sort((a,b)=>(a.order||0)-(b.order||0));
    categories = list;

    renderCategoryFilter();
    updateAdminCategorySelect();
    renderCategoryAdminList();
  });
}
// ============= PRODUCTS RENDER =============
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
    productsGrid.innerHTML =
      "<p class='history-empty'>Hozircha mahsulot qo‘shilmagan.</p>";
    return;
  }

  filtered.forEach(p=>{
    const index = products.indexOf(p);

    const discount = p.oldPrice && p.oldPrice > p.price
      ? (100 - Math.round(p.price*100/p.oldPrice))
      : null;

    const catLabel = categoryLabel[p.category] || "Kategoriya";

    const firstImage =
      (p.images && p.images.length)
        ? p.images[0]
        : RAW_PREFIX + "noimage.png";

    let imgHtml = "";
    if (firstImage.startsWith(RAW_PREFIX)) {
      const base = firstImage.replace(/\.(png|jpg|jpeg)$/i, "");
      imgHtml =
        `<img src="${base}.png" 
         onerror="this.onerror=null;this.src='${base}.jpg';">`;
    } else {
      imgHtml = `<img src="${firstImage}">`;
    }

    productsGrid.innerHTML += `
      <article class="product-card" onclick="openProductDetail(${index})">
        <div class="product-img-wrap">
          ${imgHtml}
          ${discount ? `<div class="product-sale">-${discount}%</div>` : ``}
        </div>

        <div class="product-body">
          <div class="product-name">${p.name}</div>
          <div class="product-meta">
            ${catLabel} • ${p.tag || "Teg yo‘q"}
          </div>

          <div class="price-row">
            <div>
              <div class="price-main">${formatPrice(p.price)} so‘m</div>
              ${p.oldPrice ? `<div class="price-old">${formatPrice(p.oldPrice)} so‘m</div>` : ``}
            </div>
            <button class="btn-add"
              onclick="event.stopPropagation(); addToCart(${index});">
              ➕ Savatga
            </button>
          </div>
        </div>
      </article>
    `;
  });
}


// ============= CATEGORY FILTER =============
function renderCategoryFilter(){
  if(!filterBar) return;

  let html = `
    <button class="chip ${activeCategory === "all" ? "active" : ""}"
      data-category="all">
/*  
===========================================
   🚀 PART 3 shu yerdan boshlanadi
   (buni PART 2 tugagan joydan keyin qo'ying)
===========================================
*/

// ===================== CATEGORY FILTER CLICK =====================
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


// ===================== SEARCH =====================
if(searchInput){
  searchInput.addEventListener("input", ()=>{
    currentSearch = searchInput.value.trim().toLowerCase();
    renderProducts();
  });
}


// ===================== CART SYSTEM =====================
function addToCart(index, qty = 1){
  if (qty <= 0) return;

  const found = cart.find(c => c.index === index);
  if(found){
    found.qty += qty;
  } else {
    cart.push({ index, qty });
  }

  updateCartUI();
  showToast("Savatga qo‘shildi");
}

function updateCartUI(){
  let totalCount = 0;
  let totalPrice = 0;

  cart.forEach(c=>{
    const p = products[c.index];
    if (!p) return;
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
  const next   = (typeof force === "boolean" ? force : !isOpen);

  cartSheet.classList.toggle("open", next);
  cartSheetOverlay.classList.toggle("show", next);

  if(next){
    renderCartItems();
  }
}

function renderCartItems(){
  if(cart.length === 0){
    cartItemsEl.innerHTML = `
      <p class='cart-empty'>Savat hozircha bo‘sh 🙂</p>
    `;
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
    cart = cart.filter(c => c.index !== productIndex);
  }

  updateCartUI();
  renderCartItems();
}

function removeFromCart(productIndex){
  cart = cart.filter(c => c.index !== productIndex);
  updateCartUI();
  renderCartItems();
}


// ===================== OPEN TELEGRAM URL (YANGILANGAN) =====================
function openTelegramUrl(url){
  const tg = window.Telegram && window.Telegram.WebApp;

  try {
    if (tg && typeof tg.openUrl === "function") {
      tg.openUrl(url);  // WebApp yopilmaydi
    } else {
      window.location.href = url;
    }
  } catch (e) {
    window.location.href = url;
  }
}


/*  
===========================================
   ⬆⬆⬆ PART 3 shu yerda tugaydi.
   Keyingi bo'lak uchun:
   👉 “PART 4 tashla” deb yozing.
===========================================
*/
/*  
===========================================
   🚀 PART 4 shu yerdan boshlanadi
   (buni PART 3 dan keyin qo'ying)
===========================================
*/


// ===================== PRODUCT DETAIL HELPERS =====================
function getDetailImages(){
  if(detailIndex === null) return [RAW_PREFIX + "noimage.png"];

  const p = products[detailIndex];
  if(!p) return [RAW_PREFIX + "noimage.png"];

  return p.images && p.images.length
    ? p.images
    : [RAW_PREFIX + "noimage.png"];
}

function renderDetailImage(){
  if(!detailImageEl) return;

  const imgs = getDetailImages();
  if(!imgs.length) return;

  if(detailImageIndex >= imgs.length) detailImageIndex = 0;
  if(detailImageIndex < 0)            detailImageIndex = imgs.length - 1;

  setImageWithPngJpgFallback(detailImageEl, imgs[detailImageIndex]);

  if(detailImageIndexEl){
    detailImageIndexEl.textContent =
      `${detailImageIndex + 1} / ${imgs.length}`;
  }
}


// ===================== OPEN PRODUCT DETAIL =====================
function openProductDetail(index){
  const p = products[index];
  if(!p) return;

  detailIndex      = index;
  detailImageIndex = 0;
  detailQty        = 1;

  // Render image
  renderDetailImage();

  // Fill data
  const catLabel = categoryLabel[p.category] || p.category;
  detailCategoryEl.textContent = catLabel;
  detailNameEl.textContent     = p.name;
  detailTagEl.textContent      = p.tag ? "💡 " + p.tag : "";

  detailDescEl.textContent =
    p.description && p.description.trim().length
      ? p.description
      : "Bu mahsulot haqida batafsil ma’lumot kiritilmagan.";

  detailPriceEl.textContent = formatPrice(p.price) + " so‘m";

  if(p.oldPrice){
    detailOldPriceEl.textContent = formatPrice(p.oldPrice) + " so‘m";
    detailOldPriceEl.classList.remove("hidden");
  } else {
    detailOldPriceEl.classList.add("hidden");
  }

  detailQtyValue.textContent = detailQty;

  // Reset button state
  detailAddBtn.classList.remove("added");
  detailAddBtn.textContent = "🛒 Savatga qo‘shish";

  // Hide back button
  detailBackBtn.classList.add("hidden");

  // Open modal
  productDetailOverlay.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}


// ===================== CLOSE PRODUCT DETAIL =====================
function closeProductDetail(){
  productDetailOverlay.classList.add("hidden");
  document.body.style.overflow = "";
  detailIndex = null;
}


// ===================== GALLERY BUTTONS =====================
if(detailPrevBtn){
  detailPrevBtn.addEventListener("click", e=>{
    e.stopPropagation();
    detailImageIndex--;
    renderDetailImage();
  });
}

if(detailNextBtn){
  detailNextBtn.addEventListener("click", e=>{
    e.stopPropagation();
    detailImageIndex++;
    renderDetailImage();
  });
}


// ===================== QTY BUTTONS =====================
if(detailQtyMinus){
  detailQtyMinus.addEventListener("click", e=>{
    e.stopPropagation();
    if(detailQty > 1){
      detailQty--;
      detailQtyValue.textContent = detailQty;
    }
  });
}

if(detailQtyPlus){
  detailQtyPlus.addEventListener("click", e=>{
    e.stopPropagation();
    detailQty++;
    detailQtyValue.textContent = detailQty;
  });
}


// ===================== ADD TO CART FROM DETAIL =====================
if(detailAddBtn){
  detailAddBtn.addEventListener("click", ()=>{
    if(detailIndex === null) return;

    // If already added → return to shop
    if(detailAddBtn.classList.contains("added")){
      closeProductDetail();
      return;
    }

    // Add first time
    addToCart(detailIndex, detailQty);
    detailAddBtn.classList.add("added");
    detailAddBtn.textContent = "⬅️ Magaziniga qaytish";

    detailBackBtn.classList.remove("hidden");
  });
}

if(detailBackBtn){
  detailBackBtn.addEventListener("click", ()=>{
    closeProductDetail();
  });
}


// ===================== CLOSE BY CLICK ON OVERLAY =====================
if(productDetailOverlay){
  productDetailOverlay.addEventListener("click", e=>{
    if(e.target === productDetailOverlay){
      closeProductDetail();
    }
  });
}


/*  
===========================================
   ⬆⬆⬆ PART 4 shu yerda tugaydi.
   Keyingi bo'lak uchun:
   👉 “PART 5 tashla” deb yozing.
===========================================
*/
/*  
===========================================
   🚀 PART 5 shu yerdan boshlanadi
   (buni PART 4 dan keyin qo'ying)
===========================================
*/


// ===================== SEND ORDER =====================
function sendOrder(){
  if (cart.length === 0) {
    showToast("Savat bo‘sh. Avval mahsulot tanlang 🙂");
    return;
  }

  // 1) Mijoz ma'lumotlari
  const customer = askCustomerInfo();
  if (!customer) {
    showToast("Ma'lumotlar kiritilmadi.");
    return;
  }

  // 2) Buyurtma matnini yaratish
  let total = 0;
  let lines = [];

  cart.forEach((c, i) => {
    const p = products[c.index];
    if (!p) return;

    const sum = p.price * c.qty;
    total += sum;

    lines.push(
      `${i + 1}) ${p.name} — ${c.qty} dona × ${formatPrice(p.price)} so‘m = ${formatPrice(sum)} so‘m`
    );
  });

  const text =
    "📦 ONLINE MAGAZIN YANGIOBOD — Buyurtma\n" +
    "━━━━━━━━━━━━━━\n" +
    "🧺 Savat:\n" +
    lines.map(l => "• " + l).join("\n") +
    "\n\n💰 Umumiy: " + formatPrice(total) + " so‘m\n" +
    "👤 Ism: " + customer.name + "\n" +
    "📱 Tel: " + customer.phone + "\n" +
    "📍 Manzil: " + customer.address + "\n";

  const encoded = encodeURIComponent(text);

  // 3) 2 TA AKKAUNTGA NAVBAT BILAN YUBORISH
  const ACC1 = "https://t.me/onatili_premium";
  const ACC2 = "https://t.me/shahbozzbek";

  let last = localStorage.getItem("last_account") || "acc2";
  let target = (last === "acc1") ? ACC2 : ACC1;

  localStorage.setItem("last_account", (last === "acc1" ? "acc2" : "acc1"));

  const finalUrl = `${target}?text=${encoded}&t=${Date.now()}`;

  // 4) Telegramga xabar yuborish
  openTelegramUrl(finalUrl);

  // 5) Savatni tozalash (har safar aniq ishlashi uchun)
  setTimeout(() => {
    cart = [];
    updateCartUI();
    renderCartItems();
    toggleCartSheet(false);
  }, 200);

  // 6) Yuborilgandan keyin sahifani 1 martagina yangilash
  setTimeout(() => {
    location.reload();
  }, 500);
}


/*  
===========================================
   ⬆⬆⬆ PART 5 shu yerda tugaydi.
   Keyingi bo'lak (PART 6 — Admin panel, init, exports)
   👉 “PART 6 tashla” deb yozing.
===========================================
*/
/*  
===========================================
   🚀 PART 6 shu yerdan boshlanadi
   (buni PART 5 dan keyin qo'ying)
===========================================
*/


// ===================== ADMIN CHECK =====================
function askAdminAccess(){
  const pass = prompt("Admin paroli:");
  if(pass === "7777"){   
    isAdmin = true;
    adminTabBtn.classList.remove("hidden");
    showToast("Admin rejimi yoqildi");
  } else {
    showToast("Noto‘g‘ri parol");
  }
}


// ===================== ADMIN PRODUCT LIST =====================
function renderAdminCustomList(){
  if(!isAdmin) return;
  adminCustomListEl.innerHTML = "";

  remoteProducts.forEach(p=>{
    adminCustomListEl.innerHTML += `
      <div class="admin-item">
        <div class="admin-name">${p.name}</div>
        <button onclick="deleteProduct('${p.id}')">🗑 O‘chirish</button>
      </div>
    `;
  });
}


// ===================== ADD NEW PRODUCT =====================
async function addNewProduct(){
  const name  = adminNameEl.value.trim();
  const cat   = adminCategoryEl.value.trim().toLowerCase();
  const price = parseInt(adminPriceBaseEl.value) || 0;
  const tag   = adminTagEl.value.trim();
  const desc  = adminDescriptionEl.value.trim();

  const hasDiscount = adminHasDiscountEl.checked;
  const oldPrice = hasDiscount
    ? (parseInt(adminPriceDiscountEl.value) || null)
    : null;

  const imgs = normalizeImagesInput(adminImagesEl.value);

  if(!name || !cat || price <= 0){
    showToast("Ma’lumotlar to‘liq emas");
    return;
  }

  await addDoc(productsCol, {
    name,
    category: cat,
    price,
    oldPrice,
    tag,
    description: desc,
    images: imgs,
    createdAt: serverTimestamp()
  });

  showToast("Mahsulot qo‘shildi");

  adminNameEl.value = "";
  adminCategoryEl.value = "";
  adminPriceBaseEl.value = "";
  adminHasDiscountEl.checked = false;
  adminPriceDiscountEl.value = "";
  adminTagEl.value = "";
  adminDescriptionEl.value = "";
  adminImagesEl.value = "";
}


// ===================== DELETE PRODUCT =====================
async function deleteProduct(id){
  const ok = confirm("Rostdan o‘chirilsinmi?");
  if(!ok) return;

  await deleteDoc(doc(db, "beauty_products", id));
  showToast("Mahsulot o‘chirildi");
}


// ===================== CATEGORY ADMIN RENDER =====================
function updateAdminCategorySelect(){
  if(!adminCategoryEl) return;

  adminCategoryEl.innerHTML = "";
  categories.forEach(cat=>{
    adminCategoryEl.innerHTML += `
      <option value="${cat.code}">${cat.label}</option>
    `;
  });
}

function renderCategoryAdminList(){
  if(!isAdmin) return;

  adminCategoryListEl.innerHTML = "";
  categories.forEach(cat=>{
    adminCategoryListEl.innerHTML += `
      <div class="admin-cat-item">
        <span>${cat.emoji} ${cat.label} (${cat.code})</span>
        <button onclick="deleteCategory('${cat.id}')">🗑</button>
      </div>
    `;
  });
}


// ===================== ADD CATEGORY =====================
async function addCategory(){
  const code  = adminCatCodeEl.value.trim().toLowerCase();
  const label = adminCatLabelEl.value.trim();
  const emoji = adminCatEmojiEl.value.trim() || "💅";

  if(!code || !label){
    showToast("Kategoriya nomi yoki kodi kiritilmagan");
    return;
  }

  await addDoc(categoriesCol, {
    code,
    label,
    emoji,
    order: categories.length
  });

  adminCatCodeEl.value = "";
  adminCatLabelEl.value = "";
  adminCatEmojiEl.value = "";

  showToast("Kategoriya qo‘shildi");
}


// ===================== DELETE CATEGORY =====================
async function deleteCategory(id){
  const ok = confirm("Kategoriya o‘chirilsinmi?");
  if(!ok) return;

  await deleteDoc(doc(db, "beauty_categories", id));
  showToast("Kategoriya o‘chirildi");
}


// ===================== INIT APP =====================
function init(){
  renderCustomerInfo();
  subscribeProductsRealtime();
  subscribeCategoriesRealtime();
  updateCartUI();

  const tg = window.Telegram && window.Telegram.WebApp;
  if(tg){
    tg.ready();
    tg.expand();
  }
}

init();


/*  
===========================================
   ⬆⬆⬆ PART 6 shu yerda tugaydi.
   Bu — app.js ning yakuniy bo‘limi.
===========================================
*/
/*
===========================================
↑↑↑ PART 6 shu yerda tugaydi.
Bu – app.js ning yakuniy bo‘limi.
===========================================
*/


/*
===========================================
   🚀 EXPORT — HTML uchun funksiyalarni chiqarish
   🟢 BU JOY TO‘G‘RI — app.js ning eng oxiri
===========================================
*/

window.openProductDetail  = openProductDetail;
window.closeProductDetail = closeProductDetail;

window.changeQty          = changeQty;
window.removeFromCart     = removeFromCart;
window.toggleCartSheet    = toggleCartSheet;

window.sendOrder          = sendOrder;

window.addNewProduct      = addNewProduct;
window.deleteProduct      = deleteProduct;

window.addCategory        = addCategory;
window.deleteCategory     = deleteCategory;

window.askAdminAccess     = askAdminAccess;

window.resetCustomerInfo  = resetCustomerInfo;
window.editCustomerInfo   = editCustomerInfo;

/*
===========================================
   EXPORT yakunlandi — app.js tugadi
===========================================
*/
