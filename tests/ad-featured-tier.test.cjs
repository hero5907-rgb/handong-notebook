const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");

const source = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
const start = source.indexOf("function startFeaturedAds(){");
const end = source.indexOf("function prevAd(){", start);
assert.ok(start >= 0 && end > start);

function orderFor(ads) {
  const context = vm.createContext({
    state: {ads},
    featuredAdTimer: null,
    featuredAds: [],
    featuredAdIndex: 0,
    featuredAdRemain: 0,
    clearInterval() {},
    setInterval() { return 1; },
    renderFeaturedAd() {},
    Math: Object.assign(Object.create(Math), {random: () => 0})
  });
  vm.runInContext(source.slice(start, end) + "\nstartFeaturedAds();", context);
  return Array.from(context.featuredAds, ad => ad.id);
}

assert.deepEqual(orderFor([
  {id:"basic-old"}, {id:"gold",tier:"GOLD"},
  {id:"vip-one",tier:"VIP"}, {id:"diamond",tier:"DIAMOND"},
  {id:"vip-two",tier:"VIP"}, {id:"basic",tier:"BASIC"}
]), ["vip-two","vip-one","diamond","gold","basic","basic-old"]);
assert.deepEqual(orderFor([{id:"legacy"},{id:"unknown",tier:"UNKNOWN"}]),
  ["unknown","legacy"]);
assert.deepEqual(orderFor([]), []);

console.log("featured ad tier ordering passed");
