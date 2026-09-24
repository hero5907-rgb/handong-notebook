const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const appSource = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
const start = appSource.indexOf("function startFeaturedAds(){");
const end = appSource.indexOf("function prevAd(){", start);
assert.ok(start >= 0 && end > start, "추천 광고 함수 범위를 찾을 수 있어야 함");

const featuredSource = appSource.slice(start, end);
const renderStart = appSource.indexOf("function renderFeaturedAd(){");
assert.ok(renderStart >= 0 && renderStart < start, "추천 광고 렌더 함수를 찾을 수 있어야 함");
const renderSource = appSource.slice(renderStart, start);

function sequenceRandom(values) {
  let index = 0;
  return () => values[index++ % values.length];
}

function orderFor(ads, random = () => 0) {
  const context = vm.createContext({
    state: { ads },
    featuredAdTimer: null,
    featuredAds: [],
    featuredAdIndex: 0,
    featuredAdRemain: 0,
    clearInterval() {},
    setInterval() { return 1; },
    renderFeaturedAd() {},
    Math: Object.assign(Object.create(Math), { random })
  });

  vm.runInContext(`${featuredSource}\nstartFeaturedAds();`, context);
  return Array.from(context.featuredAds, ad => ad);
}

const tierRank = { VIP: 0, DIAMOND: 1, GOLD: 2, BASIC: 3 };
const normalizedRank = ad => {
  const tier = String(ad?.tier || "BASIC").trim().toUpperCase();
  return tierRank[tier] ?? tierRank.BASIC;
};

function assertTierPolicy(ads, random) {
  const before = JSON.stringify(ads);
  const actual = orderFor(ads, random);

  assert.equal(JSON.stringify(ads), before, "원본 광고 배열과 객체는 변경하지 않음");
  assert.equal(actual.length, ads.length, "광고 수를 유지");
  assert.deepEqual(
    actual.map(ad => ad.id).sort(),
    ads.map(ad => ad.id).sort(),
    "광고가 누락·중복 없이 정확히 한 번씩 포함됨"
  );

  const ranks = actual.map(normalizedRank);
  assert.deepEqual(
    ranks,
    [...ranks].sort((a, b) => a - b),
    "VIP → DIAMOND → GOLD → BASIC 등급 경계를 유지"
  );

  return actual.map(ad => ad.id);
}

const mixed = [
  { id: "basic-old" },
  { id: "gold", tier: "GOLD" },
  { id: "vip-one", tier: "VIP" },
  { id: "diamond", tier: "DIAMOND" },
  { id: "vip-two", tier: "vip" },
  { id: "basic", tier: "BASIC" },
  { id: "unknown", tier: "PLATINUM" }
];

assert.deepEqual(
  assertTierPolicy(mixed, () => 0),
  ["vip-two", "vip-one", "diamond", "gold", "basic", "unknown", "basic-old"],
  "고정 RNG 0에서 같은 등급 내부 셔플은 결정적"
);

assert.deepEqual(
  assertTierPolicy(mixed, () => 0.999999),
  ["vip-one", "vip-two", "diamond", "gold", "basic-old", "basic", "unknown"],
  "고정 RNG 1에 가까운 값에서도 등급 경계를 넘지 않음"
);

assert.deepEqual(
  assertTierPolicy(mixed, sequenceRandom([0.25, 0.75, 0.5, 0])),
  ["vip-two", "vip-one", "diamond", "gold", "basic-old", "basic", "unknown"],
  "여러 고정 RNG 값에서도 결과가 결정적"
);

assert.deepEqual(assertTierPolicy([], () => 0), [], "광고 0건 처리");
assert.deepEqual(
  assertTierPolicy([{ id: "only", tier: "VIP" }], () => 0.5),
  ["only"],
  "광고 1건 처리"
);
assert.deepEqual(
  assertTierPolicy([
    { id: "one", tier: "GOLD" },
    { id: "two", tier: "GOLD" },
    { id: "three", tier: "GOLD" }
  ], () => 0),
  ["two", "three", "one"],
  "같은 등급 광고만 있어도 등급 밖으로 이동하지 않고 셔플"
);

assert.doesNotMatch(
  renderSource,
  /\b(?:adFee|advertisingFee|paymentAmount|renewalHistory|adHistory|changedBy)\b/,
  "추천 광고 공개 렌더링에서 광고비·이력·관리자 내부 필드를 사용하지 않음"
);

console.log(JSON.stringify({ ok: true, tests: 9, policy: "VIP>DIAMOND>GOLD>BASIC" }));
