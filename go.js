"use strict";

const APP_URL = "https://handong.khanreal.kr/";
const ANDROID_INTENT_URL =
  "intent://handong.khanreal.kr/#Intent;scheme=https;package=com.android.chrome;" +
  "action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;" +
  "S.browser_fallback_url=https%3A%2F%2Fhandong.khanreal.kr%2F;end";

function isAndroidDevice(userAgent = navigator.userAgent) {
  return /Android/i.test(String(userAgent || ""));
}

function isInAppBrowser(userAgent = navigator.userAgent) {
  return /KAKAOTALK|NAVER|Band|Daum/i.test(String(userAgent || ""));
}

function setCopyStatus(message, isError = false) {
  const status = document.getElementById("copyStatus");
  if (!status) return;
  status.textContent = message;
  status.classList.toggle("is-error", isError);
}

function selectOfficialAddress() {
  const address = document.getElementById("officialAddress");
  if (!address) return false;
  address.focus();
  address.select();
  address.setSelectionRange?.(0, address.value.length);
  return true;
}

async function copyOfficialAddress() {
  const button = document.getElementById("btnCopyAddress");
  let copied = false;

  try {
    if (!navigator.clipboard?.writeText) throw new Error("CLIPBOARD_UNAVAILABLE");
    await navigator.clipboard.writeText(APP_URL);
    copied = true;
  } catch (error) {
    selectOfficialAddress();
    try {
      copied = document.execCommand?.("copy") === true;
    } catch (fallbackError) {
      copied = false;
    }
  }

  if (copied) {
    setCopyStatus("주소가 복사되었습니다.");
    if (button) {
      const originalLabel = button.textContent;
      button.textContent = "복사 완료 ✓";
      button.disabled = true;
      window.setTimeout(() => {
        button.textContent = originalLabel;
        button.disabled = false;
      }, 1800);
    }
    return true;
  }

  setCopyStatus("자동 복사가 차단되었습니다. 주소를 길게 눌러 복사해 주세요.", true);
  return false;
}

function showGuide(type) {
  const androidGuide = document.getElementById("androidGuide");
  const iosGuide = document.getElementById("iosGuide");
  if (androidGuide) androidGuide.hidden = type !== "android";
  if (iosGuide) iosGuide.hidden = type !== "ios";
  document.getElementById(type + "Guide")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function openOfficialApp() {
  window.location.assign(APP_URL);
}

function startAndroidInstall() {
  showGuide("android");
  if (isAndroidDevice() && isInAppBrowser()) {
    window.location.assign(ANDROID_INTENT_URL);
    return;
  }
  window.location.assign(APP_URL);
}

function initGoInstallPage() {
  document.getElementById("btnCopyAddress")?.addEventListener("click", copyOfficialAddress);
  document.getElementById("btnOpenWeb")?.addEventListener("click", openOfficialApp);
  document.getElementById("btnAndroidInstall")?.addEventListener("click", startAndroidInstall);
  document.getElementById("btnIosGuide")?.addEventListener("click", () => showGuide("ios"));

  const notice = document.getElementById("browserNotice");
  if (notice && isInAppBrowser()) {
    notice.hidden = false;
    notice.textContent =
      "앱 안의 브라우저로 열렸습니다. 우측 상단 메뉴에서 ‘다른 브라우저로 열기’를 선택하거나 공식 주소를 복사해 주세요.";
  }
}

document.addEventListener("DOMContentLoaded", initGoInstallPage, { once: true });
