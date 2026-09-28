const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const styles = fs.readFileSync(path.join(root, "styles.css"), "utf8");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const detailStart = app.indexOf("function openAdModal");
const detailEnd = app.indexOf("function bindAdSwipe", detailStart);
const detailSource = app.slice(detailStart, detailEnd);

assert(detailStart >= 0 && detailEnd > detailStart, "광고 상세 렌더링 함수를 찾을 수 없습니다.");
assert(!/window\.open\s*\(\s*ad\.mainPhoto/.test(detailSource), "대표사진이 외부 창으로 열립니다.");
assert(!detailSource.includes("onclick=\"window.open('${url}'"), "추가사진에 인라인 외부 창 열기가 남아 있습니다.");
assert(/openGisuPhotoZoom\s*\(\s*ad\.mainPhoto/.test(detailSource), "대표사진이 앱 내부 확대창을 사용하지 않습니다.");
assert(/document\.createElement\(\s*["']img["']\s*\)/.test(detailSource), "추가사진을 createElement로 만들지 않습니다.");
assert(/galleryImage\.addEventListener\(\s*["']click["']/.test(detailSource), "추가사진 클릭 이벤트가 addEventListener를 사용하지 않습니다.");
assert(/openGisuPhotoZoom\s*\(\s*url/.test(detailSource), "추가사진이 앱 내부 확대창을 사용하지 않습니다.");
assert(/#featuredAdPhoto[\s\S]*?object-fit\s*:\s*contain/.test(styles), "추천 광고 사진이 contain이 아닙니다.");
assert(/#adModalMainPhoto[\s\S]*?object-fit\s*:\s*contain/.test(styles), "광고 상세 사진이 contain이 아닙니다.");
assert(/background\s*:\s*#f8fafc/.test(styles), "광고 사진 배경색이 없습니다.");

console.log(JSON.stringify({ ok: true, tests: 10 }));
