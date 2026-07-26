// cc-charts.js - FIXED CART 104 GHOST + INITIAL OLD NUMBER + D1 CLEAR
import { STATS_API, charts, currentBeatId, currentRange, setCurrentRange, setCurrentBeatId } from './cc-config.js';

let sparklineCharts = {};
let pollInterval = null;
let activeMetric = 'plays';
let lastGlobalHourHash = '';
let lastGlobalRangeHash = '';
let lastTrackHash = '';
let liveCartCount = 0;
let liveCartPerBeat = {};
let liveLikesCount = 0;
let liveLikesPerBeat = {};
const tzOffset = new Date().getTimezoneOffset() * -1;

function calcPercentChange(history) {
  if (!history || history.length < 2) {
    if (history && history.length === 1 && history[0] > 0) return { text: '+100%', color: '#10b981' };
    return { text: '+0%', color: '#6b7280' };
  }
  let current = history[history.length - 1];
  if (current === 0) for (let i = history.length - 2; i >=0; i--) if (history[i] > 0) { current = history[i]; break; }
  let prev = 0;
  for (let i = history.length - 2; i >= 0; i--) if (history[i] > 0 && String(history[i])!== String(current)) { prev = history[i]; break; }
  if (prev === 0) return current > 0? { text: '+100%', color: '#10b981' } : { text: '+0%', color: '#6b7280' };
  const change = ((current - prev) / prev) * 100;
  if (change === 0) return { text: '+0%', color: '#6b7280' };
  return { text: `${change>0?'+':''}${Math.round(change)}%`, color: change>0?'#10b981':'#ef4444' };
}
function updateSmallChangeBadge(id, history) {
  const el = document.getElementById(id);
  if (!el) return;
  const { text, color } = calcPercentChange(history);
  if (el.textContent === text) return;
  el.textContent = text;
  el.style.color = color;
  el.style.background = `${color}15`;
  el.style.border = `1px solid ${color}30`;
}

export async function initCharts() {
  window.addEventListener('cc_stats_loaded', (e) => {
    if (!currentBeatId) loadTradeChartData(null, currentRange);
  });
  window.addEventListener('cc_track_selected', (e) => {
    setCurrentBeatId(e.detail.beatId);
    lastTrackHash='';
    document.getElementById('clearTrackFilter') && (document.getElementById('clearTrackFilter').style.display='block');
    loadTradeChartData(e.detail.beatId, currentRange);
  });
  window.addEventListener('cc_cart_updated', (e) => {
    rebuildCartMapFromStorage();
    updateCartLineRealtime(e.detail?.beat_id, e.detail?.count, 'add');
    pushCartToSmallGraphs(liveCartCount, 'add');
  });
  window.addEventListener('cc_player_cart_sync', (e) => {
    rebuildCartMapFromStorage();
    updateCartLineRealtime(null, e.detail?.total || 0, 'sync');
    pushCartToSmallGraphs(e.detail?.total || 0, 'add');
  });
  window.addEventListener('cc_cart_removed', (e) => {
    rebuildCartMapFromStorage();
    const bid = e.detail?.beat_id || e.detail?.beatId;
    const count = e.detail?.count;
    if (e.detail?.beat_ids && Array.isArray(e.detail.beat_ids)) {
      handleCheckoutSubtract(e.detail.beat_ids);
    } else {
      updateCartLineRealtime(bid, count, 'remove');
      pushCartToSmallGraphs(liveCartCount, 'remove');
    }
  });
  window.addEventListener('cc_checkout_completed', (e) => {
    const removedIds = e.detail?.beat_ids || [];
    handleCheckoutSubtract(removedIds);
  });
  window.addEventListener('cc_like_updated', (e) => {
    rebuildLikesMapFromStorage();
    updateLikesLineRealtime(e.detail?.beat_id, e.detail?.liked);
    pushLikesToSmallGraphs(liveLikesCount);
  });
  window.addEventListener('cc_player_like_sync', (e) => {
    rebuildLikesMapFromStorage();
    updateLikesLineRealtime(e.detail?.beat_id, e.detail?.liked);
    pushLikesToSmallGraphs(e.detail?.total || 0);
  });

  initMainChart();
  initSparklines();
  initRangeButtons();
  initMetricButtons();
  initClearButton();
  await loadSmallGraphsHour();
  await loadTradeChartData(currentBeatId, currentRange);
  startLivePolling();
  rebuildCartMapFromStorage();
  rebuildLikesMapFromStorage();
}

function rebuildCartMapFromStorage() {
  try {
    const cart = JSON.parse(localStorage.getItem('dopetone_cart') || '[]');
    liveCartCount = cart.length;
    liveCartPerBeat = {};
    cart.forEach(c => { liveCartPerBeat[String(c.id)] = (liveCartPerBeat[String(c.id)] || 0) + 1; });
  } catch(e){ liveCartPerBeat = {}; liveCartCount = 0; }
}
function rebuildLikesMapFromStorage() {
  try {
    const likes = JSON.parse(localStorage.getItem('dopetone_likes') || '{}');
    liveLikesPerBeat = {};
    Object.keys(likes).forEach(id => { liveLikesPerBeat[String(id)] = 1; });
    liveLikesCount = Object.keys(likes).length;
  } catch(e){ liveLikesPerBeat = {}; liveLikesCount = 0; }
}
function initClearButton() {
  const btn = document.getElementById('clearTrackFilter');
  if (btn) {
    btn.onclick = () => {
      setCurrentBeatId(null);
      lastGlobalRangeHash='';
      btn.style.display='none';
      loadTradeChartData(null, currentRange);
    };
  }
}
function hashData(arr) {
  try { return arr.length + '-' + arr.reduce((a,b)=>a+(b?.cart||b?.plays||0),0); } catch(e){ return ''; }
}
function generateFullCurve(totalPlays, totalCarts, range = 'hour') {
  const points = []; const now = new Date();
  if (range === 'hour') {
    for (let i = 23; i >= 0; i--) {
      const d = new Date(now); d.setHours(now.getHours() - i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:00`;
      if (i === 0) points.push({ date: dateStr, plays: Math.max(1, Math.floor(totalPlays/4)), likes: 0, downloads: 0, cart: totalCarts || 0 });
      else if (i < 3) points.push({ date: dateStr, plays: Math.floor(totalPlays/8), likes: 0, downloads: 0, cart: 0 });
      else points.push({ date: dateStr, plays: 0, likes: 0, downloads: 0, cart: 0 });
    }
  } else {
    let days = range === 'day'? 7 : range === 'week'? 7 : range === 'month'? 30 : 7;
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now); d.setDate(now.getDate() - i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      const isToday = i === 0;
      const isRecent = i < 3;
      if (isToday) points.push({ date: dateStr, plays: Math.max(1, Math.floor(totalPlays/2)), likes: Math.max(0, Math.floor(totalPlays/3)), downloads: 0, cart: totalCarts || 0, orders: 0, revenue: 0 });
      else if (isRecent) points.push({ date: dateStr, plays: Math.floor(totalPlays/4), likes: 0, downloads: 0, cart: 0, orders: 0, revenue: 0 });
      else points.push({ date: dateStr, plays: 0, likes: 0, downloads: 0, cart: 0, orders: 0, revenue: 0 });
    }
  }
  return points;
}
function extendHistoryToToday(points, range) {
  if (!points || points.length === 0) return points;
  const now = new Date(); const lastStr = points[points.length - 1].date; let lastDate;
  try { if (lastStr.includes(' ')) lastDate = new Date(lastStr.replace(' ', 'T')); else lastDate = new Date(lastStr); } catch(e) { return points; }
  if (range === 'hour') {
    const diffHrs = (now - lastDate) / (1000 * 60);
    if (diffHrs < 1) return points;
    const missing = Math.floor(diffHrs);
    for (let i = 1; i <= missing; i++) {
      const d = new Date(lastDate); d.setHours(lastDate.getHours() + i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:00`;
      points.push({ date: dateStr, plays: points[points.length-1].plays || 0, likes: points[points.length-1].likes || 0, downloads: points[points.length-1].downloads || 0, cart: points[points.length-1].cart || 0, orders: 0, revenue: 0 });
    }
  } else {
    const lastDay = new Date(lastDate); lastDay.setHours(0,0,0,0);
    const today = new Date(now); today.setHours(0,0,0,0);
    const diffDays = Math.floor((today - lastDay) / (1000*60*60*24));
    if (diffDays <= 0) return points;
    for (let i = 1; i <= diffDays; i++) {
      const d = new Date(lastDay); d.setDate(lastDay.getDate() + i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      points.push({ date: dateStr, plays: points[points.length-1].plays || 0, likes: points[points.length-1].likes || 0, downloads: points[points.length-1].downloads || 0, cart: points[points.length-1].cart || 0, orders: 0, revenue: 0 });
    }
  }
  return points;
}

async function loadSmallGraphsHour() {
  try {
    const res = await fetch(`${STATS_API}/api/stats/global?range=hour&tz=${tzOffset}`);
    if (!res.ok) return;
    const json = await res.json();
    let points = json.history || [];
    if (!points.length) {
      const padded = generateFullCurve(json.totalPlays || 0, json.cartItems || 0, 'hour');
      updateSparklinesFromGlobal(padded, json.cartItems, json.totalRevenue, json.totalOrders, json.totalLikes);
      updateTotalsIfChanged(json);
      return;
    }
    points = extendHistoryToToday(points, 'hour');
    lastGlobalHourHash = hashData(points);
    updateSparklinesFromGlobal(points, json.cartItems, json.totalRevenue, json.totalOrders, json.totalLikes);
    updateTotalsIfChanged(json);
  } catch(e){ console.error('[CC Charts] Small hour load failed', e); }
}

function updateCartLineRealtime(beatId, playerCartCount, action='add') {
  if (!charts.trade) return;
  const cartDataset = charts.trade.data.datasets[3];
  if (!cartDataset || cartDataset.data.length === 0) return;
  rebuildCartMapFromStorage();
  let data = [...cartDataset.data];
  const lastIdx = data.length - 1;
  if(lastIdx < 0) return;

  if (currentBeatId) {
    if (beatId && String(beatId)!== String(currentBeatId) && action!=='checkout') return;
    if(action === 'remove'){
      const currentD1 = data[lastIdx] || 0;
      const newCount = Math.max(0, currentD1 - 1);
      data[lastIdx] = newCount;
      console.log(`[CC Charts] Cart REMOVE track ${currentBeatId} ${currentD1} -> ${newCount}`);
    } else if(action === 'checkout'){
      data[lastIdx] = 0;
    } else {
      const trackCountLive = liveCartPerBeat[String(currentBeatId)] || 0;
      const newCount = Math.max(0, trackCountLive);
      data[lastIdx] = newCount;
    }
    cartDataset.data = data;
    charts.trade.update('none');
  } else {
    if(action === 'remove'){
      const newCount = Math.max(0, (data[lastIdx]||0) - 1);
      data[lastIdx] = newCount;
    } else if(action === 'checkout'){
      data[lastIdx] = 0;
    } else {
      const serverVal = data[lastIdx] || 0;
      const localVal = liveCartCount || 0;
      data[lastIdx] = Math.max(serverVal, localVal);
    }
    cartDataset.data = data;
    charts.trade.update('none');
  }

  const cartEl = document.getElementById('cartItems');
  if (cartEl) {
    if(currentBeatId){
      cartEl.textContent = String(liveCartPerBeat[String(currentBeatId)] || 0);
    }
  }
}

function handleCheckoutSubtract(removedIds){
  if (!charts.trade) return;
  const cartDataset = charts.trade.data.datasets[3];
  if (!cartDataset) return;
  let data = [...cartDataset.data];
  const lastIdx = data.length - 1;
  if(lastIdx < 0) return;
  if(currentBeatId){
    if(removedIds.map(String).includes(String(currentBeatId))){
      data[lastIdx] = 0;
      cartDataset.data = data;
      charts.trade.update('none');
    }
  } else {
    if(!removedIds || removedIds.length===0){
      data[lastIdx] = 0;
    } else {
      data[lastIdx] = Math.max(0, (data[lastIdx]||0) - removedIds.length);
    }
    cartDataset.data = data;
    charts.trade.update('none');
  }
  pushCartToSmallGraphs(0, 'checkout');
  rebuildCartMapFromStorage();
}

function pushCartToSmallGraphs(playerCount, action='add') {
  const spark = sparklineCharts['cartSpark'];
  if (!spark) return;
  let data = [...spark.data.datasets[0].data];
  if (data.length === 0) return;
  const lastIdx = data.length - 1;
  if(action === 'remove'){
    const newVal = Math.max(0, (data[lastIdx]||0) - 1);
    data[lastIdx] = newVal;
    spark.data.datasets[0].data = data;
    spark.update('none');
    updateSmallChangeBadge('cartsChange', data);
    return;
  }
  if(action === 'checkout'){
    data[lastIdx] = 0;
    spark.data.datasets[0].data = data;
    spark.update('none');
    updateSmallChangeBadge('cartsChange', data);
    return;
  }
  const newVal = Math.max(data[lastIdx] || 0, playerCount || 0, liveCartCount || 0);
  if (data[lastIdx]!== newVal) {
    data[lastIdx] = newVal;
    if (data.length >= 2 && data[lastIdx-1] === 0 && newVal > 0) {
      data[lastIdx-1] = Math.max(0, newVal - 1);
    }
    spark.data.datasets[0].data = data;
    spark.update('none');
    updateSmallChangeBadge('cartsChange', data);
  }
}

function updateLikesLineRealtime(beatId, liked) {
  if (!charts.trade) return;
  const likesDataset = charts.trade.data.datasets[1];
  if (!likesDataset || likesDataset.data.length === 0) return;
  rebuildLikesMapFromStorage();
  let data = [...likesDataset.data];
  const lastIdx = data.length - 1;
  if (lastIdx < 0) return;
  if (currentBeatId) {
    if (beatId && String(beatId)!== String(currentBeatId)) return;
    const isLikedLive =!!liveLikesPerBeat[String(currentBeatId)];
    let newVal = isLikedLive? 1 : 0;
    if (data[lastIdx]!== newVal) { data[lastIdx] = newVal; likesDataset.data = data; charts.trade.update('none'); }
  } else {
    const finalVal = liveLikesCount;
    if (data[lastIdx]!== finalVal) { data[lastIdx] = finalVal; likesDataset.data = data; charts.trade.update('none'); }
  }
}
function pushLikesToSmallGraphs(playerCount) {
  const spark = sparklineCharts['likesSpark'];
  if (!spark) return;
  let data = [...spark.data.datasets[0].data];
  if (data.length === 0) return;
  const lastIdx = data.length - 1;
  rebuildLikesMapFromStorage();
  const newVal = liveLikesCount;
  if (data[lastIdx]!== newVal) {
    data[lastIdx] = newVal;
    if (data.length >= 2 && data[lastIdx-1] === 0 && newVal > 0) data[lastIdx-1] = Math.max(0, newVal - 1);
    spark.data.datasets[0].data = data;
    spark.update('none');
    updateSmallChangeBadge('likesChange', data);
  }
}
function startLivePolling() {
  if (pollInterval) clearInterval(pollInterval);
  pollInterval = setInterval(async () => {
    try {
      const hourRes = await fetch(`${STATS_API}/api/stats/global?range=hour&tz=${tzOffset}`);
      if (hourRes.ok) {
        const json = await hourRes.json();
        let pts = json.history || [];
        pts = extendHistoryToToday(pts, 'hour');
        const hHash = hashData(pts);
        if (hHash!== lastGlobalHourHash) {
          lastGlobalHourHash = hHash;
          updateSparklinesFromGlobal(pts, json.cartItems, json.totalRevenue, json.totalOrders, json.totalLikes);
          updateTotalsIfChanged(json);
        } else {
          updateTotalsIfChanged(json);
        }
      }
      if (currentBeatId) {
        const res = await fetch(`${STATS_API}/api/stats/track/${currentBeatId}?range=${currentRange}&tz=${tzOffset}`);
        if (!res.ok) return;
        const json = await res.json();
        const h = JSON.stringify((json.points||[]).slice(-4));
        if (h!== lastTrackHash) { lastTrackHash=h; await loadTradeChartData(currentBeatId, currentRange, true); }
      } else {
        const res = await fetch(`${STATS_API}/api/stats/global?range=${currentRange}&tz=${tzOffset}`);
        if (!res.ok) return;
        const json = await res.json();
        const h = JSON.stringify((json.history||[]).slice(-4));
        if (h!== lastGlobalRangeHash) { lastGlobalRangeHash=h; await loadTradeChartData(null, currentRange, true); }
      }
    } catch(e){}
  }, 15000);
}

function updateTotalsIfChanged(json) {
  const set = (id,val) => { const el=document.getElementById(id); if(!el)return; const n=String(val||0); if(el.textContent!==n) el.textContent=n; };
  const cartEl = document.getElementById('cartItems');
  if (cartEl) {
    if(currentBeatId){
      const trackLive = liveCartPerBeat[String(currentBeatId)] || 0;
      if(cartEl.textContent!== String(trackLive)) cartEl.textContent = String(trackLive);
    } else {
      // 🔥 SERVER IS TRUTH - FIX GHOST 104
      const serverGlobal = json.cartItems?? 0;
      const localGlobal = liveCartCount || 0;
      // if server 0 and local 0 -> 0, if server 104 but you cleaned ghosts, server will be 0
      const display = Math.max(serverGlobal, localGlobal);
      // allow drop to 0 when D1 cleared
      if (serverGlobal === 0) {
        cartEl.textContent = String(localGlobal);
      } else {
        if(cartEl.textContent!== String(display)) cartEl.textContent = String(display);
      }
    }
  }
  const likesEl = document.getElementById('totalLikes');
  if (likesEl) {
    if(currentBeatId == null){
      const display = Math.max(json.totalLikes||0, liveLikesCount||0);
      if(likesEl.textContent!== String(display)) likesEl.textContent = String(display);
    }
  }
  set('totalPlays', json.totalPlays);
  set('totalDownloads', json.totalDownloads);
  set('totalOrders', json.totalOrders);
  const rev=document.getElementById('totalRevenue');
  if(rev){ const n=`$${(json.totalRevenue||0).toFixed(2)}`; if(rev.textContent!==n) rev.textContent=n; }
}

function initMainChart() {
  const ctx = document.getElementById('tradeChart')?.getContext('2d');
  if (!ctx) return;
  const g1 = ctx.createLinearGradient(0,0,0,300); g1.addColorStop(0,'rgba(139,92,246,0.4)'); g1.addColorStop(1,'rgba(139,92,246,0)');
  const g2 = ctx.createLinearGradient(0,0,0,300); g2.addColorStop(0,'rgba(239,68,68,0.4)'); g2.addColorStop(1,'rgba(239,68,68,0)');
  const g3 = ctx.createLinearGradient(0,0,0,300); g3.addColorStop(0,'rgba(16,185,129,0.4)'); g3.addColorStop(1,'rgba(16,185,129,0)');
  const g4 = ctx.createLinearGradient(0,0,0,300); g4.addColorStop(0,'rgba(245,158,11,0.6)'); g4.addColorStop(1,'rgba(245,158,11,0.1)');
  charts.trade = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        { label: 'Plays', data: [], borderColor: '#8b5cf6', backgroundColor: g1, borderWidth: 3, tension: 0.4, fill: true, pointRadius: 4, pointHoverRadius: 8, pointBackgroundColor: '#8b5cf6', pointBorderColor: '#fff', pointBorderWidth: 2 },
        { label: 'Likes', data: [], borderColor: '#ef4444', backgroundColor: g2, borderWidth: 3, tension: 0.4, fill: true, pointRadius: 4, pointHoverRadius: 8, pointBackgroundColor: '#ef4444', pointBorderColor: '#fff', pointBorderWidth: 2 },
        { label: 'Downloads', data: [], borderColor: '#10b981', backgroundColor: g3, borderWidth: 3, tension: 0.4, fill: true, pointRadius: 4, pointHoverRadius: 8, pointBackgroundColor: '#10b981', pointBorderColor: '#fff', pointBorderWidth: 2 },
        { label: 'Cart (Current Track)', data: [], borderColor: '#f59e0b', backgroundColor: g4, borderWidth: 4, tension: 0.4, fill: true, pointRadius: 6, pointHoverRadius: 10, pointBackgroundColor: '#f59e0b', pointBorderColor: '#fff', pointBorderWidth: 3 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false, animation: false,
      transitions: { active: { animation: { duration: 0 } } },
      interaction: { intersect: false, mode: 'index' },
      plugins: {
        legend: { display: true, position: 'top', labels: { color: '#888', usePointStyle: true, padding: 15, font: { size: 11 } } },
        tooltip: { backgroundColor: '#1a1a1a', titleColor: '#fff', bodyColor: '#fff', borderColor: '#333', borderWidth: 1, padding: 12, displayColors: true,
          callbacks: { title: (items) => { const raw = items[0].label; if (currentRange === 'hour') { const [d,t]=raw.split(' '); const [y,m,day]=d.split('-'); return `${m}/${day} ${t}`; } const [y,m,day]=raw.split('-'); return `${m}/${day}`; }, label: (c) => `${c.dataset.label}: ${c.parsed.y}` } }
      },
      scales: {
        x: { type: 'category', grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#666', font: { size: 10 }, maxTicksLimit: 8, callback: function(v){ const l=this.getLabelForValue(v); if(currentRange==='hour') return l.split(' ')[1]||l; const p=l.split('-'); return p.length===3?`${p[1]}/${p[2]}`:l; } }, border: { display: false } },
        y: { ticks: { color: '#666', font: { size: 10 }, stepSize: 1, callback: (v)=>Math.floor(v) }, grid: { color: 'rgba(255,255,255,0.05)' }, border: { display: false }, beginAtZero: true }
      }
    }
  });
}

function updateSparklinesFromGlobal(points, cartOverride = null, revenueOverride = null, ordersOverride = null, likesOverride = null) {
  if (!points) return;
  let last24 = points.slice(-24);
  if (last24.length < 24) {
    const padCount = 24 - last24.length;
    const pad = Array(padCount).fill(0).map((_,i) => { const d = new Date(); d.setHours(d.getHours() - (24 - i)); return { date: d.toISOString(), plays: 0, likes: 0, downloads: 0, cart: 0, orders: 0, revenue: 0 }; });
    last24 = [...pad,...last24];
  }
  rebuildLikesMapFromStorage();
  rebuildCartMapFromStorage();
  const sparkData = {
    'playsSpark': last24.map(d => d.plays || 0),
    'likesSpark': last24.map((d,i) => { let v = d.likes || 0; if (i === last24.length - 1) v = Math.max(v, parseInt(likesOverride||0)||0, liveLikesCount||0); return v; }),
    'downloadsSpark': last24.map(d => d.downloads || 0),
    'cartSpark': last24.map((d,i) => {
      let v = d.cart || 0;
      // 🔥 FIX: D1 truth - if server says 0, show 0 + local
      const serverVal = parseInt(cartOverride||0)||0;
      if (i === last24.length - 1) {
        if (serverVal === 0) v = liveCartCount || 0;
        else v = Math.max(v, serverVal, liveCartCount||0);
      }
      return v;
    }),
    'ordersSpark': last24.map((d,i) => { let v = d.orders || 0; if (i === last24.length - 1) v = Math.max(v, parseInt(ordersOverride||0)||0); if (v === 0 && ordersOverride > 0 && i >= last24.length - 3) v = Math.max(1, Math.floor(ordersOverride * 0.35)); return v; }),
    'revenueSpark': last24.map((d,i) => { let v = d.revenue || 0; if (i === last24.length - 1) v = Math.max(v, Number(revenueOverride||0)); if (v === 0 && revenueOverride > 0 && i >= last24.length - 3) v = Number((revenueOverride * 0.35).toFixed(2)); return v; })
  };
  const badgeMap = { 'playsSpark':'playsChange', 'likesSpark':'likesChange', 'downloadsSpark':'downloadsChange', 'cartSpark':'cartsChange', 'ordersSpark':'ordersChange', 'revenueSpark':'revenueChange' };
  Object.entries(sparkData).forEach(([id,data]) => {
    if (sparklineCharts[id]) {
      const old = sparklineCharts[id].data.datasets[0].data;
      if (old.length!== data.length || old.join(',')!== data.join(',')) {
        sparklineCharts[id].data.labels = Array(24).fill('');
        sparklineCharts[id].data.datasets[0].data = data;
        sparklineCharts[id].update('none');
      }
    }
    if (badgeMap[id]) updateSmallChangeBadge(badgeMap[id], data);
  });
}

export async function loadTradeChartData(beatId = null, range = 'day', isPoll = false) {
  if (!charts.trade) return;
  if (beatId!== null) setCurrentBeatId(beatId);
  setCurrentRange(range);
  const clearBtn = document.getElementById('clearTrackFilter');
  if (beatId) { if(clearBtn) clearBtn.style.display='block'; } else { if(clearBtn) clearBtn.style.display='none'; }
  try {
    let titleEl = document.getElementById('graphBeatName');
    if (beatId) {
      const res = await fetch(`${STATS_API}/api/stats/track/${beatId}?range=${range}&tz=${tzOffset}`);
      if (!res.ok) throw new Error('track fail');
      const json = await res.json();
      let points = json.points || [];
      points = extendHistoryToToday(points, range);
      if (isPoll) { const h=JSON.stringify(points.slice(-4)); if(h===lastTrackHash) return; lastTrackHash=h; }
      rebuildCartMapFromStorage();
      rebuildLikesMapFromStorage();
      charts.trade.data.labels = points.map(d => d.date);
      charts.trade.data.datasets[0].data = points.map(d => d.plays || 0);
      charts.trade.data.datasets[1].data = points.map((d,i) => { let v = d.likes || 0; if (i === points.length - 1) v = liveLikesPerBeat[String(beatId)]? 1 : 0; return v; });
      charts.trade.data.datasets[2].data = points.map(d => d.downloads || 0);
      charts.trade.data.datasets[3].data = points.map((d,i) => { let v = d.cart || 0; if (i === points.length - 1) v = Math.max(0, liveCartPerBeat[String(beatId)] || 0); return v; });
      if (points.length === 0) {
        const liveForTrack = liveCartPerBeat[String(beatId)] || 0;
        const liveLike = liveLikesPerBeat[String(beatId)] || 0;
        if (liveForTrack > 0 || liveLike > 0) {
          charts.trade.data.labels = [new Date().toISOString().split('T')[0]];
          charts.trade.data.datasets[1].data = [liveLike];
          charts.trade.data.datasets[3].data = [liveForTrack];
        }
      }
      if (titleEl) titleEl.textContent = `${json.beatTitle || 'Track #'+beatId} - ${range} - Cart: ${liveCartPerBeat[String(beatId)] || 0} (player) Likes: ${liveLikesPerBeat[String(beatId)]? 1 : 0} - up to ${new Date().toLocaleDateString()}`;
    } else {
      const res = await fetch(`${STATS_API}/api/stats/global?range=${range}&tz=${tzOffset}`);
      if (!res.ok) throw new Error('global fail');
      const json = await res.json();
      let points = json.history || [];
      points = extendHistoryToToday(points, range);
      if (isPoll) { const h=JSON.stringify(points.slice(-4)); if(h===lastGlobalRangeHash) return; lastGlobalRangeHash=h; }
      rebuildCartMapFromStorage();
      rebuildLikesMapFromStorage();
      charts.trade.data.labels = points.map(d => d.date);
      charts.trade.data.datasets[0].data = points.map(d => d.plays || 0);
      charts.trade.data.datasets[1].data = points.map((d,i) => { let v = d.likes || 0; if (i === points.length - 1) v = Math.max(v, json.totalLikes||0, liveLikesCount||0); return v; });
      charts.trade.data.datasets[2].data = points.map(d => d.downloads || 0);
      charts.trade.data.datasets[3].data = points.map((d,i) => {
        let v = d.cart || 0;
        if (i === points.length - 1) {
          const serverVal = json.cartItems||0;
          if (serverVal === 0) v = liveCartCount||0;
          else v = Math.max(v, serverVal, liveCartCount||0);
        }
        return v;
      });
      if (titleEl) titleEl.textContent = `All Tracks - ${range} - Global Carts: ${json.cartItems||0} - up to ${new Date().toLocaleDateString()}`;
      if (!isPoll) updateTotalsIfChanged(json);
    }
    charts.trade.update('none');
  } catch (err) {
    if(!isPoll){ charts.trade.data.labels=[]; charts.trade.data.datasets.forEach(ds=>ds.data=[]); charts.trade.update('none'); }
  }
}

function initSparklines() {
  const configs = [
    { id: 'playsSpark', color: '#8b5cf6', bg: 'rgba(139,92,246,0.2)' },
    { id: 'downloadsSpark', color: '#10b981', bg: 'rgba(16,185,129,0.2)' },
    { id: 'cartSpark', color: '#f59e0b', bg: 'rgba(245,158,11,0.2)' },
    { id: 'likesSpark', color: '#ef4444', bg: 'rgba(239,68,68,0.2)' },
    { id: 'ordersSpark', color: '#3b82f6', bg: 'rgba(59,130,246,0.2)' },
    { id: 'revenueSpark', color: '#10b981', bg: 'rgba(16,185,129,0.2)' }
  ];
  configs.forEach(cfg => {
    const ctx = document.getElementById(cfg.id)?.getContext('2d');
    if (!ctx) return;
    sparklineCharts[cfg.id] = new Chart(ctx, {
      type: 'line',
      data: { labels: Array(24).fill(''), datasets: [{ data: Array(24).fill(0), borderColor: cfg.color, backgroundColor: cfg.bg, borderWidth: 2, tension: 0.4, fill: true, pointRadius: 0, pointHoverRadius: 0 }] },
      options: { responsive: true, maintainAspectRatio: false, animation: false, transitions: { active: { animation: { duration: 0 } } }, plugins: { legend: { display: false }, tooltip: { enabled: false } }, scales: { x: { display: false }, y: { display: false, beginAtZero: true } }, elements: { line: { cubicInterpolationMode: 'monotone' } } }
    });
  });
}
export async function loadSparklines(history) { if (!history) { await loadSmallGraphsHour(); return; } updateSparklinesFromGlobal(history); }
export function selectTrackForGraph(beatId) { setCurrentBeatId(beatId); lastGlobalRangeHash=''; lastTrackHash=''; document.getElementById('clearTrackFilter') && (document.getElementById('clearTrackFilter').style.display='block'); loadTradeChartData(beatId, currentRange); }
export function clearTrackFilter() { setCurrentBeatId(null); lastGlobalRangeHash=''; const b=document.getElementById('clearTrackFilter'); if(b) b.style.display='none'; loadTradeChartData(null, currentRange); }
function initRangeButtons() { document.querySelectorAll('[data-range]').forEach(btn=>{ btn.onclick=()=>{ document.querySelectorAll('[data-range]').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); lastGlobalRangeHash=''; lastTrackHash=''; loadTradeChartData(currentBeatId, btn.dataset.range); }; }); }
function initMetricButtons() { document.querySelectorAll('[data-metric]').forEach(btn=>{ btn.onclick=()=>{ document.querySelectorAll('[data-metric]').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); activeMetric=btn.dataset.metric; charts.trade.data.datasets.forEach((ds,i)=>{ const m=['plays','likes','downloads','cart']; ds.hidden=m[i]!==activeMetric; }); charts.trade.update('none'); }; }); }
window.addEventListener('beforeunload', ()=>{ if(pollInterval) clearInterval(pollInterval); });
window.clearTrackFilter=clearTrackFilter;
window.dispatchCartRemoved = (beatId) => { window.dispatchEvent(new CustomEvent('cc_cart_removed', { detail: { beat_id: beatId, beatId } })); };
window.dispatchCheckout = (beatIds) => { window.dispatchEvent(new CustomEvent('cc_checkout_completed', { detail: { beat_ids: beatIds } })); };
