const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const styles = fs.readFileSync(path.join(root, "styles.css"), "utf8");

let tests = 0;
function test(name, fn) {
  fn();
  tests += 1;
  console.log(`ok ${tests} - ${name}`);
}

const helperStart = app.indexOf("function getAdPhotoGallery");
const helperEnd = app.indexOf("// 두 점 사이 거리 계산", helperStart);
assert.ok(helperStart >= 0 && helperEnd > helperStart, "광고 사진 헬퍼를 찾을 수 없습니다.");

const helperContext = {};
vm.runInNewContext(app.slice(helperStart, helperEnd), helperContext);
const { getAdPhotoGallery, getWrappedPhotoIndex } = helperContext;

const detailStart = app.indexOf("function openAdModal");
const detailEnd = app.indexOf("function bindAdSwipe", detailStart);
const detailSource = app.slice(detailStart, detailEnd);
const zoomStart = app.indexOf("function normalizeGisuPhotoGallery");
const zoomEnd = app.indexOf("function getMemberPositionValues", zoomStart);
const zoomSource = app.slice(zoomStart, zoomEnd);
const popstateStart = app.indexOf('window.addEventListener("popstate"');
const popstateEnd = app.indexOf("if (state.navStack.length > 1)", popstateStart);
const popstateSource = app.slice(popstateStart, popstateEnd);

test("대표사진과 추가사진은 빈 항목 없이 원래 순서를 유지한다", () => {
  const photos = getAdPhotoGallery({
    storeName: "테스트",
    mainPhoto: " main.jpg ",
    photo2: "two.jpg",
    photo3: "",
    photo4: null,
    photo5: "five.jpg"
  });

  assert.deepEqual(
    Array.from(photos, (photo) => photo.url),
    ["main.jpg", "two.jpg", "five.jpg"]
  );
});

test("대표사진과 추가사진의 접근성 설명을 구분한다", () => {
  const photos = getAdPhotoGallery({
    storeName: "테스트",
    mainPhoto: "main.jpg",
    photo2: "two.jpg"
  });

  assert.match(photos[0].alt, /대표사진/);
  assert.match(photos[1].alt, /추가사진 1/);
});

test("마지막 다음은 첫 사진으로 순환한다", () => {
  assert.equal(getWrappedPhotoIndex(4, 1, 5), 0);
});

test("첫 사진 이전은 마지막 사진으로 순환한다", () => {
  assert.equal(getWrappedPhotoIndex(0, -1, 5), 4);
});

test("대표사진 클릭은 같은 광고 갤러리와 시작 순번을 전달한다", () => {
  assert.match(detailSource, /const adPhotos = getAdPhotoGallery\(ad\)/);
  assert.match(detailSource, /openGisuPhotoZoom\([\s\S]*?adPhotos,[\s\S]*?adPhotos\.indexOf\(mainPhoto\)/);
});

test("추가사진 클릭은 해당 사진 순번으로 갤러리를 연다", () => {
  assert.match(detailSource, /adPhotos\.indexOf\(photo\)/);
  assert.match(detailSource, /galleryImage\.addEventListener\(\s*["']click["']/);
});

test("광고 사진은 외부 창으로 이탈하지 않는다", () => {
  assert.doesNotMatch(detailSource, /window\.open\s*\(\s*ad\.mainPhoto/);
  assert.doesNotMatch(detailSource, /window\.open\s*\(\s*photo\.url/);
});

test("사진이 여러 장일 때만 화살표와 순번을 표시한다", () => {
  assert.match(zoomSource, /const hasMultiple = gisuPhotoGallery\.length > 1/);
  assert.match(zoomSource, /previous\.hidden = !hasMultiple/);
  assert.match(zoomSource, /counter\.hidden = !hasMultiple/);
  assert.match(zoomSource, /gisuPhotoGalleryIndex \+ 1/);
});

test("사진 변경은 확대와 이동 상태를 초기화한다", () => {
  const showStart = zoomSource.indexOf("function showGisuPhotoAt");
  const moveStart = zoomSource.indexOf("function moveGisuPhoto", showStart);
  const showSource = zoomSource.slice(showStart, moveStart);
  assert.match(showSource, /resetGisuPhotoZoom\(\)/);
});

test("사진 이동 자체는 history 항목을 추가하지 않는다", () => {
  const moveStart = zoomSource.indexOf("function moveGisuPhoto");
  const openStart = zoomSource.indexOf("function openGisuPhotoZoom", moveStart);
  assert.doesNotMatch(zoomSource.slice(moveStart, openStart), /pushState/);
});

test("확대창을 처음 열 때만 image history를 추가한다", () => {
  assert.match(zoomSource, /const wasOpen = zoom\?\.hidden === false/);
  assert.match(zoomSource, /!wasOpen && history\.state\?\.modal !== ["']image["']/);
  assert.match(zoomSource, /history\.pushState\([\s\S]*?modal: ["']image["']/);
});

test("X와 배경 닫기는 image history를 back으로 소비한다", () => {
  assert.match(zoomSource, /gisu-photo-zoom-close[\s\S]*?addEventListener\(["']click["'], closeGisuPhotoZoom\)/);
  assert.match(zoomSource, /if \(e\.target === zoom\)[\s\S]*?closeGisuPhotoZoom\(\)/);
  assert.match(zoomSource, /history\.state\?\.modal === ["']image["'][\s\S]*?history\.back\(\)/);
  assert.match(zoomSource, /gisuPhotoClosePending/);
});

test("popstate는 사진 확대창을 광고 상세보다 먼저 닫는다", () => {
  const photoIndex = popstateSource.indexOf('el("gisuPhotoZoom")');
  const adIndex = popstateSource.indexOf('el("adModal")');
  assert.ok(photoIndex >= 0 && adIndex > photoIndex);
  assert.match(popstateSource, /hideGisuPhotoZoomFromHistory\(\)/);
});

test("확대 배율 1에서만 한 손가락 스와이프 이동을 허용한다", () => {
  const gestureStart = app.indexOf("function bindGisuPhotoGestures");
  const normalizeStart = app.indexOf("function normalizeGisuPhotoGallery", gestureStart);
  const gestureSource = app.slice(gestureStart, normalizeStart);
  assert.match(gestureSource, /gisuPhotoScale <= 1\.01/);
  assert.match(gestureSource, /Math\.abs\(dx\) >= 60/);
  assert.match(gestureSource, /Math\.abs\(dx\) > Math\.abs\(dy\) \* 1\.5/);
});

test("핀치가 시작되면 사진 넘김 후보를 취소한다", () => {
  assert.match(app, /gisuPhotoHadMultiplePointers = true;[\s\S]*?gisuPhotoSwipeStart = null/);
});

test("확대 배율이 1보다 크면 한 손가락은 사진 이동에 사용된다", () => {
  assert.match(app, /gisuPhotoPointers\.size === 1 &&[\s\S]*?gisuPhotoScale > 1 &&[\s\S]*?gisuPhotoDragStart/);
});

test("키보드 좌우와 Escape는 확대창이 열렸을 때만 동작한다", () => {
  assert.match(zoomSource, /gisuPhotoZoom["']\)\?\.hidden !== false\) return/);
  assert.match(zoomSource, /e\.key === ["']ArrowLeft["'][\s\S]*?moveGisuPhoto\(-1\)/);
  assert.match(zoomSource, /e\.key === ["']ArrowRight["'][\s\S]*?moveGisuPhoto\(1\)/);
  assert.match(zoomSource, /e\.key === ["']Escape["'][\s\S]*?closeGisuPhotoZoom\(\)/);
});

test("기존 단일사진 호출은 선택 인자 없이 계속 호환된다", () => {
  assert.match(app, /function openGisuPhotoZoom\(photoUrl, gisu, altText, photos, startIndex = 0\)/);
  assert.match(zoomSource, /:\s*\[\{ url: photoUrl, alt: fallbackAlt \}\]/);
});

test("확대 UI는 모바일 폭을 넘지 않고 숨김 상태를 보존한다", () => {
  assert.match(styles, /\.gisu-photo-zoom-image[\s\S]*?max-width\s*:\s*96vw/);
  assert.match(styles, /\.gisu-photo-zoom-nav\[hidden\],[\s\S]*?display\s*:\s*none\s*!important/);
  assert.match(styles, /@media \(max-width: 430px\)[\s\S]*?\.gisu-photo-zoom-nav/);
});

test("대표·추가 광고 사진은 contain 배경으로 표시된다", () => {
  assert.match(styles, /#featuredAdPhoto[\s\S]*?object-fit\s*:\s*contain/);
  assert.match(styles, /#adModalMainPhoto[\s\S]*?object-fit\s*:\s*contain/);
  assert.match(styles, /background\s*:\s*#f8fafc/);
});

console.log(JSON.stringify({ ok: true, tests }));
