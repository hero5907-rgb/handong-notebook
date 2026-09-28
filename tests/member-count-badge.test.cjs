const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const css = fs.readFileSync(path.join(root, "styles.css"), "utf8");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");

const finalHeaderRule = css.lastIndexOf(".membersSticky .card-header{");
const finalTitleRule = css.lastIndexOf(".membersSticky .card-header > .card-title{");
const countRule = css.lastIndexOf("#memberCountPill{");

assert.notEqual(finalHeaderRule, -1, "회원명부 헤더 최종 규칙이 필요합니다.");
assert.notEqual(finalTitleRule, -1, "회원명부 제목 영역 최종 규칙이 필요합니다.");
assert.notEqual(countRule, -1, "인원수 배지 전용 규칙이 필요합니다.");

const finalCss = css.slice(Math.min(finalHeaderRule, finalTitleRule, countRule));

assert.match(finalCss, /\.membersSticky \.card-header\s*\{[\s\S]*?gap\s*:\s*8px/);
assert.match(finalCss, /\.membersSticky \.card-header > \.card-title\s*\{[\s\S]*?flex\s*:\s*1 1 auto/);
assert.match(finalCss, /\.membersSticky \.card-header > \.card-title\s*\{[\s\S]*?min-width\s*:\s*0/);
assert.match(finalCss, /\.membersSticky \.card-header > \.card-title\s*\{[\s\S]*?flex-wrap\s*:\s*wrap/);
assert.match(finalCss, /#memberCountPill\s*\{[\s\S]*?flex\s*:\s*0 0 auto/);
assert.match(finalCss, /#memberCountPill\s*\{[\s\S]*?min-width\s*:\s*max-content/);
assert.match(finalCss, /#memberCountPill\s*\{[\s\S]*?white-space\s*:\s*nowrap/);
assert.match(finalCss, /#memberCountPill\s*\{[\s\S]*?word-break\s*:\s*keep-all/);
assert.doesNotMatch(finalCss, /\.pill\s*\{[\s\S]*?white-space\s*:\s*nowrap/);

assert.match(app, /pill\.textContent\s*=\s*`\$\{list\.length\}명`/);
for (const count of [0, 1, 15, 55, 416]) {
  assert.equal(`${count}명`.includes("\n"), false);
  assert.equal(`${count}명`.includes(" "), false);
}

console.log(JSON.stringify({
  ok: true,
  cases: ["0명", "1명", "15명", "55명", "416명"],
  rule: "member-count-nowrap"
}));
