import { db } from './firebase.js';
import {
  collection, addDoc, onSnapshot,
  updateDoc, doc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

// Telegram fallback
const TG = window.Telegram && Telegram.WebApp ? Telegram.WebApp : null;
if (TG) TG.ready();

const user = TG?.initDataUnsafe?.user || { id: "local_user", first_name: "Local" };
const TG_ID = String(user.id);
const TG_NAME = user.first_name;

const taxisRef = collection(db, "taxis");

// Qo‘shish
window.addTaxi = async () => {
  const route = route.value.trim();
  const seats = parseInt(seats.value);
  const phone = phone.value.trim();
  const time = time.value;

  if (!route || !seats || !phone || !time) {
    alert("Maʼlumot to‘liq emas");
    return;
  }

  await addDoc(taxisRef, {
    ownerId: TG_ID,
    ownerName: TG_NAME,
    route,
    seats,
    phone,
    time,
    createdAt: serverTimestamp()
  });

  alert("Eʼlon qo‘shildi");
};

// Mijoz ko‘radi va joy band qiladi
const list = document.getElementById("list");
onSnapshot(taxisRef, snap => {
  list.innerHTML = "";
  snap.forEach(d => {
    const t = d.data();
    list.innerHTML += `
      <div class="card">
        <b>${t.route}</b><br>
        🪑 Qolgan joy: ${t.seats}<br>
        <button onclick="book('${d.id}', ${t.seats})">📌 Joy band qilish</button>
      </div>
    `;
  });
});

window.book = async (id, seats) => {
  if (seats <= 0) {
    alert("Joy qolmagan");
    return;
  }
  await updateDoc(doc(db, "taxis", id), { seats: seats - 1 });
  if (TG) TG.showAlert("Joy band qilindi");
  else alert("Joy band qilindi");
};
