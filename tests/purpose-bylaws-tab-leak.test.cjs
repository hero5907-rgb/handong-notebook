const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const css = fs.readFileSync(path.join(root, "styles.css"), "utf8");

const purposeBranch = app.match(
  /else if \(target === "purpose"\) \{([\s\S]*?)\}\s*else if \(target === "bylaws"\)/
);
assert.ok(purposeBranch, "모임 목적 분기 코드를 찾을 수 있어야 합니다.");
assert.match(
  purposeBranch[1],
  /const bylawsTabs = el\("bylawsTabs"\);[\s\S]*bylawsTabs\.hidden = true;/,
  "모임 목적 진입 시 회칙 탭을 숨겨야 합니다."
);
assert.match(
  purposeBranch[1],
  /textTitle"\)\.textContent = "목적"/,
  "모임 목적 제목을 유지해야 합니다."
);
assert.match(
  app,
  /else if \(target === "bylaws"\) \{\s*openMainBylaws\(\);\s*\}/,
  "회칙 진입은 동문회 탭을 초기화하는 기존 함수를 사용해야 합니다."
);
assert.match(
  app,
  /function openMainBylaws\(\)\{[\s\S]*?el\("bylawsTabs"\)\.hidden = false;[\s\S]*?renderBylawsView\(\);/,
  "동문회 회칙 탭은 탭을 표시하고 기존 회칙을 렌더링해야 합니다."
);
assert.match(
  app,
  /function openClassBylaws\(\)\{[\s\S]*?el\("bylawsTabs"\)\.hidden = false;[\s\S]*?renderClassBylaws\(\);/,
  "55기 회칙 탭의 기존 동작을 유지해야 합니다."
);
assert.match(
  purposeBranch[1],
  /pdfBtn은 위에서 이미 hidden=true 처리됨/,
  "모임 목적에서는 원본 PDF 숨김 처리가 유지되어야 합니다."
);
assert.match(
  css,
  /#bylawsTabs\[hidden\]\s*\{\s*display\s*:\s*none\s*!important\s*;\s*\}/,
  "hidden 속성이 회칙 탭의 flex 표시보다 우선해야 합니다."
);

console.log(JSON.stringify({ ok: true, tests: 7 }));
