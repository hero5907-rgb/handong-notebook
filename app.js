
// ===============================
// 🔒 모바일 줌 완전 차단 (전역)
// ===============================
(function blockZoom(){

  // iOS / Android 공통
  document.addEventListener("gesturestart", e => e.preventDefault(), { passive:false });
  document.addEventListener("gesturechange", e => e.preventDefault(), { passive:false });
  document.addEventListener("gestureend", e => e.preventDefault(), { passive:false });

  // 두 손가락 확대 차단
  document.addEventListener("touchmove", e => {
    if (e.touches && e.touches.length > 1) {
      e.preventDefault();
    }
  }, { passive:false });

  // 더블탭 확대 차단
//  let lastTouchEnd = 0;
//  document.addEventListener("touchend", e => {
//    const now = Date.now();
//    if (now - lastTouchEnd <= 300) {
//      e.preventDefault();
//    }
//    lastTouchEnd = now;
//  }, false);

})();

function resetAppSameAsLongTouch() {
  if (!confirm("앱 캐시를 초기화하시겠습니까?")) return;

  localStorage.clear();

  if (window.caches) {
    caches.keys().then(keys => {
      keys.forEach(k => caches.delete(k));
    });
  }

  alert("초기화되었습니다. 다시 로그인하세요.");
  location.reload();
}




function hardResetApp() {
  if (!confirm("앱을 초기화하고 로그인 화면으로 이동합니다.\n계속할까요?")) return;

  // 🔹 로그인 정보 제거
  localStorage.removeItem(LS_KEY);

  // 🔹 상태 초기화
  state = {
    me: null,
    settings: null,
    members: [],
    announcements: [],
    navStack: ["login"],
  };

  // 🔹 관리자 버튼 제거
  setAdminButton(false);
  const tileAdmin = el("tileAdmin");
  if (tileAdmin) {
    tileAdmin.hidden = true;
    tileAdmin.onclick = null;
  }

  // 🔹 로그인 사용자 이름 숨김
  const nameBox = el("loginUserName");
  if (nameBox) {
    nameBox.hidden = true;
    nameBox.textContent = "";
  }

  document.body.classList.remove("logged-in");

  // 🔹 화면 전환
  showScreen("login");

  toast("앱이 초기화되었습니다", { force: true });
}



// 🎧 의전 오디오 컨트롤 (전역 1개만 사용)
let ceremonyAudio = null;
let ceremonyBtn = null;

function playCeremony(src, btn){

  // 카드 안 아이콘만 찾기
  const icon = btn.querySelector(".ceremony-icon");
  if (!icon) return;

  // 다른거 재생중이면 정지
  if (ceremonyAudio){
    ceremonyAudio.pause();
    ceremonyAudio.currentTime = 0;
    if (ceremonyBtn){
      const oldIcon = ceremonyBtn.querySelector(".ceremony-icon");
      if (oldIcon) oldIcon.textContent = ceremonyBtn.dataset.icon || "▶";
    }
  }

  // 같은 버튼 다시 누르면 정지
  if (ceremonyBtn === btn){
    ceremonyAudio = null;
    ceremonyBtn = null;
    return;
  }

  // ⭐ 원래 아이콘 저장
  btn.dataset.icon = icon.textContent;

  ceremonyAudio = new Audio(src);
  ceremonyBtn = btn;

  icon.textContent = "⏹";

  ceremonyAudio.play();

  ceremonyAudio.onended = ()=>{
    icon.textContent = btn.dataset.icon || "▶";
    ceremonyAudio = null;
    ceremonyBtn = null;
  };
}

function stopCeremony(){
  if (ceremonyAudio){
    ceremonyAudio.pause();
    ceremonyAudio.currentTime = 0;
  }

  if (ceremonyBtn){
    // ⭐ 버튼 전체 글자 바꾸지 말고 아이콘만 복구
    const oldIcon = ceremonyBtn.querySelector(".ceremony-icon");
    if (oldIcon) oldIcon.textContent = ceremonyBtn.dataset.icon || "▶";
  }

  ceremonyAudio = null;
  ceremonyBtn = null;
}

let modalCtx = { list: [], index: -1 };


let featuredAds = [];
let featuredAdIndex = 0;
let featuredAdTimer = null;
let featuredAdRemain = 10;
let currentAdIndex = -1;



let gisuSortDesc = true; // true = 최신기수 위, false = 오래된기수 위

let swipeCount = Number(localStorage.getItem("memberSwipeCount") || 0);

// 🍎 iOS 감지 (아이폰/아이패드)
const IS_IOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);


let homeBackTimer = null;

let currentClassFilter = null;   // 🔵 현재 선택된 기수 (null = 전체)

let execMode = false;   // 🔵 총동문 집행부 모드


function getAuthSafe(){
  // 1) state에 있으면 그걸 우선
  let phone = normalizePhone(state?._authPhone || state?.me?.phone || "");
  let code  = String(state?._authCode || "").trim();

  // 2) 없으면 localStorage(로그인유지)에서 꺼내기
  if ((!phone || !code)) {
    try {
      const savedStr = localStorage.getItem(LS_KEY);
      if (savedStr) {
        const saved = JSON.parse(savedStr);
        phone = phone || normalizePhone(saved?.phone || "");
        code  = code  || String(saved?.code || "").trim();
      }
    } catch {}
  }

  return { phone, code };
}

function api(action, params = {}, cb){
  const { phone, code } = getAuthSafe();

  apiJsonp({ action, phone, code, ...params })
    .then(cb)
    .catch(e=>{
      console.error(e);
      toast("서버 통신 오류");
    });
}

function setAdminButton(isAdmin) {
  const btnAdmin = document.getElementById("btnAdmin");
  if (!btnAdmin) return;

  if (isAdmin === true) {
    btnAdmin.style.display = "flex";   // 보이기
    btnAdmin.onclick = openAdminPage;  // 클릭 연결
  } else {
    btnAdmin.style.display = "none";   // 숨기기
    btnAdmin.onclick = null;           // 클릭 제거
  }
}




function isAnyModalOpen(){
  return (
    el("profileModal")?.hidden === false ||
    el("annModal")?.hidden === false ||
    el("imgModal")?.hidden === false
  );
}


function closeAnyModal(){
  if (el("profileModal")?.hidden === false) closeProfile();
  if (el("annModal")?.hidden === false) closeAnnModal();
  if (el("imgModal")?.hidden === false) closeImgModal();

}





const CFG = window.APP_CONFIG || {};
const API_URL = String(CFG.apiUrl || "").trim();




const LS_KEY = "bplions_auth_v1";

const el = (id) => document.getElementById(id);

const screens = {
  boot: el("screenBoot"),
  login: el("screenLogin"),
  home: el("screenHome"),
  members: el("screenMembers"),
  announcements: el("screenAnnouncements"),
  text: el("screenText"),
  events: el("screenEvents"),   // ✅ 추가
  calendar: el("screenCalendar"), // 🔥 이 줄 추가
lionism: el("screenLionism"),
  ceremony: el("screenCeremony"),
mypage: el("screenMyPage"),
ads: el("screenAds"),
adlist: el("screenAdList"),
addetail: el("screenAdDetail"),

};


const btnBack = el("btnBack");
const btnLogout = el("btnLogout");

let state = {
  me: null,
  settings: null,
  members: [],
  announcements: [],
  navStack: ["login"],
};






function normalizePhone(p) {
  return String(p || "").replace(/[^0-9]/g, "");
}

// 🔵 로그인한 기수 텍스트 반환
function getMyGisuText() {
  if (!state.me?.gisu) return "";
  return `${state.me.gisu}기 `;
}





function openMyPage(){

  if(!state.me){
    toast("로그인이 필요합니다");
    return;
  }

  const m = state.me;

  el("myPhoto").src = m.photoUrl || "";

// 🔵 이름 + 기수 표시
const myNameEl = el("myName");

if (myNameEl) {
  myNameEl.innerHTML = `
    ${m.gisu ? `<span class="gisu-medal">${m.gisu}기</span>` : ""}
    <span class="name-text">${m.name || ""}</span>
  `;
}

// 직위 유지
const isExec = m.group && m.group.trim() !== "";

el("myPosition").textContent = m.position || "";
el("myPosition").className = "badge" + (isExec ? " badge-exec" : "");

  const g = String(m.group || "").trim();
const myGroupEl = el("myGroup");

if (!g) {
  myGroupEl.textContent = "";
  myGroupEl.hidden = true;   // 🔥 이게 핵심
} else {
  myGroupEl.hidden = false;
  myGroupEl.textContent = g;
}

  // 직장 + 주소
  const workplaceRaw = String(m.workplace || "").trim();
  const title = String(m.title || "").trim();
  const address = String(m.address || "").trim();

  const parts = [];
  if (workplaceRaw) parts.push(workplaceRaw);
  if (title) parts.push(title);

  el("myWorkplace").innerHTML =
    `<div>${parts.join(" ")}</div>` +
    `<div>${address}</div>`;

  // 지도 버튼
  const btnMap = el("myMap");
  if(btnMap && address){
    const q = encodeURIComponent(address);
    btnMap.onclick = ()=> window.open(`https://map.naver.com/v5/search/${q}`,"_blank");
  }

  el("myEngName").textContent = m.engName || "";

  el("myMemberInfo").innerHTML =
    `${m.memberNo ? `<div>회원번호: ${m.memberNo}</div>` : ""}` +
    `${m.joinDate ? `<div>입회일자: ${m.joinDate}</div>` : ""}`;

  const rec = el("myRecommender");
  if(m.recommender){
    rec.textContent = `추천인: ${m.recommender}`;
    rec.hidden = false;
  }else{
    rec.hidden = true;
  }

  // 폰번호 포맷
  const p = String(m.phone||"").replace(/[^0-9]/g,"");
  el("myPhone").textContent =
    p.length===11 ? `${p.slice(0,3)}-${p.slice(3,7)}-${p.slice(7)}` : p;

  // 🔥 회관 전화 버튼 (config 사용)
  const hallPhone =
    state.settings?.hallPhone ||
    CFG.hallPhone ||
    "";

  // 🔥 대학 전화 버튼 (config.js 사용 + 번호 표시)
const btnHall = el("btnHallCall");

if(btnHall){

  const hallPhone =
    (window.APP_CONFIG && window.APP_CONFIG.phone) || "";

  // ⭐ 버튼에 번호까지 표시
  if(hallPhone){
    btnHall.textContent = `☎ 대학 통화 (${hallPhone})`;
  }else{
    btnHall.textContent = "☎ 대학 통화";
  }

  btnHall.onclick = ()=>{
    if(!hallPhone){
      toast("대학 전화번호가 없습니다");
      return;
    }
    location.href = `tel:${hallPhone}`;
  };
}

  // 📩 메시지함 (추후 기능)
  el("btnMyInbox").onclick = ()=>{
    toast("개별 메시지함은 준비중입니다");
  };



  // 🔐 비밀번호 패널 토글 (마이페이지 열릴 때 연결)
  const toggleBtn = el("btnPwToggle");
  const panel = el("pwPanel");
  const arrow = document.querySelector(".pw-arrow");

  if (toggleBtn && panel) {
    toggleBtn.onclick = function(){
      const isOpen = !panel.hidden;
      panel.hidden = isOpen;

      if (arrow) {
        arrow.style.transform = isOpen ? "rotate(0deg)" : "rotate(90deg)";
      }
    };
  }


  pushNav("mypage");
}

function toast(msg, opts = {}) {
  const t = el("toast");
  if (!t) return;

  // 강제 표시 옵션
  if (opts.force) {
    toast._lock = false;
  }

  if (toast._lock) return;
  toast._lock = true;

  t.textContent = msg;
  t.hidden = false;

  const dur = Number(opts.duration || 2000);

  setTimeout(() => {
    t.hidden = true;
    toast._lock = false;
  }, dur);
}


// 🔥 여기부터 추가
function showLoading(){
  const el = document.getElementById("loading");
  if(el) el.style.display = "flex";
}

function hideLoading(){
  const el = document.getElementById("loading");
  if(el) el.style.display = "none";
}


function showScreen(name) {


  // 🔥 달력 다시 들어올 때 상태 초기화
  if (name === "calendar"){
    __calendarReloading = false;
  }

 
stopCeremony();   // 🔥 화면 이동시 무조건 정지


  // 🔥 추가
  if (name === "ceremony") {
    const elIntro = document.getElementById("introText");
    if (elIntro && window.APP_CONFIG?.introText) {
      elIntro.innerText = window.APP_CONFIG.introText;
    }
  }


 Object.entries(screens).forEach(([k, node]) => {
    if (!node) return;
    node.hidden = (k !== name);
  });

  const isLoggedIn = !!state.me;

  if (name === "boot" || name === "login") {
    if (btnLogout) btnLogout.hidden = true;
    if (btnBack) btnBack.hidden = true;
    return;
  }

  if (btnLogout) btnLogout.hidden = !isLoggedIn;
  if (btnBack) btnBack.hidden = (state.navStack.length <= 1 || name === "home");

  // ✅ home에 들어오면 종료 대기 상태 초기화
  if (name === "home" && homeBackTimer) {
    clearTimeout(homeBackTimer);
    homeBackTimer = null;
  }



}

function pushNav(name) {
  state.navStack.push(name);
  showScreen(name);
  history.pushState({ app: true }, "", location.href);
  window.scrollTo(0, 0);
}


function popNav() {


  console.log(
    "POPNAV",
    JSON.stringify(state.navStack)
  );


  if (state.navStack.length > 1) state.navStack.pop();
  showScreen(state.navStack.at(-1));
  window.scrollTo(0, 0);
}

btnBack?.addEventListener("click", () => popNav());


btnLogout?.addEventListener("click", async () => {

  const ok = await appConfirm("로그아웃 하시겠습니까?");
  if (!ok) return;

  setAdminButton(false);

  localStorage.removeItem(LS_KEY);

  const tileAdmin = el("tileAdmin");
  if (tileAdmin) {
    tileAdmin.hidden = true;
    tileAdmin.onclick = null;
  }

  const nameBox = document.getElementById("loginUserName");
  if (nameBox) {
    nameBox.hidden = true;
    nameBox.textContent = "";
  }

  document.body.classList.remove("logged-in");

  state = { me: null, settings: null, members: [], announcements: [], navStack: ["login"] };
  showScreen("login");

  toast("로그아웃");

});



// 🔐 마이페이지 비밀번호 변경
el("btnChangePw")?.addEventListener("click", () => {

  const oldCode = el("oldPw")?.value.trim();
  const newCode = el("newPw")?.value.trim();
  const newCode2 = el("newPw2")?.value.trim();

  if (!oldCode || !newCode){
    toast("모든 항목 입력");
    return;
  }

  if (newCode !== newCode2){
    toast("새 비밀번호 불일치");
    return;
  }

  api("changePassword", {
    oldCode,
    newCode
  }, (res) => {

    if (res.ok){
      toast("비밀번호 변경 완료");

      state._authCode = newCode;

      localStorage.setItem(LS_KEY, JSON.stringify({
        phone: state._authPhone,
        code: newCode
      }));

      el("oldPw").value = "";
      el("newPw").value = "";
      el("newPw2").value = "";

} else {

  const errorMap = {
    "PASSWORD_MUST_BE_4_DIGITS": "비밀번호는 숫자 4자리입니다.",
    "WRONG_CURRENT_PASSWORD": "현재 비밀번호가 일치하지 않습니다.",
    "LOGIN_REQUIRED": "로그인이 필요합니다.",
    "USER_NOT_FOUND": "회원 정보를 찾을 수 없습니다.",
    "EMPTY_PASSWORD": "비밀번호를 입력하세요."
  };

  toast(errorMap[res.error] || "변경 실패");
}
  });
});








// ===== API (JSONP: doGet + callback) =====
function apiJsonp(paramsObj) {
  return new Promise((resolve, reject) => {
    const cbName = "__cb_" + Math.random().toString(36).slice(2);
    const params = new URLSearchParams();

    Object.entries(paramsObj || {}).forEach(([k, v]) => {
      params.set(k, String(v ?? ""));
    });

    params.set("callback", cbName);
    params.set("_", String(Date.now()));

    const url = API_URL + "?" + params.toString();

    let done = false;
    const script = document.createElement("script");

    function cleanup() {
      if (script.parentNode) script.parentNode.removeChild(script);
      try { delete window[cbName]; } catch {}
    }

    window[cbName] = (data) => {
      if (done) return;
      done = true;
      cleanup();
      resolve(data);
    };

    script.onerror = () => {
      if (done) return;
      done = true;
      cleanup();
      reject(new Error("JSONP_LOAD_FAILED"));
    };

    script.src = url;
    document.body.appendChild(script);

setTimeout(() => {
  if (done) return;
  console.warn("⏱ JSONP 지연중 (계속 대기):", url);
  // ❌ 실패시키지 말고 그냥 기다림
}, 20000);
  });
}

// ✅ 기수/대수 표기 통일 (없으면 빈값)
function formatTerm(term, generation) {
  const t = String(term ?? "").trim();
  if (t) return t;

  const gRaw = String(generation ?? "").trim();
  if (!gRaw) return "";

  // 이미 "54대", "54기" 같은 형태면 그대로
  if (/[대기회]/.test(gRaw)) return gRaw;

  // 숫자면 "대" 붙이기
  const n = parseInt(gRaw, 10);
  if (!Number.isNaN(n)) return `${n}대`;

  return gRaw;
}



function setBrand(settings) {
  const cfg = window.APP_CONFIG || {};

  const district = (settings?.district || cfg.district || "한 동 회");
  const clubName = (settings?.clubName || cfg.clubName || "한동대학교 최고경영자과정");

  if (el("districtText2")) el("districtText2").textContent = district;

  if (el("genClubText")) {
    const term = formatTerm(settings?.term, settings?.generation || CFG.generation);
    el("genClubText").textContent = term ? `${term} ${clubName}` : clubName;
  }

  if (el("districtText")) el("districtText").textContent = district;
  if (el("clubNameText")) el("clubNameText").textContent = clubName;
  if (el("coverTitle")) el("coverTitle").textContent = clubName;
  if (el("coverSub")) el("coverSub").textContent = district;
  if (el("districtHomeText")) el("districtHomeText").textContent = district;

  const slogan = String(settings?.slogan ?? cfg.slogan ?? "").trim();
  if (el("sloganText")) el("sloganText").textContent = slogan ? `“${slogan}”` : "";

  const club = (settings?.clubName ?? cfg.clubName ?? clubName);
  const term = formatTerm(settings?.term, settings?.generation ?? cfg.generation ?? "");
  if (el("generationText")) el("generationText").textContent = term ? `${term} ${club}` : club;

  const addr = (settings?.address ?? settings?.hallAddress ?? cfg.address ?? cfg.hallAddress ?? "");
  if (el("hallAddress")) el("hallAddress").textContent = addr ? `📍 ${addr}` : "";

  const phone = (settings?.phone ?? settings?.hallPhone ?? cfg.phone ?? cfg.hallPhone ?? "");
  if (el("hallPhone")) el("hallPhone").textContent = phone ? `☎ ${phone}` : "";

  const cr = (settings?.copyright ?? cfg.copyright ?? "");
  if (el("copyrightText")) el("copyrightText").textContent = cr;

  const s = el("clubLogoSmall");
  if (s) {
    const logoUrl = (settings?.logoUrl || cfg.logoUrl || "./logo.png").trim();
    s.src = logoUrl;
    s.style.visibility = "visible";
  }

  if (el("bootTitle")) el("bootTitle").textContent = clubName;
  if (el("bootSub")) el("bootSub").textContent = "회원수첩";

  if (el("loginTitleMain")) el("loginTitleMain").textContent = clubName;
  if (el("loginTitleSub")) el("loginTitleSub").textContent = "회원수첩";

  if (el("docTitle")) el("docTitle").textContent = `${clubName} 수첩`;
}



function openAdminPage() {
  // 지금 입력한 phone/code를 저장해둔 값으로 링크 생성
  const phone = state._authPhone || "";
  const code  = state._authCode || "";
  if (!phone || !code) { toast("다시 로그인 후 시도"); return; }

  const url = `${API_URL}?page=admin&phone=${encodeURIComponent(phone)}&code=${encodeURIComponent(code)}`;
  window.open(url, "_blank"); // 새 탭
}


function esc(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}


function formatDateTime(v){
  if (!v) return "";

  const d = new Date(v);
  if (isNaN(d)) return v;

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth()+1).padStart(2,"0");
  const dd = String(d.getDate()).padStart(2,"0");

  const hh = String(d.getHours()).padStart(2,"0");
  const mi = String(d.getMinutes()).padStart(2,"0");

  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}

function formatDate(v){
  if (!v) return "";
  return String(v).slice(0,10);
}

function formatTime(v){
  if (!v) return "";
  const m = String(v).match(/^(\d{2}):(\d{2})$/);
  if (!m) return v;

  let h = parseInt(m[1],10);
  const min = m[2];

  return h >= 12
    ? `오후 ${h-12 || 12}:${min}`
    : `오전 ${h}:${min}`;
}



function renderBylawsView() {
  const body = el("textBody");
  if (!body) return;

  const text =
  String(
    state.settings?.mainBylaws || ""
  ).trim();

const url = String(
  state.settings?.mainBylawsUrl || ""
).trim();


  const safeText = esc(text || "내용 준비중");
  // ✅ 헤더 오른쪽 "원본PDF" 버튼 제어
  const pdfBtn = el("btnBylawsPdf");
  if (pdfBtn) {
    if (url) {
      pdfBtn.href = url;
      pdfBtn.hidden = false;
      pdfBtn.textContent = "원본PDF";
    } else {
      pdfBtn.hidden = true;
    }
  }



    body.innerHTML = `<div style="white-space:pre-wrap;line-height:1.6;">${safeText}</div>`;

}


function renderClassBylaws(){

  const body =
    el("textBody");

  const text =
    String(
      state.settings?.classBylaws || ""
    ).trim();

  body.innerHTML = `
    <div style="
      white-space:pre-wrap;
      line-height:1.8;
    ">
      ${esc(text || "내용 준비중")}
    </div>
  `;

  const pdfBtn =
    el("btnBylawsPdf");

  if(pdfBtn){

    const url =
      String(
        state.settings?.classBylawsUrl || ""
      ).trim();

    if(url){

      pdfBtn.href = url;
      pdfBtn.hidden = false;

    }else{

      pdfBtn.hidden = true;

    }

  }

}


// ✅ 회원여부 필터: isMember === false 인 사람은 회원명부/인원수에서 제외
function onlyRealMembers(arr){
  const list = Array.isArray(arr) ? arr : [];
  return list.filter(m => {
    // 서버에서 isMember를 안 내려주면(구버전) 기존처럼 "회원" 취급
    if (m && typeof m.isMember === "boolean") return m.isMember === true;
    return true;
  });
}

function formatPhone(p){
  const n = String(p||"").replace(/[^0-9]/g,"");
  if(n.length===11) return `${n.slice(0,3)}-${n.slice(3,7)}-${n.slice(7)}`;
  return n;
}


function renderMembers(list) {

// 🔵 필터 버튼 텍스트 동기화
const btnClass = el("btnClassFilter");
if (btnClass) {
  if (execMode) btnClass.textContent = "총.집행부 ▼";
  else if (currentClassFilter === null) btnClass.textContent = "기수전체 ▼";
  else btnClass.textContent = `${currentClassFilter}기 ▼`;
}


  // 🔵 내기수보기 버튼 표시/숨김 제어
  const btnMembersRefresh = el("btnMembersRefresh");
if (btnMembersRefresh) {

  const myGisu = Number(state.me?.gisu || 0);

  // 🔥 상태 기준으로 정확히 판단
  if (!execMode && currentClassFilter === myGisu) {
    btnMembersRefresh.style.display = "none";
  } else {
    btnMembersRefresh.style.display = "";
  }
}

  // 🔵 총동문 집행부 모드
  if (execMode) {
    list = list.filter(m => m.group === "총동문회");

    // H컬럼 정렬순서
    list.sort((a,b)=>{
      return Number(a.sortOrder||0) - Number(b.sortOrder||0);
    });
  }

  // 🔵 기수 필터
  if (currentClassFilter !== null) {
    list = list.filter(m => Number(m.gisu || 0) === currentClassFilter);
  }

  const pill = el("memberCountPill");


  if (pill) pill.textContent = `${list.length}명`;

  const wrap = el("memberList");
  if (!wrap) return;

  wrap.innerHTML = "";
  if (!list.length) {
    wrap.innerHTML = `<div class="row-sub">검색 결과가 없습니다.</div>`;
    return;
  }

// 🔥 기수 정렬 적용 (집행부 아닐때만)
if (!execMode) {
  list.sort((a, b) => {
    const ga = Number(a.gisu || 0);
    const gb = Number(b.gisu || 0);
    return gisuSortDesc ? gb - ga : ga - gb;
  });
}



 // 🔵 기수별 그룹 만들기
const groups = {};

list.forEach(m => {
  const g = m.gisu || "기타";
  if (!groups[g]) groups[g] = [];
  groups[g].push(m);
});

// 🔵 그룹별 출력
let sortedGisu;

if (execMode) {
  sortedGisu = Object.keys(groups).sort((a, b) => {
    const aMin = Math.min(...groups[a].map(m => Number(m.sortOrder || 9999)));
    const bMin = Math.min(...groups[b].map(m => Number(m.sortOrder || 9999)));
    return aMin - bMin;
  });
} else {
  sortedGisu = Object.keys(groups).sort((a, b) => b - a);
}

for (const gisu of sortedGisu) {

  const groupBox = document.createElement("div");
  groupBox.className = "gisu-group";

  // 🔵 기수 제목
  const title = document.createElement("div");
  title.className = "gisu-title";
  title.textContent = gisu + "기";
  groupBox.appendChild(title);

  groups[gisu].forEach((m, i) => {

  const row = document.createElement("div");

  let cls = "row";

  if (Number(m.sortOrder) === 10) {
    cls += " is-grand-president";   // 총회장
  } else if (Number(m.sortOrder) === 100) {
    cls += " is-class-president";   // 기수회장
  }

  row.className = cls;

    row.innerHTML = `
      ${m.photoUrl ? `<img class="avatar" src="${esc(m.photoUrl)}" alt="사진">` : `<div class="avatar"></div>`}
      <div class="row-main">
        <div class="row-title">
          ${esc(m.name)} 
          ${m.gisu ? `<span class="badge">${m.gisu}기</span>` : ""}
        </div>

        <div class="profile-badges">
          ${(() => {

            let html = "";

            if (m.position) {
              const arr = String(m.position)
                .split(/[,/]/)
                .map(v => v.trim())
                .filter(Boolean);

              arr.forEach(v => {
                html += `
                  <span class="badge ${v.includes("총동문") ? 'badge-exec' : ''}">
                    ${esc(v)}
                  </span>
                `;
              });
            }

            if (m.group) {
              html += `
                <span class="badge badge-group">
                  ${esc(m.group)}
                </span>
              `;
            }

            return html;

          })()}
        </div>

        <div class="row-sub">${esc([m.workplace, m.title, formatPhone(m.phone)].filter(Boolean).join(" / "))}</div>

        <div class="actions">
          <a class="a-btn primary" href="tel:${esc(m.phone)}">📞 통화</a>
          <a class="a-btn" href="sms:${esc(m.phone)}">💬 문자</a>
        </div>
      </div>
    `;

    row.addEventListener("click", () => openProfileAt(groups[gisu], i));
    row.querySelector(".actions")?.addEventListener("click", (e) => e.stopPropagation());

    groupBox.appendChild(row);
  });

  wrap.appendChild(groupBox);
}
}

function renderAnnouncements() {
  const wrap = el("annList");
  if (!wrap) return;

  wrap.innerHTML = "";
  const items = state.announcements || [];
  if (!items.length) {
    wrap.innerHTML = `<div class="row-sub">등록된 공지사항이 없습니다.</div>`;
    return;
  }

  for (const a of items) {
    const row = document.createElement("div");
    row.className = "row";
    row.innerHTML = `
      <div class="row-main">
        <div class="row-title">${esc(a.title || "")}</div>
        <div class="row-sub">${formatDateTime(a.date)} ${a.author ? " · " + esc(a.author) : ""}</div>
        <div class="row-sub" style="white-space:normal;margin-top:8px;">${esc(a.body || "")}</div>
      </div>`;

   row.addEventListener("click", () => openAnnModal(a));

    wrap.appendChild(row);
  }
}

function isAnnNew(a){
  if (!a) return false;
  if (a.isNew === true) return true; // 서버에서 내려준 값 우선

  // 혹시 isNew가 없으면 newUntil로 계산(보험)
  const v = a.newUntil;
  if (!v) return false;
  const t = new Date(v).getTime();
  return t && Date.now() < t;
}


function renderLatest() {
  const wrap = el("latestAnnouncements");
  if (!wrap) return;

  wrap.innerHTML = "";
  const items = (state.announcements || []).slice(0, 3);
  if (!items.length) {
    wrap.innerHTML = `<div class="row-sub">등록된 공지사항이 없습니다.</div>`;
    return;
  }

  for (const a of items) {
    const row = document.createElement("div");
    row.className = "row";
    row.innerHTML = `
      <div class="row-main">
        <div class="row-title">
  ${esc(a.title || "")}
  ${isAnnNew(a) ? `<span class="badge-new">NEW</span>` : ""}

</div>

        <div class="row-sub">${formatDateTime(a.date)} ${a.author ? " · " + esc(a.author) : ""}</div>
      </div>`;
    wrap.appendChild(row);
  }
}

async function handleLogin() {

// 🔥 중복 로그인 차단 (핵심)
if (window.__loginLock) return;
window.__loginLock = true;


  const rawPhone = el("inputPhone")?.value || "";
  const rawCode  = el("inputCode")?.value || "";

  // 🔔 팝업 API를 미리 시작 (data API와 병렬)
  


  const phone = normalizePhone(rawPhone);
  const code  = String(rawCode).trim();
  const keep  = !!el("keepLogin")?.checked;

  // ✅ phone/code 만든 다음에 저장 (관리자페이지 링크용)
  state._authPhone = phone;
  state._authCode  = code;




  const err = el("loginError");
  if (err) err.hidden = true;

  if (!phone) {
    if (err) { err.hidden = false; err.textContent = "휴대폰번호를 입력하세요(숫자만)"; }
    return;
  }

  if (!code) {
    if (err) { err.hidden = false; err.textContent = "접속코드를 입력하세요"; }
    return;
  }

  const btn = el("btnLogin");
if (btn) { btn.disabled = true; btn.textContent = "확인중..."; }

try {

  if (!API_URL) {
    throw new Error("CONFIG_API_URL_EMPTY (config.js의 apiUrl을 확인하세요)");
  }



  // 🔥 data + popupEvents 동시에 호출
const [json, popupRes] = await Promise.all([
  apiJsonp({ action: "data", phone, code }),
  apiJsonp({ action: "popupEvents", phone, code })
]);




    if (!json || json.ok !== true) {
      const msg = json?.error ? String(json.error) : "LOGIN_FAILED";
      throw new Error(msg);
    }

 const rawAdmin = json.me?.isAdmin;

const isAdmin =
  rawAdmin === true ||
  rawAdmin === "TRUE" ||
  rawAdmin === "true" ||
  rawAdmin === 1 ||
  rawAdmin === "1";

state.me = {
  ...json.me,
  isAdmin: isAdmin === true
};

execMode = false;   // 🔥 리스트무조건기수순

// 🔵 로그인 사용자 기수 기본 필터값 설정
currentClassFilter = state.me?.gisu
  ? Number(state.me.gisu)
  : null;


setAdminButton(state.me?.isAdmin === true);



// ✅ 로그인 상태 표시 (CSS 제어용)
document.body.classList.add("logged-in");



// 🔔 로그인 사용자 이름 상단 표시
const nameBox = document.getElementById("loginUserName");
if (nameBox && state.me?.name) {
  nameBox.textContent = `${getMyGisuText()}${state.me.name}`;
  nameBox.hidden = false;
}








state.settings = json.settings;

state.members = onlyRealMembers(json.members || [])
  .map((m) => ({ ...m, phone: normalizePhone(m.phone) }));

state.announcements = json.announcements || [];

state.ads = json.ads || [];

    // ✅ 관리자 버튼: 로그인 성공 시에만 표시/숨김 결정
    const tileAdmin = el("tileAdmin");
    if (tileAdmin) {
      tileAdmin.hidden = !(state.me && state.me.isAdmin === true);
      tileAdmin.onclick = openAdminPage;
    }

    setBrand(state.settings);




// 🔵 모든 gisuPrefix에 로그인 기수 붙이기
document.querySelectorAll(".gisuPrefix").forEach(el=>{
  el.textContent = getMyGisuText();
});




    // 정렬
state.members.sort((a, b) =>
  (Number(a.gisu ?? 0) - Number(b.gisu ?? 0)) ||   // 1️⃣ 기수
  (Number(a.sortOrder ?? 9999) - Number(b.sortOrder ?? 9999)) || // 2️⃣ 정렬순서
  (a.name || "").localeCompare(b.name || "", "ko") // 3️⃣ 이름
);

renderLatest();
renderAnnouncements();

// 🔥 먼저 기수값 보장
currentClassFilter = state.me?.gisu
  ? Number(state.me.gisu)
  : null;

buildClassWheel();

if (keep) localStorage.setItem(LS_KEY, JSON.stringify({ phone, code }));
else localStorage.removeItem(LS_KEY);

// ✅ 로그인 성공 → 홈 화면으로 이동 (이 줄들이 빠져 있었음)


// 🔵 로그인 성공 → 홈 화면으로 이동
state.navStack = ["home"];
showScreen("home");




 

// 🔥 바로 팝업 실행 (지연 없음)
if (popupRes && popupRes.ok === true){

  const myGisu = Number(state.me?.gisu || 0);

  const list = (popupRes.events || []).filter(e=>{
    const g = Number(String(e.gisu || "0").trim());
    return g === 0 || g === myGisu;
  });

  if (list.length){

    list.sort((a, b) => {
      const dA = new Date(`${a.date||""} ${a.startTime||"00:00"}`);
      const dB = new Date(`${b.date||""} ${b.startTime||"00:00"}`);
      return dA - dB;
    });

    requestAnimationFrame(()=>{

      openModal(`
        <div class="day-wrap">

          <div class="day-header">
            <h3>중요 일정 안내</h3>
          </div>

          <div class="day-scroll">

            ${
              list.map(e=>{

                const d = e.date || "";
                const t = e.startTime || "";

                return `
                  <div class="event-item">

                    <div class="event-title">
                      <span style="
                        width:8px;
                        height:8px;
                        border-radius:50%;
                        display:inline-block;
                        background:${Number(e.gisu||0) === 0 ? '#e53935' : '#111'};
                      "></span>
                      ${e.title || ""}
                    </div>

                    <div class="event-meta">
                      ${d} ${t}
                      ${e.place ? " / " + e.place : ""}
                    </div>

                    ${
                      e.desc
                      ? `<div class="event-desc">${e.desc}</div>`
                      : ""
                    }

                  </div>
                `;
              }).join("")
            }

          </div>

          <div class="day-footer">
            <button onclick="closeModal()" class="btn primary">
              닫기
            </button>
          </div>

        </div>
      `);

    });

  }
}







// ✅ 여기부터는 handleLogin 정상 흐름
history.pushState({ app: true }, "", location.href);
window.scrollTo(0, 0);


}
catch (err) {

  console.error("LOGIN ERROR:", err);

  const errBox = el("loginError");
  if (errBox) {
    errBox.hidden = false;
    errBox.textContent = "휴대폰번호 또는 접속코드가 올바르지 않습니다.";
  }

  toast("로그인 실패");

}
finally {
  window.__loginLock = false;   // 🔥 이거 추가
  if (btn) { btn.disabled = false; btn.textContent = "로그인"; }
}
}





function bindNav() {
  document.querySelectorAll("[data-nav]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.getAttribute("data-nav");

      // ✅ 텍스트 화면 들어갈 때마다 기본은 숨김 (회칙에서만 renderBylawsView가 켬)
      const pdfBtn = el("btnBylawsPdf");
      if (pdfBtn) pdfBtn.hidden = true;

if (target === "members") {

  execMode = false;   // 🔥 추가

  if (currentClassFilter === null && state.me?.gisu) {
    currentClassFilter = Number(state.me.gisu);
  }

  // 🔵 로그인 사용자 기수 기본 적용 (혹시 초기화됐을 경우 대비)
  if (currentClassFilter === null && state.me?.gisu) {
    currentClassFilter = Number(state.me.gisu);
  }

  // 🔵 버튼 텍스트 갱신
  const btnClass = el("btnClassFilter");
  if (btnClass) {
    btnClass.textContent = currentClassFilter
      ? `${currentClassFilter}기 ▼`
      : "기수전체 ▼";
  }

  pushNav("members");

  if (el("memberSearch")) el("memberSearch").value = "";

  renderMembers(state.members);
} else if (target === "announcements") {
  pushNav("announcements");
  renderAnnouncements();

  const btn = el("btnAnnRefresh");
  if (btn) btn.onclick = reloadAnnouncements;
}else if (target === "purpose") {
        pushNav("text");
        if (el("textTitle")) el("textTitle").textContent = "목적";
        if (el("textBody")) el("textBody").textContent = state.settings?.purpose || "내용 준비중";
        // pdfBtn은 위에서 이미 hidden=true 처리됨

      } else if (target === "bylaws") {
  pushNav("text");
  if (el("textTitle")) el("textTitle").textContent = "회칙";
  renderBylawsView();
} 
else if (target === "events") {
  pushNav("events");
  loadEvents();
}

else if (target === "calendar") {
  pushNav("calendar");


currentEventDate = null;   // 🔥 이거 추가

  // 🔥 캐시 완전 초기화 (핵심)
  calendarCache = {};
  allEvents = [];

  __calendarReloading = false;

  loadCalendar();
}

else if (target === "ads") {

  pushNav("ads");

  loadAdCategories();

}

else if (target === "lionism") {
  window.open("https://www.handong.edu/kor/", "_blank");
}

else if (target === "ceremony") {
  pushNav("ceremony");
}
      
    });
  });
}

function bindSearch() {
  const input = el("memberSearch");
  if (!input) return;

  input.addEventListener("input", () => {
    const q = input.value.trim().toLowerCase();
    if (!q) { renderMembers(state.members); return; }
    const filtered = state.members.filter((m) => {
      const hay = [m.name, m.position, m.workplace, m.group, m.phone].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(q);
    });
    renderMembers(filtered);
  });
}



// ⬇️⬇️⬇️ 여기부터 붙여넣기 ⬇️⬇️⬇️

function init() {


setAdminButton(false);




  // 기본 세팅
  setBrand(null);
  bindNav();
  bindSearch();

const installBar = el("installBar");
const btnInstallBar = el("btnInstallBar");

if (installBar && btnInstallBar) {

  // 🔥 기본 숨김 (이미 HTML에서 했지만 안전하게)
  installBar.style.display = "none";

  // 🔥 Android + 설치 가능할 때만 표시
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;

    installBar.style.display = "block";
  });

  btnInstallBar.addEventListener("click", async () => {

    // 🤖 안드로이드 + 크롬
    if (isRealChromeOnAndroid()) {

      if (!deferredPrompt) {
        toast("설치 준비중입니다. 잠시 후 다시 시도하세요.");
        return;
      }

      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      deferredPrompt = null;

      if (choice?.outcome === "accepted") {
        installBar.style.display = "none";
      }

    } else if (IS_IOS) {

      // 🍎 아이폰 안내
      showHint(`
        <b>아이폰 설치 방법</b><br><br>
        1) 사파리로 접속<br>
        2) 하단 공유버튼(⬆️)<br>
        3) 홈 화면에 추가
      `);

    } else {

      toast("이 브라우저에서는 설치가 지원되지 않습니다.");
    }

  });
}

  // 🔥 여기다 붙여넣는다 (정확히 이 위치)
 const btnSelectAll = document.getElementById("btnSelectAll");

if (btnSelectAll) {
  btnSelectAll.addEventListener("click", (e) => {


    if (window.__snapClassWheelToAll) {
      window.__snapClassWheelToAll();
    }
  });
}

const btnExecView = document.getElementById("btnExecView");

if (btnExecView) {
  btnExecView.addEventListener("click", () => {

    buildClassWheel();

    document.body.style.overflow = "hidden";
    classSlide.hidden = false;

    requestAnimationFrame(() => {
      classSlide.classList.add("show");
    });

    setTimeout(()=>{

      const scroller = document.getElementById("classScroller");
      const items = scroller.querySelectorAll(".wheel-item");

      const blockSize = items.length / 40;
      const centerBlock = Math.floor(40/2);
      const index = centerBlock * blockSize;

      const elItem = items[index];

      const target =
        elItem.offsetTop -
        (scroller.clientHeight/2 - elItem.offsetHeight/2);

      scroller.scrollTo({
        top: target,
        behavior:"smooth"
      });

    },80);

  });
}

// 🔵 상단 로그인 사용자 이름 → 마이페이지
const nameBox = el("loginUserName");
if (nameBox) {
  nameBox.addEventListener("click", openMyPage);
}



const logo = el("clubLogoSmall");
if (logo) {
  logo.addEventListener("contextmenu", (e) => {
    // ✅ Ctrl + 우클릭만 허용
    if (e.ctrlKey) {
      e.preventDefault(); // 기본 우클릭 메뉴 차단
      hardResetApp();
    }
  });
}




// 🔄 회원명부 새로고침 버튼
const btnMembersRefresh = el("btnMembersRefresh");
if (btnMembersRefresh) {
  btnMembersRefresh.onclick = () => {

    execMode = false; // 🔥 총동문 집행부 모드 해제

    currentClassFilter = state.me?.gisu
      ? Number(state.me.gisu)
      : null;

    renderMembers(state.members); // 🔥 다시 그리기
  };
}


  // 로그인 버튼 / 엔터
  el("btnLogin")?.addEventListener("click", handleLogin);

el("btnAddEvent")?.addEventListener("click", ()=>{
  openEventSheet();
});


// ✅ 저장 버튼
// ✅ 저장 버튼
el("btnEventSave")?.addEventListener("click", ()=>{

  console.log("🔥 저장 클릭됨");

  setTimeout(()=>{   // 🔥 이거 필수

    const title = el("evTitle").value.trim();
    const time  = el("evTime").value;
    const place = el("evPlace").value.trim();
    const desc  = el("evDesc").value.trim();
    const date  = el("evDateText").textContent;
    const popup = el("evIsPopup")?.checked === true;
    console.log("🔥 읽은값", {title, time, date});



// 🔵 gisu 결정 (추가)
let gisu = 0;

if (state.me?.adminLevel === 1){
  // 기수관리자 → 무조건 자기기수
  gisu = state.me.gisu;

} else {
  // 전체관리자 → 선택값
  const scope = document.querySelector('input[name="evScope"]:checked')?.value;

  if (scope === "my"){
    gisu = state.me.gisu;
  } else {
    gisu = 0;
  }
}



    if (!title){
      toast("제목 입력");
      return;
    }

showLoading();   // 🔥


    api(
  editingEventId ? "adminUpdateEvent" : "adminAddEvent",
  {
    ...getAuthSafe(),
    id: editingEventId,
    date: date,
    title: title,
    startTime: time,
    endTime: "",
    place: place,
    desc: desc,
    gisu: gisu,
    popup: popup


    }, (res)=>{

      console.log("🔥 응답", res);

      if (res && res.ok){
toast("등록 완료");
closeEventSheet();

const wait = setInterval(()=>{
  if (!__calendarReloading){
    clearInterval(wait);
    openDayEvents(currentEventDate);
  }
}, 50);


// 🔥 추가 (캐시 초기화)
calendarCache = {};
allEvents = [];

loadCalendar();

  



      } else {
        toast("실패");

  hideLoading();   // 🔥 실패시

      }

    });

  }, 150);  // 🔥 100 → 150으로 (안정성)
});

// ✅ 취소 버튼 (따로!)
el("btnEventCancel")?.addEventListener("click", ()=>{
  console.log("🔥 취소 클릭됨");
  closeEventSheet();
});


// ✅ 삭제 버튼 (밖으로 빼라)
el("btnEventDelete")?.addEventListener("click", ()=>{

  if (!editingEventId){
    toast("삭제할 데이터 없음");
    return;
  }

  if (!confirm("삭제할까요?")) return;

  api("adminDeleteEvent", {
  id: editingEventId
}, (res)=>{

    if (res && res.ok){
toast("삭제 완료");
closeEventSheet();



// 🔥 추가 (캐시 초기화)
calendarCache = {};
allEvents = [];

loadCalendar();
    } else {
      toast("삭제 실패");
    }

  });

});

  ["inputPhone", "inputCode"].forEach((id) => {
    el(id)?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") handleLogin();
    });
  });

  // 🔧 비상용: 캐시 + SW 제거 후 새로고침
  el("btnHardReload")?.addEventListener("click", async () => {
    try {
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const r of regs) await r.unregister();
      }
      if (window.caches) {
        const keys = await caches.keys();
        for (const k of keys) await caches.delete(k);
      }
    } catch {}
    location.reload();
  });




  // 자동 로그인
  const savedStr = localStorage.getItem(LS_KEY);
  if (savedStr) {
    try {
      const { phone, code } = JSON.parse(savedStr);
      if (el("inputPhone")) el("inputPhone").value = phone || "";
      if (el("inputCode"))  el("inputCode").value  = code  || "";
      if (el("keepLogin"))  el("keepLogin").checked = true;

if (phone && code) {

  // 🔥 이미 로그인 진행중이면 막기
  if (window.__loginLock) return;
 

  state.navStack = ["boot"];
  showScreen("boot");

  setTimeout(() => handleLogin(), 50);
  return;
}

    } catch {
      localStorage.removeItem(LS_KEY);
    }

  }

  // ✅ 여기서 기본 로그인 화면 결정
  state.navStack = ["login"];
  showScreen("login");
history.pushState({ app: true }, "", location.href);


// ✅ 메뉴 열기 (버튼 전용)
document.addEventListener("click", (e) => {

  const btn = e.target.closest(".menu-btn");
  if (!btn) return;

  e.stopPropagation();

  const popup = btn.nextElementSibling;
  if (!popup) return;

  // 전부 닫고
  document.querySelectorAll(".menu-popup").forEach(p => {
    p.style.display = "none";
  });

  // 현재만 열기
  popup.style.display = "block";
});


// ✅ 바깥 클릭 → 닫기 전용 (완전히 분리)
document.addEventListener("click", (e) => {

  if (e.target.closest(".menu-wrap")) return;

  document.querySelectorAll(".menu-popup").forEach(p => {
    p.style.display = "none";
  });

});

} // 🔥 init 끝

document.addEventListener("DOMContentLoaded", init);







window.addEventListener("popstate", () => {



// 🔥 일정 입력 시트 닫기
if (!el("eventSheet")?.hidden) {
  closeEventSheet();
  return;
}




// 🔥 사이드바 열려있으면 먼저 닫기
if (!classSlide.hidden) {
  classSlide.classList.remove("show");

  setTimeout(()=>{
    classSlide.hidden = true;
    document.body.style.overflow = "";
  }, 250);

 

  return;
}



// 🔔 공용 모달(일정 팝업) 열려 있으면 → 닫기
if (document.getElementById("modal")?.hidden === false) {
  closeModal();
  history.pushState({ app: true }, "", location.href);
  return;
}





  // 1️⃣ 모달 열려 있으면 → 모달 닫기

// 광고모달 우선
if (el("adModal")?.hidden === false) {
  closeAdModal();
  return;
}

  if (el("profileModal")?.hidden === false) {
    closeProfile();

    return;
  }

  if (el("annModal")?.hidden === false) {
    closeAnnModal();

    return;
  }

  if (el("imgModal")?.hidden === false) {
    closeImgModal();
  
    return;
  }

if (state.navStack.length > 1) {
  popNav();
  return;
}


  // 3️⃣ 지금은 메인(home) 화면
  if (!homeBackTimer) {
    toast("뒤로 한번 더 누르면 종료됩니다", {
      duration: 1000,
      force: true
    });

    homeBackTimer = setTimeout(() => {
      homeBackTimer = null;
    }, 1000);


    return;
  }

  // 4️⃣ 1초 안에 다시 누르면 → 종료
  window.close();
});








if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      const reg = await navigator.serviceWorker.register("./sw.js");

      // ✅ 즉시 업데이트 체크
      reg.update();

      const askRefresh = () => {
        const w = reg.waiting || reg.installing;
        if (w) w.postMessage({ type: "SKIP_WAITING" });
      };

      // ✅ 이미 waiting 상태면 바로 토스트(컨트롤러 유무 상관없음)
      if (reg.waiting) showUpdateToast(askRefresh);

      // ✅ 설치가 끝나 waiting이 되면 토스트
      reg.addEventListener("updatefound", () => {
        const nw = reg.installing;
        if (!nw) return;
        nw.addEventListener("statechange", () => {
          if (nw.state === "installed") {
            // installed 후 waiting이 잡히는 타이밍이 있어서 한 번 더 체크
            setTimeout(() => {
              if (reg.waiting) showUpdateToast(askRefresh);
            }, 50);
          }
        });
      });

      // ✅ 짧은 시간 동안 waiting 폴링(모바일에서 이벤트 놓치는 케이스 방지)
      let tries = 0;
      const iv = setInterval(() => {
        tries++;
        if (reg.waiting) {
          
          clearInterval(iv);
        }
        if (tries >= 20) clearInterval(iv); // 10초
      }, 500);

      // ✅ 새 SW가 활성화되면 자동 새로고침
      let refreshing = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (refreshing) return;
        refreshing = true;
        // 업데이트가 실제 적용됐으니 잠금 해제
        toast._lock = false;
        location.reload();
      });

    } catch (e) {
      console.error("SW_REGISTER_FAILED:", e);
    }
  });
}


// ===== PWA Install buttons =====

let deferredPrompt = null;

function isRealChromeOnAndroid(){
  const ua = navigator.userAgent || "";
  const isAndroid = /Android/i.test(ua);

  // 크롬(Chromium) 기반 브라우저 제외
  const isEdge = /EdgA|EdgiOS|Edg\//i.test(ua);
  const isSamsung = /SamsungBrowser/i.test(ua);
  const isOpera = /OPR\//i.test(ua);
  const isWhale = /Whale/i.test(ua);

  // 인앱 제외
  const isKakao = /KAKAOTALK/i.test(ua);
  const isNaver = /NAVER/i.test(ua);
  const isDaum = /Daum/i.test(ua);

  // ✅ “진짜 크롬” 조건
  const isChrome = /Chrome\/\d+/i.test(ua) && /Google/i.test(navigator.vendor || "");

  return isAndroid && isChrome && !isEdge && !isSamsung && !isOpera && !isWhale && !isKakao && !isNaver && !isDaum;
}



const btnA = el("btnInstallAndroid");
const btnI = el("btnInstallIOS");
const hint = el("installHint");

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true; // iOS
}

function showHint(html) {
  if (!hint) return;
  hint.innerHTML = html;
  hint.hidden = false;
}

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  if (btnA) {
    btnA.disabled = false;
    btnA.style.opacity = "1";
  }
});

window.addEventListener("appinstalled", () => {
  deferredPrompt = null;
  if (btnA) btnA.style.display = "none";
  if (btnI) btnI.style.display = "none";
  if (hint) hint.hidden = true;
});



if (isStandalone()) {
  if (btnA) btnA.style.display = "none";
  if (btnI) btnI.style.display = "none";
  if (hint) hint.hidden = true;
}


btnA?.addEventListener("click", async () => {

  // ✅ 진짜 크롬이 아니면 무조건 안내
  if (!isRealChromeOnAndroid()) {
    showHint(`
      ⚠️ 이 브라우저에서는 앱 설치가 불가능합니다.<br><br>
      <b>반드시 'Chrome'에서 열어 설치</b>해 주세요.<br>
      (카톡/밴드/네이버앱 안에서는 설치가 안 됩니다)
    `);
    return;
  }

  // ✅ 설치 트리거가 아직 안 잡힘
  if (!deferredPrompt) {
    showHint(`
      ⚠️ 아직 설치 준비가 안 됐습니다.<br>
      <b>5초 뒤 다시 눌러보세요.</b><br><br>
      그래도 안 뜨면:<br>
      크롬 우측상단 <b>⋮ 메뉴</b> → <b>앱 설치</b>를 눌러주세요.
    `);
    return;
  }

  // ✅ 정상 설치 진행
  deferredPrompt.prompt();
  const choice = await deferredPrompt.userChoice;
  deferredPrompt = null;

  if (choice?.outcome !== "accepted") {
    showHint("설치를 취소했습니다. 필요하면 다시 설치할 수 있습니다.");
  }
});







btnI?.addEventListener("click", () => {
  showHint(`
    <b>아이폰 설치 방법(사파리)</b><br/>
    1) 사파리로 이 페이지 열기<br/>
    2) 아래 <b>공유(⬆️)</b> 버튼 누르기<br/>
    3) <b>홈 화면에 추가</b> 선택<br/>
    4) 추가 → 홈화면 아이콘으로 실행
  `);
});





function openProfileAt(list, index) {

// 🔥 초기화 이후 swipeCount 다시 읽기
swipeCount = Number(localStorage.getItem("memberSwipeCount") || 0);

  modalCtx.list = list || [];
  modalCtx.index = index ?? -1;

  const m = modalCtx.list[modalCtx.index];
  if (!m) return;


// ✅ ⭐⭐⭐ 추가 (히스토리 쌓기)
  history.pushState({ modal: "profile" }, "", location.href);

  // ✅ 멤버 데이터 주입
 const imgEl = el("modalPhoto");
const newSrc = m.photoUrl || "";

if(IS_IOS){
  // 🍎 아이폰만 repaint 강제
  imgEl.src = "";
  requestAnimationFrame(()=>{
    imgEl.src = newSrc;
  });
}else{
  // 🤖 안드로이드/PC 기존 빠른 방식 유지
  imgEl.src = newSrc;
}

  // 이름(굵게) + 직위(지금처럼)
// 🔵 이름 + 기수 표시
const nameEl = el("modalName");


// 🔥 상세페이지 배지 생성
const wrap = el("modalBadges");
if (wrap) {
  wrap.innerHTML = "";

  // 1️⃣ 직위 쪼개기
  if (m.position) {
    const arr = String(m.position)
      .split(/[,/]/)
      .map(v => v.trim())
      .filter(Boolean);

    arr.forEach(v => {
      const span = document.createElement("span");


if (v.includes("총동문")) {
  span.className = "badge badge-exec";
} else if (v.includes("기")) {
  span.className = "badge badge-gisu";
} else {
  span.className = "badge";
}

      span.textContent = v;
      wrap.appendChild(span);
    });
  }

  // 2️⃣ 그룹 추가
  if (m.group) {
    const g = document.createElement("span");
    g.className = "badge badge-group";
    g.textContent = m.group;
    wrap.appendChild(g);
  }
}



if (nameEl) {
  nameEl.innerHTML = `
    ${m.gisu ? `<span class="gisu-medal">${m.gisu}기</span>` : ""}
    <span class="name-text">${m.name || ""}</span>
  `;
}

// 기존 직위 유지
const isExec = m.group && m.group.trim() !== "";



// ===== 추가: 영문이름 =====
const engEl = el("modalEngName");
if (engEl) {
  engEl.textContent = m.engName || "";
}

// ===== 추가: 회원번호 / 입회일자 =====
const infoEl = el("modalMemberInfo");
if (infoEl) {
  const rows = [];
  if (m.memberNo) rows.push(`<div>회원번호: ${esc(m.memberNo)}</div>`);
  if (m.joinDate) rows.push(`<div>입회일자: ${esc(m.joinDate)}</div>`);
  infoEl.innerHTML = rows.join("");
}


// ===== 추가: 추천인 =====
const recEl = el("modalRecommender");
if (recEl) {
  if (m.recommender) {
    recEl.textContent = `추천인: ${m.recommender}`;
    recEl.hidden = false;
  } else {
    recEl.hidden = true;
  }
}





    // 직장 / 직함 / 주소 (두 줄로 표시)
  const workplaceRaw = String(m.workplace || "").trim();
  const title = String(m.title || "").trim();
  const address = String(m.address || "").trim();

  const parts = [];
  if (workplaceRaw) parts.push(workplaceRaw);
  if (title) parts.push(title);

  const line1 = parts.join(" ");     // 예: "삼성전자 과장"
  const line2 = address || "";       // 예: "포항시 북구 ..."

  // ✅ 화면 표시 (line1 + line2 줄바꿈)
 // ✅ 주소를 무조건 다음 줄로(HTML 2줄 고정)
const wEl = el("modalWorkplace");
if (wEl) {
  wEl.innerHTML =
    `<div>${esc(line1 || "")}</div>` +
    `<div>${esc(line2 || "")}</div>`;
}

const adBox = el("memberAdBox");

if (adBox) {

  const myAds = (state.ads || []).filter(ad =>
    String(ad.memberName || "") === String(m.name || "")
  );

  if (!myAds.length) {

    adBox.innerHTML = "";

  } else {

    adBox.innerHTML = myAds.map(ad => `

      <div
        onclick="openAdModal('${ad.adId}')"
        style="
          margin-top:12px;
          padding:12px;
          border-radius:12px;
          background:#f5f9ff;
          border:1px solid #dbeafe;
          cursor:pointer;">

        🏪 <b>${ad.storeName}</b><br>

        <span style="
          color:#2563eb;
          font-size:13px;">
          동문광고 보기
        </span>

      </div>

    `).join("");

  }

}


  // ✅ 지도/로드뷰 버튼 연결 (주소가 있을 때만)
  const addr = String(m.address || "").trim();
    const btnMap = el("btnMap");

  if (btnMap) btnMap.hidden = !addr;

  if (addr && btnMap) {
    const q = encodeURIComponent(addr);

    btnMap.onclick = () => {
      window.open(`https://map.naver.com/v5/search/${q}`, "_blank");
    };
  }



  // 폰번호(굵게는 CSS에서 처리)
  // ===== 휴대폰 번호 포맷 (010-xxxx-xxxx) =====
const phoneEl = el("modalPhone");
if (phoneEl) {
  const p = String(m.phone || "").replace(/[^0-9]/g, "");
  if (p.length === 11) {
    phoneEl.textContent =
      `${p.slice(0,3)}-${p.slice(3,7)}-${p.slice(7)}`;
  } else {
    phoneEl.textContent = p;
  }
}


  el("modalCall").href = `tel:${m.phone || ""}`;
  el("modalSms").href  = `sms:${m.phone || ""}`;

  resetPhotoTransform();
el("profileModal").hidden = false;

const scrollBtn = document.getElementById("btnScrollTop");
if (scrollBtn) scrollBtn.style.display = "none";



document.body.classList.add("modal-open");



// ⭐⭐⭐ 여기부터 추가 ⭐⭐⭐

// 카드 흔들림 힌트
const card = el("profileModal")?.querySelector(".modal-card");
if (card) {
  card.classList.remove("swipe-hint");
  setTimeout(()=> card.classList.add("swipe-hint"), 120);
  setTimeout(()=> card.classList.remove("swipe-hint"), 900);
}


// 첫 1회 토스트
if (!localStorage.getItem("memberSwipeHint")) {
  setTimeout(()=>{

  // ⭐ 강제로 toast 잠금 해제
  toast._lock = false;

  toast("좌우로 밀면 다음 회원을 볼 수 있어요", {
    duration:2500,
    force:true
  });

    // ⭐ 여기 안으로 이동 (핵심)
    localStorage.setItem("memberSwipeHint","1");

  }, 350);
}
}

function closeProfile() {
  const modal = el("profileModal");
  if (modal) {
    modal.hidden = true;

    // 🔵 마이페이지 모드 OFF (다음 열림 대비)
    modal.classList.remove("mypage");
  }

  resetPhotoTransform();
  document.body.classList.remove("modal-open");

const scrollBtn = document.getElementById("btnScrollTop");
if (scrollBtn) {
  scrollBtn.style.display = window.scrollY < 300 ? "none" : "block";
}


}


function nextMember(dir) {
  if (!modalCtx.list.length) return;

  let n = modalCtx.index + dir;
  if (n < 0) n = 0;
  if (n >= modalCtx.list.length) n = modalCtx.list.length - 1;

  if (n === modalCtx.index) return;
  openProfileAt(modalCtx.list, n);
// ⭐ swipe 사용 횟수 기록
swipeCount++;
localStorage.setItem("memberSwipeCount", swipeCount);

// ⭐ 3번 넘기면 힌트 종료
if (swipeCount >= 3) {
  localStorage.setItem("memberSwipeHint","1");
}
}

(function bindModalSwipe() {
  const modal = el("profileModal");
  const card = modal?.querySelector(".modal-card");
  if (!card) return;

  let sx = 0, sy = 0, st = 0;

  card.addEventListener("touchstart", (e) => {
    if (e.touches.length !== 1) return;
    sx = e.touches[0].clientX;
    sy = e.touches[0].clientY;
    st = Date.now();
  }, { passive: true });

  card.addEventListener("touchend", (e) => {
    const dt = Date.now() - st;
    const ex = e.changedTouches?.[0]?.clientX ?? sx;
    const ey = e.changedTouches?.[0]?.clientY ?? sy;

    const dx = ex - sx;
    const dy = ey - sy;

    // ✅ 좌우 스와이프 판정 (너무 느리거나 세로가 크면 무시)
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5 && dt < 600) {
      if (dx < 0) nextMember(+1); // 왼쪽으로 밀면 다음
      else nextMember(-1);        // 오른쪽으로 밀면 이전
    }
  });
})();


let photoScale = 1;
let photoTx = 0;
let photoTy = 0;

const ptrs = new Map(); // pointerId -> {x,y}
let pinchStartDist = 0;
let pinchStartScale = 1;
let dragStart = null; // {x,y,tx,ty}

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

function applyPhotoTransform() {
  const img = el("modalPhoto");
  if (!img) return;
  img.style.transform = `translate(${photoTx}px, ${photoTy}px) scale(${photoScale})`;
}

function resetPhotoTransform() {
  photoScale = 1;
  photoTx = 0;
  photoTy = 0;
  applyPhotoTransform();
}

(function bindPhotoPinch() {
  const img = el("modalPhoto");
  if (!img) return;

  img.addEventListener("pointerdown", (e) => {
    img.setPointerCapture(e.pointerId);
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (ptrs.size === 1) {
      dragStart = { x: e.clientX, y: e.clientY, tx: photoTx, ty: photoTy };
    }

    if (ptrs.size === 2) {
      // 핀치 시작
      const pts = [...ptrs.values()];
      pinchStartDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      pinchStartScale = photoScale;
      dragStart = null;
    }
  });

  img.addEventListener("pointermove", (e) => {
    if (!ptrs.has(e.pointerId)) return;
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (ptrs.size === 2) {
      const pts = [...ptrs.values()];
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const ratio = dist / (pinchStartDist || dist);

      photoScale = clamp(pinchStartScale * ratio, 1, 3); // 1~3배
      applyPhotoTransform();
      return;
    }

    if (ptrs.size === 1 && dragStart && photoScale > 1) {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      photoTx = dragStart.tx + dx;
      photoTy = dragStart.ty + dy;
      applyPhotoTransform();
    }
  });

  function endPtr(e) {
    ptrs.delete(e.pointerId);
    if (ptrs.size < 2) pinchStartDist = 0;
    if (ptrs.size === 0) dragStart = null;

    // 스케일이 1로 내려가면 위치도 초기화
    if (photoScale <= 1) resetPhotoTransform();
  }

  img.addEventListener("pointerup", endPtr);
  img.addEventListener("pointercancel", endPtr);

  // 더블클릭/더블탭으로 리셋(PC도 편함)
  img.addEventListener("dblclick", () => resetPhotoTransform());
})();


window.addEventListener("keydown", (e) => {
  if (el("profileModal")?.hidden === false) {
    if (e.key === "ArrowLeft") nextMember(-1);
    if (e.key === "ArrowRight") nextMember(+1);
    if (e.key === "Escape") closeProfile();
  }
});






function openImgModal(src){
  const m = el("imgModal");
  const img = el("imgModalPhoto");
  if (!m || !img) return;
  img.src = src;
  m.hidden = false;
}

function closeImgModal(){
  const m = el("imgModal");
  if (m) m.hidden = true;
}


function openAnnModal(a){
  const m = el("annModal");
  if (!m) return;
  el("annModalTitle").textContent = a?.title || "";
  el("annModalMeta").textContent =
  [formatDateTime(a?.date), a?.author].filter(Boolean).join(" · ");
  el("annModalBody").textContent = a?.body || "";
  m.hidden = false;

}

function closeAnnModal(){
  const m = el("annModal");
  if (m) m.hidden = true;
}

// ===============================
// 📅 일정 입력 시트 (열기/닫기)
// ===============================

function openEventSheet(data = {}) {

  const sheet = el("eventSheet");
  if (!sheet) return;

// 값 채우기
  el("evTitle").value = data.title || "";
editingEventId = data.id || null;   // 🔥 추가

const btnDelete = el("btnEventDelete");
if (btnDelete){
  btnDelete.hidden = !editingEventId;
}
  el("evDateText").textContent = data.date || ""; // 🔥 이거 추가
  el("evTime").value = data.time || "";
  el("evPlace").value = data.place || "";
  el("evDesc").value = data.desc || "";
  el("evIsPopup").checked = String(data.popup).toLowerCase() === "true";
  // 🔥 전체/기수 선택값 세팅
const isAll = Number(data.gisu || 0) === 0;

const rAll = document.querySelector('input[name="evScope"][value="all"]');
const rMy  = document.querySelector('input[name="evScope"][value="my"]');

if (rAll && rMy) {
  if (isAll) {
    rAll.checked = true;
  } else {
    rMy.checked = true;
  }
}

// 🔵 권한별 UI 처리
const box = el("evScopeBox");
if (box){
  if (state.me?.adminLevel === 1){
    box.style.display = "none";
  } else {
    box.style.display = "flex";
  }
}



  // 표시
  sheet.hidden = false;

  requestAnimationFrame(()=>{
    sheet.classList.add("show");
  });

  // 🔥 뒤로가기 대응 (핵심)
  history.pushState({ modal: "eventSheet" }, "", location.href);
}


function closeEventSheet(){

  const sheet = el("eventSheet");
  if (!sheet) return;

  sheet.classList.remove("show");

  setTimeout(()=>{
    sheet.hidden = true;
  }, 250);
}

async function loadEvents(yyyymm){
  const now = new Date();
  const ym = (yyyymm || `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,"0")}`)
    .replace(/[^0-9]/g,"")
    .slice(0,6);

  try{
    const json = await apiJsonp({
      action: "events",
      phone: state._authPhone,
      code: state._authCode,   // ✅ 핵심 수정
      yyyymm: ym
    });

    const list = json?.events || [];

    const box = el("eventsList");
    if(!list.length){
      box.innerHTML = "<div class='small'>등록된 일정이 없습니다.</div>";
      return;
    }

    let html = "";
    for(const e of list){
      html += `
        <div class="card">
          <b>${formatDate(e.date)} ${formatTime(e.startTime)}</b>
          <div>${e.title || ""}</div>
          ${e.place ? `<div class="small">📍 ${e.place}</div>` : ""}
          ${e.desc ? `<div class="small">${e.desc}</div>` : ""}
        </div>
      `;
    }

    box.innerHTML = html;

  }catch(e){
    console.error(e);
    el("eventsList").innerHTML = "일정 불러오기 실패";
  }
}

function loadUpcomingEvents(){
  google.script.run
    .withSuccessHandler((list)=>{
      const wrap = document.getElementById("eventListMain");
      if (!wrap) return;

      const arr = Array.isArray(list) ? list : [];
      if (!arr.length){
        wrap.textContent = "예정된 일정이 없습니다.";
        return;
      }

      wrap.innerHTML = arr.map(e=>{
        return `
          <div style="padding:6px 0;border-bottom:1px solid #eee;">
            <b>${e.title}</b><br/>
            <span style="color:#64748b;font-size:.9rem;">
              ${e.date} ${e.startTime || ""} ${e.place || ""}
            </span>
          </div>
        `;
      }).join("");
    })
    .getUpcomingEvents();
}


let calendar = null;
let allEvents = [];
let editingEventId = null;   // 🔥 추가
let calendarCache = {};
let currentEventDate = null;   // 🔥 추가

function loadCalendar(yyyymm){


  showLoading();

  // 🔥 이거 추가 (핵심)
  if (__calendarReloading){
    hideLoading();   // ← 이거 없어서 무한로딩
    return;
  }

  __calendarReloading = true;

  const base = yyyymm
    ? new Date(yyyymm.slice(0,4), Number(yyyymm.slice(4))-1, 1)
    : new Date();

  // 전월 / 현재월 / 다음월
  const months = [
    new Date(base.getFullYear(), base.getMonth()-1, 1),
    new Date(base.getFullYear(), base.getMonth(),   1),
    new Date(base.getFullYear(), base.getMonth()+1, 1),
  ];

  const keys = months.map(d =>
    `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}`
  );

  const need = keys.filter(k => !calendarCache[k]);

  // 이미 다 캐시돼 있으면 바로 그림
if (!need.length) {
  allEvents = keys.flatMap(k => calendarCache[k]);
  initCalendar(allEvents);
  __calendarReloading = false;   // 🔥 반드시 풀어준다


    hideLoading();   // 🔥🔥🔥 이거 추가 (핵심)

  return;
}


  Promise.all(
    need.map(k =>
  new Promise((resolve)=>{
    api("events", {
  ...getAuthSafe(),
  yyyymm: k
}, resolve);
  }).then(res => {

    const myGisu = Number(state.me?.gisu || 0);

const list = (res?.events || [])
  .filter(e => {
    const g = Number(String(e.gisu || "0").trim());
    return g === 0 || g === myGisu;   // 🔥 핵심
  })
  .map(e => ({

      id: e.id,
      title: e.title,
      start: e.date,
      end: e.endTime ? `${e.date}T${e.endTime}` : null,
      extendedProps: {
  date: e.date,
  startTime: e.startTime,
  place: e.place,
  desc: e.desc,
  gisu: Number(e.gisu || 0),
   popup: e.popup 



}
    }));

    calendarCache[k] = list;
  })
)




  ).then(() => {
  allEvents = keys.flatMap(k => calendarCache[k]);
  initCalendar(allEvents);
  __calendarReloading = false;


 hideLoading();   // 🔥 여기

}).catch(e=>{
    console.error(e);
    toast("달력 일정 불러오기 실패");
    __calendarReloading = false;   // ← 추가

  hideLoading();   // 🔥 여기

  });
}




function initCalendar(events){
  const el = document.getElementById("calendar");
  if (!el) return;



// 🔄 달력 로딩중 표시
const loading = document.getElementById("calendarLoading");
if (loading) loading.style.display = "block";



if (calendar) {
calendar.removeAllEventSources();   // 🔥 핵심

calendar.addEventSource(events);

calendar.addEventSource({
  googleCalendarId: "ko.south_korea#holiday@group.v.calendar.google.com",
  className: "holiday-event",
  color: "#d60000",
  textColor: "#d60000"
});

  // 🔥 추가 (이거 한줄이 핵심)
  const loading = document.getElementById("calendarLoading");
  if (loading) loading.style.display = "none";

  return;
}


  // ✅ 처음 한 번만 생성
  calendar = new FullCalendar.Calendar(el, {
    locale: "ko",
    initialView: "dayGridMonth",
    height: "auto",

  eventDisplay: 'list-item',   // 🔥 이거 추가

    headerToolbar: {
      left: "prev,next",
      center: "title",
      right: ""
    },

    // 날짜 숫자만 표시
    dayCellContent(arg) {
      return { html: String(arg.date.getDate()) };
    },

    // 달력 칸에는 제목만  전체일정 빨간색 처리 포함
eventContent(arg) {

  const gisu = Number(arg.event.extendedProps?.gisu || 0);

  const colorStyle = (gisu === 0)
    ? 'style="color:#d60000;font-weight:700;"'
    : '';

  return {
    html: `<span class="fc-title-only" ${colorStyle}>
             ${arg.event.title}
           </span>`
  };
},

    // 날짜 클릭 → 팝업
    dateClick(info){
      openDayEvents(info.dateStr);
    },

    eventClick(info) {
      info.jsEvent.preventDefault();
    },

    // 🔥 달 이동할 때마다 해당 월 일정 다시 불러오기
datesSet(info){

  // 🔥 렌더 중에는 절대 호출 금지
  if (__calendarReloading === true) return;

  // 🔥 이미 같은 달이면 막기 (핵심)
const yyyymm =
  info.view.currentStart.getFullYear() +
  String(info.view.currentStart.getMonth() + 1).padStart(2, "0");

  if (loadCalendar._lastYM === yyyymm) return;

  loadCalendar._lastYM = yyyymm;

  loadCalendar(yyyymm);
},


    eventSources: [

  events,   // 🔵 기존 일정

  {
    googleCalendarId: "ko.south_korea#holiday@group.v.calendar.google.com",
    className: "holiday-event",
    color: "#d60000",
    textColor: "#d60000"
  }

],
googleCalendarApiKey: "AIzaSyDjyQd4-nHYS2giAgNvO1wDwBGUcBJ3tuM"
  });

  calendar.render();

// ✅ 달력 로딩 완료 → 로딩 문구 숨김
if (loading) loading.style.display = "none";



}



 // ===============================
// 📅 일정 팝업 (최종 구조)
// ===============================
function openDayEvents(date){

  currentEventDate = date;

  const list = (allEvents || []).filter(e=>{
    const d = (e.extendedProps?.date || e.start || "").slice(0,10);
    return d === date;
  });


// 🔥 공휴일(공지) 가져오기
const holidays = (state.announcements || []).filter(a=>{
  const d = (a.date || "").slice(0,10);
  return d === date;
});


  openModal(`
    <div class="day-wrap">

      <!-- 🔵 상단 -->
      <div class="day-header">

        ${
          state.me?.isAdmin === true
          ? `<button id="btnAddEventTop" class="icon-btn">
              <svg viewBox="0 0 24 24" class="ico">
                <path d="M12 5v14M5 12h14"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"/>
              </svg>
            </button>`
          : `<div style="width:32px"></div>`
        }

<h3>
  ${date}
  ${
    (calendar?.getEvents() || [])
      .filter(e => {
        const d = (e.startStr || "").slice(0,10);

        // 🔥 니가 만든 일정 제외
        const isMyEvent = e.extendedProps?.gisu !== undefined;

        return d === date && !isMyEvent;
      })
      .map(e => {
        let title = e.title || "";

        // 🔥 여기만 추가 (핵심)
        if (title.startsWith("쉬는 날 ")) {
          const name = title.replace("쉬는 날 ", "");
          title = `${name} 대체공휴일`;
        }

        return `<div class="holiday-item">${title}</div>`;
      })
      .join("")
  }
</h3>

        <button class="icon-btn" onclick="closeModal()">
          <svg viewBox="0 0 24 24" class="ico">
            <path d="M6 6l12 12M18 6l-12 12"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"/>
          </svg>
        </button>

      </div>

      <!-- 🔵 리스트 -->
      <div class="day-scroll">

        ${(()=>{
          const holidays = list.filter(e =>
            e.source && e.source.googleCalendarId
          );

          const normalEvents = list.filter(e =>
            !(e.source && e.source.googleCalendarId)
          );

          let html = "";

          // 🔴 공휴일 먼저
          if (holidays.length){
            html += `
                <div class="holiday-line">
                ${holidays.map(h => h.title).join(", ")}
              </div>
            `;
          }

          // 📌 일반 일정
          if (!normalEvents.length){
            html += `<p class="empty">일정이 없습니다.</p>`;
          } else {

            html += normalEvents.map(e=>`

              <div class="event-item">

                <div class="event-top">

                  <div class="event-title">
                    <span style="
                      width:8px;
                      height:8px;
                      border-radius:50%;
                      display:inline-block;
                      background:${e.extendedProps?.gisu === 0 ? '#e53935' : '#111'};
                    "></span>
                    ${e.title || ""}
                  </div>

                  ${
                    (
                      state.me?.isAdmin === true &&
                      (
                        state.me.adminLevel === 0 ||
                        (
                          state.me.adminLevel === 1 &&
                          Number(e.extendedProps?.gisu) !== 0 &&
                          Number(e.extendedProps?.gisu) === Number(state.me.gisu)
                        )
                      )
                    ) ? `
                    <div class="menu-wrap">
                      <button class="menu-btn" onclick="toggleMenu(this)">⋯</button>
                      <div class="menu-popup">
                        <div class="menu-item" onclick="editEvent('${e.id}')">수정</div>
                        <div class="menu-item danger" onclick="deleteEvent('${e.id}')">삭제</div>
                      </div>
                    </div>
                  ` : ""
                  }

                </div>

                ${(()=>{
                  const d = (e.extendedProps?.date || e.start || "").slice(0,10);

                  const raw = String(e.extendedProps?.startTime || "");
                  const match = raw.match(/^(\d{2}):(\d{2})$/);

                  let timeText = "";

                  if (match){
                    let h = parseInt(match[1],10);
                    const m = match[2];

                    if (h >= 12){
                      timeText = "오후 " + (h - 12 || 12) + ":" + m;
                    } else {
                      timeText = "오전 " + h + ":" + m;
                    }
                  }

                  return `
                    <div class="event-meta">
                      ${d} ${timeText}
                      ${e.extendedProps?.place ? " / " + e.extendedProps.place : ""}
                    </div>
                  `;
                })()}

                ${e.extendedProps?.desc ? `
                  <div class="event-desc">
                    ${e.extendedProps.desc}
                  </div>
                ` : ""}

              </div>

            `).join("");
          }

          return html;

        })()}

      </div>

    </div>
  `);

  // 🔥 메뉴 초기화
  setTimeout(()=>{
    document.querySelectorAll(".menu-popup").forEach(p=>{
      p.style.display = "none";
    });
  },0);

  // 🔥 상단 + 버튼
  if (state.me?.isAdmin){
    setTimeout(()=>{
      const btn = el("btnAddEventTop");
      if (btn){
        btn.onclick = ()=>{
          openEventSheet({ date });
        };
      }
    },0);
  }
}







function reloadMembers() {
  if (!state._authPhone || !state._authCode) {
    toast("다시 로그인 후 시도");
    return;
  }

  toast("회원명부 업데이트 중...");

  api("data", {}, (json) => {
    if (!json || json.ok !== true) {
      toast("회원명부 불러오기 실패");
      return;
    }

    // ✅ 최신 시트 데이터로 state 갱신
    state.members = onlyRealMembers(json.members || [])
      .map(m => ({ ...m, phone: normalizePhone(m.phone) }));

// 🔵 로그인한 사용자 기수로 기본 필터 설정
currentClassFilter = state.me?.gisu
  ? Number(state.me.gisu)
  : null;

// 🔵 기수 버튼 텍스트도 변경
const btnClass = el("btnClassFilter");
if (btnClass) {
  btnClass.textContent = currentClassFilter
    ? `${currentClassFilter}기 ▼`
    : "기수전체 ▼";
}



    // ✅ 정렬 (로그인 때와 동일)
state.members.sort((a, b) =>
  (Number(a.gisu ?? 0) - Number(b.gisu ?? 0)) ||   // 1️⃣ 기수
  (Number(a.sortOrder ?? 9999) - Number(b.sortOrder ?? 9999)) || // 2️⃣ 정렬순서
  (a.name || "").localeCompare(b.name || "", "ko") // 3️⃣ 이름
);

    // ✅ 검색어 초기화
    const input = el("memberSearch");
    if (input) input.value = "";

    // ✅ 다시 렌더
    renderMembers(state.members);





    toast("회원명부 업데이트 완료");
  });
}









function openModal(html){
  const modal = document.getElementById("modal");
  const body  = document.getElementById("modalBody");
  body.innerHTML = html;
  body.scrollTop = 0;   // ✅ 이 줄 추가


  // 🔥 기존 footer 닫기 버튼 숨김 (핵심)
// 🔥 "day-wrap"일 때만 숨김
if (html.includes("day-wrap")) {
  const defaultFooter = modal.querySelector(".modal-footer");
  if (defaultFooter) defaultFooter.style.display = "none";
}

  modal.hidden = false;
}

function closeModal(){
  const modal = document.getElementById("modal");

  // 🔥 다시 살려줌 (다른 모달 위해)
  const defaultFooter = modal.querySelector(".modal-footer");
  if (defaultFooter) defaultFooter.style.display = "";

  modal.hidden = true;
}

function confirmAlerts(rows){
  if (!Array.isArray(rows) || !rows.length) {
    console.warn("confirmAlerts: rows empty → skip");
    closeModal();
    return;
  }

  api("markEventsNotified", { rows }, ()=>{
    closeModal();
  });
}


let __calendarReloading = false;



// 🗓️ 달력 새로고침 버튼 (완전 초기화)

el("btnCalendarRefresh")?.addEventListener("click", () => {

// 🔄 달력 새로고침 시작 → 로딩 표시
const loading = document.getElementById("calendarLoading");
if (loading) loading.style.display = "block";

  // 🔥 강제로 락 해제
  __calendarReloading = false;

  // 🔥 캐시 완전 초기화
  calendarCache = {};
  allEvents = [];

  // 🔥 달력 인스턴스 제거
  if (calendar) {
    calendar.destroy();
    calendar = null;
  }

  // 🔥 현재 달 기준 재로딩
  const now = new Date();
  const yyyymm =
    now.getFullYear() +
    String(now.getMonth() + 1).padStart(2, "0");

  loadCalendar(yyyymm);
});


// 🔄 공지사항 다시 불러오기
function reloadAnnouncements(){




  toast("공지 업데이트 중..."); // 🔥 먼저 보여줘서 체감속도 개선

  api("announcements", {}, (json)=>{




    if (!json || json.ok !== true) {
      toast("공지 새로고침 실패");
      return;
    }

    state.announcements = json.announcements || [];

    renderAnnouncements();
    renderLatest();

    toast("공지 업데이트 완료");

  });
}




// ===== 이름 5초 롱터치 중앙 애니메이션 (안정화 버전) =====
window.addEventListener("load", () => {

  const box = el("clubLogoSmall");   // 🔥 여기만 변경

// ⭐ 안드로이드 이미지 롱터치 메뉴 차단 (필수)
box.addEventListener("contextmenu", e => e.preventDefault());

  const overlay = el("holdOverlay");
  const circle = overlay?.querySelector("circle");

  if(!box || !overlay || !circle) {
    console.log("롱터치 DOM 못찾음");
    return;
  }

  overlay.style.pointerEvents = "none";

  let start = 0;
  let raf = null;
  const HOLD_DELAY = 1500;   // 처음 3초 대기
const HOLD_TIME  = 1500;   // 원형 애니메이션 2초

  function reset(){
  overlay.hidden = true;
  start = 0;   // ⭐ 핵심 (지연 시작 취소)
  cancelAnimationFrame(raf);
}

  function loop(){
    const p = Math.min(1,(Date.now()-start)/HOLD_TIME);

    if(circle && circle.style){
      circle.style.strokeDashoffset = 100 - (100*p);
    }

if (p >= 1) {
  reset();
  resetAppSameAsLongTouch();
  return;
}

    raf = requestAnimationFrame(loop);
  }

  box.addEventListener("touchstart",()=>{

  start = Date.now();

  // ⭐ 처음엔 아무것도 안보임
  overlay.hidden = true;

  setTimeout(()=>{

    // 아직 손 안뗐으면 애니메이션 시작
    if(!start) return;

    overlay.hidden = false;
    start = Date.now();
    loop();

  }, HOLD_DELAY);

});

  box.addEventListener("touchend",reset);
  box.addEventListener("touchcancel",reset);

});

function isKakaoInApp() {
  return /KAKAOTALK/i.test(navigator.userAgent);
}


// 🔵 기수 슬라이드 열기
const btnClassFilter = document.getElementById("btnClassFilter");
const classSlide = document.getElementById("classSlide");

if (btnClassFilter) {
btnClassFilter.addEventListener("click", () => {

  buildClassWheel();   // 🔥 반드시 먼저 호출

  document.body.style.overflow = "hidden";
  classSlide.hidden = false;

  requestAnimationFrame(() => {
    classSlide.classList.add("show");
  });

});
}






function closeClassSlide() {
  const panel = classSlide.querySelector(".class-slide-panel");

  classSlide.classList.remove("show");

  // 🔥 스와이프 중 transform 초기화
  if (panel) panel.style.transform = "";

  setTimeout(() => {
    classSlide.hidden = true;
    document.body.style.overflow = "";   // 스크롤 복구
  }, 250);
}




/* ============================
   iOS Infinite Wheel Engine
============================ */

function buildClassWheel(){

  if (!state || !Array.isArray(state.members) || state.members.length === 0) {
    return;
  }

  let scroller = document.getElementById("classScroller");
  if (!scroller) return;

  scroller.replaceWith(scroller.cloneNode(true));
  scroller = document.getElementById("classScroller");
  if(!scroller) return;

  const highlightBtn = document.getElementById("highlightBtn");

  const MAX_REPEAT = 40;

  let base = [...new Set(
    state.members
      .map(m => Number(m.gisu))
      .filter(g => !isNaN(g))
  )];

  base.sort((a,b)=> a-b);

  if(base.length === 0) return;

  const wheelItems = [
    "총동문 집행부",
    "기수전체",
    ...base.map(g => `${g}기`)
  ];

  const items = Array.from({length:MAX_REPEAT}, ()=>wheelItems).flat();

  scroller.innerHTML = items.map((t,i)=>`
    <div class="wheel-item" data-index="${i}" data-label="${t}" data-active="0">${t}</div>
  `).join("");

  const itemEls = Array.from(scroller.querySelectorAll(".wheel-item"));

  itemEls.forEach(elItem => {
    elItem.addEventListener("click", () => {

      const label = elItem.dataset.label;
      const btnClass = document.getElementById("btnClassFilter");

      if(label === "총동문 집행부"){
        execMode = true;
        currentClassFilter = null;
        if(btnClass) btnClass.textContent = "총.집행부 ▼";
      }
      else if(label === "기수전체"){
        execMode = false;
        currentClassFilter = null;
        if(btnClass) btnClass.textContent = "기수전체 ▼";
      }
      else{
        execMode = false;
        const gisu = Number(label.replace("기",""));
        currentClassFilter = gisu;
        if(btnClass) btnClass.textContent = `${gisu}기 ▼`;
      }

      closeClassSlide();
      renderMembers(state.members);
    });
  });

  function getNearestIndex(){
    const rect = scroller.getBoundingClientRect();
    const centerY = rect.top + rect.height/2;

    let bestIdx = 0;
    let bestDist = Infinity;

    for(const el of itemEls){
      const r = el.getBoundingClientRect();
      const y = r.top + r.height/2;
      const d = Math.abs(y - centerY);
      if(d < bestDist){
        bestDist = d;
        bestIdx = Number(el.dataset.index);
      }
    }
    return bestIdx;
  }

  function setActive(idx){
    itemEls.forEach(el => el.dataset.active = "0");
    if(itemEls[idx]) itemEls[idx].dataset.active = "1";
  }

  function snapToIndex(idx, smooth=true){

    const elItem = itemEls[idx];
    if(!elItem) return;

    const target =
      elItem.offsetTop -
      (scroller.clientHeight / 2 - elItem.offsetHeight / 2);

    if (smooth) {
      scroller.scrollTo({ top: target, behavior: "smooth" });
    } else {
      scroller.scrollTop = target;
    }

    setActive(idx);
  }

  const centerBlock = Math.floor(MAX_REPEAT/2);
  const blockSize = wheelItems.length;
  const centerStart = centerBlock * blockSize;

  let initialIdx = centerStart + 1;

  if(execMode){
    initialIdx = centerStart;
  }
  else if(currentClassFilter === null){
    initialIdx = centerStart + 1;
  }
  else{
    const pos = base.indexOf(Number(currentClassFilter));
    if(pos >= 0){
      initialIdx = centerStart + pos + 2;
    }
  }

  requestAnimationFrame(()=>{
    requestAnimationFrame(()=>{
      snapToIndex(initialIdx,false);
    });
  });

  let scrollTimer = null;

  scroller.addEventListener("scroll", ()=>{

    clearTimeout(scrollTimer);

    scrollTimer = setTimeout(()=>{

      const idx = getNearestIndex();
      snapToIndex(idx,false);

    },120);

  }, { passive:true });

  if (highlightBtn) {
    highlightBtn.onclick = function(){

      const idx = getNearestIndex();
      const label = items[idx];
      const btnClass = document.getElementById("btnClassFilter");

      if(label === "총동문 집행부"){
        execMode = true;
        currentClassFilter = null;
        if(btnClass) btnClass.textContent = "총.집행부 ▼";
      }
      else if(label === "기수전체"){
        execMode = false;
        currentClassFilter = null;
        if(btnClass) btnClass.textContent = "기수전체 ▼";
      }
      else{
        execMode = false;
        currentClassFilter = Number(label.replace("기",""));
        if(btnClass) btnClass.textContent = label + " ▼";
      }

      renderMembers(state.members);

      if (typeof closeClassSlide === "function") {
        closeClassSlide();
      }

    };
  }



window.__snapClassWheelToAll = function(){

  const scroller = document.getElementById("classScroller");
  if(!scroller) return;

  const items = scroller.querySelectorAll(".wheel-item");

  const blockSize = 2 + new Set(
    state.members.map(m=>Number(m.gisu)).filter(g=>!isNaN(g))
  ).size;

  const centerBlock = Math.floor(40/2);
  const centerStart = centerBlock * blockSize;

  const targetIndex = centerStart + 1; // 기수전체

  const elItem = items[targetIndex];

  if(!elItem) return;

  const target =
    elItem.offsetTop -
    (scroller.clientHeight/2 - elItem.offsetHeight/2);

  scroller.scrollTo({
    top: target,
    behavior: "smooth"
  });

};



}







function buildClassList() {

  const listEl = document.getElementById("classSlideList");
  if (!listEl) return;

  const members = state.members || [];

  // 🔵 기수 수집
  const set = new Set();
  members.forEach(m => {
    const g = Number(m.gisu || 0);
    set.add(g);
  });

  let arr = Array.from(set);

  // 🔵 정렬: 최신 위 / 0기 맨 아래
  arr.sort((a,b)=>{
    if (a === 0) return 1;
    if (b === 0) return -1;
    return b - a;
  });

  listEl.innerHTML = "";

  // 🔵 전체 버튼
  const allItem = document.createElement("div");
  allItem.className = "class-item";
  allItem.textContent = "기수전체";
  if (currentClassFilter === null) allItem.classList.add("active");

allItem.onclick = () => {
  currentClassFilter = null;
  document.getElementById("btnClassFilter").textContent = "기수전체 ▾";
  renderMembers(state.members);
};

  listEl.appendChild(allItem);

  // 🔵 기수 버튼들
  arr.forEach(g => {

    const item = document.createElement("div");
    item.className = "class-item";
    item.textContent = g + "기";

    if (currentClassFilter === g) item.classList.add("active");

    item.onclick = () => {
      currentClassFilter = g;
      document.getElementById("btnClassFilter").textContent = g + "기 ▾";
      closeClassSlide();
      renderMembers(state.members);
    };

    listEl.appendChild(item);
  });
}


// 🔥 슬라이드 좌로 밀어 닫기
(function(){

  const slide = document.getElementById("classSlide");
  const panel = slide?.querySelector(".class-slide-panel");
  if (!slide || !panel) return;

  let startX = 0;
  let currentX = 0;
  let dragging = false;

panel.addEventListener("touchstart", (e)=>{
  startX = e.touches[0].clientX;
  currentX = startX;   // 🔥 이 줄 추가 (핵심)
  dragging = true;
}, { passive:true });

  panel.addEventListener("touchmove", (e)=>{
    if (!dragging) return;

    currentX = e.touches[0].clientX;
    const diff = currentX - startX;

    // 🔵 오른쪽에서 왼쪽으로 밀 때만
    if (diff < 0) {
      panel.style.transform = `translateX(${diff}px)`;
    }
  }, { passive:true });

  panel.addEventListener("touchend", ()=>{
    dragging = false;

    const diff = currentX - startX;

    // 🔥 60px 이상 밀면 닫기
    if (diff < -60) {
      closeClassSlide();
    } else {
      panel.style.transform = "";
    }

    currentX = 0;
  });

})();


// 🔥 기수 정렬 토글
const gisuSortBtn = document.getElementById("gisuSortBtn");

if (gisuSortBtn) {
  gisuSortBtn.addEventListener("click", () => {
    gisuSortDesc = !gisuSortDesc;
    gisuSortBtn.textContent = gisuSortDesc ? "최신기수순" : "오래된기수순";
    renderMembers(state.members);
  });
}






// 🔥 공통 confirm 함수
function appConfirm(message){

  return new Promise(resolve => {

    const modal = document.getElementById("confirmModal");
    const msg = document.getElementById("confirmMessage");
    const btnOk = document.getElementById("confirmOk");
    const btnCancel = document.getElementById("confirmCancel");

    msg.textContent = message;
    modal.hidden = false;

    function close(result){
      modal.hidden = true;
      btnOk.removeEventListener("click", okHandler);
      btnCancel.removeEventListener("click", cancelHandler);
      resolve(result);
    }

    function okHandler(){ close(true); }
    function cancelHandler(){ close(false); }

    btnOk.addEventListener("click", okHandler);
    btnCancel.addEventListener("click", cancelHandler);
  });
}

// 🔼 맨 위로 버튼

 

window.addEventListener("DOMContentLoaded", () => {

  const scrollBtn = document.getElementById("btnScrollTop");
  if(!scrollBtn) return;
 console.log("스크롤 버튼 이동 또 실행됨");  // 🔥 확인용
  document.body.appendChild(scrollBtn);

  scrollBtn.hidden = false;                 // 🔥 추가
  scrollBtn.removeAttribute("hidden");      // 🔥 추가

  const toggle = () => {
    scrollBtn.style.display = window.scrollY < 300 ? "none" : "block";
  };

  toggle();
  window.addEventListener("scroll", toggle);

  scrollBtn.onclick = () => {
    window.scrollTo({
      top:0,
      behavior:"smooth"
    });
  };

});


(function bindImgModalPinch(){

  const img = document.getElementById("imgModalPhoto");
  if (!img) return;

  let scale = 1;
  let tx = 0;
  let ty = 0;

  const ptrs = new Map();
  let pinchStartDist = 0;
  let pinchStartScale = 1;
  let dragStart = null;

  function clamp(v, min, max){ return Math.max(min, Math.min(max, v)); }

  function apply(){
    img.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
  }

  function reset(){
    scale = 1;
    tx = 0;
    ty = 0;
    apply();
  }

  img.addEventListener("pointerdown", (e)=>{
    img.setPointerCapture(e.pointerId);
    ptrs.set(e.pointerId, {x:e.clientX, y:e.clientY});

    if(ptrs.size === 1){
      dragStart = {x:e.clientX, y:e.clientY, tx, ty};
    }

    if(ptrs.size === 2){
      const pts = [...ptrs.values()];
      pinchStartDist = Math.hypot(pts[0].x-pts[1].x, pts[0].y-pts[1].y);
      pinchStartScale = scale;
      dragStart = null;
    }
  });

  img.addEventListener("pointermove", (e)=>{
    if(!ptrs.has(e.pointerId)) return;
    ptrs.set(e.pointerId, {x:e.clientX, y:e.clientY});

    if(ptrs.size === 2){
      const pts = [...ptrs.values()];
      const dist = Math.hypot(pts[0].x-pts[1].x, pts[0].y-pts[1].y);
      const ratio = dist / (pinchStartDist || dist);

      scale = clamp(pinchStartScale * ratio, 1, 4);
      apply();
      return;
    }

    if(ptrs.size === 1 && dragStart && scale > 1){
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      tx = dragStart.tx + dx;
      ty = dragStart.ty + dy;
      apply();
    }
  });

  function end(e){
    ptrs.delete(e.pointerId);
    if(ptrs.size < 2) pinchStartDist = 0;
    if(ptrs.size === 0) dragStart = null;

    if(scale <= 1) reset();
  }

  img.addEventListener("pointerup", end);
  img.addEventListener("pointercancel", end);

img.addEventListener("dblclick", reset);

})();   // 🔥 이건 그대로 (이 함수 끝)


function editEvent(id){

  const e = allEvents.find(v => v.id == id);
  if (!e) return;

  openEventSheet({
    id: e.id,
    title: e.title,
    date: e.extendedProps.date,
    time: e.extendedProps.startTime,
    place: e.extendedProps.place,
    desc: e.extendedProps.desc,
    popup: e.extendedProps.popup,  
    gisu: e.extendedProps.gisu

  });
}

function deleteEvent(id){

  showLoading();   // 🔥 여기 추가 (confirm 전에)

  if (!confirm("삭제할까요?")) {
    hideLoading();   // 🔥 취소하면 다시 숨김
    return;
  }

api("adminDeleteEvent", {
  ...getAuthSafe(),
  id: id
}, (res)=>{

    if (res && res.ok){
toast("삭제 완료");



calendarCache = {};
allEvents = [];

loadCalendar();

// 🔥 달력 로딩 끝날때까지 기다렸다 열기
const wait = setInterval(()=>{
  if (!__calendarReloading){
    clearInterval(wait);
    openDayEvents(currentEventDate);
  }
}, 50);
 
    } else {
      toast("삭제 실패");

  hideLoading();   // 🔥 실패시 숨김

    }

  });
}

function toggleMenu(btn){

  const popup = btn.nextElementSibling;
  if (!popup) return;

  // 전부 닫기
  document.querySelectorAll(".menu-popup").forEach(p=>{
    p.style.display = "none";
  });

  // 토글
  if (popup.style.display === "block"){
    popup.style.display = "none";
  } else {
    popup.style.display = "block";
  }
}




document.addEventListener("click", function(e){

  // 메뉴 버튼 클릭이면 무시 (이미 toggleMenu에서 처리함)
  if (e.target.closest(".menu-btn")) return;

  // 메뉴 영역 클릭이면 무시
  if (e.target.closest(".menu-popup")) return;

  // 그 외 → 전부 닫기
  document.querySelectorAll(".menu-popup").forEach(p=>{
    p.style.display = "none";
  });

});

function loadAdCategories(){

  startFeaturedAds();

  const ads = state.ads || [];

  const map = {};

  ads.forEach(ad => {

    const name =
      String(ad.category || "").trim();

    if(!name) return;

    if(!map[name]){
      map[name] = 0;
    }

    map[name]++;

  });

  const list =
    Object.keys(map)
      .sort()
      .map(name => ({
        name,
        count: map[name]
      }));

  const box = el("adsCategoryList");

  if(!list.length){

    box.innerHTML =
      "등록된 광고 없음";

    return;
  }

  box.className = "ad-grid";

  box.innerHTML = list.map(c=>`

    <div
      class="ad-tile2"
      onclick="openAdCategory('${c.name}')">

      <div class="ad-tile-name">
        ${c.name}
      </div>

      <div class="ad-tile-count">
        ${c.count}개 업체
      </div>

    </div>

  `).join("");

}

function openAdCategory(category){

  pushNav("adlist");

  el("adListTitle").textContent = category;

  console.time("광고목록");

  const list =
    (state.ads || [])
      .filter(ad =>
        ad.category === category
      );

  console.timeEnd("광고목록");
  console.log("광고목록(로컬)", list);

  const box = el("adCompanyList");

  if(!list.length){

    box.innerHTML =
      "등록된 업체 없음";

    return;
  }

  box.innerHTML = list.map(ad=>`

    <div class="row"
      onclick="openAdModal('${ad.adId}')">

      <div class="row-main">

        <div class="row-title">
          ${ad.storeName}
        </div>

        <div class="row-sub">
          ${ad.gisu}기
          ${ad.memberName}
        </div>

        <div class="row-sub">
          ${ad.intro || ""}
        </div>

      </div>

    </div>

  `).join("");

}

function openAdModal(adId){

  history.pushState(
    { modal:"ad" },
    "",
    "#ad"
  );

  console.time("광고상세");

  const ad =
    (state.ads || [])
      .find(x =>
        String(x.adId) === String(adId)
      );


currentAdIndex =
  (state.ads || [])
    .findIndex(x =>
      String(x.adId) === String(adId)
    );


  console.timeEnd("광고상세");

  if(!ad) return;

  el("adModalStoreName").textContent =
    ad.storeName || "";

  el("adModalOwner").textContent =
    `${ad.gisu}기 ${ad.memberName}`;

  el("adModalIntro").textContent =
    ad.intro || "";

  el("adModalAddress").textContent =
    ad.address || "";

  el("adModalDesc").textContent =
    ad.desc || "";

  const tel = el("adModalTel");
  tel.href = `tel:${ad.tel || ""}`;

  const home = el("adModalHome");

  if(ad.homepage){
    home.href = ad.homepage;
    home.style.display = "";
  }else{
    home.style.display = "none";
  }

  const img = el("adModalMainPhoto");

if(ad.mainPhoto){

  img.src = ad.mainPhoto;
  img.style.display = "";

  img.onclick = ()=>{
    window.open(
      ad.mainPhoto,
      "_blank"
    );
  };

  img.style.cursor =
    "pointer";

}else{

  img.style.display =
    "none";

}

  const gallery = el("adModalGallery");

  const photos = [
    ad.photo2,
    ad.photo3,
    ad.photo4,
    ad.photo5
  ].filter(Boolean);

  gallery.innerHTML =
    photos.map(url => `
      <img
        src="${url}"
        style="
          width:100%;
          border-radius:12px;
          cursor:pointer;
        "
        onclick="window.open('${url}','_blank')">
    `).join("");

  document.body.classList.add("modal-open");

  el("adModal").hidden = false;
bindAdSwipe();
}

let adSwipeBound = false;
let adSwipeStartX = 0;
let adSwipeStartY = 0;

function bindAdSwipe(){

  if(adSwipeBound) return;

  const modal =
    el("adModal");

  if(!modal) return;

  adSwipeBound = true;

  modal.addEventListener("touchstart",(e)=>{

    if(e.touches.length !== 1) return;

    adSwipeStartX =
      e.touches[0].clientX;

    adSwipeStartY =
      e.touches[0].clientY;

  },{passive:true});

  modal.addEventListener("touchend",(e)=>{

    const dx =
      e.changedTouches[0].clientX -
      adSwipeStartX;

    const dy =
      e.changedTouches[0].clientY -
      adSwipeStartY;

    if(
      Math.abs(dx) > 60 &&
      Math.abs(dx) > Math.abs(dy) * 1.5
    ){

      if(dx < 0){
        nextAdModal();
      }else{
        prevAd();
      }

    }

  });

}

function closeAdModal(){

  console.log(
    "광고닫기",
    JSON.stringify(state.navStack)
  );

  el("adModal").hidden = true;

  document.body.classList.remove("modal-open");

  startFeaturedAds();
}






function openMainBylaws(){

  el("bylawsTabs").hidden = false;

  el("tabMainBylaws").style.background =
    "#0b4ea2";

  el("tabMainBylaws").style.color =
    "#fff";

  el("tabClassBylaws").style.background =
    "#eef2ff";

  el("tabClassBylaws").style.color =
    "#0b4ea2";

  el("textTitle").textContent =
    "회칙";

  renderBylawsView();

  if(state.navStack.at(-1)!=="text"){
    pushNav("text");
  }
}





function openClassBylaws(){

  el("bylawsTabs").hidden = false;

  el("tabClassBylaws").style.background =
    "#0b4ea2";

  el("tabClassBylaws").style.color =
    "#fff";

  el("tabMainBylaws").style.background =
    "#eef2ff";

  el("tabMainBylaws").style.color =
    "#0b4ea2";

  el("textTitle").textContent =
      "회칙";

  renderClassBylaws();

  if(state.navStack.at(-1)!=="text"){
    pushNav("text");
  }
}







function openBylawsSelect(){

  el("bylawsTabs").hidden = false;

  openMainBylaws();
}





function renderFeaturedAd(){

  if(!featuredAds.length) return;

  const ad = featuredAds[featuredAdIndex];

  const card = el("featuredAdCard");

  if(!card) return;

  card.hidden = false;


const photo =
  el("featuredAdPhoto");

if(ad.mainPhoto){

  photo.src =
    ad.mainPhoto;

  photo.hidden =
    false;

}else{

  photo.hidden =
    true;

}



  el("featuredAdName").textContent =
    ad.storeName || "";

  el("featuredAdOwner").textContent =
    `${ad.gisu}기 ${ad.memberName}`;

  el("featuredAdIntro").textContent =
    ad.intro || "";

  card.onclick = ()=>{
    openAdModal(ad.adId);
  };

el("featuredAdDots").textContent =
  `Next.. ⟳${featuredAdRemain}s`;
}

function nextFeaturedAd(){

  if(featuredAds.length <= 1) return;

  featuredAdIndex++;

  if(featuredAdIndex >= featuredAds.length){
    featuredAdIndex = 0;
  }

  featuredAdRemain = 10;

  renderFeaturedAd();
}



function startFeaturedAds(){

  clearInterval(featuredAdTimer);

  featuredAds = [...(state.ads || [])];

  if(!featuredAds.length){
    return;
  }

  featuredAds.sort(
    ()=>Math.random()-0.5
  );

  featuredAdIndex = 0;

  featuredAdRemain = 10;

  renderFeaturedAd();

  featuredAdTimer =
    setInterval(()=>{

      featuredAdRemain--;

      el("featuredAdDots").textContent =
  `Next.. ⟳${featuredAdRemain}s`;


if(featuredAdRemain <= 0){

  featuredAdRemain = 10;

  nextFeaturedAd();

}

    },1000);

}




function prevAd(){

  if(!state.ads?.length) return;

  currentAdIndex--;

  if(currentAdIndex < 0){
    currentAdIndex =
      state.ads.length - 1;
  }

  closeAdModal();

  openAdModal(
    state.ads[currentAdIndex].adId
  );

}

function nextAdModal(){

  if(!state.ads?.length) return;

  currentAdIndex++;

  if(currentAdIndex >= state.ads.length){
    currentAdIndex = 0;
  }

  closeAdModal();

  openAdModal(
    state.ads[currentAdIndex].adId
  );

}
