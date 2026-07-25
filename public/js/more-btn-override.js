// ===============================
// 🔥 MORE BUTTON OVERRIDE FINAL V2 - COMPATIBLE WITH WORKING HEART + CART D1
// DOPE TONE - email gate v3
// ===============================

const API_URL = 'https://api.dopetonevault.com/api/beats'
let __DT_CURRENT_BEAT__ = null;

// ---------- email check ----------
function hasCollectedEmail(){
  return localStorage.getItem('dt_email_collected') === 'true'
    || (JSON.parse(localStorage.getItem('dt_emails') || '[]').length > 0)
    || !!JSON.parse(localStorage.getItem('dopetone_user') || '{}').email;
}
function markEmailCollected(email){
  localStorage.setItem('dt_email_collected', 'true');
  if(email) localStorage.setItem('dt_last_email', email);
}
const FORCE_FREE_FOR_TEST = false;
function isFreeDownloadable(beat){
  if(!beat) return false;
  const mode = beat.monetization_mode;
  const free =
    mode === 'free' ||
    mode === 'hybrid' ||
    beat.has_free_tagged === 1 ||
    beat.has_free_tagged === true ||
    beat.is_free === true ||
    beat.free === true ||
    beat.free_download === true ||
    beat.price === 0 ||
    beat.price === '0';
  return FORCE_FREE_FOR_TEST ? true : free;
}

// ---------- CART HELPERS - NOW WITH CHART D1 EVENTS ----------
function getCart() {
  try { return JSON.parse(localStorage.getItem('dopetone_cart') || '[]'); }
  catch(e){ return []; }
}
function saveCart(cart) {
  localStorage.setItem('dopetone_cart', JSON.stringify(cart));
  localStorage.setItem('dopetone_cart_count', String(cart.length));
  // 🔥 FIRE EVENTS FOR CHARTS D1
  window.dispatchEvent(new CustomEvent('cc_cart_updated', { 
    detail: { beat_id: window.__CURRENT_BEAT__?.id, count: cart.length } 
  }));
  window.dispatchEvent(new CustomEvent('cc_player_cart_sync', { 
    detail: { total: cart.length } 
  }));
  window.dispatchEvent(new CustomEvent('cc_cart_change', { 
    detail: { beat_id: window.__CURRENT_BEAT__?.id, count: cart.length } 
  }));
}

window.openDownloadGate = function(beat){
  beat = beat || window.__CURRENT_BEAT__;
  __DT_CURRENT_BEAT__ = beat;
  if(!beat) return;
  if(!isFreeDownloadable(beat)){
    window.location.href = `licence-page.html?id=${beat.id}`;
    return;
  }
  if(hasCollectedEmail()){
    startDopeToneDownload();
    return;
  }
  createDownloadGate();
  document.getElementById('downloadGate').classList.add('active');
};

function createDownloadGate(){
  if(document.getElementById('downloadGate')) return;
  const gate = document.createElement('div');
  gate.id = 'downloadGate';
  gate.className = 'download-gate';
  gate.innerHTML = `
  <div class="gate-content">
    <button class="gate-close" type="button">✕</button>
    <div class="gate-icon">👑</div>
    <h3>Unlock HQ Download</h3>
    <p class="gate-subtitle">Get 320kbps + exclusive drops. Join 12k+ producers.</p>
    <form id="gateForm" class="gate-form" novalidate>
      <input type="email" id="gateEmailInput" placeholder="your@email.com" required autocomplete="email">
      <button type="submit" class="gate-btn">Continue →</button>
    </form>
    <p class="gate-privacy">🔒 No spam. Unsubscribe anytime.</p>
    <button class="gate-skip" type="button">Maybe later</button>
  </div>`;
  document.body.appendChild(gate);
  gate.querySelector('.gate-close').onclick = closeDownloadGate;
  gate.querySelector('.gate-skip').onclick = closeDownloadGate;
  gate.addEventListener('click', e => { if(e.target === gate) closeDownloadGate(); });
  gate.querySelector('#gateForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('gateEmailInput');
    const email = input.value.trim();
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if(!valid){ input.style.borderColor = '#ff3c3c'; return; }
    input.style.borderColor = '';
    const emails = JSON.parse(localStorage.getItem('dt_emails') || '[]');
    emails.push({email, track: __DT_CURRENT_BEAT__?.id, time: Date.now()});
    localStorage.setItem('dt_emails', JSON.stringify(emails));
    markEmailCollected(email);
    fetch(`${API_URL}/api/emails`, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({email, source: 'download_gate', beat_id: __DT_CURRENT_BEAT__?.id})
    }).catch(()=>{});
    startDopeToneDownload();
  });
}
window.closeDownloadGate = function(){
  document.getElementById('downloadGate')?.classList.remove('active');
  __DT_CURRENT_BEAT__ = null;
};
window.skipDownloadGate = window.closeDownloadGate;

async function startDopeToneDownload(){
  const beat = __DT_CURRENT_BEAT__;
  if(!beat) return;
  const btn = document.querySelector('#gateForm .gate-btn');
  if(btn){ btn.disabled = true; btn.textContent = 'Preparing...'; }
  fetch(`${API_URL}/api/stats/download`, {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({beat_id: beat.id})
  }).catch(()=>{});
  const downloadUrl = `${API_URL}/api/download/${beat.id}?url=${encodeURIComponent(beat.mp3_url || beat.url)}&title=${encodeURIComponent(beat.title)}`;
  try {
    const res = await fetch(downloadUrl);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${beat.title}.mp3`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    setTimeout(closeDownloadGate, 800);
  } catch(err) {
    console.error(err);
    alert('Download failed, try again');
    if(btn){ btn.disabled = false; btn.textContent = 'Continue →'; }
  }
}

window.openDownloadGate = function(beat){
  __DT_CURRENT_BEAT__ = beat;
  if(!isFreeDownloadable(beat)){
    window.location.href = `licence-page.html?id=${beat.id}`;
    return;
  }
  if(hasCollectedEmail()){
    startDopeToneDownload();
    return;
  }
  createDownloadGate();
  document.getElementById('downloadGate').classList.add('active');
  setTimeout(() => document.getElementById('gateEmailInput')?.focus(), 50);
};

document.addEventListener('click', (e) => {
  const dl = e.target.closest('.wave-download');
  if(!dl) return;
  e.preventDefault(); e.stopPropagation();
  const beat = window.__CURRENT_BEAT__;
  if(beat) window.openDownloadGate(beat);
});

// ===============================
// 🔥 MORE BUTTON SYSTEM V2 - NO CLONE KILL
// ===============================
document.addEventListener("DOMContentLoaded", () => {

  const mpMoreOriginal = document.getElementById("mpMore");
  const gpMoreOriginal = document.getElementById("gpMore");

  if (!mpMoreOriginal) {
    console.log("mpMore not found");
    return;
  }

  // Don't clone - just override onclick to keep V2 listeners intact where possible
  // Remove old listeners by setting onclick = null and using new system
  function setupMoreButton() {
    const mpMore = document.getElementById("mpMore");
    const gpMore = document.getElementById("gpMore");
    if (!mpMore) return;

    const openSheet = async (e) => {
      e?.stopPropagation();
      const beat = window.__CURRENT_BEAT__;
      if (!beat) return;

      const old = document.getElementById("proMenuSheet");
      if (old) old.remove();

      const sheet = document.createElement("div");
      sheet.id = "proMenuSheet";
      sheet.innerHTML = `
        <div class="sheet-backdrop"></div>
        <div class="sheet-panel">
          <div class="sheet-handle"></div>
          <div class="sheet-title">${beat.title}</div>
          <button class="sheet-item" data-action="playlist">🎵 Create Playlist</button>
          <button class="sheet-item" data-action="add_playlist">➕ Add To Playlist</button>
          <button class="sheet-item" data-action="dopetone_cart">🛒 Add To Cart</button>
          <button class="sheet-item" data-action="download">⬇ Free Download</button>
          <button class="sheet-item" data-action="share">🔗 Share</button>
          <button class="sheet-item buy" data-action="buy">💳 Buy Now</button>
          ${localStorage.getItem("isOwner") === "true" ? `<button class="sheet-item delete" data-action="delete">🗑 Delete Beat</button>` : ""}
        </div>
      `;
      document.body.appendChild(sheet);
      const backdrop = sheet.querySelector(".sheet-backdrop");
      backdrop.onclick = () => sheet.remove();

      sheet.querySelectorAll(".sheet-item").forEach(btn => {
        btn.onclick = async () => {
          const action = btn.dataset.action;
          if(action === "playlist") {
            if(window.openPlaylistModal) window.openPlaylistModal(beat);
            sheet.remove(); return;
          }
          if(action === "dopetone_cart") {
            let cart = getCart();
            const exists = cart.find(item => String(item.id) === String(beat.id));
            if(!exists){ cart.push(beat); saveCart(cart); }
            if(window.renderCartBeatRow) window.renderCartBeatRow();
            if(window.checkEmptyState) window.checkEmptyState();
            if(window.updateCartCount) window.updateCartCount();
            const cartCount = document.getElementById("cartCount");
            if(cartCount){
              cartCount.textContent = cart.length;
              cartCount.classList.remove("bump");
              void cartCount.offsetWidth;
              cartCount.classList.add("bump");
            }
            showCartToast(beat.title + " added to cart");
            sheet.remove(); return;
          }
          if(action === "add_playlist"){
            const playlists = window.getPlaylists().filter(p => !p.isLiked && p.id !== "liked_playlist");
            document.getElementById("addPlaylistModal")?.remove();
            const modal = document.createElement("div");
            modal.id = "addPlaylistModal";
            modal.innerHTML = `
            <div class="playlist-picker-backdrop"></div>
            <div class="playlist-picker">
              <div class="playlist-picker-title">Add To Playlist</div>
              <div class="playlist-picker-list">
                ${playlists.map(playlist => {
                  const exists = playlist.beats.find(b => String(b.id) === String(beat.id));
                  return `<button class="playlist-pick-item" data-id="${playlist.id}"><span>${playlist.name}</span><span>${exists? "✓ Added" : playlist.beats.length + " tracks"}</span></button>`;
                }).join("")}
                <button class="playlist-create-new">+ Create New Playlist</button>
              </div>
            </div>`;
            document.body.appendChild(modal);
            modal.querySelector(".playlist-picker-backdrop").onclick = () => modal.remove();
            modal.querySelectorAll(".playlist-pick-item").forEach(pBtn => {
              pBtn.onclick = () => {
                const playlistId = pBtn.dataset.id;
                const result = window.addBeatToPlaylist(playlistId, beat);
                const info = pBtn.querySelectorAll("span")[1];
                info.style.minWidth = "90px"; info.style.textAlign = "right"; info.style.transition = "opacity .25s ease"; info.style.opacity = "0";
                setTimeout(() => { info.textContent = result?.removed? "Removed" : "✓ Added"; info.style.opacity = "1"; },120);
                setTimeout(() => {
                  const updated = playlists.find(p => p.id === playlistId);
                  if(!updated) return;
                  info.style.opacity = "0";
                  setTimeout(() => { info.textContent = `${updated.beats.length} tracks`; info.style.opacity = "1"; },180);
                },1800);
                const playlist = playlists.find(p => p.id === playlistId);
                showCartToast(result?.removed ? `Removed from ${playlist.name}` : `Added to ${playlist.name}`);
              };
            });
            modal.querySelector(".playlist-create-new").onclick = () => {
              modal.remove();
              if(window.openPlaylistModal){ window.openPlaylistModal(); window.__PENDING_PLAYLIST_BEAT__ = beat; }
            };
            sheet.remove(); return;
          }
          if(action === "download") { sheet.remove(); window.openDownloadGate(beat); return; }
          if(action === "share") {
            if(navigator.share) await navigator.share({ title: beat.title, url: location.href });
            sheet.remove(); return;
          }
          if(action === "buy") {
            let cart = getCart();
            const exists = cart.find(item => String(item.id) == String(beat.id));
            if(!exists){ cart.push(beat); saveCart(cart); }
            if(window.renderCartBeatRow) window.renderCartBeatRow();
            if(window.checkEmptyState) window.checkEmptyState();
            if(window.updateCartCount) window.updateCartCount();
            const isLicencePage = window.location.pathname.includes("licence-page");
            if(isLicencePage){
              if(window.switchActiveBeat) window.switchActiveBeat(beat);
              const licenceCard = document.querySelector(".licence-layout");
              if(licenceCard){
                const targetY = licenceCard.getBoundingClientRect().top + window.pageYOffset - 40;
                const startY = window.scrollY; const distance = targetY - startY; const duration = 1800; let startTime = null;
                function easeInOutCubic(t){ return t < 0.5? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
                function animateScroll(currentTime){
                  if(!startTime) startTime = currentTime;
                  const elapsed = currentTime - startTime; const progress = Math.min(elapsed / duration, 1); const ease = easeInOutCubic(progress);
                  window.scrollTo(0, startY + distance * ease);
                  if(progress < 1) requestAnimationFrame(animateScroll);
                }
                requestAnimationFrame(animateScroll);
              }
            } else {
              window.location.href = `licence-page.html?id=${beat.id}`;
            }
            sheet.remove(); return;
          }
          if(action === "delete") { alert("Connect Firebase delete"); sheet.remove(); return; }
          sheet.remove();
        };
      });
    };

    // Attach new handler WITHOUT cloning (preserves V2 heart)
    const freshMpMore = document.getElementById("mpMore");
    const freshGpMore = document.getElementById("gpMore");
    
    if (freshMpMore) {
      // remove previous click listeners by cloning ONLY once, then we own it
      const clone = freshMpMore.cloneNode(true);
      freshMpMore.parentNode.replaceChild(clone, freshMpMore);
      clone.addEventListener("click", openSheet);
    }
    if (freshGpMore) {
      const clone2 = freshGpMore.cloneNode(true);
      freshGpMore.parentNode.replaceChild(clone2, freshGpMore);
      clone2.addEventListener("click", (e) => {
        e.stopPropagation();
        const existing = document.getElementById("proMenuSheet");
        if(existing){
          const panel = existing.querySelector(".sheet-panel");
          if(panel) panel.style.animation = "pcMoreClose .22s ease forwards";
          setTimeout(()=>{ existing.remove(); },200);
          return;
        }
        document.getElementById("mpMore")?.click();
      });
    }
  }

  setupMoreButton();
});

function showCartToast(text){
  let toast = document.getElementById("cartToast");
  if(!toast){ toast = document.createElement("div"); toast.id = "cartToast"; document.body.appendChild(toast); }
  toast.textContent = text;
  toast.classList.add("active");
  clearTimeout(toast.__timer);
  toast.__timer = setTimeout(() => { toast.classList.remove("active"); },2200);
}

// PC more toggle
document.addEventListener("click",(e)=>{
  const sheet = document.getElementById("proMenuSheet");
  if(!sheet) return;
  if(e.target.closest(".sheet-panel")) return;
  if(e.target.closest("#gpMore")) return;
  if(e.target.closest("#mpMore")) return;
  const panel = sheet.querySelector(".sheet-panel");
  if(!panel) return;
  panel.style.animation = "pcMoreClose .22s ease forwards";
  setTimeout(()=>{ sheet.remove(); },200);
});
