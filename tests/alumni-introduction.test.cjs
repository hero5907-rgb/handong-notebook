const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "styles.css"), "utf8");
const sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} 함수가 있어야 합니다.`);
  const bodyStart = source.indexOf("{", start);
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
  throw new Error(`${name} 함수 끝을 찾지 못했습니다.`);
}

const getSettingsSource = extractFunction(app, "getAlumniIntroductionSettings");
const renderSource = extractFunction(app, "renderAlumniIntroduction");
const getSettings = new Function(
  "state",
  "window",
  `${getSettingsSource}; return getAlumniIntroductionSettings();`
);

const fallback = getSettings(
  { settings: {} },
  { APP_CONFIG: { introText: "기존 소개글" } }
);
assert.deepEqual(fallback, {
  term: "11",
  executivePhotoUrl: "./group.jpg",
  executiveText: "기존 소개글",
  organizationPhotoUrl: "",
  organizationText: "조직도 내용이 준비되지 않았습니다."
});

const managed = getSettings(
  {
    settings: {
      alumniIntroTerm: "12",
      alumniIntroExecutivePhotoUrl: "https://example.test/executive.jpg",
      alumniIntroExecutiveText: "첫째 줄\n둘째 줄 <img src=x onerror=alert(1)>",
      alumniIntroOrganizationPhotoUrl: "https://example.test/chart.png",
      alumniIntroOrganizationText: "조직도 설명"
    }
  },
  { APP_CONFIG: { introText: "기존 소개글" } }
);
assert.equal(managed.term, "12");
assert.equal(managed.executiveText.includes("<img"), true);
assert.equal(managed.organizationText, "조직도 설명");

function fakeElement(id) {
  const classes = new Set();
  return {
    id,
    hidden: false,
    textContent: "",
    src: "",
    dataset: {},
    attributes: {},
    classList: {
      toggle(name, active) {
        if (active) classes.add(name);
        else classes.delete(name);
      },
      contains(name) { return classes.has(name); }
    },
    setAttribute(name, value) { this.attributes[name] = value; },
    removeAttribute(name) {
      delete this.attributes[name];
      if (name === "src") this.src = "";
    }
  };
}

const elements = Object.fromEntries([
  "alumniIntroGeneratedTitle",
  "alumniIntroExecutivePanel",
  "alumniIntroOrganizationPanel",
  "alumniIntroExecutivePhoto",
  "alumniIntroExecutivePhotoButton",
  "alumniIntroExecutiveText",
  "alumniIntroOrganizationPhoto",
  "alumniIntroOrganizationPhotoButton",
  "alumniIntroOrganizationText"
].map((id) => [id, fakeElement(id)]));
const executiveTab = fakeElement("alumniIntroExecutiveTab");
executiveTab.dataset.introTab = "executive";
const organizationTab = fakeElement("alumniIntroOrganizationTab");
organizationTab.dataset.introTab = "organization";
const openedPhotos = [];
const dynamicFactory = new Function(
  "state",
  "window",
  "document",
  "el",
  "openImgModal",
  `${getSettingsSource}\n${extractFunction(app, "setAlumniIntroductionTab")}\n${renderSource}\n` +
  "return { renderAlumniIntroduction, setAlumniIntroductionTab };"
);
const dynamic = dynamicFactory(
  { settings: {
    alumniIntroTerm: "12",
    alumniIntroExecutivePhotoUrl: "https://example.test/executive.jpg",
    alumniIntroExecutiveText: "첫째 줄\n둘째 줄 <b>문자열</b>",
    alumniIntroOrganizationPhotoUrl: "https://example.test/chart.jpg",
    alumniIntroOrganizationText: "조직도 설명"
  } },
  { APP_CONFIG: { introText: "기존 소개글" } },
  { querySelectorAll: () => [executiveTab, organizationTab] },
  (id) => elements[id],
  (url) => openedPhotos.push(url)
);
dynamic.renderAlumniIntroduction();
assert.equal(elements.alumniIntroGeneratedTitle.textContent, "제12대 한동CEO동문회 집행부");
assert.equal(elements.alumniIntroExecutiveText.textContent, "첫째 줄\n둘째 줄 <b>문자열</b>");
assert.equal(elements.alumniIntroOrganizationText.textContent, "조직도 설명");
assert.equal(elements.alumniIntroExecutivePanel.hidden, false);
assert.equal(elements.alumniIntroOrganizationPanel.hidden, true);
organizationTab.onclick();
assert.equal(elements.alumniIntroExecutivePanel.hidden, true);
assert.equal(elements.alumniIntroOrganizationPanel.hidden, false);
elements.alumniIntroExecutivePhotoButton.onclick();
elements.alumniIntroOrganizationPhotoButton.onclick();
assert.deepEqual(openedPhotos, [
  "https://example.test/executive.jpg",
  "https://example.test/chart.jpg"
]);

assert.match(html, /data-intro-tab="executive"[^>]*>집행부 소개/);
assert.match(html, /data-intro-tab="organization"[^>]*>조직도/);
assert.match(html, /alumniIntroExecutiveTab" class="alumni-intro-tab active"/);
assert.match(html, /alumniIntroOrganizationPanel[^>]*hidden/);

assert.doesNotMatch(renderSource, /apiJsonp|fetch\s*\(|XMLHttpRequest/);
assert.doesNotMatch(renderSource, /innerHTML\s*=/);
assert.match(renderSource, /\.textContent\s*=/);
assert.match(renderSource, /openImgModal\(intro\.executivePhotoUrl\)/);
assert.match(renderSource, /openImgModal\(intro\.organizationPhotoUrl\)/);
assert.match(renderSource, /setAlumniIntroductionTab\("executive"\)/);

const executiveRosterSource = extractFunction(app, "renderExecutiveMembers");
assert.match(
  executiveRosterSource,
  /getAlumniIntroductionSettings\(\)\.executivePhotoUrl/
);
assert.doesNotMatch(executiveRosterSource, /organizationPhotoUrl/);
assert.doesNotMatch(executiveRosterSource, /querySelector\(\s*["']#screenCeremony/);

assert.match(css, /\.intro-photo\s*\{[\s\S]*?object-fit\s*:\s*contain/);
assert.match(css, /\.intro-text\s*\{[\s\S]*?white-space\s*:\s*pre-wrap/);
assert.match(css, /@media\s*\(max-width:430px\)/);
assert.match(css, /\.alumni-intro-heading[\s\S]*?flex-wrap\s*:\s*wrap/);
assert.match(sw, /const CACHE_NAME = "handong-v2\.14";/);

const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
assert.deepEqual([...new Set(duplicates)], [], "중복 DOM ID가 없어야 합니다.");

console.log("alumni introduction tests: PASS");
