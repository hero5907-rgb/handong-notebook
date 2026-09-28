const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");

function extractFunction(name) {
  const start = app.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} 함수가 없습니다.`);

  const bodyStart = app.indexOf("{", start);
  let depth = 0;

  for (let index = bodyStart; index < app.length; index += 1) {
    if (app[index] === "{") depth += 1;
    if (app[index] === "}") depth -= 1;
    if (depth === 0) return app.slice(start, index + 1);
  }

  throw new Error(`${name} 함수 끝을 찾지 못했습니다.`);
}

const context = {};
vm.createContext(context);
vm.runInContext([
  extractFunction("isNeutralCalendarObservanceTitle"),
  extractFunction("hasCalendarEventGisu"),
  extractFunction("getCalendarEventTitleColor")
].join("\n"), context);

const googleEvent = (title) => ({
  title,
  extendedProps: {},
  source: {
    googleCalendarId: "ko.south_korea#holiday@group.v.calendar.google.com"
  }
});

assert.equal(
  context.getCalendarEventTitleColor(googleEvent("국군의날")),
  "#1f2937",
  "10월 1일 국군의날은 중립색이어야 합니다."
);
assert.equal(
  context.getCalendarEventTitleColor(googleEvent("국군의 날")),
  "#1f2937",
  "국군의 날의 공백 차이를 허용해야 합니다."
);

for (const title of ["개천절", "쉬는 날 개천절", "개천절 대체공휴일", "한글날"]) {
  assert.equal(
    context.getCalendarEventTitleColor(googleEvent(title)),
    "#d60000",
    `${title}은 공휴일 빨간색을 유지해야 합니다.`
  );
}

assert.equal(
  context.getCalendarEventTitleColor({
    title: "동문회 전체일정",
    extendedProps: { gisu: 0 }
  }),
  "#d60000",
  "gisu=0 전체일정은 빨간색을 유지해야 합니다."
);
assert.equal(
  context.getCalendarEventTitleColor({
    title: "55기 일정",
    extendedProps: { gisu: 55 }
  }),
  "#111",
  "기수일정은 검정색을 유지해야 합니다."
);
assert.equal(
  context.getCalendarEventTitleColor({
    title: "gisu 없는 일반 일정",
    extendedProps: {}
  }),
  "#111",
  "gisu 누락을 전체일정으로 간주하면 안 됩니다."
);

assert.match(
  app,
  /holiday-item" style="color:\$\{getCalendarEventTitleColor\(e\)\}"/,
  "날짜 상세 팝업도 같은 색상 판정을 사용해야 합니다."
);

console.log(JSON.stringify({ ok: true, tests: 9 }));
