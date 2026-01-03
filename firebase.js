import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

export const firebaseConfig = {
  apiKey: "AIzaSyDLIJg7UfsVYiz9HdhbwblqQ_3ZYZPJ8fg",
  authDomain: "shahbozbek-4922b.firebaseapp.com",
  projectId: "shahbozbek-4922b",
  storageBucket: "shahbozbek-4922b.firebasestorage.app",
  messagingSenderId: "131010057146",
  appId: "1:131010057146:web:f9fe30976d19e9d1ea0383"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
