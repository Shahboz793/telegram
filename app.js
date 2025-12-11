// app.js — Savol-Javob (O‘qituvchi/O‘quvchi) — audio link, mikrofon, baholash, shaxsiy feedback

// ========== Telegram WebApp ==========
const tg = window.Telegram?.WebApp ?? null;
if (tg) {
  tg.ready?.();
  tg.expand?.();
  tg.disableVerticalSwipes?.();
  tg.setHeaderColor?.("#0b0c0f");
  tg.setBackgroundColor?.("#0b0c0f");
}

// ========== Firebase v11 ==========
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getFirestore, collection, addDoc, doc, getDoc, getDocs, setDoc,
  updateDoc, onSnapshot, query, where, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import {
  getStorage, ref as sRef, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-storage.js";
import {
  getAuth, signInAnonymously, onAuthStateChanged, updateProfile
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

// ========== Firebase config (SIZNING LOYIHANGIZ) ==========
const firebaseConfig = {
  apiKey: "AIzaSyDVidcgjpUxkg88bxXfIFzmsFydv0rMMao",
  authDomain: "shahboz-5d0a3.firebaseapp.com",
  projectId: "shahboz-5d0a3",
  storageBucket: "shahboz-5d0a3.appspot.com", // uploadda muammo bo'lsa, appspot.com to'g'ri variant
  messagingSenderId: "352024095535",
  appId: "1:352024095535:web:3f495ac74cdd40f5c54fda",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const st = getStorage(app);
const auth = getAuth(app);

// ========== DOM util ==========
const $  = (s, d=document)=> d.querySelector(s);
const $$ = (s, d=document)=> Array.from(d.querySelectorAll(s));
const whoamiEl = $("#whoami");

// ========== Global holat ==========
let me = { id:null, name:null, role:"teacher" };   // default: teacher tab ochiq
let currentSession = null;   // {id, title, code, online, teacherId, currentQuestionId}
let currentQuestion = null;  // {id, text, audioUrl}

let recStream = null, rec = null, recChunks = [], recBlob = null;

// Teacher taraf listeners
let unsubSessionT = null, unsubQuestionsT = null, unsubParticipantsListT = null;
let teacherAnswerUnsubs = [];    // answers listenerlari (har participant)

// Student taraf listeners
let unsubSessionS = null, unsubQuestionDocS = null;
let myParticipant = null;
let myParticipantUnsubS = null;
let myAnswerUnsubS = null;

// ========== Auth ==========
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    await signInAnonymously(auth);
    return;
  }
  const tgu = tg?.initDataUnsafe?.user;
  const displayName = tgu?.username || [tgu?.first_name, tgu?.last_name].filter(Boolean).join(" ") || user.displayName || "Guest";
  if (!user.displayName && displayName) {
    try { await updateProfile(user, { displayName }); } catch {}
  }
  me.id = user.uid;
  me.name = user.displayName || displayName || "Guest";
  whoamiEl.textContent = `ID: ${me.id.slice(0,6)}… — ${me.name}`;
});

// ========== Tabs ==========
const teacherPanel = $("#teacherPanel");
const studentPanel = $("#studentPanel");
$("#tabTeacher").addEventListener("click", () => {
  me.role = "teacher";
  teacherPanel.classList.remove("hidden");
  studentPanel.classList.add("hidden");
  $("#tabTeacher").classList.add("active");
  $("#tabStudent").classList.remove("active");
});
$("#tabStudent").addEventListener("click", () => {
  me.role = "student";
  teacherPanel.classList.add("hidden");
  studentPanel.classList.remove("hidden");
  $("#tabStudent").classList.add("active");
  $("#tabTeacher").classList.remove("active");
});

// ========== Helpers ==========
const shortCode = (docId)=> docId.slice(-6).toUpperCase();
function setInfo(el, text){ el.textContent = text; el.classList.remove("hidden"); }
function hide(el){ el.classList.add("hidden"); }
async function uploadBlobTo(path, blob, contentType="audio/webm"){
  const r = sRef(st, path);
  await uploadBytes(r, blob, { contentType });
  return await getDownloadURL(r);
}
async function startRecord(btnStart, btnStop){
  recChunks = []; recBlob = null;
  if (!recStream) recStream = await navigator.mediaDevices.getUserMedia({ audio:true });
  rec = new MediaRecorder(recStream, { mimeType: "audio/webm" });
  rec.ondataavailable = (e)=> e.data.size && recChunks.push(e.data);
  rec.onstop = ()=> { recBlob = new Blob(recChunks, { type: "audio/webm" }); };
  rec.start();
  btnStart.disabled = true; btnStop.disabled = false;
}
function stopRecord(btnStart, btnStop){
  if (rec && rec.state !== "inactive") rec.stop();
  btnStart.disabled = false; btnStop.disabled = true;
  return recBlob;
}

// ========== 1) TEACHER: Sessiya ==========
const sessionInfoEl = $("#sessionInfo");
const toggleOnlineEl = $("#toggleOnline");

$("#btnCreateSession").addEventListener("click", async () => {
  const title = $("#sessTitle").value.trim() || "Savol-Javob";
  const dref = await addDoc(collection(db, "sessions"), {
    title, teacherId: me.id, teacherName: me.name,
    online: false, createdAt: serverTimestamp(), currentQuestionId: null
  });
  const scode = shortCode(dref.id);
  await updateDoc(doc(db,"sessions",dref.id), { code: scode });
  currentSession = { id:dref.id, title, teacherId:me.id, code:scode, online:false, currentQuestionId:null };
  setInfo(sessionInfoEl, `Sessiya yaratildi. Kod: ${scode}`);
  toggleOnlineEl.checked = false;
  bindTeacherRealtime();
});

$("#btnFindSession").addEventListener("click", async () => {
  const code = $("#sessCodeFind").value.trim().toUpperCase();
  if (!code) return;
  const qs = query(collection(db,"sessions"), where("code","==",code));
  const snap = await getDocs(qs);
  if (snap.empty){ setInfo(sessionInfoEl, "Sessiya topilmadi."); return; }
  const d = snap.docs[0];
  currentSession = { id:d.id, ...d.data() };
  setInfo(sessionInfoEl, `Sessiya: ${currentSession.title} — Kod: ${currentSession.code}`);
  toggleOnlineEl.checked = !!currentSession.online;
  bindTeacherRealtime();
});

toggleOnlineEl.addEventListener("change", async (e)=>{
  if (!currentSession) return;
  await updateDoc(doc(db,"sessions",currentSession.id), { online: e.target.checked });
});

// Realtime (teacher)
function bindTeacherRealtime(){
  // Session
  unsubSessionT?.();
  unsubSessionT = onSnapshot(doc(db,"sessions",currentSession.id),(ds)=>{
    const data = ds.data(); if(!data) return;
    currentSession = { id: ds.id, ...data };
    setInfo(sessionInfoEl, `Sessiya: ${data.title} — Kod: ${data.code} — Online: ${data.online ? "ON" : "OFF"}`);
    // Faol savol o'zgarganda answers panelni yangilaymiz
    if (data.currentQuestionId && (!currentQuestion || currentQuestion.id !== data.currentQuestionId)) {
      currentQuestion = { id: data.currentQuestionId };
      mountTeacherAnswersRealtime(currentQuestion.id);
    }
  });

  // Questions ro‘yxati
  unsubQuestionsT?.();
  unsubQuestionsT = onSnapshot(
    query(collection(db,"sessions",currentSession.id,"questions"), orderBy("createdAt","asc")),
    (qsnap)=>{
      const list = qsnap.docs.map(qd=> ({ id:qd.id, ...qd.data() }));
      renderQuestions(list);
      if (currentSession?.currentQuestionId) {
        currentQuestion = list.find(x=>x.id===currentSession.currentQuestionId) || null;
        if (currentQuestion) mountTeacherAnswersRealtime(currentQuestion.id);
      }
    }
  );

  // Participants ro‘yxati (faqat ro‘yxat uchun alohida listener)
  unsubParticipantsListT?.();
  unsubParticipantsListT = onSnapshot(
    query(collection(db,"sessions",currentSession.id,"participants"), orderBy("joinedAt","asc")),
    (psnap)=> renderParticipants(psnap.docs.map(pd=> ({ id:pd.id, ...pd.data() })))
  );
}

// ========== 2) TEACHER: Savol yaratish ==========
const btnRecStart = $("#btnRecStart");
const btnRecStop  = $("#btnRecStop");
const qFile = $("#qFile");
const qAudioLink = $("#qAudioLink");
const qPreview = $("#qPreview");
const btnSaveQuestion = $("#btnSaveQuestion");

let qRecordBlob = null, qFileBlob = null, qUseLink = "";

btnRecStart.addEventListener("click", async ()=>{
  await startRecord(btnRecStart, btnRecStop);
});
btnRecStop.addEventListener("click", ()=>{
  stopRecord(btnRecStart, btnRecStop);
  qRecordBlob = recBlob;
  if (qRecordBlob) {
    const url = URL.createObjectURL(qRecordBlob);
    qPreview.src = url; qPreview.classList.remove("hidden");
    btnSaveQuestion.disabled = false;
  }
});
qFile.addEventListener("change", (e)=>{
  const f = e.target.files?.[0];
  if (f) {
    qFileBlob = f;
    qPreview.src = URL.createObjectURL(f);
    qPreview.classList.remove("hidden");
    btnSaveQuestion.disabled = false;
  }
});
qAudioLink.addEventListener("input", ()=>{
  qUseLink = qAudioLink.value.trim();
  if (qUseLink) {
    qPreview.src = qUseLink;
    qPreview.classList.remove("hidden");
    btnSaveQuestion.disabled = false;
  }
});

$("#btnSaveQuestion").addEventListener("click", async ()=>{
  if (!currentSession) return;
  let audioUrl = qUseLink || null;
  const text = $("#qText").value.trim() || null;

  if (!audioUrl) {
    const blob = qRecordBlob || qFileBlob;
    if (blob) {
      audioUrl = await uploadBlobTo(
        `sessions/${currentSession.id}/questions/${Date.now()}.webm`,
        blob,
        blob.type || "audio/webm"
      );
    }
  }

  await addDoc(collection(db,"sessions",currentSession.id,"questions"), {
    text, audioUrl: audioUrl || null, createdAt: serverTimestamp()
  });

  // UI tozalash
  $("#qText").value = "";
  qAudioLink.value = ""; qUseLink = "";
  qFile.value = ""; qFileBlob = null; qRecordBlob = null;
  qPreview.pause(); qPreview.src = ""; qPreview.classList.add("hidden");
  btnSaveQuestion.disabled = true;
});

// Savollar ro‘yxatini chizish + “Faol savol” o‘rnatish
function renderQuestions(list){
  const wrap = $("#qList");
  wrap.innerHTML = "";
  list.forEach(q=>{
    const isActive = currentSession?.currentQuestionId === q.id;
    const el = document.createElement("div");
    el.className = "qitem";
    el.innerHTML = `
      <div class="kv">
        <div class="tag">Matn</div>
        <div>${q.text || "-"}</div>
        <div class="tag">Audio</div>
        <div>${q.audioUrl ? `<audio controls src="${q.audioUrl}"></audio>` : "-"}</div>
      </div>
      <div class="row mt8">
        <button class="btn ${isActive?'ok':''}" data-act="${q.id}">
          ${isActive ? "Faol (o‘rnatilgan)" : "Faol savol qilib o‘rnatish"}
        </button>
      </div>
    `;
    wrap.appendChild(el);
    el.querySelector("[data-act]")?.addEventListener("click", async ()=>{
      await updateDoc(doc(db,"sessions",currentSession.id), { currentQuestionId: q.id });
    });
  });
}

// ========== 3) TEACHER: Participants boshqaruvi ==========
function renderParticipants(list){
  const wrap = $("#pList");
  wrap.innerHTML = "";
  list.forEach(p=>{
    const el = document.createElement("div");
    el.className = "pline";
    el.innerHTML = `
      <div>${p.name || "(no name)"} ${p.active? '<span class="pill">active</span>':''}</div>
      <div class="row">
        <input type="checkbox" class="chk" data-pid="${p.id}" ${p.active?'checked':''} />
      </div>
    `;
    wrap.appendChild(el);
  });
}
$("#btnActivateSelected").addEventListener("click", async ()=>{
  if (!currentSession) return;
  const checks = $$(".chk");
  for (const c of checks) {
    const pid = c.dataset.pid;
    if (c.checked) await updateDoc(doc(db,"sessions",currentSession.id,"participants",pid), { active:true });
  }
});
$("#btnDeactivateAll").addEventListener("click", async ()=>{
  if (!currentSession) return;
  const qs = await getDocs(collection(db,"sessions",currentSession.id,"participants"));
  for (const d of qs.docs) await updateDoc(d.ref, { active:false });
});

// ========== 4) TEACHER: Answers (faol savol bo‘yicha) ==========
function clearTeacherAnswersListeners(){
  teacherAnswerUnsubs.forEach(fn=> fn && fn());
  teacherAnswerUnsubs = [];
}
function mountTeacherAnswersRealtime(qid){
  clearTeacherAnswersListeners();
  $("#answersBoard").innerHTML = "";

  // Barcha participantlar bo'yicha answers/{qid}ni kuzatamiz
  const unsub = onSnapshot(
    query(collection(db,"sessions",currentSession.id,"participants"), orderBy("joinedAt","asc")),
    (psnap)=>{
      const participants = psnap.docs.map(pd=> ({ id:pd.id, ...pd.data() }));
      clearTeacherAnswersListeners(); // qaytadan quramiz
      participants.forEach(p=>{
        const u = onSnapshot(
          doc(db,"sessions",currentSession.id,"participants",p.id,"answers",qid),
          (ad)=> renderAnswerCard(p, ad.exists() ? { id:ad.id, ...ad.data() } : null)
        );
        teacherAnswerUnsubs.push(u);
      });
    }
  );
  teacherAnswerUnsubs.push(unsub);
}

function renderAnswerCard(participant, answer){
  const board = $("#answersBoard");
  let el = board.querySelector(`[data-ans="${participant.id}"]`);
  if (!el) {
    el = document.createElement("div");
    el.dataset.ans = participant.id;
    el.className = "qitem";
    board.appendChild(el);
  }
  const audioHtml = answer?.audioUrl ? `<audio controls src="${answer.audioUrl}"></audio>` : `<span class="muted">Javob kelmagan</span>`;
  const result = answer?.result || "pending";
  const fb = answer?.feedbackAudioUrl ? `<audio controls src="${answer.feedbackAudioUrl}"></audio>` : `<span class="muted">—</span>`;

  el.innerHTML = `
    <h4>${participant.name || participant.id}</h4>
    <div class="kv">
      <div class="tag">Javob</div>
      <div>${audioHtml}</div>
      <div class="tag">Natija</div>
      <div>${result === "pending" ? '<span class="pill">kutilmoqda</span>' :
                result === "correct" ? '<span class="pill" style="background:#12301c;border-color:#1e4d2b">to‘g‘ri</span>' :
                '<span class="pill" style="background:#2a1517;border-color:#3b181a">noto‘g‘ri</span>'}</div>
      <div class="tag">Feedback audio</div>
      <div>${fb}</div>
    </div>

    <div class="row mt8">
      <button class="btn ok" data-mark="correct" data-pid="${participant.id}">✔ To‘g‘ri</button>
      <button class="btn danger" data-mark="incorrect" data-pid="${participant.id}">✖ Noto‘g‘ri</button>
    </div>

    <div class="mt8">
      <div class="row">
        <button class="btn" data-fbrecstart="${participant.id}">🎤 Feedback yozish</button>
        <button class="btn danger" data-fbrecstop="${participant.id}" disabled>To‘xtatish</button>
        <input type="file" accept="audio/*" data-fbfile="${participant.id}" class="file" />
      </div>
      <input class="inp mt8" placeholder="Feedback audio link" data-fblink="${participant.id}" />
      <div class="row mt8">
        <button class="btn primary" data-fbsave="${participant.id}">Feedbackni saqlash</button>
      </div>
      <audio controls class="mt8 hidden" data-fbpreview="${participant.id}"></audio>
    </div>
  `;

  // Baholash tugmalari
  el.querySelectorAll("[data-mark]")?.forEach(btn=>{
    btn.onclick = async ()=>{
      const v = btn.dataset.mark;
      const qid = currentSession.currentQuestionId;
      await updateDoc(doc(db,"sessions",currentSession.id,"participants",participant.id,"answers",qid), {
        result: v, evaluatedBy: me.id, evaluatedAt: serverTimestamp()
      });
    };
  });

  // Feedback yozish / fayl / link
  const recStart = el.querySelector(`[data-fbrecstart="${participant.id}"]`);
  const recStop  = el.querySelector(`[data-fbrecstop="${participant.id}"]`);
  const fbFile   = el.querySelector(`[data-fbfile="${participant.id}"]`);
  const fbLink   = el.querySelector(`[data-fblink="${participant.id}"]`);
  const fbPreview= el.querySelector(`[data-fbpreview="${participant.id}"]`);
  let fbBlob = null, fbFileBlob = null, fbUseLink = "";

  recStart.onclick = async ()=>{ await startRecord(recStart, recStop); };
  recStop.onclick = ()=>{
    stopRecord(recStart, recStop);
    fbBlob = recBlob;
    if (fbBlob) { fbPreview.src = URL.createObjectURL(fbBlob); fbPreview.classList.remove("hidden"); }
  };
  fbFile.onchange = (e)=>{
    const f = e.target.files?.[0];
    if (f){ fbFileBlob = f; fbPreview.src = URL.createObjectURL(f); fbPreview.classList.remove("hidden"); }
  };
  fbLink.oninput = (e)=>{
    fbUseLink = e.target.value.trim();
    if (fbUseLink){ fbPreview.src = fbUseLink; fbPreview.classList.remove("hidden"); }
  };

  el.querySelector(`[data-fbsave="${participant.id}"]`).onclick = async ()=>{
    const qid = currentSession.currentQuestionId;
    let feedbackAudioUrl = fbUseLink || null;
    if (!feedbackAudioUrl){
      const blob = fbBlob || fbFileBlob;
      if (blob){
        feedbackAudioUrl = await uploadBlobTo(
          `sessions/${currentSession.id}/feedback/${participant.id}_${qid}_${Date.now()}.webm`,
          blob,
          blob.type || "audio/webm"
        );
      }
    }
    await updateDoc(doc(db,"sessions",currentSession.id,"participants",participant.id,"answers",qid), {
      feedbackAudioUrl: feedbackAudioUrl || null,
      feedbackBy: me.id, feedbackAt: serverTimestamp()
    });
  };
}

// ========== 5) STUDENT: Ulanish va javob ==========
const stInfo = $("#stSessionInfo");
const stStatus = $("#stStatus");
const stQuestionWrap = $("#stQuestion");
const stRecStart = $("#stRecStart");
const stRecStop  = $("#stRecStop");
const stPreview  = $("#stPreview");
const btnSendAnswer = $("#btnSendAnswer");
const stResult = $("#stResult");
const stFeedback = $("#stFeedback");

$("#btnJoin").addEventListener("click", async ()=>{
  const code = $("#stCode").value.trim().toUpperCase();
  const name = $("#stName").value.trim() || me.name || "Guest";
  if (!code) return;

  // Sessiyani topish
  const qs = query(collection(db,"sessions"), where("code","==",code));
  const snap = await getDocs(qs);
  if (snap.empty){ setInfo(stInfo, "Sessiya topilmadi."); return; }
  const d = snap.docs[0];
  currentSession = { id:d.id, ...d.data() };
  setInfo(stInfo, `Ulandingiz: ${currentSession.title}. Kod: ${currentSession.code}`);

  // Participant doc = me.id
  const pref = doc(db,"sessions",currentSession.id,"participants",me.id);
  const pdoc = await getDoc(pref);
  if (!pdoc.exists()){
    await setDoc(pref, { userId: me.id, name, active: false, joinedAt: serverTimestamp() });
  } else if (!pdoc.data().name && name){
    await updateDoc(pref, { name });
  }

  // Participant realtime
  myParticipantUnsubS?.();
  myParticipantUnsubS = onSnapshot(pref,(ps)=>{
    if (!ps.exists()) return;
    myParticipant = { id:ps.id, ...ps.data() };
    stStatus.textContent = myParticipant.active ? "Siz savol-javobda ishtirokchisiz." : "Ruxsatni kuting.";
    stRecStart.disabled = !myParticipant.active;
  });

  // Session realtime (faol savol)
  unsubSessionS?.();
  unsubSessionS = onSnapshot(doc(db,"sessions",currentSession.id),(ds)=>{
    const data = ds.data(); if (!data) return;
    currentSession = { id: ds.id, ...data };
    if (!data.currentQuestionId){
      stQuestionWrap.innerHTML = `<div class="muted">Faol savol yo‘q.</div>`;
      return;
    }
    // Savolni kuzatamiz
    unsubQuestionDocS?.();
    const qref = doc(db,"sessions",currentSession.id,"questions",data.currentQuestionId);
    unsubQuestionDocS = onSnapshot(qref,(qd)=>{
      const q = qd.data();
      if (!q){ stQuestionWrap.innerHTML = `<div class="muted">Savol topilmadi</div>`; return; }
      stQuestionWrap.innerHTML = `
        <div class="qitem">
          <div class="kv">
            <div class="tag">Savol</div>
            <div>${q.text || "-"}</div>
            <div class="tag">Audio</div>
            <div>${q.audioUrl ? `<audio controls src="${q.audioUrl}"></audio>` : "-"}</div>
          </div>
        </div>
      `;

      // O'zimning answer hujjatimni kuzatish
      myAnswerUnsubS?.();
      myAnswerUnsubS = onSnapshot(
        doc(db,"sessions",currentSession.id,"participants",me.id,"answers", qd.id),
        (ad)=>{
          if (!ad.exists()){
            stResult.classList.add("hidden");
            stFeedback.classList.add("hidden");
            btnSendAnswer.disabled = !myParticipant?.active;
            return;
          }
          const a = ad.data();
          stResult.classList.remove("hidden");
          stResult.innerHTML = `<div class="info">Natija: ${a.result === "pending" ? "Kutilmoqda" : a.result === "correct" ? "To‘g‘ri" : "Noto‘g‘ri"}</div>`;
          if (a.feedbackAudioUrl){
            stFeedback.classList.remove("hidden");
            stFeedback.innerHTML = `<div class="qitem"><div class="tag">O‘qituvchi izohi</div><audio controls src="${a.feedbackAudioUrl}"></audio></div>`;
          } else {
            stFeedback.classList.add("hidden");
          }
          btnSendAnswer.disabled = true; // yuborgandan so'ng blok (soddalashtirilgan siyosat)
        }
      );
    });
  });
});

// Student — yozish
stRecStart.addEventListener("click", async ()=>{
  await startRecord(stRecStart, stRecStop);
});
stRecStop.addEventListener("click", ()=>{
  stopRecord(stRecStart, stRecStop);
  if (recBlob) { stPreview.src = URL.createObjectURL(recBlob); stPreview.classList.remove("hidden"); btnSendAnswer.disabled = false; }
});

// Student — yuborish
btnSendAnswer.addEventListener("click", async ()=>{
  if (!currentSession?.currentQuestionId || !myParticipant?.active || !recBlob) return;
  const qid = currentSession.currentQuestionId;
  const url = await uploadBlobTo(
    `sessions/${currentSession.id}/answers/${me.id}_${qid}_${Date.now()}.webm`,
    recBlob,
    "audio/webm"
  );
  await setDoc(doc(db,"sessions",currentSession.id,"participants",me.id,"answers",qid), {
    participantId: me.id,
    questionId: qid,
    audioUrl: url,
    createdAt: serverTimestamp(),
    result: "pending"
  });
  btnSendAnswer.disabled = true;
});
