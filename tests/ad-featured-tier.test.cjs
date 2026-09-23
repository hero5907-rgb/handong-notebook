const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");

const source = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
const start = source.indexOf("function startFeaturedAds(){");
const end = source.indexOf("function prevAd(){", start);
assert.ok(start >= 0 && end > start);

function orderFor(ads, random = () => 0) {
  const context = vm.createContext({
    state: {ads},
    featuredAdTimer: null,
    featuredAds: [],
    featuredAdIndex: 0,
    featuredAdRemain: 0,
    clearInterval() {},
    setInterval() { return 1; },
    renderFeaturedAd() {},
    Math: Object.assign(Object.create(Math), {random})
  });
  vm.runInContext(source.slice(start, end) + "\nstartFeaturedAds();", context);
  return Array.from(context.featuredAds, ad => ad.id);
}

const tierRank = {VIP: 0, DIAMOND: 1, GOLD: 2, BASIC: 3};

function assertTierPolicy(ads, random) {
  const actual = orderFor(ads, random);
  const expectedIds = ads.map(ad => ad.id).sort();
  assert.deepEqual([...actual].sort(), expectedIds, "광고는 누락·중복 없이 한 번씩 포함");
  const byId = new Map(ads.map(ad => [ad.id, ad]));
  const ranks = actual.map(id => {
    const tier = String(byId.get(id)?.tier || "BASIC").toUpperCase();
    return tierRank[tier] ?? tierRank.BASIC;
  });
  assert.deepEqual(ranks, [...ranks].sort((a, b) => a - b),
    "등급 경계는 VIP → DIAMOND → GOLD → BASIC 순서를 유지");
  return actual;
}

const mixed = [
  {id:"basic-old"}, {id:"gold",tier:"GOLD"},
  {id:"vip-one",tier:"VIP"}, {id:"diamond",tier:"DIAMOND"},
  {id:"vip-two",tier:"VIP"}, {id:"basic",tier:"BASIC"}
];
assert.deepEqual(assertTierPolicy(mixed, () => 0),
  ["vip-two","vip-one","diamond","gold","basic","basic-old"],
  "고정 RNG에서 같은 등급 내부 셔플은 결정적");
assert.deepEqual(assertTierPolicy(mixed, () => 0.999999),
  ["vip-one","vip-two","diamond","gold","basic-old","basic"],
  "다른 고정 RNG에서도 등급 경계를 넘지 않음");

assert.deepEqual(assertTierPolicy([
  {id:"legacy"}, {id:"unknown",tier:"UNKNOWN"}, {id:"gold",tier:"GOLD"}
], () => 0), ["gold","unknown","legacy"],
"등급 누락·알 수 없는 등급은 BASIC으로 안전하게 처리");

assert.deepEqual(assertTierPolicy([], () => 0), []);
assert.deepEqual(assertTierPolicy([{id:"only",tier:"VIP"}], () => 0), ["only"]);
assert.deepEqual(assertTierPolicy([
  {id:"one",tier:"GOLD"}, {id:"two",tier:"GOLD"}, {id:"three",tier:"GOLD"}
], () => 0), ["two","three","one"],
"같은 등급만 있어도 결정적으로 셔플");

console.log("featured ad tier ordering passed");
