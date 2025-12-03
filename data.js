/* ============================================================
   DATA.JS — Firebase config, global variables, helpers
============================================================ */

/* ------------------------------------------------------------
   FIREBASE CONFIG
------------------------------------------------------------ */
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  getDoc,
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

// INIT Firebase
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

/* ------------------------------------------------------------
   GLOBAL STATE
------------------------------------------------------------ */
export let products = [];
export let remoteProducts = [];
export let cart = [];
export let categories = [];

export let activeCategory = "all";
export let currentSearch = "";

// Raw image path
export const RAW_PREFIX =
  "https://raw.githubusercontent.com/hanbek221-design/kosmetika-premium/main/images/";

/* ------------------------------------------------------------
   HELPERS
------------------------------------------------------------ */
export function formatPrice(v) {
  return v.toLocaleString("uz-UZ");
}

/* ------------------ IMAGE NORMALIZER ----------------------- */
export function normalizeImagesInput(raw) {
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

/* ------------------ IMAGE FALLBACK -------------------------- */
export function setImageWithPngJpgFallback(imgElement, url) {
  if (!url) {
    imgElement.src = RAW_PREFIX + "noimage.png";
    return;
  }
  if (url.startsWith(RAW_PREFIX)) {
    const base = url.replace(/\.(png|jpg|jpeg)$/i, "");
    imgElement.onerror = function () {
      this.onerror = null;
      this.src = base + ".jpg";
    };
    imgElement.src = base + ".png";
  } else {
    imgElement.src = url;
  }
}

/* ------------------------------------------------------------
   FIRESTORE COLLECTIONS
------------------------------------------------------------ */
export const productsCol = collection(db, "beauty_products");
export const categoriesCol = collection(db, "beauty_categories");
export const adminSettingsCol = doc(db, "beauty_admin_settings", "security");

/* ------------------------------------------------------------
   GLOBAL EXPORT
------------------------------------------------------------ */
export {
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  getDoc,
  serverTimestamp
};
