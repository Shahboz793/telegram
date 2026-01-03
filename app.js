import { db } from './firebase.js';
import {
  collection, addDoc, onSnapshot, query, where,
  doc, deleteDoc, runTransaction, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

// Telegram fallback
const TG = window.Telegram && Telegram.WebApp ? Telegram.WebApp : null;
if (TG) TG.ready();

const tgUser = TG?.initDataUnsafe?.user || { id: 'local', first_name: 'Local' };
const TG_ID = String(tgUser.id);
const TG_NAME = tgUser.first_name || 'Haydovchi';

// Codes
const DRIVER_CODE = '1212';
const ADMIN_CODE = '2768';

let isDriver=false, isAdmin=false;

const taxisRef = collection(db,'taxis');

// Unlock
window.unlockDriver = ()=>{
  const code = driverCode.value;
  if(code===DRIVER_CODE){
    isDriver=true;
    driverPanel.classList.remove('hidden');
    alert('Haydovchi rejimi yoqildi');
  }
  if(code===ADMIN_CODE){
    isAdmin=true;
    alert('Admin rejimi yoqildi');
  }
};

// Add taxi (one per Telegram ID)
window.addTaxi = async ()=>{
  if(!isDriver) return alert('Ruxsat yo‘q');
  const q = query(taxisRef, where('ownerId','==',TG_ID));
  let existing=[];
  await new Promise(res=>onSnapshot(q,s=>{existing=s.docs;res();}));
  if(existing.length){
    if(!confirm('Eski eʼlon o‘chirilib yangisi qo‘shilsinmi?')) return;
    for(const d of existing) await deleteDoc(doc(db,'taxis',d.id));
  }

  if(!route.value||!date.value||!time.value||!seats.value||!phone.value)
    return alert('Maʼlumot to‘liq emas');

  await addDoc(taxisRef,{
    ownerId:TG_ID, ownerName:TG_NAME,
    route:route.value, date:date.value, time:time.value,
    seats:parseInt(seats.value), phone:phone.value,
    createdAt:serverTimestamp()
  });
  alert('Eʼlon qo‘shildi');
};

// Realtime list + TRANSACTION booking
onSnapshot(taxisRef,(snap)=>{
  list.innerHTML='';
  snap.forEach(d=>{
    const t=d.data();
    const div=document.createElement('div');
    div.className='item';
    div.innerHTML=`
      <div class="title">${t.route}</div>
      <div class="meta">📅 ${t.date} ⏰ ${t.time}</div>
      <div class="meta">🪑 Qolgan: <b>${t.seats}</b></div>
      <div class="meta">📞 ${t.phone}</div>
      <button onclick="bookSeat('${d.id}')">📌 Joy band qilish</button>
      ${isAdmin?`<button class="admin-del" onclick="del('${d.id}')">❌ O‘chirish</button>`:''}
    `;
    list.appendChild(div);
  });
});

// Transaction booking
window.bookSeat = async(id)=>{
  const ref=doc(db,'taxis',id);
  try{
    await runTransaction(db,async(tr)=>{
      const s=await tr.get(ref);
      if(!s.exists()) throw 'Yo‘q';
      if(s.data().seats<=0) throw 'Joy qolmagan';
      tr.update(ref,{seats:s.data().seats-1});
    });
    TG?TG.showAlert('✅ Joy band qilindi'):alert('Joy band qilindi');
  }catch(e){
    TG?TG.showAlert('❌ Joy qolmagan'):alert('Joy qolmagan');
  }
};

// Admin delete
window.del = async(id)=>{
  if(!isAdmin) return;
  await deleteDoc(doc(db,'taxis',id));
};
