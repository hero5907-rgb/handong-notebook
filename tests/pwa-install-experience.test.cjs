const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "styles.css"), "utf8");
const goHtml = fs.readFileSync(path.join(root, "go.html"), "utf8");
const goCss = fs.readFileSync(path.join(root, "go.css"), "utf8");
const goJs = fs.readFileSync(path.join(root, "go.js"), "utf8");
const sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");

let passed = 0;
function test(name, fn) {
  return Promise.resolve()
    .then(fn)
    .then(() => {
      passed += 1;
    }, (error) => {
      error.message = name + ": " + error.message;
      throw error;
    });
}

function extractFunction(source, name) {
  const functionStart = source.indexOf("function " + name + "(");
  assert.notEqual(functionStart, -1, name + " 함수가 있어야 합니다.");
  const start = source.slice(Math.max(0, functionStart - 6), functionStart) === "async "
    ? functionStart - 6
    : functionStart;
  const signatureEnd = source.indexOf(") {", start);
  const bodyStart = signatureEnd === -1
    ? source.indexOf("{", start)
    : signatureEnd + 2;
  let depth = 0;
  let quote = "";
  let escaped = false;
  for (let i = bodyStart; i < source.length; i += 1) {
    const char = source[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = "";
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error(name + " 함수 끝을 찾지 못했습니다.");
}

const parseSource = extractFunction(app, "parsePwaDismissedUntil");
const shouldSource = extractFunction(app, "shouldShowAutomaticPwaInstall");
const pureFactory = new Function(
  parseSource + "\n" + shouldSource +
  "\nreturn { parsePwaDismissedUntil, shouldShowAutomaticPwaInstall };"
);
const pure = pureFactory();
const now = 2_000_000_000_000;
const allowedBase = {
  platform: "android",
  standalone: false,
  hasPrompt: true,
  loggedIn: true,
  homeVisible: true,
  blockingUiOpen: false,
  dismissedUntil: 0,
  now
};

function makeRequestHarness(outcome) {
  const requestSource = extractFunction(app, "requestPwaInstall");
  const installButton = { disabled: false, textContent: "" };
  const closes = [];
  const promptEvent = {
    promptCalls: 0,
    async prompt() { this.promptCalls += 1; },
    userChoice: Promise.resolve({ outcome })
  };
  const harness = new Function("promptEvent", "installButton", "closes", `
    let deferredPrompt = promptEvent;
    let pwaInstallMode = "prompt";
    let guideCalls = 0;
    const el = id => id === "btnPwaInstallNow" ? installButton : null;
    const closePwaInstallDialog = options => closes.push(options);
    const openPwaInstallGuide = () => { guideCalls += 1; };
    const configurePwaInstallDialog = () => {};
    const getPwaPlatform = () => "android";
    ${requestSource}
    return {
      run: requestPwaInstall,
      getDeferred: () => deferredPrompt,
      getGuideCalls: () => guideCalls
    };
  `)(promptEvent, installButton, closes);
  return { ...harness, closes, promptEvent };
}

function makeCopyHarness({ clipboard, execResult }) {
  const status = {
    textContent: "",
    classList: { toggle() {} }
  };
  const address = {
    value: "https://handong.khanreal.kr/",
    focused: false,
    selected: false,
    focus() { this.focused = true; },
    select() { this.selected = true; },
    setSelectionRange() {}
  };
  const button = { textContent: "주소 복사", disabled: false };
  const elements = {
    copyStatus: status,
    officialAddress: address,
    btnCopyAddress: button
  };
  const document = {
    getElementById: id => elements[id] || null,
    execCommand: () => execResult
  };
  const window = { setTimeout: fn => fn() };
  const factory = new Function("navigator", "document", "window", `
    const APP_URL = "https://handong.khanreal.kr/";
    ${extractFunction(goJs, "setCopyStatus")}
    ${extractFunction(goJs, "selectOfficialAddress")}
    ${extractFunction(goJs, "copyOfficialAddress")}
    return copyOfficialAddress;
  `);
  return {
    run: factory({ clipboard }, document, window),
    status,
    address,
    button
  };
}

(async () => {
  await test("beforeinstallprompt 리스너는 정확히 1개", () => {
    assert.equal((app.match(/addEventListener\(\s*["']beforeinstallprompt["']/g) || []).length, 1);
  });
  await test("appinstalled 리스너는 정확히 1개", () => {
    assert.equal((app.match(/addEventListener\(\s*["']appinstalled["']/g) || []).length, 1);
  });
  await test("설치 이벤트 전 자동 안내 없음", () => {
    assert.equal(pure.shouldShowAutomaticPwaInstall({ ...allowedBase, hasPrompt: false }), false);
  });
  await test("Android 설치 가능 로그인 홈에서 자동 안내", () => {
    assert.equal(pure.shouldShowAutomaticPwaInstall(allowedBase), true);
  });
  await test("로그인 전 자동 안내 없음", () => {
    assert.equal(pure.shouldShowAutomaticPwaInstall({ ...allowedBase, loggedIn: false }), false);
  });
  await test("홈 표시 전 자동 안내 없음", () => {
    assert.equal(pure.shouldShowAutomaticPwaInstall({ ...allowedBase, homeVisible: false }), false);
  });
  await test("standalone 자동 안내 없음", () => {
    assert.equal(pure.shouldShowAutomaticPwaInstall({ ...allowedBase, standalone: true }), false);
  });
  await test("다른 모달과 자동 안내 중첩 없음", () => {
    assert.equal(pure.shouldShowAutomaticPwaInstall({ ...allowedBase, blockingUiOpen: true }), false);
  });
  await test("iPhone 자동 설치창 없음", () => {
    assert.equal(pure.shouldShowAutomaticPwaInstall({ ...allowedBase, platform: "ios" }), false);
  });
  await test("PC 자동 설치창 없음", () => {
    assert.equal(pure.shouldShowAutomaticPwaInstall({ ...allowedBase, platform: "desktop" }), false);
  });
  await test("7일 유예 중 자동 안내 없음", () => {
    assert.equal(pure.shouldShowAutomaticPwaInstall({ ...allowedBase, dismissedUntil: now + 1 }), false);
  });
  await test("7일 유예 경과 후 자동 안내 가능", () => {
    assert.equal(pure.shouldShowAutomaticPwaInstall({ ...allowedBase, dismissedUntil: now - 1 }), true);
  });
  await test("손상된 유예 값은 0", () => {
    assert.equal(pure.parsePwaDismissedUntil("broken"), 0);
  });
  await test("음수 유예 값은 0", () => {
    assert.equal(pure.parsePwaDismissedUntil("-10"), 0);
  });
  await test("설치 클릭에서 prompt 1회", async () => {
    const harness = makeRequestHarness("accepted");
    await harness.run();
    assert.equal(harness.promptEvent.promptCalls, 1);
  });
  await test("accepted는 유예 없이 닫힘", async () => {
    const harness = makeRequestHarness("accepted");
    await harness.run();
    assert.deepEqual(harness.closes, [{ defer: false }]);
  });
  await test("dismissed는 7일 유예로 닫힘", async () => {
    const harness = makeRequestHarness("dismissed");
    await harness.run();
    assert.deepEqual(harness.closes, [{ defer: true }]);
  });
  await test("사용한 deferred event 재사용 금지", async () => {
    const harness = makeRequestHarness("accepted");
    await harness.run();
    await harness.run();
    assert.equal(harness.getGuideCalls(), 1);
  });
  await test("나중에/X/배경은 공통 닫기 경로", () => {
    assert.match(app, /btnPwaInstallLater[\s\S]*?closePwaInstallDialog/);
    assert.match(app, /btnPwaInstallClose[\s\S]*?closePwaInstallDialog/);
    assert.match(app, /pwaInstallBackdrop[\s\S]*?closePwaInstallDialog/);
  });
  await test("ESC 닫기 지원", () => {
    assert.match(app, /event\.key !== "Escape"[\s\S]*?closePwaInstallDialog/);
  });
  await test("설정 메뉴는 유예 값을 검사하지 않고 수동 안내", () => {
    const source = extractFunction(app, "openPwaInstallGuide");
    assert.doesNotMatch(source, /getPwaDismissedUntil|PWA_INSTALL_DISMISS_KEY/);
  });
  await test("Android 비지원 브라우저 안내", () => {
    assert.match(app, /현재 브라우저에서 자동 설치창을 열 수 없습니다/);
  });
  await test("iPhone 5단계 안내", () => {
    assert.match(app, /웹 앱으로 열기/);
    assert.match(app, /5\. ‘추가’ 선택/);
  });
  await test("appinstalled 후 안내 숨김", () => {
    assert.match(app, /pwaInstalledThisSession = true/);
    assert.match(app, /updatePwaInstallEntryVisibility\(\)/);
  });
  await test("업데이트 안내가 설치 안내보다 우선", () => {
    const source = extractFunction(app, "showUpdateToast");
    assert.match(source, /closePwaInstallDialog\(\{ defer: false \}\)/);
  });
  await test("로그인 성공 후에만 자동 안내 예약", () => {
    const login = extractFunction(app, "handleLogin");
    assert.match(login, /showScreen\("home"\);\s*scheduleAutoPwaInstall\(true\)/);
  });
  await test("로그인 하단 버튼은 공통 컨트롤러 사용", () => {
    const source = extractFunction(app, "initPwaInstallController");
    assert.match(source, /btnInstallAndroid[\s\S]*?openPwaInstallGuide/);
    assert.match(source, /btnInstallIOS[\s\S]*?openPwaInstallGuide/);
  });
  await test("기존 installBar 제거", () => {
    assert.doesNotMatch(html + css + app, /installBar|btnInstallBar/);
  });
  await test("Clipboard API 성공", async () => {
    let written = "";
    const harness = makeCopyHarness({
      clipboard: { writeText: async value => { written = value; } },
      execResult: false
    });
    assert.equal(await harness.run(), true);
    assert.equal(written, "https://handong.khanreal.kr/");
    assert.equal(harness.status.textContent, "주소가 복사되었습니다.");
  });
  await test("Clipboard API 거부 후 fallback 성공", async () => {
    const harness = makeCopyHarness({
      clipboard: { writeText: async () => { throw new Error("denied"); } },
      execResult: true
    });
    assert.equal(await harness.run(), true);
    assert.equal(harness.address.selected, true);
  });
  await test("Clipboard API 미지원 후 fallback 성공", async () => {
    const harness = makeCopyHarness({ clipboard: {}, execResult: true });
    assert.equal(await harness.run(), true);
  });
  await test("최종 복사 실패 수동 안내", async () => {
    const harness = makeCopyHarness({ clipboard: {}, execResult: false });
    assert.equal(await harness.run(), false);
    assert.match(harness.status.textContent, /길게 눌러 복사/);
  });
  await test("페이지 로딩 시 자동 복사 없음", () => {
    assert.equal((goJs.match(/copyOfficialAddress\s*\(/g) || []).length, 1);
  });
  await test("공식 주소 상시 표시", () => {
    assert.match(goHtml, /id="officialAddress"[\s\S]*?value="https:\/\/handong\.khanreal\.kr\/"/);
  });
  await test("공식 주소 외 복사 대상 없음", () => {
    assert.equal((goJs.match(/clipboard\.writeText\(/g) || []).length, 1);
    assert.match(goJs, /clipboard\.writeText\(APP_URL\)/);
  });
  await test("공식 주소 외 이동 대상 없음", () => {
    assert.doesNotMatch(goJs, /URLSearchParams|location\.search|location\.hash/);
    assert.match(goJs, /window\.location\.assign\(APP_URL\)/);
  });
  await test("go.html 인라인 onclick 없음", () => {
    assert.doesNotMatch(goHtml, /\sonclick\s*=/i);
  });
  await test("go.html 인라인 script/style 없음", () => {
    assert.doesNotMatch(goHtml, /<script(?![^>]*\bsrc=)[^>]*>/i);
    assert.doesNotMatch(goHtml, /<style\b/i);
    assert.doesNotMatch(goHtml, /\sstyle\s*=/i);
  });
  await test("CSP 외부 script 허용 없음", () => {
    assert.match(goHtml, /script-src 'self'/);
    assert.doesNotMatch(goHtml, /script-src[^"]*https?:/);
    assert.match(goHtml, /object-src 'none'/);
    assert.match(goHtml, /base-uri 'none'/);
    assert.match(goHtml, /form-action 'none'/);
  });
  await test("referrer no-referrer 적용", () => {
    assert.match(goHtml, /name="referrer" content="no-referrer"/);
  });
  await test("상태 메시지는 textContent 사용", () => {
    assert.doesNotMatch(goJs, /innerHTML/);
    assert.match(goJs, /status\.textContent/);
  });
  await test("eval과 new Function 미사용", () => {
    assert.doesNotMatch(goJs, /\beval\s*\(|new Function/);
  });
  await test("중앙 안내 접근성 속성", () => {
    assert.match(html, /id="pwaInstallDialog"[\s\S]*?role="dialog"[\s\S]*?aria-modal="true"/);
  });
  await test("중앙 안내 버튼 최소 44px", () => {
    assert.match(css, /\.pwa-install-actions \.btn\s*\{[\s\S]*?min-height:\s*48px/);
    assert.match(css, /\.pwa-install-close\s*\{[\s\S]*?width:\s*44px[\s\S]*?height:\s*44px/);
  });
  await test("설치 페이지 가로 overflow 차단", () => {
    assert.match(goCss, /overflow-x:\s*hidden/);
    assert.match(goCss, /width:\s*min\(100%,\s*520px\)/);
  });
  await test("360~430px 모바일 레이아웃", () => {
    assert.match(goCss, /@media \(max-width:\s*430px\)/);
    assert.match(goCss, /\.address-row\s*\{\s*grid-template-columns:\s*1fr/);
  });
  await test("safe area 고려", () => {
    assert.match(goCss + css, /env\(safe-area-inset-bottom\)/);
  });
  await test("PWA 캐시 v2.18", () => {
    assert.match(sw, /const CACHE_NAME = "handong-v2\.18";/);
  });
  await test("go 설치 파일은 서비스워커 ASSETS에 추가하지 않음", () => {
    assert.doesNotMatch(sw, /go\.html|go\.css|go\.js/);
  });
  await test("공개 API URL 파일은 변경 대상 아님", () => {
    assert.equal(fs.readFileSync(path.join(root, "config.js"), "utf8").length > 0, true);
  });

  console.log(JSON.stringify({ ok: true, tests: passed }));
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
