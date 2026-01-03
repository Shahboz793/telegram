import { db } from './firebase.js';
import {
 collection, addDoc, onSnapshot,
 doc, runTransaction, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const TG = window.Telegram && Telegram.WebApp ? Telegram.WebApp : null;
if (TG) TG.ready();

const user = TG?.initDataUnsafe?.user || {id:"local",first_name:"Local"};
const TG_ID = String(user.id);
const TG_NAME = user.first_name;

const taxisRef = collection(db,"taxis");

window.addTaxi = async ()=>{
 const route=route.value.trim();
 const seats=parseInt(seats.value);
 const phone=phone.value.trim();
 const time=time.value;
 if(!route||!seats||!phone||!time){alert("To‘liq emas");return;}
 await addDoc(taxisRef,{
  ownerId:TG_ID,
  ownerName:TG_NAME,
  route,seats,phone,time,
  createdAt:serverTimestamp()
 });
 alert("Qo‘shildi");
};

onSnapshot(taxisRef,snap=>{
 list.innerHTML="";
 snap.forEach(d=>{
  const t=d.data();
  list.innerHTML+=`
  <div class="card">
   <b>${t.route}</b><br>
   🪑 ${t.seats}<br>
   <button onclick="book('${d.id}')">📌 Band qilish</button>
  </div>`;
 });
});

window.book = async(id)=>{
 const ref=doc(db,"taxis",id);
 try{
  await runTransaction(db,async(tr)=>{
   const s=await tr.get(ref);
   if(!s.exists()) throw 1;
   if(s.data().seats<=0) throw 2;
   tr.update(ref,{seats:s.data().seats-1});
  });
  alert("Joy band qilindi");
 }catch(e){
  alert("Joy qolmagan");
 }
};
