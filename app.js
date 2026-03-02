/* ============================
   iOS Infinite Wheel Engine
============================ */

function buildClassWheel(){

  const scroller = document.getElementById("classScroller");
  const highlightBtn = document.getElementById("highlightBtn");
  const btnAll = document.getElementById("btnSelectAll");

  if(!scroller) return;

  const MAX_REPEAT = 40;

  // ===== 기수 데이터 =====
  let base = [...new Set(state.members.map(m=>m.gisu).filter(Boolean))];
  base.sort((a,b)=> b-a);

  if(base.length === 0) return;

  const loopNums = base.map(g => `${g}기`);

  // 🔥 전체 포함
  const items = ["전체", ...Array.from({length:MAX_REPEAT}, ()=>loopNums).flat()];

  scroller.innerHTML = items.map((t,i)=>`
    <div class="wheel-item" data-index="${i}" data-label="${t}" data-active="0">${t}</div>
  `).join("");

  const itemEls = Array.from(scroller.querySelectorAll(".wheel-item"));

  // ===== 중앙 기준 인덱스 찾기 =====
  function getNearestIndex(){
    const rect = scroller.getBoundingClientRect();
    const centerY = rect.top + rect.height/2;

    let bestIdx = 0;
    let bestDist = Infinity;

    for(const el of itemEls){
      const r = el.getBoundingClientRect();
      const y = r.top + r.height/2;
      const d = Math.abs(y - centerY);
      if(d < bestDist){
        bestDist = d;
        bestIdx = Number(el.dataset.index);
      }
    }
    return bestIdx;
  }

  // ===== active 표시 =====
  function setActive(idx){
    itemEls.forEach(el=>{
      el.dataset.active = (Number(el.dataset.index) === idx) ? "1":"0";
    });
  }

  // ===== 스냅 =====
  function snapToIndex(idx, smooth=true){
    const el = itemEls[idx];
    if(!el) return;
    el.scrollIntoView({block:"center",behavior:smooth?"smooth":"auto"});
    setActive(idx);
  }

  // 외부 버튼에서 사용 가능하게
  window.__classSnapToIndex = snapToIndex;

  // ===== 무한루프 보정 =====
  function recenterIfNeeded(){
    const idx = getNearestIndex();
    const label = items[idx];

    if(label === "전체") return;

    const centerBlock = Math.floor(MAX_REPEAT/2);
    const centerStart = 1 + centerBlock * base.length;

    const g = Number(label.replace("기",""));
    const pos = base.indexOf(g);
    if(pos < 0) return;

    const targetIdx = centerStart + pos;

    if(Math.abs(idx - targetIdx) > base.length * 5){
      snapToIndex(targetIdx,false);
    }
  }

  // ===== 초기 중앙 배치 =====
  const centerBlock = Math.floor(MAX_REPEAT/2);
  const centerStart = 1 + centerBlock * base.length;
  snapToIndex(centerStart,false);

  // ===== 스크롤 이벤트 =====
  let t = null;

  scroller.addEventListener("scroll", ()=>{
    clearTimeout(t);

    const idx = getNearestIndex();
    setActive(idx);

    t = setTimeout(()=>{
      const idx2 = getNearestIndex();
      snapToIndex(idx2,true);
      setTimeout(recenterIfNeeded,160);
    },110);

  },{passive:true});

  // ===== 가운데 탭 즉시 적용 =====
  if(highlightBtn){
    highlightBtn.onclick = ()=>{
      const idx = getNearestIndex();
      const label = items[idx];

      if(label === "전체"){
        currentClassFilter = null;
      }else{
        currentClassFilter = Number(label.replace("기",""));
      }

      renderMembers(state.members);
    };
  }

  // ===== 상단 "전체" 버튼 =====
  if(btnAll){
    btnAll.onclick = ()=>{
      snapToIndex(0,true);  // 🔥 0번이 전체
      currentClassFilter = null;
      renderMembers(state.members);
    };
  }
}