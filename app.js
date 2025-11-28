/* ============================================
   FIREBASE CONFIG
   ============================================ */
const firebaseConfig = {
  apiKey: "AIzaSyDVidcgjpUxkg88bxXfIFzmsFydv0rMMao",
  authDomain: "shahboz-5d0a3.firebaseapp.com",
  projectId: "shahboz-5d0a3",
  storageBucket: "shahboz-5d0a3.appspot.com",
  messagingSenderId: "352024095535",
  appId: "1:352024095535:web:6ca630de2c199a33c54fda",
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

/* ============================================
   DOM ELEMENTS
   ============================================ */
const homePage = document.getElementById("home-page");
const adminPage = document.getElementById("admin-page");
const courseDetailPage = document.getElementById("course-detail-page");
const lessonPage = document.getElementById("lesson-page");

const navAdmin = document.getElementById("nav-admin");
const logoutBtn = document.getElementById("logout-btn");
const openAuthBtn = document.getElementById("open-auth");

const authModal = document.getElementById("auth-modal");
const closeAuth = document.getElementById("close-auth");

const loginUser = document.getElementById("login-user");
const loginPass = document.getElementById("login-pass");
const loginBtn = document.getElementById("login-btn");
const loginError = document.getElementById("login-error");

const regUser = document.getElementById("reg-user");
const regPass = document.getElementById("reg-pass");
const regPass2 = document.getElementById("reg-pass2");
const registerBtn = document.getElementById("register-btn");
const registerError = document.getElementById("register-error");

const splash = document.getElementById("splash-screen");

const courseList = document.getElementById("course-list");
const homeEmpty = document.getElementById("home-empty");

const adminCourseList = document.getElementById("admin-course-list");
const courseTitleInput = document.getElementById("course-title");
const courseDescInput = document.getElementById("course-desc");
const coursePriceInput = document.getElementById("course-price");
const addCourseBtn = document.getElementById("add-course-btn");
const courseError = document.getElementById("course-error");

const detailTitle = document.getElementById("course-detail-title");
const detailDesc = document.getElementById("course-detail-desc");
const lessonList = document.getElementById("lesson-list");

const backHome = document.getElementById("back-home");


/* ============================================
   LOCAL STATE
   ============================================ */
let currentUser = null;
let courses = [];
let currentCourse = null;
let currentLesson = null;

let player = null;
let videoDuration = 0;
let watchPercent = 0;


/* ============================================
   HELPERS
   ============================================ */
function showPage(page) {
  homePage.classList.add("hidden");
  adminPage.classList.add("hidden");
  courseDetailPage.classList.add("hidden");
  lessonPage.classList.add("hidden");
  page.classList.remove("hidden");
}

function openModal() { authModal.classList.remove("hidden"); }
function closeModal() { authModal.classList.add("hidden"); }

function formatPrice(n) {
  return n == 0 ? "Bepul" : Number(n).toLocaleString("uz-UZ") + " so‘m";
}

function saveUserToLocal(user) {
  localStorage.setItem("otlms_user", JSON.stringify(user));
}

function loadUserFromLocal() {
  try { return JSON.parse(localStorage.getItem("otlms_user")); }
  catch { return null; }
}

function logout() {
  currentUser = null;
  localStorage.removeItem("otlms_user");
  logoutBtn.classList.add("hidden");
  openAuthBtn.classList.remove("hidden");
  navAdmin.classList.add("hidden");
  showPage(homePage);
}


/* ============================================
   AUTH TABS
   ============================================ */
document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");

    document.querySelectorAll(".tab-pane").forEach(p => p.classList.add("hidden"));
    document.getElementById(tab.dataset.tab).classList.remove("hidden");
  });
});


/* ============================================
   LOGIN
   ============================================ */
loginBtn.addEventListener("click", async () => {
  const u = loginUser.value.trim();
  const p = loginPass.value;

  loginError.textContent = "";

  if (!u || !p) {
    loginError.textContent = "Login va parolni kiriting!";
    return;
  }

  const doc = await db.collection("users").doc(u).get();
  if (!doc.exists) return loginError.textContent = "Bunday foydalanuvchi topilmadi!";

  const user = doc.data();
  if (user.password !== p) return loginError.textContent = "Parol noto‘g‘ri!";

  currentUser = user;
  saveUserToLocal(user);

  closeModal();
  showSplash();
});


/* ============================================
   REGISTER
   ============================================ */
registerBtn.addEventListener("click", async () => {
  const u = regUser.value.trim();
  const p = regPass.value;
  const p2 = regPass2.value;

  registerError.textContent = "";

  if (!u || !p || !p2) {
    registerError.textContent = "Hamma maydonlarni to‘ldiring!";
    return;
  }

  if (p !== p2) return registerError.textContent = "Parollar mos emas!";

  const doc = await db.collection("users").doc(u).get();
  if (doc.exists) return registerError.textContent = "Bu login band!";

  await db.collection("users").doc(u).set({
    username: u,
    password: p,
    role: "user",
    progress: {}
  });

  currentUser = { username: u, role: "user", progress: {} };
  saveUserToLocal(currentUser);

  closeModal();
  showSplash();
});


/* ============================================
   SPLASH SCREEN
   ============================================ */
function showSplash() {
  splash.classList.remove("hidden");
  setTimeout(() => {
    splash.classList.add("hidden");
    afterLogin();
  }, 5000);
}


/* ============================================
   AFTER LOGIN
   ============================================ */
function afterLogin() {
  openAuthBtn.classList.add("hidden");
  logoutBtn.classList.remove("hidden");

  if (currentUser.role === "admin") navAdmin.classList.remove("hidden");
  else navAdmin.classList.add("hidden");

  showPage(homePage);
}


/* ============================================
   MODAL + LOGOUT EVENTS
   ============================================ */
openAuthBtn.onclick = openModal;
closeAuth.onclick = closeModal;
logoutBtn.onclick = logout;


/* ============================================
   LOAD COURSES
   ============================================ */
async function loadCourses() {
  const snap = await db.collection("courses").get();
  courses = snap.docs.map(d => d.data());
  renderCourses();
  renderAdminCourses();
}


/* ============================================
   RENDER HOME COURSES
   ============================================ */
function renderCourses() {
  courseList.innerHTML = "";

  if (courses.length === 0) return homeEmpty.classList.remove("hidden");

  homeEmpty.classList.add("hidden");

  courses.forEach(course => {
    const card = document.createElement("div");
    card.className = "course-card";

    card.innerHTML = `
      <h3>${course.title}</h3>
      <p>${course.description}</p>
      <p><b>${formatPrice(course.price)}</b></p>
    `;

    card.addEventListener("click", () => {
      if (!currentUser) return openModal();
      openCourse(course.id);
    });

    courseList.appendChild(card);
  });
}


/* ============================================
   RENDER ADMIN COURSES
   ============================================ */
function renderAdminCourses() {
  adminCourseList.innerHTML = "";

  courses.forEach(course => {
    const div = document.createElement("div");
    div.className = "card";

    div.innerHTML = `
      <h3>${course.title}</h3>
      <p>${course.description}</p>
      <p><b>${formatPrice(course.price)}</b></p>
      <button class="btn-primary-small" onclick="openCourse('${course.id}')">Darslar</button>
      <button class="btn-secondary-small" onclick="deleteCourse('${course.id}')">O‘chirish</button>
    `;

    adminCourseList.appendChild(div);
  });
}


/* ============================================
   ADD COURSE
   ============================================ */
addCourseBtn.addEventListener("click", async () => {
  const title = courseTitleInput.value.trim();
  const desc = courseDescInput.value.trim();
  const price = Number(coursePriceInput.value || 0);

  courseError.textContent = "";

  if (!title || !desc) {
    courseError.textContent = "Hamma maydonlarni to‘ldiring!";
    return;
  }

  const id = Date.now().toString();

  await db.collection("courses").doc(id).set({
    id, title, description: desc, price,
    lessons: []
  });

  courseTitleInput.value = "";
  courseDescInput.value = "";
  coursePriceInput.value = "";

  loadCourses();
});


/* ============================================
   DELETE COURSE
   ============================================ */
async function deleteCourse(id) {
  if (!confirm("Kursni o‘chirasizmi?")) return;
  await db.collection("courses").doc(id).delete();
  loadCourses();
}


/* ============================================
   OPEN COURSE DETAIL
   ============================================ */
async function openCourse(id) {
  const course = courses.find(c => c.id === id);
  if (!course) return;

  currentCourse = course;

  detailTitle.textContent = course.title;
  detailDesc.textContent = course.description;

  renderLessons(course);

  showPage(courseDetailPage);
}


/* ============================================
   RENDER LESSONS
   ============================================ */
function renderLessons(course) {
  lessonList.innerHTML = "";

  if (!course.lessons || course.lessons.length === 0) {
    document.getElementById("lesson-empty").classList.remove("hidden");
    return;
  }

  document.getElementById("lesson-empty").classList.add("hidden");

  const userProgress = currentUser.progress?.[course.id] || {};

  course.lessons.forEach((lesson, index) => {
    const item = document.createElement("div");
    item.className = "lesson-item";

    const isLocked = index > 0 && !(userProgress[index - 1]?.passed);
    if (isLocked) item.classList.add("locked");

    item.innerHTML = `
      <b>${index + 1}-dars.</b> ${lesson.title}
      <br><small>${lesson.description}</small>
    `;

    item.addEventListener("click", () => {
      if (isLocked) return alert("Oldingi darsni to‘liq bajarishingiz kerak!");
      openLesson(lesson, index);
    });

    lessonList.appendChild(item);
  });
}


/* ============================================
   OPEN LESSON PAGE
   ============================================ */
function openLesson(lesson, index) {
  currentLesson = { ...lesson, index };

  document.getElementById("lesson-title").textContent =
    `${index + 1}-dars. ${lesson.title}`;

  showPage(lessonPage);
  loadVideo(lesson.videoId);
}


/* ============================================
   LOAD YOUTUBE VIDEO
   ============================================ */
function loadVideo(videoId) {
  if (player) player.destroy();

  player = new YT.Player("yt-player", {
    height: "360",
    width: "640",
    videoId: videoId,
    playerVars: {
      rel: 0,
      modestbranding: 1,
      playsinline: 1,
    },
    events: {
      onReady: onVideoReady,
      onStateChange: onVideoState,
    }
  });
}


/* ============================================
   VIDEO READY
   ============================================ */
function onVideoReady() {
  videoDuration = player.getDuration();
  watchPercent = 0;
  updateProgress(0);
}


/* ============================================
   VIDEO STATE
   ============================================ */
function onVideoState(event) {
  if (event.data === YT.PlayerState.PLAYING) {
    trackWatching();
  }
}


/* ============================================
   TRACK VIDEO WATCHING
   ============================================ */
function trackWatching() {
  const check = setInterval(() => {

    if (!player || player.getPlayerState() !== 1) {
      clearInterval(check);
      return;
    }

    const current = player.getCurrentTime();
    const percent = Math.floor((current / videoDuration) * 100);

    watchPercent = Math.min(percent, 99);

    updateProgress(watchPercent);

    if (videoDuration - current <= 7) {
      document.getElementById("open-quiz-btn").classList.remove("hidden");
    }

  }, 1000);
}


/* ============================================
   PROGRESS BAR
   ============================================ */
function updateProgress(p) {
  document.getElementById("video-progress-text").textContent = p + "%";
  document.getElementById("video-progress").style.width = p + "%";
}


/* ============================================
   SAVE LESSON PROGRESS
   ============================================ */
async function saveLessonPassed() {
  const cId = currentCourse.id;
  const index = currentLesson.index;

  if (!currentUser.progress) currentUser.progress = {};
  if (!currentUser.progress[cId]) currentUser.progress[cId] = {};

  currentUser.progress[cId][index] = {
    watched: watchPercent,
    passed: true,
  };

  await db.collection("users")
    .doc(currentUser.username)
    .update({ progress: currentUser.progress });

  saveUserToLocal(currentUser);
}


/* ============================================
   BACK BUTTONS
   ============================================ */
backHome.onclick = () => showPage(homePage);

document.getElementById("back-course").onclick = () => {
  renderLessons(currentCourse);
  showPage(courseDetailPage);
};


/* ============================================
   QUIZ SYSTEM
   ============================================ */
const quizOverlay = document.getElementById("quiz-overlay");
const quizBox = document.getElementById("quiz-box");
const openQuizBtn = document.getElementById("open-quiz-btn");

let quizIndex = 0;
let correctAnswers = 0;

openQuizBtn.addEventListener("click", startQuiz);


/* QUIZ START */
function startQuiz() {
  openQuizBtn.classList.add("hidden");
  quizOverlay.classList.remove("hidden");

  quizIndex = 0;
  correctAnswers = 0;

  loadQuizQuestion();
}


/* QUIZ SAVOLLARI */
function getQuizForLesson() {
  return currentLesson.quiz || [
    {
      question: "Ushbu darsning asosiy g‘oyasi nima?",
      options: ["A", "B", "C", "D"],
      answer: 0
    }
  ];
}


/* SAVOLNI CHIQARISH */
function loadQuizQuestion() {
  let quiz = getQuizForLesson();

  if (quizIndex >= quiz.length) {
    finishQuiz();
    return;
  }

  let q = quiz[quizIndex];

  quizBox.innerHTML = `
    <h2>Quiz</h2>
    <div class="quiz-question">
      <b>${quizIndex + 1}. ${q.question}</b>
      <div id="quiz-options"></div>
    </div>
  `;

  const optBox = document.getElementById("quiz-options");

  q.options.forEach((opt, i) => {
    let btn = document.createElement("button");
    btn.className = "btn-primary";
    btn.style.display = "block";
    btn.style.marginTop = "10px";
    btn.textContent = opt;

    btn.addEventListener("click", () => {
      if (i === q.answer) correctAnswers++;
      quizIndex++;
      loadQuizQuestion();
    });

    optBox.appendChild(btn);
  });
}


/* QUIZ TUGASHI */
function finishQuiz() {
  let quiz = getQuizForLesson();
  let percent = Math.floor((correctAnswers / quiz.length) * 100);

  if (percent === 100) percent = 99;

  let passed = percent >= 30;

  quizBox.innerHTML = `
    <h2>Natija</h2>
    <p><b>To‘g‘ri javoblar:</b> ${correctAnswers} / ${quiz.length}</p>
    <p><b>Foiz:</b> ${percent}%</p>
    <p style="margin-top:10px; color:${passed ? "green" : "red"};">
      ${passed ? "Tabriklaymiz! Dars o'tildi." : "Afsus! Qayta urinib ko‘ring."}
    </p>
  `;

  if (passed) {
    saveLessonPassed();

    quizBox.innerHTML += `
      <button id="goto-next" class="btn-primary" style="margin-top:15px;">
        Keyingi darsga o'tish
      </button>
      <p style="opacity:.7; margin-top:10px;">5 soniyada avtomatik o'tkaziladi...</p>
    `;

    document.getElementById("goto-next").addEventListener("click", goNextLesson);

    setTimeout(goNextLesson, 5000);

  } else {
    quizBox.innerHTML += `
      <button id="retry" class="btn-primary" style="margin-top:15px;">
        Qayta ishlash
      </button>
    `;

    document.getElementById("retry").addEventListener("click", () => {
      quizIndex = 0;
      correctAnswers = 0;
      loadQuizQuestion();
    });
  }
}


/* KEYINGI DARSGA O‘TISH */
function goNextLesson() {
  quizOverlay.classList.add("hidden");

  let nextIndex = currentLesson.index + 1;

  if (nextIndex >= currentCourse.lessons.length) {
    alert("Bu kursning oxirgi darsi edi!");
    showPage(courseDetailPage);
    return;
  }

  const nextLesson = currentCourse.lessons[nextIndex];
  openLesson(nextLesson, nextIndex);
}


/* ============================================
   INIT APP
   ============================================ */
async function init() {
  currentUser = loadUserFromLocal();
  if (currentUser) afterLogin();

  await loadCourses();
}

init();
