import { db } from './firebase.js';
import {
 collection, addDoc, onSnapshot, query, where,
 doc, deleteDoc, runTransaction, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

// Telegram fallback
const TG = window.Telegram && Telegram.WebApp ? Telegram.WebApp : null;
if (TG) TG.ready();

const tgUser = TG?.initDataUnsafe?.user || { id: "local", first_name: "Local" };
const TG_ID = String(tgUser.id);
const TG_NAME = tgUser.first_name;

// CONFIG
const DRIVER_CODE = "1212";
const ADMIN_CODE = "2768";

let isDriver = false;
let isAdmin = false;

const taxisRef = collection(db, "taxis");

// Unlock driver
window.unlockDriver = () => {
  const code = driverCode.value;
  if (code === DRIVER_CODE) {
    isDriver = true;
    driverPanel.style.display = "block";
    alert("Haydovchi rejimi yoqildi");
  }
  if (code === ADMIN_CODE) {
    isAdmin = true;
    alert("Admin rejimi");
  }
};

// Add taxi (1 elon per Telegram ID)
window.addTaxi = async () => {
  if (!isDriver) return alert("Ruxsat yo‘q");

  const q = query(taxisRef, where("ownerId", "==", TG_ID));
  const snap = await new Promise(res => onSnapshot(q, s => res(s)));

  if (!snap.empty) {
    if (!confirm("Sizda eʼlon bor. O‘chirib yangisini kiritasizmi?")) return;
    snap.forEach(d => deleteDoc(doc(db, "taxis", d.id)));
  }

  const route = route.value.trim();
  const date = date.value;
  const time = time.value;
  const seats = parseInt(seats.value);
  const phone = phone.value.trim();

  if (!route || !date || !time || !seats || !phone) {
    alert("Maʼlumot to‘liq emas");
    return;
  }

  await addDoc(taxisRef, {
    ownerId: TG_ID,
    ownerName: TG_NAME,
    route, date, time, seats, phone,
    createdAt: serverTimestamp()
  });

  alert("Eʼlon qo‘shildi");
};

// Client realtime list
onSnapshot(taxisRef, snap => {
  list.innerHTML = "";
  snap.forEach(d => {
    const t = d.data();
    list.innerHTML += `
      <div class="card">
        <b>${t.route}</b><br>
        📅 ${t.date} ⏰ ${t.time}<br>
        🪑 ${t.seats}<br>
        📞 ${t.phone}
        ${isAdmin ? `<button onclick="del('${d.id}')">❌</button>` : ""}
      </div>
    `;
  });
});

// Admin delete
window.del = async (id) => {
  if (!isAdmin) return;
  await deleteDoc(doc(db, "taxis", id));
};
