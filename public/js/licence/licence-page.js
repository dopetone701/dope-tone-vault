import { renderSimilarTracks } from "./licence-similar.js"
import { setupCheckout } from "./checkout-paypal.js";

const API_URL = 'https://api.dopetonevault.com';
const D1_API_URL = 'https://dope-tone-api.dopetone701.workers.dev';
const WORKER_URL = API_URL;
const STATS_API = 'https://dopetone-stats.dopetone701.workers.dev';
const STRIPE_WORKER_URL = 'https://dopetone-stripe.dopetone701.workers.dev';

const PLAY_ICON = "M8 5v14l11-7z";
const PAUSE_ICON = "M6 19h4V5H6v14zm8-14v14h4V5h-4z";
const PLAY_SVG = `<svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor"><path d="${PLAY_ICON}"/></svg>`;
const PAUSE_SVG = `<svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor"><path d="${PAUSE_ICON}"/></svg>`;

const safeParse = (key, fallback) => {
  try { const v = localStorage.getItem(key); return v? JSON.parse(v) : fallback; }
  catch { return fallback; }
};
const safeSetItem = (k,v) => { try{ localStorage.setItem(k, JSON.stringify(v)); }catch{} };
const safeGet = (id) => document.getElementById(id);

const getMode = (b) => {
  if (!b) return 'paid';
  let m = (b.monetization_mode || b.monetizationMode || '').toLowerCase().trim();
  if (['free','hybrid','paid'].includes(m)) return m;
  if (m.includes('tagged')) return 'hybrid';
  if (b.is_free == 1 || b.is_free === true) return 'free';
  if (b.has_free_tagged == 1) return 'hybrid';
  return 'paid';
};

function ensureMode(beat){
  if(!beat) return beat;
  const mode = beat.monetization_mode || beat.monetizationMode || (beat.is_free==1?'free': beat.has_free_tagged==1?'hybrid':'paid');
  return {
...beat,
    monetization_mode: mode,
    monetizationMode: mode,
    is_free: mode==='free'?1:0,
    has_free_tagged: mode==='hybrid'?1:0,
    price: beat.price?? beat.basic_price?? 29.99,
    type_beat: beat.type_beat || beat.typeBeat || beat.type || beat.beat_type || "--",
    type: beat.type_beat || beat.typeBeat || beat.type || beat.beat_type || "--"
  };
}

const calcPro = (basic) => Number((Number(basic) * 49 / 19).toFixed(2));
const calcExclusive = (basic) => Number((Number(basic) * 199 / 19).toFixed(2));

const params = new URLSearchParams(window.location.search);
let beatId = params.get("id");
let audio = null;
let selectedLicences = safeParse("dopetone_licences",{});
let selectedLicence = null;
let activeCartBeat = null;
let beatsCache = null;
let beatsCacheTime = 0;
let isRenderingCart = false; // 🔥 FIX STOP LOOP

function applyDynamicBG(image){
  const bg = document.getElementById("beatBg");
  if(!bg) return;
  if(!image || image.includes("logo.png")){
    bg.classList.remove("active");
    bg.style.backgroundImage = "none";
    return;
  }
  bg.style.backgroundImage = `url(${image})`;
  bg.classList.add("active");
}

function resetBG(){
  const bg = document.getElementById("beatBg");
  if(bg){
    bg.classList.remove("active");
    bg.style.backgroundImage = "none";
  }
}

function armGlobalPlayer(beat){
  if(!beat) return;
  beat = ensureMode(beat);
  const licenceBeat = {
    id: beat.id,
    title: beat.title,
    cover_url: beat.cover || beat.cover_url || "images/logo.png",
    mp3_url: beat.audio || beat.mp3_url,
    genre: beat.genre,
    bpm: beat.bpm
  };
  window.__LICENCE_ACTIVE_ID__ = licenceBeat.id;
  window.__LICENCE_BEAT__ = licenceBeat;
  window.__CURRENT_BEAT__ = beat;
  window.__ACTIVE_TRACK_KEY__ = `licence_${beat.id}`;
  try{
    const gpCover = safeGet("gpCover");
    const mpCover = safeGet("mpCover");
    const gpTitle = safeGet("gpTitle");
    const mpTitle = safeGet("mpTitle");
    if(gpCover && gpCover.src!== licenceBeat.cover_url) gpCover.src = licenceBeat.cover_url;
    if(mpCover && mpCover.src!== licenceBeat.cover_url) mpCover.src = licenceBeat.cover_url;
    if(gpTitle) gpTitle.textContent = licenceBeat.title;
    if(mpTitle) mpTitle.textContent = licenceBeat.title;
    if(window.globalPlayer?.audio){
      if(!window.globalPlayer.audio.src.includes(encodeURIComponent(licenceBeat.mp3_url)) && window.globalPlayer.audio.src!== licenceBeat.mp3_url){
        window.globalPlayer.audio.src = licenceBeat.mp3_url;
        window.globalPlayer.audio.preload = "auto";
      }
    }
    if(window.globalPlayer){
      window.globalPlayer._queue = [licenceBeat];
      window.globalPlayer.queue = [licenceBeat];
      window.globalPlayer._index = 0;
    }
    const playerUI = safeGet("globalPlayerUI");
    if(playerUI) playerUI.classList.add("has-track");
  }catch(e){ console.log("arm failed", e); }
}

window.addEventListener("load", async () => {
    const earlyCart = safeParse("dopetone_cart", []);
    if(earlyCart.length>0){
      document.body.classList.remove("empty-mode");
      document.body.classList.add("active-mode");
    }
    setupCheckout();
    setupCheckout();
    setupPlayer();
    setupLike();
    setupShare();
    setupLicenceSelection();
    setupAddToCart();
    updateCartCount();
    const cart = safeParse("dopetone_cart", []).map(ensureMode);
    if (!beatId && cart.length > 0) {
        const b = cart[0];
        beatId = b.id;
        activeCartBeat = b;
        window.currentBeat = b;
        window.__CURRENT_BEAT__ = b;
        safeGet("title")&&(safeGet("title").textContent = b.title);
        safeGet("cover")&&(safeGet("cover").src = b.cover_url || b.cover || "images/logo.png");
        safeGet("genre")&&(safeGet("genre").textContent = b.genre || "--");
        safeGet("bpm")&&(safeGet("bpm").textContent = b.bpm || "--");
        safeGet("type")&&(safeGet("type").textContent = b.type_beat || b.type || "--");
        safeGet("mood")&&(safeGet("mood").textContent = b.mood || "--");
        safeGet("key")&&(safeGet("key").textContent = b.key || "--");
        document.body.classList.add("active-mode");
        document.body.classList.remove("empty-mode");
        applyDynamicBG(b.cover_url || b.cover);
        armGlobalPlayer(b);
        history.replaceState({}, "", `?id=${b.id}`);
        renderSimilarTracks([b]);
        updatePrices(b);
        applyMonetizationRules(b);
        loadGlobalLikeCount(b.id);
    } else if (beatId) {
        await loadBeat();
    }
    checkEmptyState();
    renderCartBeatRow(); // only here + on cart change
    updateSelectedBar();
    updateCheckoutTheme();
    setTimeout(() => document.querySelector(`[data-id="${beatId}"]`)?.classList.add("active"), 200);
    setTimeout(initCartScroll, 500);
    setTimeout(forceTitle, 2000);
});

async function loadBeat(){
    try {
        const cart = safeParse("dopetone_cart", []).map(ensureMode);
        if(!beatId) return;
        const cartBeat = cart.find(b => String(b.id)==String(beatId));
        if (cartBeat) {
            if (!beatsCache || Date.now() - beatsCacheTime > 30000) {
                const res = await fetch(`${API_URL}/beats`);
                const fresh = await res.json();
                beatsCache = fresh.map(ensureMode);
                beatsCacheTime = Date.now();
            }
            const freshBeat = beatsCache.find(b => String(b.id)==String(beatId)) || cartBeat;
            window.currentBeat = ensureMode({
           ...cartBeat,
           ...freshBeat,
                monetization_mode: cartBeat.monetization_mode || freshBeat.monetization_mode || 'paid',
                play_count: freshBeat.play_count || 0,
                price: freshBeat.price || cartBeat.price || 29.99
            });
            window.__CURRENT_BEAT__ = window.currentBeat;
            updateBeatUI(window.currentBeat);
            return;
        }
        if (!beatsCache || Date.now() - beatsCacheTime > 30000) {
            const res = await fetch(`${API_URL}/beats`);
            const fresh = await res.json();
            beatsCache = fresh.map(ensureMode);
            beatsCacheTime = Date.now();
        }
        const beat = beatsCache.find(b => String(b.id)==String(beatId));
        if(!beat) return;
        window.currentBeat = ensureMode({
            id: beat.id, title: beat.title, cover: beat.cover_url, cover_url: beat.cover_url,
            genre: beat.genre || "--", bpm: beat.bpm || "--",
            type: beat.type_beat || beat.typeBeat || beat.type || "--",
            type_beat: beat.type_beat || beat.typeBeat || beat.type || "--",
            mood: beat.mood || "--", key: beat.key || "--",
            audio: beat.mp3_url, play_count: beat.play_count || beat.plays || 0,
            monetization_mode: beat.monetization_mode || getMode(beat) || 'paid',
            has_free_tagged: beat.has_free_tagged || 0,
            price: beat.price || beat.basic_price || 29.99
        });
        window.__CURRENT_BEAT__ = window.currentBeat;
        updateBeatUI(window.currentBeat);
    } catch(err) { console.log('loadBeat error:', err); }
}

function updateBeatUI(beat) {
    beat = ensureMode(beat);
    safeSet("title", beat.title); safeSet("genre", beat.genre); safeSet("bpm", beat.bpm);
    safeSet("type", beat.type_beat || beat.type || "--"); safeSet("mood", beat.mood || "--"); safeSet("key", beat.key || "--");
    const cover = safeGet("cover");
    if(cover && cover.src!== (beat.cover || beat.cover_url)){
        cover.src = beat.cover || beat.cover_url || "images/logo.png";
    }
    applyDynamicBG(beat.cover || beat.cover_url);
    armGlobalPlayer(beat);
    if(beat.audio) audio = new Audio(beat.audio);
    let playEl = safeGet("playCount");
    if (!playEl) {
        playEl = document.createElement("div"); playEl.id = "playCount"; playEl.className = "beat-plays";
        const titleEl = safeGet("title"); titleEl?.parentNode?.insertBefore(playEl, titleEl.nextSibling);
    }
    const plays = beat.play_count?? 0;
    playEl.textContent = `${plays.toLocaleString()} plays`;
    playEl.style.cssText = 'display:block;opacity:1;color:#b3b3b3;text-align:center;margin-top:8px';
    updatePrices(beat);
    // 🔥 REMOVED renderCartBeatRow() FROM HERE - WAS CAUSING LOOP
    renderSimilarTracks([beat]);
    loadGlobalLikeCount(beat.id);
    setTimeout(forceTitle, 100);
    applyMonetizationRules(beat);
}

function updateCartCount(){
    const cart = safeParse("dopetone_cart", []);
    document.querySelectorAll(".cart-count").forEach(el => { el.textContent = cart.length; });
    const goToCart = () => {
        if(cart.length === 0){ window.location.href = "licence-page.html"; return; }
        window.location.href = `licence-page.html?id=${cart[0].id}`;
    };
    const cartBtn = safeGet("cartBtn"); if(cartBtn) cartBtn.onclick = (e)=>{ e.preventDefault(); goToCart(); };
    const mobileCartBtn = safeGet("mobileCartBtn"); if(mobileCartBtn) mobileCartBtn.onclick = (e)=>{ e.preventDefault(); goToCart(); };
}

function checkEmptyState(){
    const cart = safeParse("dopetone_cart", []);
    if(cart.length === 0){
        renderSimilarTracks(); const st = safeGet("similarTitle"); if(st) st.textContent = "Recommended Tracks";
        beatId = null; activeCartBeat = null; window.currentBeat = null; selectedLicence = null; audio = null;
        window.history.replaceState({}, "", "licence-page.html");
        document.body.classList.add("empty-mode"); document.body.classList.remove("active-mode");
        safeSet("title", "CART EMPTY"); ["genre","bpm","type","mood","key"].forEach(id=>safeSet(id,"--"));
        const cover = safeGet("cover"); if(cover) cover.src = "images/logo.png";
        const playBtn = safeGet("playBtn"); if(playBtn) playBtn.innerHTML = PLAY_SVG;
        resetBG();
        document.querySelectorAll(".old,.new").forEach(el => el.textContent = "$00");
        localStorage.removeItem("dopetone_licences"); selectedLicences = {};
        renderCartBeatRow();
        updateSelectedBar(); updateCheckoutTheme(); return;
    }
    const similarTitle = safeGet("similarTitle"); if(similarTitle) similarTitle.textContent = "Similar Tracks";
    document.body.classList.remove("empty-mode"); document.body.classList.add("active-mode");
}

function setupShare(){
    const shareBtn = safeGet("shareBtn"); if(!shareBtn) return;
    shareBtn.onclick = async() => {
        const beat = window.currentBeat;
        const shareData = { title: beat?.title || 'Dope Tone Beat', text: `🔥 Check out "${beat?.title}" on Dope Tone`, url: window.location.href };
        try{ if (navigator.share && navigator.canShare?.(shareData)) await navigator.share(shareData); else throw 0; }
        catch{ try{ await navigator.clipboard.writeText(window.location.href); showToast('Link copied 🔗'); }catch{ showToast('Copy failed'); } }
    };
}

function showToast(msg) {
    const toast = document.createElement('div'); toast.textContent = msg;
    toast.style.cssText = `position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.9);color:#fff;padding:12px 24px;border-radius:24px;z-index:99999;font-size:14px;backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,0.1);`;
    document.body.appendChild(toast); setTimeout(() => toast.remove(), 2000);
}

function setupLicenceSelection(){
    const cards = document.querySelectorAll(".licence-card");
    document.querySelectorAll(".pay-btn").forEach(btn => {
        btn.onclick = () => {
            const card = btn.closest(".licence-card"); if(!card||card.classList.contains('locked')) return;
            cards.forEach(c => { c.classList.remove("active","faded"); });
            card.classList.add("active"); cards.forEach(c => { if(c!==card) c.classList.add("faded"); });
            selectedLicences[beatId] = { name: btn.dataset.name, price: Number(btn.dataset.price), title: window.currentBeat?.title||'Beat' };
            safeSetItem("dopetone_licences", selectedLicences); updateSelectedBar(); updateCheckoutTheme();
        };
    });
}

function renderCartBeatRow(){
    if(isRenderingCart) return; // 🔥 STOP UNSTOPABLE LOOP
    isRenderingCart = true;
    const wrap = document.querySelector("#cartBeatRow"); if(!wrap){ isRenderingCart=false; return; }
    let cart = safeParse("dopetone_cart", []).map(ensureMode);
    wrap.innerHTML = "";
    cart.forEach((beat) => {
        const b = ensureMode(beat);
        const card = document.createElement("div");
        card.className = "cart-beat-card";
        card.dataset.id = b.id;
        card.dataset.mode = b.monetization_mode;
        if(String(b.id) === String(activeCartBeat?.id || beatId)) card.classList.add("active");
        card.innerHTML = `<button class="remove-cart-track" data-id="${b.id}">✕</button><img src="${b.cover || b.cover_url || "images/logo.png"}" loading="lazy"><h4>${b.title}</h4><span style="position:absolute;top:4px;left:4px;font-size:8px;padding:2px 4px;border-radius:3px;font-weight:800;color:#fff;background:${b.monetization_mode==='free'?'#3b82f6':b.monetization_mode==='hybrid'?'#f59e0b':'#ff003c'}">${b.monetization_mode.toUpperCase()}</span>`;
        card.querySelector(".remove-cart-track").onclick = (e) => { e.stopPropagation(); e.preventDefault(); removeBeatFromCart(e, b.id); };
        card.onclick = async () => {
            document.querySelectorAll(".cart-beat-card").forEach(c => c.classList.remove("active"));
            card.classList.add("active");
            await switchActiveBeat(b);
            const licenceBeat = { id: b.id, title: b.title, cover_url: b.cover || b.cover_url, mp3_url: b.audio || b.mp3_url };
            window.__LICENCE_BEAT__ = licenceBeat;
            window.__CURRENT_BEAT__ = b;
            armGlobalPlayer(b);
            window.globalPlayer?.play(0, [licenceBeat], `licence_${b.id}_${Date.now()}`);
            window._licenceSetPause?.();
        };
        wrap.appendChild(card);
    });
    isRenderingCart = false;
}

function updateCheckoutTheme(){
    document.body.classList.remove("selected-free","selected-basic","selected-pro","selected-exclusive");
    document.querySelectorAll(".licence-card.active").forEach(card => {
        if(card.classList.contains("free")) document.body.classList.add("selected-free");
        if(card.classList.contains("basic")) document.body.classList.add("selected-basic");
        if(card.classList.contains("pro")) document.body.classList.add("selected-pro");
        if(card.classList.contains("exclusive")) document.body.classList.add("selected-exclusive");
    });
}

function updatePrices(beat){
    const b = ensureMode(beat || window.currentBeat); if(!b) return;
    const cart = safeParse("dopetone_cart", []); if(cart.length === 0){ document.querySelectorAll(".old,.new").forEach(el => el.textContent = "$00"); return; }
    const basic = Number(b.price?? 19); const pro = calcPro(basic); const exclusive = calcExclusive(basic);
    const prices = { free:0, basic, pro, exclusive };
    Object.keys(prices).forEach(type => {
        const card = document.querySelector(`.licence-card.${type}`); if(!card) return;
        const oldPrice = card.querySelector(".old"); const newPrice = card.querySelector(".new"); const btn = card.querySelector(".pay-btn"); const value = prices[type];
        if(oldPrice) oldPrice.textContent = type==='free'? "$00" : `$${(value*1.5).toFixed(2)}`;
        if(newPrice) newPrice.textContent = type==='free'? "$00" : `$${value.toFixed(2)}`;
        if(btn) btn.dataset.price = value;
    });
}

function safeSet(id, value){ const el = safeGet(id); if(!el) return; el.textContent = value || "--"; }

function setupPlayer(){
    const playBtn = safeGet("playBtn");
    if(!playBtn) return;
    playBtn.innerHTML = PLAY_SVG;
    const setPlay = () => { playBtn.innerHTML = PLAY_SVG; playBtn.classList.remove("playing"); };
    const setPause = () => { playBtn.innerHTML = PAUSE_SVG; playBtn.classList.add("playing"); };
    window._licenceSetPlay = setPlay;
    window._licenceSetPause = setPause;
    playBtn.onclick = async () => {
        const beat = window.currentBeat;
        if(!beat) return;
        const licenceBeat = { id: beat.id, title: beat.title, cover_url: beat.cover || beat.cover_url || "images/logo.png", mp3_url: beat.audio || beat.mp3_url, genre: beat.genre, bpm: beat.bpm };
        const gpAudio = window.globalPlayer?.audio;
        const sameTrack = String(window.__LICENCE_ACTIVE_ID__) === String(licenceBeat.id);
        const isActuallyPlaying = gpAudio?!gpAudio.paused &&!gpAudio.ended : false;
        if(sameTrack){
            if(isActuallyPlaying){
                if(window.globalPlayer?.pause) window.globalPlayer.pause();
                else gpAudio?.pause();
                setPlay();
            } else {
                try{
                    if(gpAudio){ await gpAudio.play(); } else { window.globalPlayer?.play(0, [licenceBeat], `licence_${beat.id}`); }
                    setPause();
                }catch(e){}
            }
            return;
        }
        armGlobalPlayer(beat);
        if(window.globalPlayer?.play){ window.globalPlayer.play(0, [licenceBeat], `licence_${beat.id}`); }
        else if(gpAudio){ gpAudio.src = licenceBeat.mp3_url; await gpAudio.play().catch(()=>{}); }
        setPause();
        try{ await fetch(`${API_URL}/beats/${beat.id}/play`, { method: 'POST' }); }catch{}
    };
    document.addEventListener("playerPlay", ()=>{ const curId = window.__LICENCE_ACTIVE_ID__ || window.__CURRENT_BEAT__?.id; const bId = window.currentBeat?.id; if(String(curId) === String(bId)) setPause(); });
    document.addEventListener("playerPause", ()=> setPlay());
    document.addEventListener("playerEnded", ()=> { setPlay(); if(window.globalPlayer?.audio) window.globalPlayer.audio.currentTime = 0; });
    const attachEnded = ()=>{
        const a = window.globalPlayer?.audio;
        if(!a || a._licenceBound) return;
        a._licenceBound = true;
        a.addEventListener("pause", ()=> { const same = String(window.__LICENCE_ACTIVE_ID__) === String(window.currentBeat?.id); if(same) setPlay(); });
        a.addEventListener("play", ()=> { const same = String(window.__LICENCE_ACTIVE_ID__) === String(window.currentBeat?.id); if(same) setPause(); });
        a.addEventListener("ended", ()=>{ setPlay(); a.currentTime = 0; });
    };
    setInterval(attachEnded, 1000);
}

function setupLike(){
    const likeBtn = safeGet("likeBtn");
    const heartIcon = safeGet("heartIcon");
    if(!likeBtn||!heartIcon) return;
    function getLikes(){ try{ return JSON.parse(localStorage.getItem('dopetone_likes')||'{}') }catch(e){ return {} } }
    function isLikedLocal(id){ if(!id) return false; const m=getLikes(); const s=String(id).trim(); return!!(m[s] || m[Number(s)]); }
    function toggleLocal(id){
      if(window.toggleBeatLike) return window.toggleBeatLike(id);
      const m=getLikes(); const s=String(id).trim(); const n=Number(s);
      const now=! (m[s] || m[n]);
      if(now){ m[s]=Date.now(); m[n]=Date.now(); } else { Object.keys(m).forEach(k=>{ if(String(k).trim()===s || Number(k)===n) delete m[k] }) }
      localStorage.setItem('dopetone_likes', JSON.stringify(m));
      localStorage.setItem('dopetone_likes_count', String(Object.keys(m).length));
      window.dispatchEvent(new CustomEvent('cc_like_updated',{detail:{beat_id:id, beatId:id, liked:now, count:Object.keys(m).length, perBeat:m}}));
      window.dispatchEvent(new CustomEvent('cc_player_like_sync',{detail:{total:Object.keys(m).length, beat_id:id, beatId:id, liked:now}}));
      return now;
    }
    function updateLikeUI(){
        const beat=window.__CURRENT_BEAT__ || window.currentBeat; if(!beat) return;
        const liked=isLikedLocal(beat.id);
        const btn=safeGet('likeBtn'); const icon=safeGet('heartIcon'); const countEl=safeGet('likeCount');
        if(!btn||!icon) return;
        if(liked){ btn.classList.add('liked','active'); icon.setAttribute('fill','currentColor'); icon.style.color='#ff3040'; btn.style.color='#ff3040'; if(countEl) countEl.textContent = originalLikeCount + 1; }
        else { btn.classList.remove('liked','active'); icon.setAttribute('fill','none'); icon.style.color=''; btn.style.color=''; if(countEl) countEl.textContent = originalLikeCount; }
    }
    updateLikeUI();
    setTimeout(updateLikeUI, 500);
    window.addEventListener('cc_like_updated', (e)=>{ const d=e.detail||{}; const curId=window.__CURRENT_BEAT__?.id || window.currentBeat?.id; if(String(d.beat_id)===String(curId) || String(d.beatId)===String(curId)) updateLikeUI(); });
    likeBtn.onclick = () => {
        const beat=window.__CURRENT_BEAT__ || window.currentBeat; if(!beat) return;
        const nowLiked=toggleLocal(beat.id);
        if(window.currentBeat) window.currentBeat.liked=nowLiked;
        if(window.__CURRENT_BEAT__) window.__CURRENT_BEAT__.liked=nowLiked;
        updateLikeUI();
        window.refreshMobileHeart?.();
        showToast(nowLiked? '❤️ ' : '💔');
        try{ fetch(`${STATS_API}/api/stats/event`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({beatId: parseInt(beat.id), eventType:'like'}) }).catch(()=>{}); }catch{}
    };
    window.updateLicenceLikeUI = updateLikeUI;
}

function setupAddToCart(){
    const addBtn = safeGet("addBtn"); if(!addBtn) return;
    addBtn.onclick = async () => {
        if(!window.currentBeat) return; let cart = safeParse("dopetone_cart", []);
        const beat = ensureMode({ id: window.currentBeat.id, title: window.currentBeat.title, cover: window.currentBeat.cover, cover_url: window.currentBeat.cover_url, genre: window.currentBeat.genre, bpm: window.currentBeat.bpm, type: window.currentBeat.type_beat || window.currentBeat.type || "--", type_beat: window.currentBeat.type_beat || window.currentBeat.type || "--", mood: window.currentBeat.mood || "--", key: window.currentBeat.key || "--", audio: window.currentBeat.audio, play_count: window.currentBeat.play_count || 0, monetization_mode: window.currentBeat.monetization_mode || getMode(window.currentBeat) || 'paid', has_free_tagged: window.currentBeat.has_free_tagged || 0, price: window.currentBeat.price||29.99 });
        if(cart.find(item => String(item.id)==String(beat.id))) return;
        cart.push(beat); safeSetItem("dopetone_cart", cart);
        try { await fetch(`${WORKER_URL}/api/stats/track`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ beat_id: parseInt(beat.id), event_type: 'cart' }) }); } catch {}
        if(cart.length === 1){ activeCartBeat = beat; beatId = beat.id; switchActiveBeat(beat); }
        renderCartBeatRow();
        updateCartCount();
        document.body.classList.remove("empty-mode");
    };
}

async function switchActiveBeat(beat){
    const fixed = ensureMode(beat);
    if(String(fixed.id) === String(window.currentBeat?.id)) {
        // already active - just highlight
        document.querySelectorAll(".cart-beat-card").forEach(c=> c.classList.toggle("active", String(c.dataset.id)===String(fixed.id)));
        return;
    }
    activeCartBeat = fixed; beatId = fixed.id;
    const url = new URL(window.location); url.searchParams.set("id", fixed.id); window.history.pushState({}, "", url);
    window.updateLicenceLikeUI?.(); window.currentBeat = fixed; window.__CURRENT_BEAT__ = fixed;
    applyDynamicBG(fixed.cover || fixed.cover_url);
    armGlobalPlayer(fixed);
    try{ let cart = safeParse("dopetone_cart",[]).map(ensureMode); cart = cart.map(c => String(c.id)===String(fixed.id)? fixed : ensureMode(c)); safeSetItem("dopetone_cart", cart); }catch{}
    selectedLicences = safeParse("dopetone_licences", {});
    const savedLicence = selectedLicences[fixed.id];
    document.querySelectorAll(".licence-card").forEach(card => card.classList.remove("active","faded"));
    if(savedLicence){ document.querySelectorAll(".licence-card").forEach(card => { const btn=card.querySelector(".pay-btn"); if(btn?.dataset.name===savedLicence.name) card.classList.add("active"); else card.classList.add("faded"); }); }
    // 🔥 FIX: don't re-render row, just update active class
    document.querySelectorAll(".cart-beat-card").forEach(card => {
        card.classList.toggle("active", String(card.dataset.id)===String(fixed.id));
    });
    updatePrices(fixed); applyMonetizationRules(fixed); updateSelectedBar(); updateCheckoutTheme();
    safeSet("title", fixed.title); safeSet("genre", fixed.genre); safeSet("bpm", fixed.bpm); safeSet("type", fixed.type_beat || fixed.type || "--"); safeSet("mood", fixed.mood || "--"); safeSet("key", fixed.key || "--");
    const cover = safeGet("cover");
    if(cover && cover.src!== (fixed.cover || fixed.cover_url)){
        cover.src = fixed.cover || fixed.cover_url || "images/logo.png";
    }
    if(fixed.audio){ audio = new Audio(fixed.audio); }
    renderSimilarTracks([fixed]);
    loadGlobalLikeCount(fixed.id);
}

let originalLikeCount = 0;

async function loadGlobalLikeCount(bId){
    if(!bId) return;
    try{
        const res=await fetch(`${API_URL}/beats`);
        const beats=await res.json();
        const beat=beats.find(b=> String(b.id)===String(bId));
        originalLikeCount = beat?.like_count || 0;
        const el=safeGet("likeCount");
        if(el){
            const isLiked = (()=>{ try{ const m=JSON.parse(localStorage.getItem('dopetone_likes')||'{}'); return!!(m[String(bId)]||m[Number(bId)]); }catch{return false} })();
            el.textContent = isLiked? originalLikeCount + 1 : originalLikeCount;
        }
    }catch{}
}

function updateSelectedBar(){
    const selectedWrap = document.querySelector(".selected-licence"); if(!selectedWrap) return;
    const cart = safeParse("dopetone_cart", []); selectedLicences = safeParse("dopetone_licences", {});
    let totalPrice = 0, count = 0, licenceHTML = "", historyChain = safeParse("dopetone_history",[]);
    cart.forEach(beat => {
        const licence = selectedLicences[beat.id]; if(!licence) return;
        totalPrice += Number(licence.price); count++; licenceHTML += `<div class="selected-track-line"><div class="selected-track-info"><strong>${beat.title}</strong><span class="licence-color-${licence.name.toLowerCase()}">${licence.name} • $${licence.price}</span></div><button class="remove-selected-licence" data-beat="${beat.id}">✕</button></div>`;
        if(!historyChain.find(h => String(h.beat_id)==String(beat.id) && h.license_type==licence.name)) historyChain.push({ beat_id: parseInt(beat.id), beat_title: beat.title, license_type: licence.name, amount: Math.round(Number(licence.price)*100), timestamp: Date.now() });
    });
    safeSetItem("dopetone_history", historyChain);
    if(licenceHTML === ""){ selectedWrap.innerHTML = `<div class="selected-left"><h3>Selected<br>Licence</h3><div class="total-box"><span>Total</span><div id="totalPrice">$0</div></div></div><div class="selected-right"><div id="selectedName">None</div><button id="checkoutBtn">Checkout</button></div>`; }
    else { selectedWrap.innerHTML = `<div class="selected-left"><h3>Selected<br>Licence</h3><div class="total-box"><span>Total</span><div id="totalPrice">$${totalPrice.toFixed(2)}</div></div></div><div class="selected-right"><div id="selectedName">${licenceHTML}</div><button id="checkoutBtn">Checkout ${count} Tracks</button></div>`; }
    document.querySelectorAll(".remove-selected-licence").forEach(btn => {
        btn.onclick = () => {
            const bid = btn.dataset.beat; delete selectedLicences[bid]; safeSetItem("dopetone_licences", selectedLicences);
            let hist = safeParse("dopetone_history",[]); hist = hist.filter(h => String(h.beat_id)!==String(bid)); safeSetItem("dopetone_history", hist);
            document.querySelectorAll(".licence-card").forEach(card => card.classList.remove("active","faded")); updateSelectedBar(); updateCheckoutTheme();
        };
    });
    const checkoutBtn = safeGet("checkoutBtn"); if(checkoutBtn) checkoutBtn.onclick = window.createStripeCheckout;
}

function removeBeatFromCart(event, id){
    event.stopPropagation(); event.preventDefault();

    // 🔥 D1 DELETE - PRO
    const anon_id = localStorage.getItem('dopetone_anon_id') || 'anon';
    const user_id = (()=>{ try{ const u=JSON.parse(localStorage.getItem('dopetone_user')||'null'); return u?.id||null }catch{return null} })();
    fetch(`${STATS_API}/api/stats/untrack`, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ beat_id: parseInt(id), event_type:'cart', user_id: user_id||anon_id, anon_id })
    }).catch(()=>{});

    // local
    let cart = safeParse("dopetone_cart", []); cart = cart.filter(beat => String(beat.id)!=String(id)); safeSetItem("dopetone_cart", cart);
    let licences = safeParse("dopetone_licences", {}); delete licences[id]; safeSetItem("dopetone_licences", licences);
    let hist = safeParse("dopetone_history",[]); hist = hist.filter(h=>String(h.beat_id)!==String(id)); safeSetItem("dopetone_history", hist);

    // 🔥 CHARTS SUBTRACT D1
    window.dispatchCartRemoved?.(id);
    window.dispatchEvent(new CustomEvent('cc_cart_removed', { detail:{ beat_id:id, beatId:id } }));

    updateCartCount();
    if(cart.length === 0){
        beatId = null; activeCartBeat = null; selectedLicence = null; window.currentBeat = null;
        if(audio){ audio.pause(); audio.currentTime = 0; } audio = null;
        document.body.classList.add("empty-mode"); document.body.classList.remove("active-mode");
        safeSet("title","CART EMPTY"); ["genre","bpm","type","mood","key"].forEach(k=>safeSet(k,"--"));
        const cover=safeGet("cover"); if(cover) cover.src="images/logo.png";
        window.history.replaceState({}, "", "licence-page.html");
        resetBG();
        selectedLicences={}; localStorage.removeItem("dopetone_licences");
        document.querySelectorAll(".licence-card").forEach(card => card.classList.remove("active","faded","locked"));
        document.querySelectorAll(".old,.new").forEach(el=>el.textContent="$00");
        renderCartBeatRow(); renderSimilarTracks(); checkEmptyState(); updateSelectedBar(); updateCheckoutTheme(); return;
    }
    if(String(id)===String(beatId)){ const next=ensureMode(cart[0]); beatId=next.id; activeCartBeat=next; const u=new URL(location); u.searchParams.set("id",beatId); history.replaceState({}, "", u); switchActiveBeat(next); }
    renderCartBeatRow(); checkEmptyState(); updateSelectedBar(); updateCheckoutTheme();
}


function initCartScroll() {
    const slider = safeGet("cartBeatRow"); if(!slider) return; let isDown=false,startX,scrollLeft;
    slider.addEventListener("mousedown", (e) => { if(e.target.closest(".remove-cart-track")) return; isDown=true; slider.classList.add("dragging"); startX=e.pageX-slider.offsetLeft; scrollLeft=slider.scrollLeft; });
    slider.addEventListener("mouseleave", () => { isDown=false; slider.classList.remove("dragging"); });
    slider.addEventListener("mouseup", () => { isDown=false; slider.classList.remove("dragging"); });
    slider.addEventListener("mousemove", (e) => { if(!isDown) return; e.preventDefault(); const x=e.pageX-slider.offsetLeft; slider.scrollLeft=scrollLeft-(x-startX)*2; });
}

function forceTitle() {
    const cart = safeParse("dopetone_cart", []); if (cart.length === 0) return;
    const beat = window.currentBeat || cart[0]; const titleEl = safeGet("title");
    if (titleEl && beat?.title) { titleEl.textContent = beat.title; titleEl.style.cssText = "opacity:1!important;visibility:visible!important"; }
}

function applyMonetizationRules(beat) {
    beat = ensureMode(beat); const mode = getMode(beat) || 'paid';
    const freeCard = document.querySelector('.licence-card.free'); const paidCards = document.querySelectorAll('.licence-card.basic,.licence-card.pro,.licence-card.exclusive');
    document.querySelectorAll('.licence-card').forEach(c=>{ c.classList.remove('locked','auto-selected'); c.style.pointerEvents='auto'; c.style.opacity='1'; c.style.filter='none'; const b=c.querySelector('.pay-btn'); if(b){ b.disabled=false; b.style.cursor='pointer'; } });
    if (mode === 'free') {
        paidCards.forEach(c => { c.classList.add('locked'); c.style.pointerEvents='none'; c.style.opacity='0.25'; c.style.filter='grayscale(1)'; const btn=c.querySelector('.pay-btn'); if(btn) btn.disabled=true; });
        if (freeCard) { freeCard.classList.add('auto-selected','active'); selectedLicences[beat.id]={name:'FREE',price:0,title:beat.title}; safeSetItem('dopetone_licences',selectedLicences); setTimeout(()=>{updateSelectedBar();updateCheckoutTheme();},50); }
    } else if (mode === 'paid') {
        if (freeCard) { freeCard.classList.add('locked'); freeCard.style.pointerEvents='none'; freeCard.style.opacity='0.25'; const btn=freeCard.querySelector('.pay-btn'); if(btn) btn.disabled=true; if(selectedLicences[beat.id]?.name==='FREE'){ delete selectedLicences[beat.id]; safeSetItem('dopetone_licences',selectedLicences); } }
    }
}

window.removeBeatFromCart = removeBeatFromCart; window.renderCartBeatRow = renderCartBeatRow;
window.updateCartCount = updateCartCount; window.checkEmptyState = checkEmptyState;
window.switchActiveBeat = switchActiveBeat; window.updatePrices = updatePrices; window.updateSelectedBar = updateSelectedBar;



function revealUI(){
  const loader = document.getElementById('pageLoader');
  document.body.classList.add('is-ready');
  if(loader){
    loader.classList.add('hide');
    setTimeout(()=>loader.remove(), 400);
  }
}

// call reveal after everything ready
// REPLACE your last lines in window load:
window.addEventListener("load", async () => {
    const earlyCart = safeParse("dopetone_cart", []);
    if(earlyCart.length>0){
      document.body.classList.remove("empty-mode");
      document.body.classList.add("active-mode");
    }
    setupCheckout();
    setupPlayer();
    setupLike();
    setupShare();
    setupLicenceSelection();
    setupAddToCart();
    updateCartCount();
    const cart = safeParse("dopetone_cart", []).map(ensureMode);
    if (!beatId && cart.length > 0) {
        const b = cart[0];
        beatId = b.id;
        activeCartBeat = b;
        window.currentBeat = b;
        window.__CURRENT_BEAT__ = b;
        safeGet("title")&&(safeGet("title").textContent = b.title);
        safeGet("cover")&&(safeGet("cover").src = b.cover_url || b.cover || "images/logo.png");
        safeGet("genre")&&(safeGet("genre").textContent = b.genre || "--");
        safeGet("bpm")&&(safeGet("bpm").textContent = b.bpm || "--");
        safeGet("type")&&(safeGet("type").textContent = b.type_beat || b.type || "--");
        safeGet("mood")&&(safeGet("mood").textContent = b.mood || "--");
        safeGet("key")&&(safeGet("key").textContent = b.key || "--");
        document.body.classList.add("active-mode");
        document.body.classList.remove("empty-mode");
        applyDynamicBG(b.cover_url || b.cover);
        armGlobalPlayer(b);
        history.replaceState({}, "", `?id=${b.id}`);
        renderSimilarTracks([b]);
        updatePrices(b);
        applyMonetizationRules(b);
        loadGlobalLikeCount(b.id);
    } else if (beatId) {
        await loadBeat();
    }
    checkEmptyState();
    renderCartBeatRow();
    updateSelectedBar();
    updateCheckoutTheme();
    setTimeout(() => document.querySelector(`[data-id="${beatId}"]`)?.classList.add("active"), 200);
    setTimeout(initCartScroll, 500);
    setTimeout(forceTitle, 2000);

    // SUNO CLEAN REVEAL
    requestAnimationFrame(()=> setTimeout(revealUI, 120));
});
