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
  query,
  where,
  orderBy,
  getDocs
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
const app  = initializeApp(firebaseConfig);
const db   = getFirestore(app);

// COLLECTIONS
const productsCol   = collection(db, "beauty_products");
const categoriesCol = collection(db, "beauty_categories");
const ordersCol     = collection(db, "orders");
// YANGI: KURYERLAR UCHUN KOLLEKSIYA
const couriersCol   = collection(db, "couriers");

// CONSTANTS
const STORAGE_CUSTOMER        = "beauty_customer_info";
const STORAGE_LOCATION        = "beauty_customer_location";
const THEME_KEY               = "beauty_theme";
const CLIENT_ID_KEY           = "beauty_client_id";
const RAW_PREFIX              = "https://raw.githubusercontent.com/hanbek221-design/kosmetika-premium/main/images/";
const LOCAL_ORDERS_BACKUP_KEY = "beauty_orders_history";
// Key to store list of favorite product indices in localStorage
const FAVORITES_KEY = "beauty_favorites";

// CATEGORY DICTS
const categoryEmoji = { default: "🍽" };
const categoryLabel = {};

// STATE
let products       = [];
let remoteProducts = [];
let categories     = [];
let cart           = [];
let activeCategory = "all";
let currentSearch  = "";
let isAdmin        = false;
let editingProductId  = null;
let editingCategoryId = null;
// Liked product indices persisted in localStorage.  Each entry is a numeric
// index into the products array.
let favorites     = [];

// ADMIN & CLIENT ORDER STATE
// "all" | "delivered" | "courier" | "rejected"
let adminOrderFilter     = "all";
let clientOrderStatusMap = {};
let clientId             = null;
let clientOrders         = [];
let adminOrders          = [];

// DETAIL STATE
let detailIndex              = null;
let detailImageIndex         = 0;
let detailQty                = 1;
let detailCountdownTimer     = null;
let detailCountdownRemaining = 0;
let isImageFullscreen        = false; // FULLSCREEN HOLATI

// Rasm slayderi uchun interval.  Agar mahsulotda bir nechta rasm
// bo‘lsa, bu interval har 3 soniyada rasmni avtomatik almashtiradi.
let detailSliderInterval     = null;

// COURIER STATE (xarita paneli ichida)
let courierSelectedOrderId = null;

// YANGI: KURYERLAR ADMIN BOSHQARUVI STATE
let couriers         = [];
let editingCourierId = null;

// DOM
const productsGrid       = document.getElementById("productsGrid");
const filterBar          = document.getElementById("filterBar");
const cartCountTopEl     = document.getElementById("cartCountTop");
const cartTotalTopEl     = document.getElementById("cartTotalTop");
const toastEl            = document.getElementById("toast");
const cartSheet          = document.getElementById("cartSheet");
const cartSheetOverlay   = document.getElementById("cartSheetOverlay");
const cartItemsEl        = document.getElementById("cartItems");
const cartSheetTotalEl   = document.getElementById("cartSheetTotal");
const themeToggleBtn     = document.getElementById("themeToggleBtn");
const tabsEl             = document.getElementById("tabs");
const adminAccessBtn     = document.getElementById("adminAccessBtn");
const adminTabBtn        = document.getElementById("adminTabBtn");
const searchInput        = document.getElementById("searchInput");
const customerInfoTextEl = document.getElementById("customerInfoText");
const quickOrderBtn      = document.getElementById("quickOrderBtn");

// LOCATION / TIME MODALS
const locationChoiceModal  = document.getElementById("locationChoiceModal");
const locChoiceCloseBtn    = document.getElementById("locChoiceCloseBtn");
const locChoiceCancelBtn   = document.getElementById("locChoiceCancelBtn");
const locUseSavedBtn       = document.getElementById("locUseSavedBtn");
const locUseNewBtn         = document.getElementById("locUseNewBtn");
const locChoiceSavedBox    = document.getElementById("locChoiceSavedBox");
const locSavedText         = document.getElementById("locSavedText");

const locationGuideModal   = document.getElementById("locationGuideModal");
const locGuideCloseBtn     = document.getElementById("locGuideCloseBtn");
const locGuideText         = document.getElementById("locGuideText");
const locGuideImg          = document.getElementById("locGuideImg");
const locGuideNextBtn      = document.getElementById("locGuideNextBtn");
const locGuideStartBtn     = document.getElementById("locGuideStartBtn");
const locStepDot1          = document.getElementById("locStepDot1");
const locStepDot2          = document.getElementById("locStepDot2");

const timeModal            = document.getElementById("timeModal");
const timeCloseBtn         = document.getElementById("timeCloseBtn");
const timeInput            = document.getElementById("timeInput");
const timeChips            = document.getElementById("timeChips");
const timeOkBtn            = document.getElementById("timeOkBtn");
const timeCancelBtn        = document.getElementById("timeCancelBtn");

const productDetailOverlay = document.getElementById("productDetailOverlay");
const detailImageEl        = document.getElementById("detailImage");
const detailCategoryEl     = document.getElementById("detailCategory");
const detailNameEl         = document.getElementById("detailName");
const detailTagEl          = document.getElementById("detailTag");
const detailDescEl         = document.getElementById("detailDesc");
const detailPriceEl        = document.getElementById("detailPrice");
const detailOldPriceEl     = document.getElementById("detailOldPrice");
const detailDiscountEl     = document.getElementById("detailDiscount");
const detailAddBtn         = document.getElementById("detailAddBtn");
const detailBackBtn        = document.getElementById("detailBackBtn");

// New: button to remove an item from the cart on the detail screen
const detailRemoveBtn      = document.getElementById("detailRemoveBtn");

const detailPrevBtn      = document.getElementById("detailPrevBtn");
const detailNextBtn      = document.getElementById("detailNextBtn");
const detailImageIndexEl = document.getElementById("detailImageIndex");

// === SET (Qo‘shimcha) DOM ELEMENTS ===
// Modal oynasida qo‘shimcha mahsulot (set) uchun maydonlar.  Foydalanuvchi bu qo‘shimchani 0 yoki 1 dona qo‘shishi mumkin.
const detailSetRow      = document.getElementById("detailSetRow");
const detailSetNameEl   = document.getElementById("detailSetName");
const detailSetPriceEl  = document.getElementById("detailSetPrice");
const detailSetQtyValue = document.getElementById("detailSetQtyValue");
const detailSetMinus    = document.getElementById("detailSetMinus");
const detailSetPlus     = document.getElementById("detailSetPlus");

// Qo‘shimcha soni (faqat 0 yoki 1) state
let detailSetQty = 0;

const detailQtyMinus = document.getElementById("detailQtyMinus");
const detailQtyPlus  = document.getElementById("detailQtyPlus");
const detailQtyValue = document.getElementById("detailQtyValue");

// rasm konteynerlari
const detailImgWrap       = document.querySelector(".detail-img-wrap");
const detailGalleryListEl = document.getElementById("detailGalleryList"); // pastga scroll bo‘ladigan galereya (agar HTML’da bo‘lsa)

// SPLASH SCREEN ELEMENT
// The splash screen has been removed for faster loading.
// const splashScreenEl = null;

//
// NOTE: Local storage caching of products has been removed.  Products
// are now always loaded from Firestore in real time to prevent
// conflicts and ensure the latest data is shown.  Preloading of
// images still occurs to warm up the browser cache but nothing is
// persisted into localStorage.

/*
 * Preload product images
 *
 * To improve perceived performance on subsequent visits, we load all
 * product images into the browser cache when the page first loads.
 * This function iterates over the remoteProducts array, creates
 * temporary Image objects for each image URL, and assigns the src
 * property to trigger the download. Browsers will cache these
 * resources so that when the user navigates to the product later,
 * the images appear instantly from cache.
 */
function preloadProductImages(){
  try{
    (remoteProducts || []).forEach(p=>{
      if(Array.isArray(p.images)){
        p.images.forEach(url=>{
          if(url && typeof url === 'string'){
            const img = new Image();
            img.src = url;
          }
        });
      }
    });
    // We no longer store images in localStorage.  Browsers will
    // cache resources automatically once they are requested via
    // Image objects above.
  }catch(err){
    console.warn('Image preloading error:', err);
  }
}

/* ==============================
 * Sevimli mahsulotlar (favorites)
 *
 * Foydalanuvchi mahsulotlarni "like" tugmasi orqali belgilashi va keyin
 * "Sevimlilar" sahifasida ko‘rishi mumkin.  Sevimli mahsulotlar ro‘yxati
 * brauzerning localStorage’ida saqlanadi, shuning uchun foydalanuvchi
 * keyingi tashriflarda ham ularni ko‘ra oladi.
 */
function loadFavorites(){
  try{
    const raw = localStorage.getItem(FAVORITES_KEY);
    const arr = JSON.parse(raw || "[]");
    favorites = Array.isArray(arr) ? arr : [];
  }catch(err){
    console.warn("Favorites load error:", err);
    favorites = [];
  }
}
function saveFavorites(){
  try{
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  }catch(err){
    console.warn("Favorites save error:", err);
  }
}
function isFavorite(index){
  return favorites.includes(index);
}
function toggleFavorite(index){
  // Toggle the presence of this index in the favorites array
  const i = favorites.indexOf(index);
  if(i >= 0){
    favorites.splice(i, 1);
  }else{
    favorites.push(index);
  }
  saveFavorites();
  // Re-render UI to reflect updated state
  renderProducts();
  renderFavoritesPage();
}
function renderFavoritesPage(){
  const favGrid = document.getElementById("favoritesGrid");
  if(!favGrid) return;
  // Show an empty message if there are no favorites or no products loaded
  if(!favorites.length || !products.length){
    favGrid.innerHTML = "<p class='cart-empty'>Sevimli mahsulotlar yo‘q.</p>";
    return;
  }
  favGrid.innerHTML = "";
  favorites.forEach(idx=>{
    const p = products[idx];
    if(!p) return;
    const discount = p.oldPrice && p.oldPrice > p.price
      ? (100 - Math.round(p.price*100/p.oldPrice))
      : null;
    const tag = p.tag || "Ommabop taom";
    const firstImage = (p.images && p.images.length) ? p.images[0] : RAW_PREFIX + "noimage.png";
    let imgHtml;
    if(firstImage.startsWith(RAW_PREFIX)){
      const base = firstImage.replace(/\.(png|jpg|jpeg)$/i,"");
      imgHtml = `<img src="${base}.png" alt="${p.name}" onerror="this.onerror=null;this.src='${base}.jpg';">`;
    }else{
      imgHtml = `<img src="${firstImage}" alt="${p.name}">`;
    }
    const catLabel = categoryLabel[p.category] || p.category || "Kategoriya yo‘q";
    const favActive = favorites.includes(idx);
    const favIcon = favActive ? "💚" : "🤍";
    favGrid.innerHTML += `
      <article class="product-card" onclick="openProductDetail(${idx})">
        <div class="product-img-wrap">
          ${imgHtml}
          <button class="product-fav-btn ${favActive ? 'active' : ''}" onclick="event.stopPropagation(); toggleFavorite(${idx});">${favIcon}</button>
          <div class="product-img-tag">
            <span>Beauty</span><span>Pro</span>
          </div>
          ${discount ? `<div class="product-sale">-${discount}%</div>` : ``}
        </div>
        <div class="product-body">
          <div class="product-name">${p.name}</div>
          <div class="product-meta">${catLabel} • ${tag}</div>
          <div class="tag-mini">💡 ${tag}</div>
          <div class="price-row">
            <div>
              <div class="price-main">${formatPrice(p.price)} so‘m</div>
              ${p.oldPrice ? `<div class="price-old">${formatPrice(p.oldPrice)} so‘m</div>` : ``}
            </div>
            <button class="btn-add" onclick="event.stopPropagation(); addToCart(${idx}, 1, 0);">
              ➕ Qo‘shish
            </button>
          </div>
        </div>
      </article>
    `;
  });
}

/*
 * Fetch an image from a URL and store it in localStorage under the
 * provided key.  The image is converted to a data URL via a
 * FileReader.  If localStorage limits are exceeded, errors are
 * caught and logged.
 */
// cacheImage and cacheProductImages functions removed: we no longer
// persist images into localStorage.  Browsers handle caching of
// fetched assets automatically.

// Previously a DOMContentLoaded listener was used to hide the splash
// screen after a delay.  The splash screen has been removed, so
// there is no longer any need for this listener.

// ADMIN FORM DOM
const adminNameEl          = document.getElementById("adminName");
const adminCategoryEl      = document.getElementById("adminCategory");
const adminPriceBaseEl     = document.getElementById("adminPriceBase");
const adminHasDiscountEl   = document.getElementById("adminHasDiscount");
const adminPriceDiscountEl = document.getElementById("adminPriceDiscount");
const adminTagEl           = document.getElementById("adminTag");
const adminDescriptionEl   = document.getElementById("adminDescription");
const adminImagesEl        = document.getElementById("adminImages");

// Yangi: qo‘shimcha mahsulot (set) uchun admin maydonlari
const adminSetNameEl       = document.getElementById("adminSetName");
const adminSetPriceEl      = document.getElementById("adminSetPrice");
// Yangi: bir nechta qo‘shimcha mahsulotlar (extras) uchun admin DOM
const adminExtraAddBtn     = document.getElementById("adminExtraAddBtn");
const adminExtrasContainer = document.getElementById("adminExtrasContainer");


// ADMIN CATEGORY FORM
const adminCatCodeEl      = document.getElementById("adminCatCode");
const adminCatLabelEl     = document.getElementById("adminCatLabel");
const adminCatEmojiEl     = document.getElementById("adminCatEmoji");
const adminCategoryListEl = document.getElementById("adminCategoryList");

// ORDERS DOM
const clientOrdersListEl = document.getElementById("clientOrdersList");
const adminOrdersListEl  = document.getElementById("adminOrdersList");

// COURIER DOM (admin ichidagi xarita paneli)
const courierOrderSelect = document.getElementById("courierOrderSelect");
const courierMapFrame    = document.getElementById("courierMapFrame");
const courierInfoEl      = document.getElementById("courierInfo");

// YANGI: ADMIN KURYER BOSHQARUVI DOM (ID fallback bilan)
const adminCourierNameEl     = document.getElementById("adminCourierName")     || document.getElementById("courierNameInput");
const adminCourierPhoneEl    = document.getElementById("adminCourierPhone")    || document.getElementById("courierPhoneInput");
const adminCourierCarEl      = document.getElementById("adminCourierCar")      || document.getElementById("courierCarInput");
const adminCourierPlateEl    = document.getElementById("adminCourierPlate")    || document.getElementById("courierPlateInput");
const adminCourierLoginEl    = document.getElementById("adminCourierLogin")    || document.getElementById("courierLoginInput");
const adminCourierPasswordEl = document.getElementById("adminCourierPassword") || document.getElementById("courierPasswordInput");
const adminCourierSaveBtn    = document.getElementById("adminCourierSaveBtn")  || document.getElementById("courierSaveBtn");
const adminCourierListEl     = document.getElementById("adminCourierList")     || document.getElementById("courierListAdmin");

// SOUND
const notifySoundEl = document.getElementById("notifySound");

/* HELPERS */
function formatPrice(v){
  return (v || 0).toLocaleString("uz-UZ");
}

function escapeHtml(s){
  return String(s ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function showToast(message, duration = 1800){
  if(!toastEl) return;
  toastEl.textContent = message;
  toastEl.classList.add("show");
  if(showToast._timer) clearTimeout(showToast._timer);
  showToast._timer = setTimeout(()=>toastEl.classList.remove("show"), duration);
}

// =========================
//  SIMPLE MODAL HELPERS
// =========================
function openOverlay(el){
  if(!el) return;
  el.classList.remove("hidden");
  el.setAttribute("aria-hidden","false");
}
function closeOverlay(el){
  if(!el) return;
  el.classList.add("hidden");
  el.setAttribute("aria-hidden","true");
}

function setImgWithFallback(imgEl, baseName){
  if(!imgEl) return;
  const exts = ["png","jpg","jpeg","webp"];
  let i = 0;
  const tryNext = ()=>{
    if(i >= exts.length){
      imgEl.removeAttribute("src");
      return;
    }
    imgEl.src = `images/${baseName}.${exts[i++]}`;
  };
  imgEl.onerror = ()=> tryNext();
  tryNext();
}

function chooseLocationMode(saved){
  return new Promise(resolve=>{
    // saved bo‘lsa ko‘rsatamiz, bo‘lmasa faqat "yangi" chiqadi
    if(locChoiceSavedBox){
      if(saved){
        locChoiceSavedBox.classList.remove("hidden");
      }else{
        locChoiceSavedBox.classList.add("hidden");
      }
    }
    if(locSavedText){
      if(saved){
        const acc = saved.accuracy ? `, aniqlik: ±${Math.round(saved.accuracy)}m` : "";
        locSavedText.textContent = `Lat: ${saved.lat.toFixed(5)}, Lng: ${saved.lng.toFixed(5)}${acc}`;
      }else{
        locSavedText.textContent = "—";
      }
    }

    openOverlay(locationChoiceModal);

    const cleanup = ()=>{
      if(locUseSavedBtn) locUseSavedBtn.onclick = null;
      if(locUseNewBtn) locUseNewBtn.onclick = null;
      if(locChoiceCancelBtn) locChoiceCancelBtn.onclick = null;
      if(locChoiceCloseBtn) locChoiceCloseBtn.onclick = null;
    };

    if(locUseSavedBtn){
      locUseSavedBtn.onclick = ()=>{
        cleanup();
        closeOverlay(locationChoiceModal);
        resolve("saved");
      };
    }
    if(locUseNewBtn){
      locUseNewBtn.onclick = ()=>{
        cleanup();
        closeOverlay(locationChoiceModal);
        resolve("new");
      };
    }
    const cancel = ()=>{
      cleanup();
      closeOverlay(locationChoiceModal);
      resolve(null);
    };
    if(locChoiceCancelBtn) locChoiceCancelBtn.onclick = cancel;
    if(locChoiceCloseBtn)  locChoiceCloseBtn.onclick  = cancel;
  });
}

function showLocationGuide(){
  return new Promise(resolve=>{
    let step = 1;
    function render(){
      if(step===1){
        if(locGuideText) locGuideText.textContent = "1) Telefoningiz yuqori qismidan panelni pastga tushiring.";
        if(locStepDot1) locStepDot1.classList.add("active");
        if(locStepDot2) locStepDot2.classList.remove("active");
        if(locGuideNextBtn) locGuideNextBtn.classList.remove("hidden");
        if(locGuideStartBtn) locGuideStartBtn.classList.add("hidden");
        setImgWithFallback(locGuideImg, "rasm1");
      }else{
        if(locGuideText) locGuideText.textContent = "2) 'Joylashuv / Location' tugmasini bosing (yoqing).";
        if(locStepDot1) locStepDot1.classList.remove("active");
        if(locStepDot2) locStepDot2.classList.add("active");
        if(locGuideNextBtn) locGuideNextBtn.classList.add("hidden");
        if(locGuideStartBtn) locGuideStartBtn.classList.remove("hidden");
        setImgWithFallback(locGuideImg, "rasm2");
      }
    }

    openOverlay(locationGuideModal);
    render();

    const cleanup = ()=>{
      if(locGuideNextBtn) locGuideNextBtn.onclick = null;
      if(locGuideStartBtn) locGuideStartBtn.onclick = null;
      if(locGuideCloseBtn) locGuideCloseBtn.onclick = null;
    };

    if(locGuideNextBtn){
      locGuideNextBtn.onclick = ()=>{
        step = 2;
        render();
      };
    }
    if(locGuideStartBtn){
      locGuideStartBtn.onclick = ()=>{
        cleanup();
        closeOverlay(locationGuideModal);
        resolve(true);
      };
    }
    const cancel = ()=>{
      cleanup();
      closeOverlay(locationGuideModal);
      resolve(false);
    };
    if(locGuideCloseBtn) locGuideCloseBtn.onclick = cancel;
  });
}

function askPreferredTimeModal(defaultVal=""){
  return new Promise(resolve=>{
    if(timeInput) timeInput.value = defaultVal || "";
    openOverlay(timeModal);

    const cleanup = ()=>{
      if(timeOkBtn) timeOkBtn.onclick = null;
      if(timeCancelBtn) timeCancelBtn.onclick = null;
      if(timeCloseBtn) timeCloseBtn.onclick = null;
    };

    if(timeChips){
      timeChips.onclick = (e)=>{
        const btn = e.target.closest(".ff-chip");
        if(!btn) return;
        const v = btn.dataset.val || "";
        if(timeInput) timeInput.value = v;
      };
    }

    const ok = ()=>{
      const v = (timeInput ? timeInput.value : "").trim();
      if(!v){
        showToast("⏰ Yetkazish vaqtini kiriting (masalan: 18:00 yoki 30 minut).", 2500);
        return;
      }
      cleanup();
      closeOverlay(timeModal);
      resolve(v);
    };

    const cancel = ()=>{
      cleanup();
      closeOverlay(timeModal);
      resolve(null);
    };

    if(timeOkBtn) timeOkBtn.onclick = ok;
    if(timeCancelBtn) timeCancelBtn.onclick = cancel;
    if(timeCloseBtn) timeCloseBtn.onclick = cancel;
  });
}


/* GEOLOCATION — JOYLASHUV */
function loadSavedLocation(){
  try{
    const raw = localStorage.getItem(STORAGE_LOCATION);
    if(!raw) return null;
    const obj = JSON.parse(raw);
    if(typeof obj.lat === "number" && typeof obj.lng === "number") return obj;
    return null;
  }catch(e){
    return null;
  }
}

function saveLocation(loc){
  try{
    localStorage.setItem(STORAGE_LOCATION, JSON.stringify(loc));
  }catch(e){}
}

function startLocationCountdown(seconds){
  let remain = seconds;
  showToast(`📍 Joylashuv aniqlanmoqda... ${remain} s`, 1000);
  const timer = setInterval(()=>{
    remain--;
    if(remain > 0){
      showToast(`📍 Joylashuv aniqlanmoqda... ${remain} s`, 1000);
    }else{
      clearInterval(timer);
    }
  },1000);
}

function getBrowserLocation(timeoutMs = 7000){
  return new Promise((resolve,reject)=>{
    if(!navigator.geolocation){
      reject(new Error("Geolocation qo‘llab-quvvatlanmaydi."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos=>{
        const { latitude, longitude, accuracy } = pos.coords;
        resolve({
          lat: latitude,
          lng: longitude,
          accuracy: accuracy || null,
          ts: Date.now()
        });
      },
      err=>reject(err),
      { enableHighAccuracy:true, timeout:timeoutMs }
    );
  });
}

async function getOrAskLocation(){
  const saved = loadSavedLocation();

  // Agar oldingi lokatsiya bo‘lsa — foydalanuvchiga tanlatamiz
  if(saved){
    const mode = await chooseLocationMode(saved);
    if(mode === "saved"){
      return saved;
    }
    if(mode === null){
      return null;
    }
    // mode === "new" bo‘lsa davom etamiz
  }else{
    // saqlangan lokatsiya yo‘q bo‘lsa ham tanlash oynasini ko‘rsatamiz (yangi / bekor)
    const mode = await chooseLocationMode(null);
    if(mode === null) return null;
  }

  // Yo‘riqnoma (2 ta rasm) — tezkor
  const guideOk = await showLocationGuide();
  if(!guideOk) return null;

  // Browser geolocation so‘raymiz (Telegram permission chiqadi)
  startLocationCountdown(7);
  try{
    const loc = await getBrowserLocation(7000);
    saveLocation(loc);
    showToast("📍 Joylashuv aniqlandi.", 2000);
    return loc;
  }catch(e){
    console.error("Joylashuv aniqlanmadi:", e);

    if(e && typeof e.code === "number"){
      if(e.code === 1){
        showToast(
          "⚠️ Joylashuvga ruxsat berilmadi. Telegram so‘raganda 'Allow / Ruxsat berish' ni bosing. Telefon sozlamalarida Telegram → Permissions → Location ni ham 'Allow' qiling.",
          5500
        );
      }else if(e.code === 2){
        showToast(
          "⚠️ Joylashuv aniqlanmadi. Telefoningizda GPS / Location tugmasini yoqing va qayta urinib ko‘ring.",
          5500
        );
      }else if(e.code === 3){
        showToast(
          "⚠️ Joylashuv vaqt tugab qoldi (timeout). Internetingizni tekshiring va qayta urinib ko‘ring.",
          5500
        );
      }else{
        showToast(
          "⚠️ Joylashuv aniqlanmadi. GPS va internetni yoqing, Telegram so‘raganda 'Allow' ni bosing.",
          5500
        );
      }
    }else{
      showToast(
        "⚠️ Joylashuv aniqlanmadi. GPS va internetni yoqing, Telegram so‘raganda 'Allow' ni bosing.",
        5500
      );
    }
    return null;
  }
}


/* RASM URLLARI */
// =========================================================
//   ADMIN EXTRAS (bir nechta qo‘shimcha mahsulotlar)
// =========================================================
function clearAdminExtras(){
  if(!adminExtrasContainer) return;
  adminExtrasContainer.innerHTML = "";
}

function addAdminExtraRow(nameVal="", priceVal=""){
  if(!adminExtrasContainer) return;
  const row = document.createElement("div");
  row.className = "admin-extra-row";
  row.innerHTML = `
    <input class="admin-extra-name" type="text" placeholder="Masalan: sous" value="${escapeHtml(nameVal)}">
    <input class="admin-extra-price" type="number" placeholder="Narx" value="${priceVal ? priceVal : ""}">
    <button type="button" class="admin-extra-remove" title="O‘chirish">✕</button>
  `;
  const rm = row.querySelector(".admin-extra-remove");
  if(rm) rm.addEventListener("click", ()=> row.remove());
  adminExtrasContainer.appendChild(row);
}

function collectAdminExtras(){
  if(!adminExtrasContainer) return [];
  const rows = Array.from(adminExtrasContainer.querySelectorAll(".admin-extra-row"));
  const extras = [];
  rows.forEach(r=>{
    const n = (r.querySelector(".admin-extra-name")?.value || "").trim();
    const p = parseInt(r.querySelector(".admin-extra-price")?.value || "0", 10);
    if(n && p>0) extras.push({ name:n, price:p });
  });
  return extras;
}

function loadAdminExtras(extrasArr){
  clearAdminExtras();
  if(!Array.isArray(extrasArr) || !extrasArr.length) return;
  extrasArr.forEach(ex=> addAdminExtraRow(ex?.name || "", ex?.price || ""));
}

// admin tugma
if(adminExtraAddBtn){
  adminExtraAddBtn.addEventListener("click", ()=> addAdminExtraRow());
}

function normalizeImagesInput(raw){
  if(!raw) return [];
  return raw
    .split(",")
    .map(s=>s.trim())
    .filter(Boolean)
    .map(token=>{
      if(/^https?:\/\//i.test(token)) return token;
      const name = token.replace(/\.(png|jpg|jpeg)$/i,"");
      return RAW_PREFIX + name + ".png";
    });
}

function setImageWithPngJpgFallback(imgElement,url){
  if(!imgElement) return;
  if(!url){
    imgElement.onerror = null;
    imgElement.src = RAW_PREFIX + "noimage.png";
    return;
  }
  if(url.startsWith(RAW_PREFIX)){
    const base = url.replace(/\.(png|jpg|jpeg)$/i,"");
    imgElement.onerror = function(){
      this.onerror=null;
      this.src = base + ".jpg";
    };
    imgElement.src = base + ".png";
  }else{
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

/* CLIENT ID */
function getOrCreateClientId(){
  let cid = localStorage.getItem(CLIENT_ID_KEY);
  if(!cid){
    cid = "c_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(CLIENT_ID_KEY, cid);
  }
  return cid;
}

/* CUSTOMER INFO */
function renderCustomerInfo(){
  if(!customerInfoTextEl) return;
  let info = null;
  try{
    info = JSON.parse(localStorage.getItem(STORAGE_CUSTOMER) || "null");
  }catch(e){ info = null; }
  if(info && info.name && info.phone){
    customerInfoTextEl.textContent =
      "👤 " + info.name +
      " • 📱 " + info.phone +
      (info.address ? " • 📍 " + info.address : "");
  }else{
    customerInfoTextEl.textContent =
      "Mijoz ma’lumotlari saqlanmagan. Buyurtma berganingizda ism va telefon so‘raladi.";
  }
}

function promptNewCustomerInfo(){
  const name = prompt("👤 Ismingizni kiriting (masalan, Shahboz):");
  if(!name) return null;
  const phone = prompt("📱 Telefon raqamingizni kiriting (masalan, +99890 123 45 67):");
  if(!phone) return null;
  const address = prompt("📍 Asosiy manzil (shahar, tuman, ko‘cha, uy):");
  if(!address) return null;

  const landmark = prompt("🧭 Mo‘ljal (masalan, bozor oldi, makтаб yonida) — ixtiyoriy:") || "";
  const secondPhone = prompt("📞 Qo‘shimcha telefon raqam (ixtiyoriy):") || "";
  const preferredTime = prompt("⏰ Buyurtmani qaysi vaqtda qabul qilishni xohlaysiz? (ixtiyoriy):") || "";

  const info = {
    name: name.trim(),
    phone: phone.trim(),
    address: address.trim(),
    landmark: landmark.trim(),
    secondPhone: secondPhone.trim(),
    preferredTime: preferredTime.trim()
  };
  localStorage.setItem(STORAGE_CUSTOMER, JSON.stringify(info));
  renderCustomerInfo();
  return info;
}

function askCustomerInfo(){
  let info = null;
  try{
    info = JSON.parse(localStorage.getItem(STORAGE_CUSTOMER) || "null");
  }catch(e){ info = null; }

  if(info && info.name && info.phone && info.address){
    const ok = confirm(
      "📦 Oldingi buyurtma ma’lumotlari:\n\n" +
      "👤 Ism: " + info.name + "\n" +
      "📱 Telefon: " + info.phone + "\n" +
      "📍 Manzil: " + info.address + "\n" +
      (info.landmark ? "🧭 Mo‘ljal: " + info.landmark + "\n" : "") +
      (info.preferredTime ? "⏰ Yetkazish vaqti: " + info.preferredTime + "\n" : "") +
      "\nShu ma’lumotlar bilan yuborilsinmi?"
    );
    if(ok) return info;
    return promptNewCustomerInfo();
  }
  return promptNewCustomerInfo();
}

function resetCustomerInfo(){
  localStorage.removeItem(STORAGE_CUSTOMER);
  renderCustomerInfo();
  showToast("👤 Mijoz ma’lumotlari o‘chirildi.");
}

function editCustomerInfo(){
  promptNewCustomerInfo();
}

/* THEME */
function applyTheme(theme){
  document.body.classList.toggle("theme-light", theme === "light");
  document.body.classList.toggle("theme-dark", theme === "dark");
  if(themeToggleBtn){
    themeToggleBtn.textContent = theme === "dark" ? "☀️" : "🌙";
  }
}
function toggleTheme(){
  const current = localStorage.getItem(THEME_KEY) || "dark";
  const next    = current === "dark" ? "light" : "dark";
  localStorage.setItem(THEME_KEY, next);
  applyTheme(next);
}
if(themeToggleBtn){
  themeToggleBtn.addEventListener("click", toggleTheme);
}

/* PRODUCTS REAL-TIME */
function rebuildProducts(){
  products = [...remoteProducts];
  renderProducts();
  // Preload images for all products to leverage browser caching.  This
  // helps subsequent page visits load images instantly from cache.
  preloadProductImages();
}
function renderProducts(){
  productsGrid.innerHTML = "";
  const filtered = products.filter(p =>
    (activeCategory === "all" ? true : p.category === activeCategory) &&
    matchesSearch(p)
  );
  if(!filtered.length){
    productsGrid.innerHTML = "<p class='cart-empty'>Hozircha mahsulot qo‘shilmagan.</p>";
    return;
  }
  filtered.forEach(p=>{
    const index    = products.indexOf(p);
    const discount = p.oldPrice && p.oldPrice > p.price
      ? (100 - Math.round(p.price*100/p.oldPrice))
      : null;
    const tag        = p.tag || "Ommabop taom";
    // Determine the first image to display from the product list.  If
    // no images are provided, fall back to a "noimage" placeholder
    // hosted in the raw GitHub repository.  A PNG/JPG fallback is
    // used only for placeholder images.
    const firstImage = (p.images && p.images.length) ? p.images[0] : RAW_PREFIX + "noimage.png";
    let imgHtml;
    if(firstImage.startsWith(RAW_PREFIX)){
      const base = firstImage.replace(/\.(png|jpg|jpeg)$/i,"");
      imgHtml = `<img src="${base}.png" alt="${p.name}" onerror="this.onerror=null;this.src='${base}.jpg';">`;
    }else{
      imgHtml = `<img src="${firstImage}" alt="${p.name}">`;
    }
    const catLabel = categoryLabel[p.category] || p.category || "Kategoriya yo‘q";
    // Prepare favorite button state.  Use heart icon filled when this product
    // index exists in the favorites array.
    const favActive = favorites.includes(index);
    const favIcon   = favActive ? "💚" : "🤍";

    productsGrid.innerHTML += `
      <article class="product-card" onclick="openProductDetail(${index})">
        <div class="product-img-wrap">
          ${imgHtml}
          <!-- Like button overlay -->
          <button class="product-fav-btn ${favActive ? 'active' : ''}" onclick="event.stopPropagation(); toggleFavorite(${index});">${favIcon}</button>
          <div class="product-img-tag">
            <span>Beauty</span><span>Pro</span>
          </div>
          ${discount ? `<div class="product-sale">-${discount}%</div>` : ``}
        </div>
        <div class="product-body">
          <div class="product-name">${p.name}</div>
          <div class="product-meta">${catLabel} • ${tag}</div>
          <div class="tag-mini">💡 ${tag}</div>
          <div class="price-row">
            <div>
              <div class="price-main">${formatPrice(p.price)} so‘m</div>
              ${p.oldPrice ? `<div class="price-old">${formatPrice(p.oldPrice)} so‘m</div>` : ``}
            </div>
            <button class="btn-add" onclick="event.stopPropagation(); addToCart(${index}, 1, 0);">
              ➕ Qo‘shish
            </button>
          </div>
        </div>
      </article>
    `;
  });
}

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
        emoji: data.emoji || categoryEmoji[data.category] || categoryEmoji.default,
        tag: data.tag || "",
        description: data.description || "",
        images: Array.isArray(data.images) ? data.images : [],
        extras: Array.isArray(data.extras) ? data.extras : [],
        // qo‘shimcha (set) nomi va narxi saqlanadi.  setName - matn, setPrice - raqam.
        setName: data.setName || null,
        setPrice: data.setPrice || 0,
        createdAt: data.createdAt || null
      });
    });
    remoteProducts = list;
    // Always rebuild products using the latest snapshot from Firestore.
    rebuildProducts();
    renderAdminCustomList();
    // After products are rebuilt, update the favorites grid to ensure
    // liked items show properly even if the product array order changed.
    renderFavoritesPage();
  }, err=>{
    console.error("Mahsulot realtime xato:", err);
    showToast("⚠️ Mahsulotlarni o‘qishda xato.");
  });
}

/* CATEGORIES */
function renderCategoryFilter(){
  if(!filterBar) return;
  let html = "";
  html += `<button class="chip ${activeCategory==="all"?"active":""}" data-category="all"><span>⭐</span><span>Barchasi</span></button>`;
  categories.forEach(cat=>{
    html += `
      <button class="chip ${activeCategory===cat.code?"active":""}" data-category="${cat.code}">
        <span>${cat.emoji}</span><span>${cat.label}</span>
      </button>
    `;
  });
  filterBar.innerHTML = html;
}
function subscribeCategoriesRealtime(){
  onSnapshot(categoriesCol, snap=>{
    const list = [];
    snap.forEach(d=>{
      const data = d.data() || {};
      const code = (data.code || "").trim().toLowerCase();
      if(!code) return;
      const label = (data.label || code).trim();
      const emoji = (data.emoji || "💅").trim() || "💅";
      list.push({
        id:d.id,
        code,
        label,
        emoji,
        order:data.order ?? 0
      });
      categoryEmoji[code] = emoji;
      categoryLabel[code] = label;
    });
    list.sort((a,b)=>(a.order||0)-(b.order||0));
    categories = list;
    renderCategoryFilter();
    updateAdminCategorySelect();
    renderCategoryAdminList();
    // Update favorites page because category labels might have changed
    renderFavoritesPage();
  },err=>{
    console.error("Kategoriya realtime xato:", err);
    showToast("⚠️ Kategoriyalarni o‘qishda xato.");
  });
}

if(filterBar){
  filterBar.addEventListener("click", e=>{
    const btn = e.target.closest(".chip");
    if(!btn) return;
    document.querySelectorAll(".chip").forEach(c=>c.classList.remove("active"));
    btn.classList.add("active");
    activeCategory = btn.dataset.category;
    renderProducts();
  });
}

/* SEARCH */
if(searchInput){
  searchInput.addEventListener("input", ()=>{
    currentSearch = searchInput.value.trim().toLowerCase();
    renderProducts();
  });
}

/* CART */
function addToCart(index, qty=1, setQty=0){
  // detail oynasidan tanlangan extras (per-unit)
  let extrasForCart = [];
  const fromDetail = (typeof detailIndex !== "undefined" && detailIndex === index);
  if(fromDetail && Array.isArray(detailExtrasState)){
    extrasForCart = detailExtrasState.filter(e=>(e.qty||0)>0).map(e=>({name:e.name, price:e.price, qty:e.qty}));
  }

  if(qty<=0) return;
  // Try to find an existing cart entry with the same product index and set quantity
  const found = cart.find(c=>c.index===index && (c.setQty||0)===setQty);
  if(found) found.qty += qty;
  else cart.push({index, qty, setQty});
  updateCartUI();
  // Foydalanuvchiga mahsulot qo‘shilgani haqida xabar bering
  showToast("Mahsulot qo‘shildi.");
}
function updateCartUI(){
  let totalCount=0,totalPrice=0;
  cart.forEach(c=>{
    const p = products[c.index];
    if(!p) return;
    totalCount += c.qty;
    // Compute unit price including optional set price va extras (per unit)
    const setUnit   = (c.setQty && p.setPrice) ? p.setPrice : 0;
    const extraUnit = Array.isArray(c.extras)
      ? c.extras.reduce((sum, ex)=> sum + (ex.price||0) * (ex.qty||0), 0)
      : 0;
    const unitPrice = (p.price || 0) + setUnit + extraUnit;
    totalPrice += unitPrice * c.qty;
  });
  if(cartCountTopEl) cartCountTopEl.textContent = totalCount;
  if(cartTotalTopEl) cartTotalTopEl.textContent = formatPrice(totalPrice)+" so‘m";

  if(quickOrderBtn){
    quickOrderBtn.classList.toggle("hidden", totalCount === 0);
  }

  if(cartSheet.classList.contains("open")) renderCartItems();
}
function toggleCartSheet(force){
  const isOpen = cartSheet.classList.contains("open");
  const next   = typeof force==="boolean" ? force : !isOpen;
  cartSheet.classList.toggle("open", next);
  cartSheetOverlay.classList.toggle("show", next);
  if(next) renderCartItems();
}
function renderCartItems(){
  if(cart.length===0){
    cartItemsEl.innerHTML = "<p class='cart-empty'>Savat hozircha bo‘sh 🙂</p>";
    cartSheetTotalEl.textContent = "0 so‘m";
    return;
  }
  let html="",total=0;
  cart.forEach(c=>{
    const p = products[c.index];
    if(!p) return;
    // Compute unit price including optional set price + extras (per unit)
    const setUnit   = (c.setQty && p.setPrice) ? p.setPrice : 0;
    const extraUnit = Array.isArray(c.extras)
      ? c.extras.reduce((sum, ex)=> sum + (ex.price||0) * (ex.qty||0), 0)
      : 0;
    const unitPrice = (p.price || 0) + setUnit + extraUnit;
    const lineTotal = unitPrice * c.qty;
    total += lineTotal;
    const catLabel = categoryLabel[p.category] || p.category || "Kategoriya yo‘q";
    // Prepare meta string: show base price and set price separately if needed
    let metaStr = `${formatPrice(p.price)} so‘m • ${catLabel}`;
    if(c.setQty && p.setPrice){
      metaStr += ` • Qo‘shimcha set: +${formatPrice(p.setPrice)} so‘m`;
    }
    if(Array.isArray(c.extras) && c.extras.length){
      const extrasLabel = c.extras.map(ex=>`${ex.name} ×${ex.qty}`).join(", ");
      metaStr += ` • Qo‘shimcha: ${extrasLabel}`;
    }
    html += `
      <div class="cart-item-row">
        <div class="cart-item-main">
          <div class="cart-item-name">${p.name}</div>
          <div class="cart-item-meta">${metaStr}</div>
        </div>
        <div class="cart-item-actions">
          <div class="qty-control">
            <button onclick="changeQty(${c.index},-1,${c.setQty||0})">-</button>
            <span>${c.qty}</span>
            <button onclick="changeQty(${c.index},1,${c.setQty||0})">+</button>
          </div>
          <div class="cart-item-total">${formatPrice(lineTotal)} so‘m</div>
          <button class="cart-remove" onclick="removeFromCart(${c.index},${c.setQty||0})">🗑️</button>
        </div>
      </div>
    `;
  });
  cartItemsEl.innerHTML = html;
  cartSheetTotalEl.textContent = formatPrice(total)+" so‘m";
}
function changeQty(idx, delta, setQty = 0){
  let item;
  if(setQty === undefined || setQty === null){
    // Find the first cart item with the given index (ignore setQty)
    item = cart.find(c => c.index === idx);
    if(!item) return;
    item.qty += delta;
    if(item.qty <= 0){
      // Remove all items with this index
      cart = cart.filter(c => c.index !== idx);
    }
  } else {
    // Adjust quantity for a specific set variation
    item = cart.find(c => c.index === idx && (c.setQty||0) === setQty);
    if(!item) return;
    item.qty += delta;
    if(item.qty <= 0){
      cart = cart.filter(c => !(c.index === idx && (c.setQty||0) === setQty));
    }
  }
  updateCartUI();
  renderCartItems();
}
function removeFromCart(idx, setQty = 0){
  if(setQty === undefined || setQty === null){
    // Remove all items with this index regardless of set
    cart = cart.filter(c => c.index !== idx);
  } else {
    cart = cart.filter(c => !(c.index === idx && (c.setQty||0) === setQty));
  }
  updateCartUI();
  renderCartItems();
}

/* ORDER STATUS HELPERS */
// ORDER_STEPS: buyurtmalar uchun bosqichlar ketma-ketligi.  Yakunlangan (completed)
// buyurtmalar eng oxirgi qadam sifatida qo‘shildi.  Muammoli (problem)
// buyurtmalar lineer bosqichda bo‘lmagani uchun bu ro‘yxatga kiritilmagan.
const ORDER_STEPS = ["pending","confirmed","courier","delivered","completed"];
function statusLabel(status){
  switch(status){
    case "pending":   return "Tasdiqlash kutilmoqda";
    case "confirmed": return "Admin tasdiqladi";
    case "courier":   return "Kuryerga berildi";
    case "delivered": return "Yetkazildi";
    case "rejected":  return "Bekor qilindi";
    case "completed": return "Yakunlandi";
    case "problem":   return "Muammoli";
    default:          return status;
  }
}
function statusClass(status){
  return `status-pill status-${status}`;
}
function progressPercent(status){
  if(status==="rejected") return 0;
  const idx = ORDER_STEPS.indexOf(status);
  if(idx<0) return 0;
  return ((idx+1)/ORDER_STEPS.length)*100;
}
function renderProgressHTML(status){
  const pct   = progressPercent(status);
  const steps = ORDER_STEPS;
  return `
    <div class="progress-wrap">
      <div class="progress-label">${statusLabel(status)}</div>
      <div class="progress-line">
        <div class="progress-fill" style="width:${pct}%;"></div>
      </div>
      <div class="progress-steps">
        ${steps.map(s=>`
          <span class="progress-step ${ORDER_STEPS.indexOf(s)<=ORDER_STEPS.indexOf(status) ? "active":""}">
            ${s==="pending"?"Yuborildi":
              s==="confirmed"?"Tasdiq":
              s==="courier"?"Kuryer":
              "Yetdi"}
          </span>
        `).join("")}
      </div>
    </div>
  `;
}

/* SOUND */
function playNotify(){
  if(!notifySoundEl) return;
  try{
    notifySoundEl.currentTime = 0;
    notifySoundEl.play().catch(()=>{});
  }catch(e){
    console.error("Ding ijro xato:", e);
  }
}

/* MIJOZGA STATUS XABARLARI */
function clientStatusMessage(status){
  switch(status){
    case "confirmed": return "✅ Buyurtmangiz tasdiqlandi.";
    case "courier":   return "🚚 Buyurtmangiz kuryerga topshirildi.";
    case "delivered": return "🎉 Buyurtma yetkazildi. Bizni tanlaganingiz uchun rahmat!";
    case "rejected":  return "❌ Buyurtmangiz bekor qilindi. Mahsulot tugagan bo‘lishi mumkin.";
    default:          return "ℹ️ Buyurtma holati yangilandi.";
  }
}
function notifyClientStatus(status){
  const msg = clientStatusMessage(status);
  showToast(msg, 3000);
  playNotify();
}
function checkDeliveredThankYou(){
  const hasDelivered = clientOrders.some(o => o.status === "delivered");
  if(hasDelivered){
    showToast("🎉 Buyurtmani qabul qilganingiz uchun rahmat!", 3000);
  }
}

/* REAL-TIME ORDERS (CLIENT) */
function subscribeClientOrders(){
  const qClient = query(
    ordersCol,
    where("clientId","==", clientId)
  );
  onSnapshot(qClient, snap=>{
    let hasStatusChange   = false;
    let lastChangedStatus = null;

    const list = [];
    snap.forEach(d=>{
      const data   = d.data();
      const id     = d.id;
      const status = data.status || "pending";

      const prevStatus = clientOrderStatusMap[id];
      if(prevStatus && prevStatus !== status){
        hasStatusChange   = true;
        lastChangedStatus = status;
      }
      clientOrderStatusMap[id] = status;

      list.push({ id, ...data });
    });

    list.sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));

    clientOrders = list;

    try{
      localStorage.setItem(LOCAL_ORDERS_BACKUP_KEY, JSON.stringify(list));
    }catch(e){}

    renderClientOrders();
    // Removed the thank-you toast on page load to avoid unnecessary
    // notifications.  Users will still receive status updates via
    // notifyClientStatus().

    if(hasStatusChange && lastChangedStatus){
      notifyClientStatus(lastChangedStatus);
    }
  },err=>{
    console.error("Client orders xato:", err);
    showToast("⚠️ Buyurtmalarni o‘qishda xato.");
  });
}

function renderClientOrders(){
  if(!clientOrdersListEl) return;

  function renderList(list, asHistory){
    if(!list.length){
      clientOrdersListEl.innerHTML = "<p class='cart-empty'>Hozircha buyurtmangiz yo‘q.</p>";
      return;
    }
    clientOrdersListEl.innerHTML = "";
    if(asHistory){
      clientOrdersListEl.innerHTML += "<p class='section-sub'>Telefon xotirasidagi buyurtmalar tarixi:</p>";
    }
    list.forEach(o=>{
      const created = o.createdAt?.seconds
        ? new Date(o.createdAt.seconds*1000)
        : null;
      const dateStr = created
        ? created.toLocaleString("uz-UZ",{hour12:false})
        : "";
      const itemsHtml = (o.items || []).map(i=>
        `<li>${i.name} — ${i.qty} dona × ${formatPrice(i.price)} so‘m</li>`
      ).join("");
      clientOrdersListEl.innerHTML += `
        <article class="order-card">
          <header class="order-header">
            <div>
              <div class="order-id">ID: ${o.id.slice(0,8)}...</div>
              ${dateStr ? `<div class="order-date">${dateStr}</div>` : ""}
            </div>
            <div class="order-total">${formatPrice(o.totalPrice)} so‘m</div>
          </header>
          <div class="order-status-row">
            <span class="${statusClass(o.status)}">${statusLabel(o.status)}</span>
          </div>
          ${renderProgressHTML(o.status)}
          <section class="order-items">
            <strong>Mahsulotlar:</strong>
            <ul>${itemsHtml}</ul>
          </section>
          ${o.courierName ? `
          <section class="order-courier">
            <strong>🚚 Kuryer:</strong> ${o.courierName}${o.courierCar ? ` — ${o.courierCar}` : ""}<br>
            ${o.courierPhone ? `📞 <a href="tel:${o.courierPhone}">${o.courierPhone}</a><br>` : ""}
          </section>
          ` : ""}
          ${o.courierStatus ? `
          <div class="order-courier-status">${o.courierStatus}</div>
          ` : ""}
          <footer class="order-footer">
            <span>Holat: ${statusLabel(o.status)}</span>
            <span>
              ${o.status === "completed" ? "✅ Yakunlandi" :
                o.status === "delivered" ? "Tasdiq kutilyapti" :
                o.status === "rejected" ? "❌ Bekor qilingan" :
                o.status === "problem" ? "❗ Muammoli" :
                "⏳ Jarayonda"}
            </span>
          </footer>
          ${o.status === "delivered" ? `
          <div class="order-actions" style="margin-top:10px; display:flex; gap:8px;">
            <button class="btn-xs btn-xs-primary" onclick="clientConfirmOrder('${o.id}', true)">Zakazni oldim</button>
            <button class="btn-xs btn-xs-danger" onclick="clientConfirmOrder('${o.id}', false)">Zakazni olmadim</button>
          </div>
          ` : ""}
        </article>
      `;
    });
  }

  if(clientOrders.length){
    renderList(clientOrders,false);
    return;
  }

  let backup = null;
  try{
    backup = JSON.parse(localStorage.getItem(LOCAL_ORDERS_BACKUP_KEY) || "null");
  }catch(e){ backup = null; }

  if(backup && backup.length){
    renderList(backup,true);
  }else{
    renderList([],false);
  }
}

/* REAL-TIME ORDERS (ADMIN) */
function subscribeAdminOrders(){
  const qAdmin = query(ordersCol, orderBy("createdAt","desc"));
  onSnapshot(qAdmin, snap=>{
    const changes = snap.docChanges();
    let hasNew = false;
    changes.forEach(ch=>{
      if(ch.type==="added"){
        hasNew = true;
      }
    });
    adminOrders = snap.docs.map(d=>({id:d.id, ...d.data()}));
    renderAdminOrders();
    if(isAdmin && hasNew){
      playNotify();
      showToast("🔔 Yangi buyurtma keldi!");
    }
  },err=>{
    console.error("Admin orders xato:", err);
    showToast("⚠️ Buyurtmalar (admin) xato.");
  });
}

function setAdminOrderFilter(filter){
  adminOrderFilter = filter;
  renderAdminOrders();
}

function renderAdminOrders(){
  if(!adminOrdersListEl) return;

  let visibleOrders;
  switch(adminOrderFilter){
    case "courier":
      visibleOrders = adminOrders.filter(o => o.status === "courier");
      break;
    case "delivered":
      visibleOrders = adminOrders.filter(o => o.status === "delivered");
      break;
    case "rejected":
      visibleOrders = adminOrders.filter(o => o.status === "rejected");
      break;
    default:
      visibleOrders = adminOrders.filter(o =>
        o.status !== "delivered" && o.status !== "rejected"
      );
  }

  adminOrdersListEl.innerHTML = `
    <div class="admin-order-filters">
      <button
        class="btn-xs ${adminOrderFilter === "all" ? "btn-xs-primary" : "btn-xs-secondary"}"
        onclick="setAdminOrderFilter('all')">
        Faol
      </button>
      <button
        class="btn-xs ${adminOrderFilter === "courier" ? "btn-xs-primary" : "btn-xs-secondary"}"
        onclick="setAdminOrderFilter('courier')">
        Kuryerda
      </button>
      <button
        class="btn-xs ${adminOrderFilter === "delivered" ? "btn-xs-primary" : "btn-xs-secondary"}"
        onclick="setAdminOrderFilter('delivered')">
        Yetkazilganlar
      </button>
      <button
        class="btn-xs ${adminOrderFilter === "rejected" ? "btn-xs-primary" : "btn-xs-secondary"}"
        onclick="setAdminOrderFilter('rejected')">
        Bekor qilinganlar
      </button>
      <button
        class="btn-xs btn-xs-danger"
        onclick="clearAllOrders()">
        🧹 Barcha buyurtmalarni tozalash
      </button>
    </div>
  `;

  if(!visibleOrders.length){
    adminOrdersListEl.innerHTML += "<p class='cart-empty'>Tanlangan bo‘limda buyurtма yo‘q.</p>";
    refreshCourierPanel();
    return;
  }

  visibleOrders.forEach(o=>{
    const created = o.createdAt?.seconds
      ? new Date(o.createdAt.seconds*1000)
      : null;
    const dateStr = created
      ? created.toLocaleString("uz-UZ",{hour12:false})
      : "";
    const itemsHtml = (o.items || []).map(i=>
      `<li>${i.name} — ${i.qty} dona × ${formatPrice(i.price)} so‘m</li>`
    ).join("");
    const customer = o.customer || {};
    const hasLoc   = o.location && typeof o.location.lat === "number" && typeof o.location.lng === "number";

    const extraLines = [];
    if(customer.secondPhone)   extraLines.push(`📞 Qo‘shimcha raqam: ${customer.secondPhone}`);
    if(customer.landmark)      extraLines.push(`🧭 Mo‘ljal: ${customer.landmark}`);
    if(customer.preferredTime) extraLines.push(`⏰ Vaqt: ${customer.preferredTime}`);
    if(customer.comment)       extraLines.push(`✏️ Izoh: ${customer.comment}`);

    // Escape helper for comments to prevent HTML injection
    const escapeHtml = (str) => {
      return String(str || "").replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");
    };
    adminOrdersListEl.innerHTML += `
      <article class="order-card">
        <header class="order-header">
          <div>
            <div class="order-id">ID: ${o.id}</div>
            ${dateStr ? `<div class="order-date">${dateStr}</div>` : ""}
            <div class="order-customer">
              👤 ${customer.name || "-"} • 📱 ${customer.phone || "-"}
            </div>
            <div class="order-customer">
              📍 ${customer.address || "-"}
            </div>
            ${extraLines.length ? `
              <div class="order-customer">
                ${extraLines.join("<br>")}
              </div>
            ` : ""}
            ${hasLoc ? `
              <div class="order-customer">
                📍 GPS joylashuv mavjud
              </div>
            ` : ""}
          </div>
          <div class="order-total">${formatPrice(o.totalPrice)} so‘m</div>
        </header>
        <div class="order-status-row">
          <span class="${statusClass(o.status)}">${statusLabel(o.status)}</span>
        </div>
        ${renderProgressHTML(o.status)}
        <section class="order-items">
          <strong>Mahsulotlar:</strong>
          <ul>${itemsHtml}</ul>
        </section>
        <!-- Muammoli zakazlar uchun qo'shimcha ma'lumotlar -->
        ${o.status === 'problem' ? `
          <section class="order-problem-info">
            ${o.clientComment ? `<div class="order-problem"><strong>Mijoz izohi:</strong> ${escapeHtml(o.clientComment)}</div>` : ''}
            ${o.courierStatus ? `<div class="order-problem"><strong>Kuryer holati:</strong> ${escapeHtml(o.courierStatus)}</div>` : ''}
            ${o.adminComment ? `<div class="order-problem"><strong>Admin izohi:</strong> ${escapeHtml(o.adminComment)}</div>` : ''}
          </section>
        ` : ''}
        <div class="admin-order-actions">
          ${o.status !== 'problem' ? `
            <button class="btn-xs btn-xs-primary"   onclick="updateOrderStatus('${o.id}','confirmed')">Tasdiqlash</button>
            <button class="btn-xs btn-xs-danger"    onclick="updateOrderStatus('${o.id}','rejected')">Bekor qilish</button>
            <button class="btn-xs btn-xs-secondary" onclick="updateOrderStatus('${o.id}','courier')">Kuryer oldi</button>
            <button class="btn-xs btn-xs-primary"   onclick="updateOrderStatus('${o.id}','delivered')">Yetkazildi</button>
          ` : ''}
          ${o.status === 'problem' ? `
            <button class="btn-xs btn-xs-primary" onclick="resolveProblemOrder('${o.id}')">Qayta aktivlashtirish</button>
            <button class="btn-xs btn-xs-danger"  onclick="deleteOrder('${o.id}')">Zakazni o‘chirish</button>
          ` : ''}
          ${hasLoc ? `
            <button class="btn-xs btn-xs-secondary"
              onclick="openOrderLocation(${o.location.lat},${o.location.lng})">
              📍 Marshrut
            </button>
          ` : ""}
        </div>
      </article>
    `;
  });

  refreshCourierPanel();
}

async function updateOrderStatus(orderId, newStatus){
  try{
    const current = adminOrders.find(o=>o.id===orderId);
    if(current){
      const curStatus = current.status || "pending";
      if(curStatus === "delivered" || curStatus === "rejected"){
        showToast("Bu buyurtma yakunlangan, statusni o‘zgartirib bo‘lmaydi.");
        return;
      }
    }

    await updateDoc(doc(db,"orders",orderId),{
      status:newStatus,
      updatedAt:serverTimestamp()
    });
    showToast("✅ Buyurtma statusi yangilandi.");

    if(isAdmin && newStatus === "delivered"){
      adminOrderFilter = "delivered";
      renderAdminOrders();
    }else{
      refreshCourierPanel();
    }
  }catch(e){
    console.error("Status yangilash xato:", e);
    showToast("⚠️ Status yangilashda xato.");
  }
}

/* ADMIN: BARCHA BUYURTMALARNI TOZALASH */
async function clearAllOrders(){
  const ok = confirm(
    "🧹 Barcha buyurtmalarni Firestore’dan o‘chirishni xohlaysizmi?\n" +
    "Bu amal barcha statusdagi buyurtmalarni tozalaydi."
  );
  if(!ok) return;

  try{
    const snap = await getDocs(ordersCol);
    const promises = [];
    snap.forEach(d=>{
      promises.push(deleteDoc(d.ref));
    });
    await Promise.all(promises);
    showToast("🧹 Barcha buyurtmalar o‘chirildi.");
  }catch(e){
    console.error("Barcha buyurtmalarni o‘chirish xato:", e);
    showToast("⚠️ Buyurtmalarni tozalashda xato.");
  }
}

/* GOOGLE MAPS — MARSHRUT OCHISH (ADMIN) */
function openOrderLocation(lat,lng){
  if(typeof lat !== "number" || typeof lng !== "number"){
    showToast("📍 Joylashuv ma’lumoti topilmadi.");
    return;
  }
  const url = "https://www.google.com/maps/dir/?api=1&destination=" + lat + "," + lng;
  window.open(url, "_blank");
}

/*
 * Admin: muammoli buyurtmani qayta aktivlashtirish
 *
 * Admin muammoli statusdagi buyurtma uchun bu funksiyani bosadi.
 * U buyurtmani yana kuryerga beradi, ixtiyoriy izohni
 * adminComment maydonida saqlaydi va statusni "courier" ga o‘zgartiradi.
 */
async function resolveProblemOrder(orderId){
  try{
    if(!orderId) return;
    let comment = prompt("Admin izohingizni kiriting (ixtiyoriy):") || "";
    await updateDoc(doc(db,"orders",orderId),{
      status: "courier",
      adminComment: comment,
      clientConfirmed: false,
      courierStatus: "Qayta aktivlashtirildi",
      updatedAt: serverTimestamp()
    });
    showToast("✅ Buyurtma qayta aktivlashtirildi");
    // Agar admin sahifasida bo‘lsak, ro‘yxatni yangilaymiz
    if(isAdmin){
      renderAdminOrders();
    }
  }catch(e){
    console.error("resolveProblemOrder xato:", e);
    showToast("⚠️ Buyurtmani aktivlashtirishda xato");
  }
}

/*
 * Admin: buyurtmani o‘chirish
 *
 * Admin individual buyurtmani to‘liq o‘chirishi mumkin.
 */
async function deleteOrder(orderId){
  try{
    if(!orderId) return;
    const ok = confirm("Ushbu buyurtmani o‘chirishni tasdiqlaysizmi?");
    if(!ok) return;
    await deleteDoc(doc(db, "orders", orderId));
    showToast("🗑️ Buyurtma o‘chirildi");
    // Mahalliy massivdan o‘chirib, ro‘yxatni yangilaymiz
    if(isAdmin){
      adminOrders = adminOrders.filter(o => o.id !== orderId);
      renderAdminOrders();
    }
  }catch(e){
    console.error("deleteOrder xato:", e);
    showToast("⚠️ Buyurtmani o‘chirishda xato");
  }
}

// Globalga eksport qilish (inline onClick qo‘llanadi)
window.resolveProblemOrder = resolveProblemOrder;
window.deleteOrder        = deleteOrder;

/* SEND ORDER */
async function sendOrder(){
  if(cart.length===0){
    showToast("Savat bo‘sh. Avval mahsulot tanlang.");
    return;
  }
  const customer = askCustomerInfo();
  if(!customer){
    showToast("❌ Mijoz ma’lumoti kiritilmadi.");
    return;
  }

// Har bir buyurtma uchun yetkazish vaqtini so‘raymiz
const t = await askPreferredTimeModal(customer.preferredTime || "");
if(t===null){
  showToast("⏰ Yetkazish vaqti kiritilmadi (bekor qilindi).", 2500);
  return;
}
customer.preferredTime = t;

  const extraComment = prompt("Buyurtmangizga qo‘shimcha izoh (ixtiyoriy):\nMasalan, eshik kod, pod’ezd, bolalar uxlayapti va h.k.") || "";
  if(extraComment.trim()){
    customer.comment = extraComment.trim();
  }

  const location = await getOrAskLocation();

  let totalPrice = 0;
  const items = cart.map(c=>{
  const p = products[c.index];
  if(!p) return null;

  const setUnit = (c.setQty && p.setPrice) ? p.setPrice : 0;
  const extraUnit = Array.isArray(c.extras)
    ? c.extras.reduce((sum, ex)=> sum + (ex.price||0) * (ex.qty||0), 0)
    : 0;
  const unitPrice = (p.price || 0) + setUnit + extraUnit;
  const lineTotal = unitPrice * c.qty;

  totalPrice += lineTotal;

  return {
    name: p.name || "",
    qty: c.qty,
    price: unitPrice,            // unit price (asosiy + set + extras)
    basePrice: p.price || 0,      // faqat asosiy
    category: p.category || "",
    setQty: c.setQty || 0,
    setName: (c.setQty && p.setName) ? p.setName : null,
    setPrice: (c.setQty && p.setPrice) ? p.setPrice : 0,
    extras: Array.isArray(c.extras) ? c.extras : [],
    lineTotal
  };
}).filter(Boolean);

  try{
    const payload = {
      clientId,
      customer,
      items,
      totalPrice,
      status:"pending",
      createdAt:serverTimestamp(),
      updatedAt:serverTimestamp()
    };
    if(location){
      payload.location = {
        lat: location.lat,
        lng: location.lng,
        accuracy: location.accuracy || null,
        ts: location.ts || Date.now()
      };
    }

    const docRef = await addDoc(ordersCol, payload);

    showToast("✅ Ma’lumotlaringiz olindi. Buyurtma berildi! Holatini 'Buyurtmalarim' bo‘limidan kuzatib boring. Tasdiqlanganda sizga xabar beramiz.", 4500);
    cart = [];
    updateCartUI();
    renderCartItems();
    toggleCartSheet(false);

    localStorage.setItem("beauty_last_order_id", docRef.id);
  }catch(e){
    console.error("Order yozish xato:", e);
    showToast("⚠️ Buyurtma saqlashda xato.");
  }
}

/* TABS */
if(tabsEl){
  tabsEl.addEventListener("click", e=>{
    const btn = e.target.closest(".tab-btn");
    if(!btn) return;
    const pageId = btn.dataset.page;

    if(pageId==="adminPage" && !isAdmin){
      showToast("👑 Avval admin kodini kiriting.");
      return;
    }

    document.querySelectorAll(".tab-btn").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");

    document.getElementById("shopPage").classList.add("hidden");
    document.getElementById("ordersPage").classList.add("hidden");
    document.getElementById("adminPage").classList.add("hidden");
    const favPageEl = document.getElementById("favoritesPage");
    if(favPageEl) favPageEl.classList.add("hidden");

    document.getElementById(pageId).classList.remove("hidden");
  });
}

/* ADMIN LOGIN */
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
    document.getElementById("ordersPage").classList.add("hidden");
    document.getElementById("adminPage").classList.remove("hidden");
    return;
  }
  const code = prompt("Admin uchun kirish kodi:");
  if(code===null) return;

  try{
    const settingsRef = doc(db,"beauty_admin_settings","security");
    const snap        = await getDoc(settingsRef);
    if(!snap.exists()){
      showToast("⚠️ Admin kodi Firestore’da hali sozlanmagan.");
      return;
    }
    const data     = snap.data();
    const realCode = String(data.adminCode || data.code || "").trim();
    if(!realCode){
      showToast("⚠️ Admin kodi noto‘g‘ri sozlangan.");
      return;
    }
    if(code===realCode){
      isAdmin = true;
      updateAdminUI();
      subscribeAdminOrders();
      // admin bo‘lganda kuryerlar ham real-time bo‘lsin
      subscribeCouriersRealtime();
      showToast("✅ Admin sifatida kirdingiz.");
    }else{
      showToast("❌ Noto‘g‘ri kod.");
    }
  }catch(e){
    console.error("Admin kod xato:", e);
    showToast("⚠️ Admin kodi tekshiruvida xato.");
  }
}
if(adminAccessBtn){
  adminAccessBtn.addEventListener("click", askAdminCode);
}

/* ADMIN: CATEGORY */
function updateAdminCategorySelect(){
  if(!adminCategoryEl) return;
  const current = adminCategoryEl.value;
  adminCategoryEl.innerHTML = "";
  if(!categories.length){
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
  if(current && categories.some(c=>c.code===current)){
    adminCategoryEl.value = current;
  }
}
function renderCategoryAdminList(){
  if(!adminCategoryListEl) return;
  if(!categories.length){
    adminCategoryListEl.innerHTML = "<p class='cart-empty'>Hozircha kategoriya yo‘q.</p>";
    return;
  }
  adminCategoryListEl.innerHTML = "";
  categories.forEach(cat=>{
    adminCategoryListEl.innerHTML += `
      <div class="admin-product-row">
        <span>${cat.emoji} <b>${cat.label}</b> <small>(${cat.code})</small></span>
        <div>
          <button class="admin-edit-btn" onclick="editCategory('${cat.id}')">✏️</button>
          <button class="admin-delete-btn" onclick="deleteCategory('${cat.id}')">✕</button>
        </div>
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
    const existing = categories.find(c=>c.code===code);
    if(existing){
      await updateDoc(doc(db,"beauty_categories",existing.id),{
        code,label,emoji,updatedAt:serverTimestamp()
      });
      showToast("✅ Kategoriya yangilandi.");
    }else{
      await addDoc(categoriesCol,{
        code,label,emoji,order:categories.length,createdAt:serverTimestamp()
      });
      showToast("✅ Kategoriya qo‘shildi.");
    }
    adminCatCodeEl.value  = "";
    adminCatLabelEl.value = "";
    adminCatEmojiEl.value = "";
  }catch(e){
    console.error("Kategoriya saqlash xato:", e);
    showToast("⚠️ Kategoriya saqlashda xato.");
  }
}
function editCategory(id){
  const cat = categories.find(c=>c.id===id);
  if(!cat) return;
  editingCategoryId     = id;
  adminCatCodeEl.value  = cat.code;
  adminCatLabelEl.value = cat.label;
  adminCatEmojiEl.value = cat.emoji;
  showToast("✏️ Kategoriya tahrirlash rejimi.");
}
async function deleteCategory(id){
  if(!confirm("Bu kategoriyani o‘chirishni xohlaysizmi?")) return;
  try{
    await deleteDoc(doc(db,"beauty_categories",id));
    showToast("🗑 Kategoriya o‘chirildi.");
  }catch(e){
    console.error("Kategoriya o‘chirish xato:", e);
    showToast("⚠️ Kategoriya o‘chirishda xato.");
  }
}

/* ADMIN: PRODUCTS */
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
  const basePrice   = parseInt(adminPriceBaseEl.value || "0",10);
  const hasDiscount = adminHasDiscountEl.checked;
  const discountRaw = adminPriceDiscountEl.value
    ? parseInt(adminPriceDiscountEl.value || "0",10)
    : null;
  const tag         = adminTagEl.value.trim();
  const description = adminDescriptionEl.value.trim();

  // Qo‘shimcha mahsulot (set) maydonlarini o‘qish.  Agar nom va narx mavjud bo‘lsa, qo‘shimcha sifatida saqlanadi.
  const setNameInput  = adminSetNameEl ? adminSetNameEl.value.trim() : "";
  const setPriceInput = adminSetPriceEl ? parseInt(adminSetPriceEl.value || "0",10) : 0;
  const hasSetName    = setNameInput && setNameInput.length > 0;
  const hasSetPrice   = setPriceInput && setPriceInput > 0;

  if(!name || !basePrice || basePrice<=0){
    showToast("❌ Nomi va narxini to‘g‘ri kiriting.");
    return;
  }
  if(!category){
    showToast("❌ Kategoriya tanlang.");
    return;
  }

  let price = basePrice;
  let oldPrice = null;
  if(hasDiscount && discountRaw && discountRaw>0 && discountRaw<basePrice){
    price    = discountRaw;
    oldPrice = basePrice;
  }

  let images = normalizeImagesInput(adminImagesEl.value.trim());
  if(!images.length) images = [RAW_PREFIX + "noimage.png"];

  const emoji = categoryEmoji[category] || "💅";
  const payload = { name, price, oldPrice, category, emoji, tag, description, images };
  // Agar qo‘shimcha belgilangan bo‘lsa, uni payloadga qo‘shamiz
  if(hasSetName && hasSetPrice){
    payload.setName  = setNameInput;
    payload.setPrice = setPriceInput;
  }
  // Yangi: bir nechta qo‘shimcha mahsulotlar (extras)
  const extras = collectAdminExtras();
  if(extras.length){
    payload.extras = extras;
  }

  try{
    if(editingProductId){
      await updateDoc(doc(db,"beauty_products",editingProductId),{
        ...payload,updatedAt:serverTimestamp()
      });
      remoteProducts = remoteProducts.map(p=>p.id===editingProductId?{...p,...payload}:p);
      rebuildProducts();
      renderAdminCustomList();
      showToast("✅ Mahsulot yangilandi.");
      flashAdminButton("✅ Yangilandi");
    }else{
      const docRef = await addDoc(productsCol,{
        ...payload,createdAt:serverTimestamp()
      });
      remoteProducts.push({
        id:docRef.id,fromFirebase:true,...payload,createdAt:{seconds:Date.now()/1000}
      });
      rebuildProducts();
      renderAdminCustomList();
      showToast("✅ Mahsulot qo‘shildi.");
      flashAdminButton("✅ Qo‘shildi");
    }
    editingProductId             = null;
    adminNameEl.value           = "";
    adminPriceBaseEl.value      = "";
    adminPriceDiscountEl.value  = "";
    adminHasDiscountEl.checked  = false;
    adminTagEl.value            = "";
    adminDescriptionEl.value    = "";
    adminImagesEl.value         = "";

    // Reset qo‘shimcha maydonlari
    if(adminSetNameEl)  adminSetNameEl.value  = "";
    if(adminSetPriceEl) adminSetPriceEl.value = "";
  }catch(e){
    console.error("Mahsulot saqlash xato:", e);
    showToast("⚠️ Mahsulot saqlashda xato.");
  }
}
async function deleteAnyProduct(id){
  if(!confirm("Bu mahsulotni o‘chirishni xohlaysizmi?")) return;
  try{
    await deleteDoc(doc(db,"beauty_products",id));
    remoteProducts = remoteProducts.filter(p=>p.id!==id);
    rebuildProducts();
    renderAdminCustomList();
    showToast("🗑 Mahsulot o‘chirildi.");
  }catch(e){
    console.error("Mahsulot o‘chirish xato:", e);
    showToast("⚠️ Mahsulot o‘chirishda xato.");
  }
}
function renderAdminCustomList(){
  const adminCustomListEl = document.getElementById("adminCustomList");
  if(!adminCustomListEl) return;
  if(!remoteProducts.length){
    adminCustomListEl.innerHTML = "<p class='cart-empty'>Hozircha mahsulot yo‘q.</p>";
    return;
  }
  adminCustomListEl.innerHTML = "";
  remoteProducts
    .slice()
    .sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0))
    .forEach(p=>{
      adminCustomListEl.innerHTML += `
        <div class="admin-product-row">
          <span>${p.name}</span>
          <span>${formatPrice(p.price)} so‘m</span>
          <div>
            <button class="admin-edit-btn" onclick="editProduct('${p.id}')">✏️</button>
            <button class="admin-delete-btn" onclick="deleteAnyProduct('${p.id}')">✕</button>
          </div>
        </div>
      `;
    });
}
function editProduct(id){
  const p = remoteProducts.find(r=>r.id===id);
  if(!p) return;
  editingProductId = id;
  adminNameEl.value     = p.name || "";
  adminCategoryEl.value = p.category || "";
  if(p.oldPrice && p.oldPrice>p.price){
    adminPriceBaseEl.value      = p.oldPrice;
    adminPriceDiscountEl.value  = p.price;
    adminHasDiscountEl.checked  = true;
  }else{
    adminPriceBaseEl.value      = p.price;
    adminPriceDiscountEl.value  = "";
    adminHasDiscountEl.checked  = false;
  }
  adminTagEl.value         = p.tag || "";
  adminDescriptionEl.value = p.description || "";
  adminImagesEl.value      = (p.images && p.images.length) ? p.images.join(", ") : "";
  // Qo‘shimcha maydonlarini to‘ldirish
  if(adminSetNameEl)  adminSetNameEl.value  = p.setName || "";
  if(adminSetPriceEl) adminSetPriceEl.value = p.setPrice || "";
  // Yangi: bir nechta qo‘shimcha mahsulotlarni to‘ldirish
  loadAdminExtras(p.extras || []);
  const btn = document.querySelector(".admin-btn");
  if(btn) btn.textContent = "💾 Mahsulotni saqlash (tahrirlash)";
  showToast("✏️ Tahrirlash rejimi.");
}

/* PRODUCT DETAIL */

// detail kartani fullscreen / normal rejimga o‘tkazish
function setImageFullscreen(on){
  const card = document.querySelector(".detail-card");
  if(!card) return;
  isImageFullscreen = !!on;
  card.classList.toggle("image-fullscreen", isImageFullscreen);
}

// toggle function
function toggleImageFullscreen(){
  setImageFullscreen(!isImageFullscreen);
}

function getDetailImages(){
  if(detailIndex===null) return [RAW_PREFIX + "noimage.png"];
  const p = products[detailIndex];
  if(!p) return [RAW_PREFIX + "noimage.png"];
  if(p.images && p.images.length) return p.images;
  return [RAW_PREFIX + "noimage.png"];
}

// Asosiy katta rasm (tepada)
function renderDetailImage(){
  if(!detailImageEl) return;
  const imgs = getDetailImages();
  if(!imgs.length) return;
  if(detailImageIndex>=imgs.length) detailImageIndex=0;
  if(detailImageIndex<0) detailImageIndex=imgs.length-1;
  setImageWithPngJpgFallback(detailImageEl, imgs[detailImageIndex]);
  if(detailImageIndexEl){
    detailImageIndexEl.textContent = `${detailImageIndex+1} / ${imgs.length}`;
  }
}

/* YANGI: DETAL NARXINI QTY BO‘YICHA HISOBLASH */
function updateDetailPriceUI(){
  if(detailIndex === null) return;
  const p = products[detailIndex];
  if(!p) return;
  const qty = detailQty || 1;
  // Hisob-kitob: asosiy narx + qo‘shimcha narx (agar mavjud) -> per unit price
  const basePrice    = p.price || 0;
  const baseOldPrice = p.oldPrice || null;
  const setPart      = (detailSetQty > 0 && p.setPrice) ? p.setPrice : 0;
  const extrasPart   = Array.isArray(detailExtrasState)
    ? detailExtrasState.reduce((sum, ex)=> sum + (ex.price||0) * (ex.qty||0), 0)
    : 0;
  const perUnit      = basePrice + setPart + extrasPart;
  const total        = perUnit * qty;

  if(detailPriceEl){
    detailPriceEl.textContent = formatPrice(total) + " so‘m";
  }
  if(detailOldPriceEl){
    if(baseOldPrice){
      // Eski narx faqat asosiy mahsulotga taalluqlidir; qo‘shimcha uchun eski narx yo‘q
      const totalOld = baseOldPrice * qty;
      detailOldPriceEl.textContent = formatPrice(totalOld) + " so‘m";
      detailOldPriceEl.classList.remove("hidden");
    }else{
      detailOldPriceEl.classList.add("hidden");
    }
  }

  // Show discount percentage if an old price exists on the base product
  if(typeof detailDiscountEl !== 'undefined'){
    if(baseOldPrice){
      const discount = Math.round(100 - (basePrice * 100) / baseOldPrice);
      detailDiscountEl.textContent = `-${discount}%`;
      detailDiscountEl.classList.remove("hidden");
    } else {
      detailDiscountEl.classList.add("hidden");
    }
  }
}

// Pastga qarab scroll bo‘ladigan galereya (agar HTML’da #detailGalleryList bo‘lsa)
function renderDetailGallery(){
  if(!detailGalleryListEl) return;
  const imgs = getDetailImages();
  if(!imgs.length){
    detailGalleryListEl.innerHTML = "";
    return;
  }
  detailGalleryListEl.innerHTML = "";
  imgs.forEach((url, idx)=>{
    const base = url.startsWith(RAW_PREFIX)
      ? url.replace(/\.(png|jpg|jpeg)$/i,"")
      : null;
    const srcPng = base ? base + ".png" : url;
    const srcJpg = base ? base + ".jpg" : url;

    const img = document.createElement("img");
    img.className = "detail-gallery-img";
    img.alt = "Mahsulot rasmi " + (idx+1);
    img.src = srcPng;
    if(base){
      img.onerror = function(){
        this.onerror = null;
        this.src = srcJpg;
      };
    }
    img.addEventListener("click", e=>{
      e.stopPropagation();
      detailImageIndex = idx;
      renderDetailImage();
      window.scrollTo({top:0,behavior:"smooth"});
    });
    detailGalleryListEl.appendChild(img);
  });
}

/*
 * DETAL RASM SLAYDERINI BOSHLASH
 *
 * Agar mahsulot bir nechta rasmga ega bo‘lsa, bu funksiya har 3
 * soniyada rasmni avtomatik o‘zgartirib boradi.  Slayder faqat
 * modal oynasi ochilganida ishlaydi va modal yopilganda
 * to‘xtatiladi.  Bu asosiy mahsulot kartasidagi rasmga
 * ta’sir qilmaydi.
 */
function startDetailSlider(imgs){
  try{
    // Toza boshlash uchun avval intervalni to‘xtatamiz
    stopDetailSlider();
    if(!Array.isArray(imgs) || imgs.length <= 1) return;
    let idx = 0;
    // Dastlab rasm indeksini 0 ga o‘rnatamiz
    detailImageIndex = 0;
    detailSliderInterval = setInterval(()=>{
      idx = (idx + 1) % imgs.length;
      detailImageIndex = idx;
      // Rasmni yangilash
      setImageWithPngJpgFallback(detailImageEl, imgs[idx]);
    }, 3000);
  }catch(err){
    console.warn('detail slider error:', err);
  }
}

// Slayderni to‘xtatish.  Modal yopilganda chaqiriladi.
function stopDetailSlider(){
  if(detailSliderInterval){
    clearInterval(detailSliderInterval);
    detailSliderInterval = null;
  }
}

function changeDetailImage(delta){
  if(detailIndex===null) return;
  const imgs = getDetailImages();
  if(imgs.length<=1) return;
  detailImageIndex = (detailImageIndex+delta+imgs.length)%imgs.length;
  renderDetailImage();
}

function clearDetailCountdown(){
  if(detailCountdownTimer){
    clearInterval(detailCountdownTimer);
    detailCountdownTimer=null;
  }
  // Do not alter the back button here – it remains visible with its own label
}

function openProductDetail(index){
  const p = products[index];
  if(!p) return;
  detailIndex      = index;
  detailImageIndex = 0;
  detailQty        = 1;
  clearDetailCountdown();
  setImageFullscreen(false); // har safar yangi kartada normal holat

  const catLbl = categoryLabel[p.category] || p.category || "Kategoriya yo‘q";

  // Rasmni chizish va galereyani yaratish
  renderDetailImage();
  renderDetailGallery();

  // Slayderni boshlash.  Faol rasmni har 3 soniyada almashtirish
  const imgs = getDetailImages();
  startDetailSlider(imgs);

  if(detailCategoryEl) detailCategoryEl.textContent = catLbl;
  if(detailNameEl)     detailNameEl.textContent     = p.name;
  if(detailTagEl)      detailTagEl.textContent      = p.tag ? "💡 " + p.tag : "";
  if(detailDescEl){
    detailDescEl.textContent =
      p.description && p.description.trim().length
        ? p.description
        : "Bu mahsulot sizning buyurtmangiz uchun tayyorlangan.";
  }

  if(detailQtyValue) detailQtyValue.textContent = detailQty;

  // Qo‘shimcha (set) bo‘lsa, ko‘rsatamiz; aks holda yashiramiz.  Set faqat 0 yoki 1 dona tanlanadi.
  detailSetQty = 0;
  if(p.setName && p.setPrice){
    if(detailSetRow) detailSetRow.classList.remove("hidden");
    if(detailSetNameEl) detailSetNameEl.textContent = p.setName;
    if(detailSetPriceEl) detailSetPriceEl.textContent = formatPrice(p.setPrice) + " so‘m";
    if(detailSetQtyValue) detailSetQtyValue.textContent = detailSetQty;
    // Mahsulot rasmi balandligini kamaytirish (40–45% viewport) agar qo‘shimcha mavjud bo‘lsa
    if(detailImageEl) detailImageEl.style.maxHeight = "45vh";
  }else{
    if(detailSetRow) detailSetRow.classList.add("hidden");
    if(detailImageEl) detailImageEl.style.maxHeight = "60vh";
  }

  // narxlarni qty va set bo‘yicha yangilash
  updateDetailPriceUI();

  if(detailAddBtn){
    detailAddBtn.classList.remove("added");
    // Show a simple "Qo‘shish" label without a cart icon per user request
    detailAddBtn.textContent   = "➕ Qo‘shish";
  }

  // Show or hide the remove button depending on whether this product is already in the cart
  if(detailRemoveBtn){
    const isInCart = cart.some(item => item.index === index);
    if(isInCart) detailRemoveBtn.classList.remove("hidden");
    else detailRemoveBtn.classList.add("hidden");
  }

  productDetailOverlay.classList.remove("hidden");
  document.body.style.overflow = "hidden";

  // Reset scroll position for the detail body so the top of the card is visible
  const detailBody = document.querySelector(".detail-body");
  if(detailBody) detailBody.scrollTop = 0;
}
function closeProductDetail(){
  clearDetailCountdown();
  setImageFullscreen(false);
  // Rasm slayderini to‘xtatamiz
  stopDetailSlider();
  productDetailOverlay.classList.add("hidden");
  document.body.style.overflow = "";
  detailIndex = null;
}

if(detailAddBtn){
    detailAddBtn.addEventListener("click", ()=>{
    if(detailIndex===null) return;
    // Qo‘shimcha sonini ham kartaga uzatamiz.  detailSetQty 0 yoki 1.
    addToCart(detailIndex, detailQty, detailSetQty);
    // Once added, reveal the remove button so the user can undo if needed
    if(detailRemoveBtn) detailRemoveBtn.classList.remove("hidden");
  });
}
if(detailBackBtn){
  detailBackBtn.addEventListener("click", closeProductDetail);
}

// Allow the user to remove the current product from the cart directly from the detail screen
if(detailRemoveBtn){
  detailRemoveBtn.addEventListener("click", ()=>{
    if(detailIndex===null) return;
    // Remove the item from the cart with respect to its set quantity
    removeFromCart(detailIndex, detailSetQty);
    // Reset quantity to 1 and set qty to 0
    detailQty = 1;
    detailSetQty = 0;
    if(detailQtyValue) detailQtyValue.textContent = detailQty;
    if(detailSetQtyValue) detailSetQtyValue.textContent = detailSetQty;
    // Refresh the price so it reflects the base price (qty=1)
    updateDetailPriceUI();
    // Hide the remove button again since the item is no longer in the cart
    detailRemoveBtn.classList.add("hidden");
  });
}
if(productDetailOverlay){
  productDetailOverlay.addEventListener("click", e=>{
    if(e.target===productDetailOverlay) closeProductDetail();
  });
}
if(detailPrevBtn){
  detailPrevBtn.addEventListener("click", e=>{
    e.stopPropagation();
    changeDetailImage(-1);
  });
}
if(detailNextBtn){
  detailNextBtn.addEventListener("click", e=>{
    e.stopPropagation();
    changeDetailImage(1);
  });
}
if(detailQtyMinus){
  detailQtyMinus.addEventListener("click", e=>{
    e.stopPropagation();
    if(detailQty>1){
      detailQty--;
      if(detailQtyValue) detailQtyValue.textContent = detailQty;
      updateDetailPriceUI();
    }
  });
}
if(detailQtyPlus){
  detailQtyPlus.addEventListener("click", e=>{
    e.stopPropagation();
    detailQty++;
    if(detailQtyValue) detailQtyValue.textContent = detailQty;
    updateDetailPriceUI();
  });
}
// Qo‘shimcha set soni boshqaruvi: faqat 0 yoki 1
if(detailSetMinus){
  detailSetMinus.addEventListener("click", e=>{
    e.stopPropagation();
    if(detailSetQty > 0){
      detailSetQty = 0;
      if(detailSetQtyValue) detailSetQtyValue.textContent = detailSetQty;
      updateDetailPriceUI();
    }
  });
}
if(detailSetPlus){
  detailSetPlus.addEventListener("click", e=>{
    e.stopPropagation();
    // Qo‘shimcha faqat 1 dona qo‘shiladi
    if(detailSetQty < 1){
      detailSetQty = 1;
      if(detailSetQtyValue) detailSetQtyValue.textContent = detailSetQty;
      updateDetailPriceUI();
    }
  });
}
// rasmga bosganda — ENDI FULLSCREEN YO‘Q, faqat hech narsa qilmaydi
if(detailImgWrap){
  detailImgWrap.addEventListener("click", e=>{
    e.stopPropagation();
    // fullscreen o‘chirildi, shunchaki rasm ko‘rinadi
  });
}

/* 🚴‍♂️ ADMIN UCHUN KURYER BOSHQARUVI (couriers kolleksiya) */

// status: "active" | "blocked" | "deleted"
function courierStatusLabel(status){
  switch(status){
    case "blocked": return "🚫 Bloklangan";
    case "deleted": return "🗑 O‘chirilgan";
    default:        return "✅ Faol";
  }
}

function renderCourierAdminList(){
  if(!adminCourierListEl) return;
  if(!couriers.length){
    adminCourierListEl.innerHTML = "<p class='cart-empty'>Hozircha kuryer qo‘shilmagan.</p>";
    return;
  }
  adminCourierListEl.innerHTML = "";
  couriers
    .slice()
    .sort((a,b)=>(a.name || "").localeCompare(b.name || ""))
    .forEach(c=>{
      const status = c.status || "active";
      const statusText = courierStatusLabel(status);
      const isBlocked  = status === "blocked";
      const isDeleted  = status === "deleted";

      adminCourierListEl.innerHTML += `
        <div class="admin-product-row">
          <div>
            <div><strong>${c.name || "-"}</strong> — ${c.phone || ""}</div>
            <div style="font-size:12px;opacity:.9;">
              🚗 ${c.car || ""} • ${c.plate || ""}<br>
              👤 Login: <code>${c.login || ""}</code>
            </div>
            <div style="font-size:12px;margin-top:4px;">
              Holat: ${statusText}
            </div>
          </div>
          <div>
            <button class="admin-edit-btn" onclick="editCourier('${c.id}')">✏️</button>
            ${!isDeleted ? `
              <button class="admin-delete-btn" onclick="softDeleteCourier('${c.id}')">🗑</button>
            ` : `
              <button class="admin-edit-btn" onclick="restoreCourier('${c.id}')">♻️</button>
            `}
            ${!isDeleted ? `
              <button class="admin-edit-btn" onclick="${isBlocked ? `unblockCourier('${c.id}')` : `blockCourier('${c.id}')`}">
                ${isBlocked ? "🔓" : "🚫"}
              </button>
            ` : ""}
          </div>
        </div>
      `;
    });
}

async function saveCourier(){
  if(!adminCourierNameEl || !adminCourierLoginEl || !adminCourierPasswordEl){
    showToast("⚠️ Kuryer formasi HTML’da topilmadi (IDlarni tekshiring).");
    return;
  }

  const name  = adminCourierNameEl.value.trim();
  const phone = adminCourierPhoneEl ? adminCourierPhoneEl.value.trim() : "";
  const car   = adminCourierCarEl ? adminCourierCarEl.value.trim()   : "";
  const plate = adminCourierPlateEl ? adminCourierPlateEl.value.trim() : "";
  const login = adminCourierLoginEl.value.trim();
  const pass  = adminCourierPasswordEl.value.trim();

  if(!name || !login || !pass){
    showToast("❌ Kuryer ismi, login va parolini kiriting.");
    return;
  }

  const payload = {
    name,
    phone,
    car,
    plate,
    login,
    password: pass,
    status: "active",
    updatedAt: serverTimestamp()
  };

  try{
    if(editingCourierId){
      await updateDoc(doc(db,"couriers",editingCourierId), payload);
      showToast("✅ Kuryer ma’lumoti yangilandi.");
    }else{
      await addDoc(couriersCol,{
        ...payload,
        createdAt: serverTimestamp()
      });
      showToast("✅ Kuryer qo‘shildi.");
    }

    editingCourierId = null;
    if(adminCourierNameEl)     adminCourierNameEl.value     = "";
    if(adminCourierPhoneEl)    adminCourierPhoneEl.value    = "";
    if(adminCourierCarEl)      adminCourierCarEl.value      = "";
    if(adminCourierPlateEl)    adminCourierPlateEl.value    = "";
    if(adminCourierLoginEl)    adminCourierLoginEl.value    = "";
    if(adminCourierPasswordEl) adminCourierPasswordEl.value = "";
  }catch(e){
    console.error("Kuryer saqlash xato:", e);
    showToast("⚠️ Kuryer saqlashda xato.");
  }
}

function editCourier(id){
  const c = couriers.find(x=>x.id===id);
  if(!c) return;
  editingCourierId = id;
  if(adminCourierNameEl)     adminCourierNameEl.value     = c.name  || "";
  if(adminCourierPhoneEl)    adminCourierPhoneEl.value    = c.phone || "";
  if(adminCourierCarEl)      adminCourierCarEl.value      = c.car   || "";
  if(adminCourierPlateEl)    adminCourierPlateEl.value    = c.plate || "";
  if(adminCourierLoginEl)    adminCourierLoginEl.value    = c.login || "";
  if(adminCourierPasswordEl) adminCourierPasswordEl.value = c.password || "";
  showToast("✏️ Kuryer tahrirlash rejimi.");
}

async function blockCourier(id){
  try{
    await updateDoc(doc(db,"couriers",id),{
      status:"blocked",
      updatedAt:serverTimestamp()
    });
    showToast("🚫 Kuryer bloklandi.");
  }catch(e){
    console.error("Block xato:", e);
    showToast("⚠️ Kuryerni bloklashda xato.");
  }
}

async function unblockCourier(id){
  try{
    await updateDoc(doc(db,"couriers",id),{
      status:"active",
      updatedAt:serverTimestamp()
    });
    showToast("🔓 Kuryer blokdan chiqarildi.");
  }catch(e){
    console.error("Unblock xato:", e);
    showToast("⚠️ Blokdan chiqarishda xato.");
  }
}

async function softDeleteCourier(id){
  const ok = confirm("Bu kuryer o‘chiriladi (status = deleted). Qayta tiklash mumkin. Davom etasizmi?");
  if(!ok) return;
  try{
    await updateDoc(doc(db,"couriers",id),{
      status:"deleted",
      updatedAt:serverTimestamp()
    });
    showToast("🗑 Kuryer o‘chirilgan holatga o‘tkazildi.");
  }catch(e){
    console.error("Delete xato:", e);
    showToast("⚠️ Kuryerni o‘chirishda xato.");
  }
}

async function restoreCourier(id){
  try{
    await updateDoc(doc(db,"couriers",id),{
      status:"active",
      updatedAt:serverTimestamp()
    });
    showToast("♻️ Kuryer qayta faollashtirildi.");
  }catch(e){
    console.error("Restore xato:", e);
    showToast("⚠️ Kuryerni tiklashda xato.");
  }
}

function subscribeCouriersRealtime(){
  onSnapshot(couriersCol, snap=>{
    const list = [];
    snap.forEach(d=>{
      const data = d.data() || {};
      list.push({
        id: d.id,
        ...data
      });
    });
    couriers = list;
    renderCourierAdminList();
  },err=>{
    console.error("Couriers realtime xato:", err);
  });
}

// tugma event
if(adminCourierSaveBtn){
  adminCourierSaveBtn.addEventListener("click", saveCourier);
}

/* 🚚 COURIER PANEL LOGIC (ADMIN ICHIDA XARITA) */
function refreshCourierPanel(){
  if(!courierOrderSelect || !courierMapFrame || !courierInfoEl) return;

  const courierOrders = adminOrders.filter(o =>
    o.status === "courier" &&
    o.location &&
    typeof o.location.lat === "number" &&
    typeof o.location.lng === "number"
  );

  courierOrderSelect.innerHTML = "";

  if(!courierOrders.length){
    courierOrderSelect.innerHTML = `<option value="">Kuryerda buyurtma yo‘q</option>`;
    courierMapFrame.src = "";
    courierInfoEl.innerHTML = "Kuryerga berilgan va GPS bilan saqlangan buyurtma topilmadi.";
    courierSelectedOrderId = null;
    return;
  }

  courierOrders.forEach(o=>{
    const customer = o.customer || {};
    const label = `${o.id.slice(0,6)} • ${customer.name || "Mijoz"} • ${formatPrice(o.totalPrice)} so‘m`;
    const opt = document.createElement("option");
    opt.value = o.id;
    opt.textContent = label;
    courierOrderSelect.appendChild(opt);
  });

  const firstId = courierSelectedOrderId && courierOrders.some(o=>o.id===courierSelectedOrderId)
    ? courierSelectedOrderId
    : courierOrders[0].id;

  courierSelectedOrderId = firstId;
  courierOrderSelect.value = firstId;

  updateCourierMapFromSelect();
}

function updateCourierMapFromSelect(){
  if(!courierOrderSelect || !courierMapFrame || !courierInfoEl) return;
  const id = courierOrderSelect.value;
  if(!id){
    courierMapFrame.src = "";
    courierInfoEl.innerHTML = "Kuryerga berilgan buyurtmani tanlang.";
    courierSelectedOrderId = null;
    return;
  }
  courierSelectedOrderId = id;
  const order = adminOrders.find(o=>o.id===id);
  if(!order || !order.location){
    courierMapFrame.src = "";
    courierInfoEl.innerHTML = "Bu buyurtma uchun GPS saqlanmagan.";
    return;
  }
  const {lat,lng} = order.location;
  const customer = order.customer || {};

  const url = `https://www.google.com/maps?q=${lat},${lng}&z=16&output=embed`;
  courierMapFrame.src = url;

  const lines = [];
  lines.push(`👤 ${customer.name || "-"}`);
  lines.push(`📱 ${customer.phone || "-"}`);
  if(customer.secondPhone)   lines.push(`📞 Qo‘shimcha raqam: ${customer.secondPhone}`);
  lines.push(`📍 Manzil: ${customer.address || "-"}`);
  if(customer.landmark)      lines.push(`🧭 Mo‘ljal: ${customer.landmark}`);
  if(customer.preferredTime) lines.push(`⏰ Vaqt: ${customer.preferredTime}`);
  if(customer.comment)       lines.push(`✏️ Izoh: ${customer.comment}`);

  courierInfoEl.innerHTML = lines.join("<br>");
}

if(courierOrderSelect){
  courierOrderSelect.addEventListener("change", updateCourierMapFromSelect);
}

function openSelectedCourierExternal(){
  if(!courierSelectedOrderId){
    showToast("Kuryerda buyurtmani tanlang.");
    return;
  }
  const order = adminOrders.find(o=>o.id===courierSelectedOrderId);
  if(!order || !order.location){
    showToast("📍 Bu buyurtma uchun GPS topilmadi.");
    return;
  }
  openOrderLocation(order.location.lat, order.location.lng);
}

function centerToCourier(){
  if(!courierSelectedOrderId){
    showToast("Avval kuryerda buyurtmani tanlang.");
    return;
  }
  const order = adminOrders.find(o=>o.id===courierSelectedOrderId);
  if(!order || !order.location){
    showToast("📍 Bu buyurtma uchun GPS topilmadi.");
    return;
  }
  const {lat,lng} = order.location;

  if(!navigator.geolocation){
    showToast("Telefoningiz GPS ni qo‘llamaydi. Google Maps orqali oching.");
    openOrderLocation(lat,lng);
    return;
  }

  showToast("📍 Joylashuvingiz olinmoqda...", 2500);

  navigator.geolocation.getCurrentPosition(
    pos=>{
      const myLat = pos.coords.latitude;
      const myLng = pos.coords.longitude;
      const url = `https://www.google.com/maps/dir/?api=1&origin=${myLat},${myLng}&destination=${lat},${lng}`;
      window.open(url,"_blank");
    },
    err=>{
      console.error("Courier GPS xato:", err);
      showToast("⚠️ Joylashuvga ruxsat berilmadi. Telefon sozlamalaridan GPS ni yoqing.");
    },
    { enableHighAccuracy:true, timeout:8000 }
  );
}

/*
 * Mijozning buyurtma tasdiqlashi
 *
 * Foydalanuvchi “Zakazni oldim” yoki “Zakazni olmadim” tugmalaridan
 * birini bosganda chaqiriladi.  Agar received=true bo‘lsa, buyurtma
 * `completed` holatiga o‘tadi; aks holda `problem` holatiga o‘tadi va
 * foydalanuvchi sababini `prompt()` orqali kiritishi mumkin.  Har ikki
 * holatda ham buyurtma hujjati Firestore’da yangilanadi.
 */
async function clientConfirmOrder(orderId, received){
  try{
    if(!orderId) return;
    const orderRef = doc(db, "orders", orderId);
    if(received){
      await updateDoc(orderRef, {
        status: "completed",
        clientConfirmed: true
      });
      showToast("✔ Buyurtma tasdiqlandi");
    } else {
      const reason = prompt("Zakazni olmadim. Sababini yozing:") || "";
      await updateDoc(orderRef, {
        status: "problem",
        clientConfirmed: false,
        clientComment: reason
      });
      showToast("❗ Muammo adminga bildirildi");
    }
  } catch(err){
    console.error("clientConfirmOrder xato:", err);
    showToast("⚠️ Tasdiqlashda xato");
  }
}

/* INIT */
(function init(){
  // Apply any saved site theme (light/dark) for our own palette.
  // Kunduzgi rejimni default qilib qo‘yamiz.  Agar saqlangan
  // rejim bo‘lmasa, "light" bo‘ladi.
  const savedTheme = localStorage.getItem(THEME_KEY) || "light";
  applyTheme(savedTheme);
  // If the Telegram WebApp API is available, synchronize our CSS
  // variables with the user's Telegram theme.  This ensures the app
  // respects dark/light mode and Telegram colors when running inside
  // Telegram.  We invoke this here before other rendering logic so
  // that colors are set early.
  applyTelegramTheme();
  if (window.Telegram && Telegram.WebApp && typeof Telegram.WebApp.onEvent === 'function') {
    // Listen for theme changes while the app is open.  When the
    // user changes Telegram’s theme, update our CSS variables.
    Telegram.WebApp.onEvent('themeChanged', applyTelegramTheme);
  }

  // Load favorites from localStorage before anything is rendered so that
  // heart icons reflect the saved state.  This call will populate the
  // `favorites` array.
  loadFavorites();

  clientId = getOrCreateClientId();
  renderCustomerInfo();

  isAdmin = false;
  updateAdminUI();

  renderCategoryFilter();
  // Ensure the search input is empty on initial load to prevent
  // browsers from auto-filling previous query text.  Clearing it
  // also resets the currentSearch state.
  if(searchInput){
    searchInput.value = "";
    currentSearch = "";
  }
  // Render an empty products grid initially until Firestore
  // snapshot populates products.  Products are no longer restored from
  // localStorage; the latest data is always obtained from Firestore.
  renderProducts();
  // Render the favorites page after the initial product grid is drawn.  This
  // ensures that the favorites page shows saved items even before
  // Firestore snapshots arrive.
  renderFavoritesPage();

  // Listen for real-time updates from Firestore.  When data
  // arrives, it populates the product grid.
  subscribeProductsRealtime();
  subscribeCategoriesRealtime();
  subscribeClientOrders();
  // Kuryerlarni ham real-time qilamiz (admin bo‘lmaganda ham DOM bo‘lmasa ishlamaydi)
  subscribeCouriersRealtime();

  updateCartUI();
})();

/* GLOBAL EXPORTS */
window.addToCart                   = addToCart;
window.toggleCartSheet             = toggleCartSheet;
window.changeQty                   = changeQty;
window.removeFromCart              = removeFromCart;
window.sendOrder                   = sendOrder;
window.openProductDetail           = openProductDetail;
window.closeProductDetail          = closeProductDetail;

window.resetCustomerInfo           = resetCustomerInfo;
window.editCustomerInfo            = editCustomerInfo;

window.saveCategory                = saveCategory;
window.deleteCategory              = deleteCategory;
window.editCategory                = editCategory;

window.addCustomProduct            = addCustomProduct;
window.deleteAnyProduct            = deleteAnyProduct;
window.editProduct                 = editProduct;

window.updateOrderStatus           = updateOrderStatus;
window.setAdminOrderFilter         = setAdminOrderFilter;
window.clearAllOrders              = clearAllOrders;
window.openOrderLocation           = openOrderLocation;

// Mijoz buyurtmani tasdiqlash yoki rad etish funksiyasi
window.clientConfirmOrder         = clientConfirmOrder;

// Export favorites toggling so buttons in the HTML markup can invoke it.
window.toggleFavorite              = toggleFavorite;

// Courier globals (admindagi xarita)
window.openSelectedCourierExternal = openSelectedCourierExternal;
window.centerToCourier             = centerToCourier;

// YANGI: kuryerlarni boshqarish (admin panel formida ishlatish uchun)
window.saveCourier                 = saveCourier;
window.editCourier                 = editCourier;
window.blockCourier                = blockCourier;
window.unblockCourier              = unblockCourier;
window.softDeleteCourier           = softDeleteCourier;
window.restoreCourier              = restoreCourier;

/*
 * Apply Telegram WebApp theme parameters to CSS custom properties.
 * Telegram WebApp exposes a `themeParams` object containing colors for
 * various UI elements such as `bg_color`, `secondary_bg_color`, `text_color`, etc.
 * This helper copies those values into CSS variables prefixed with
 * `--tg-theme-` so they can be referenced in stylesheets.  It also
 * updates the `color-scheme` property based on Telegram’s `colorScheme`
 * (either `light` or `dark`).  If Telegram WebApp API is not
 * available, this function does nothing.
 */
function applyTelegramTheme() {
  try {
    if (window.Telegram && Telegram.WebApp) {
      const params = Telegram.WebApp.themeParams || {};
      // Iterate over provided theme parameters and register them as CSS vars
      Object.keys(params).forEach(key => {
        const cssVar = `--tg-theme-${key.replace(/_/g, '-')}`;
        document.documentElement.style.setProperty(cssVar, params[key]);
      });
      // Set the color-scheme property so that native form controls adapt
      const scheme = Telegram.WebApp.colorScheme;
      if (scheme) {
        document.documentElement.style.setProperty('color-scheme', scheme);
      }
    }
  } catch (err) {
    // If anything goes wrong, we silently ignore it.  The site will
    // continue to use its default colors.
    console.warn('Failed to apply Telegram theme:', err);
  }
}
