// ===============================
// LATEST SECTION - DRAG + PLAY/PAUSE + PRO TIME FILTER
// ===============================
const MAX_LATEST = 10;
let isDragging = false;
let dragThreshold = 5;

const PLAY_SVG = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.14v14l11-7-11-7z"/></svg>`;
const PAUSE_SVG = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`;

export function renderLatest() {
  const section = document.getElementById("latestWrap");
  const container = document.getElementById("latestMount");
  if (!container ||!section) return;

  const allBeats = window.store?.beats || [];

  // === PRO LATEST FILTER - TIME OF UPLOAD ===
  const now = Date.now();
  const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

  const sorted = [...allBeats].sort((a, b) => {
    const da = a.created_at? new Date(a.created_at).getTime() : 0;
    const db = b.created_at? new Date(b.created_at).getTime() : 0;
    if (da && db && da!== db) return db - da;
    return b.id - a.id; // fallback: higher ID = newer
  });

  const fresh = sorted.filter(b => {
    if(!b.created_at) return true;
    const t = new Date(b.created_at).getTime();
    if(isNaN(t)) return true;
    return (now - t) < THIRTY_DAYS;
  });

  const latestBeats = fresh.length >= MAX_LATEST
   ? fresh.slice(0, MAX_LATEST)
    : [...fresh,...sorted.filter(b=>!fresh.includes(b))].slice(0, MAX_LATEST);

  if (!latestBeats.length) {
    section.classList.remove('rp-active');
    container.innerHTML = '';
    return;
  }

  section.classList.add('rp-active');
  container.innerHTML = '';

  const scroller = document.createElement('div');
  scroller.className = 'rp-scroll';

  latestBeats.forEach((beat, index) => {
    const card = document.createElement("div");
    card.className = "rp-card";
    card.dataset.beatId = beat.id;

    card.innerHTML = `
      <div class="rp-cover">
        <img src="${beat.cover_url || beat.image || 'images/studio.jpg'}" alt="${beat.title}" loading="lazy" draggable="false" />
        <button class="rp-playbtn" data-beat-id="${beat.id}" type="button">
          <span class="rp-icon">${PLAY_SVG}</span>
        </button>
      </div>
      <div class="rp-title">${beat.title || 'Untitled'}</div>
    `;

    // PLAY / PAUSE LOGIC - STRICT
    const playBtn = card.querySelector(".rp-playbtn");
    playBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (isDragging) return;

      const currentBeat = window.__CURRENT_BEAT__;
      const isPlaying = window.globalPlayer?.isPlaying?.() ||!window.__DOPE_TONE_AUDIO__?.paused;

      // SAME BEAT = TOGGLE
      if (currentBeat?.id == beat.id && isPlaying) {
        window.globalPlayer?.pause?.();
        window.__DOPE_TONE_AUDIO__?.pause?.();
      } else if (currentBeat?.id == beat.id &&!isPlaying) {
        window.globalPlayer?.resume?.();
        window.__DOPE_TONE_AUDIO__?.play?.();
      } else {
        // DIFFERENT BEAT = PLAY NEW
        window.globalPlayer?.play(index, [...latestBeats], "latest");
      }
    });

    // CARD CLICK = GO TO LICENCE (NOT PLAY)
    card.addEventListener('click', (e) => {
      if (e.target.closest(".rp-playbtn")) return;
      if (isDragging) return;

      let cart = JSON.parse(localStorage.getItem("dopetone_cart")) || [];
      const cartBeat = {
        id: beat.id, title: beat.title,
        cover: beat.cover_url, cover_url: beat.cover_url,
        genre: beat.genre, bpm: beat.bpm,
        audio: beat.mp3_url || beat.audio,
        mp3_url: beat.mp3_url, zip_url: beat.zip_url,
        mood: beat.mood, key: beat.key, type: beat.type
      };
      if (!cart.find(item => item.id == beat.id)) {
        cart.push(cartBeat);
        localStorage.setItem("dopetone_cart", JSON.stringify(cart));
      }
      window.location.href = `licence-page.html?id=${beat.id}`;
    });

    scroller.appendChild(card);
  });

  const moreCard = document.createElement("div");
  moreCard.className = "rp-card more-card";
  moreCard.innerHTML = `<div class="rp-cover more-cover"><div class="more-grid"><div class="more-dot"></div><div class="more-dot"></div><div class="more-dot"></div><div class="more-dot"></div><div class="more-dot"></div><div class="more-dot"></div></div></div><div class="rp-title">View All Beats</div>`;
  moreCard.onclick = () => { if (!isDragging) window.location.href = "beats.html"; };
  scroller.appendChild(moreCard);

  container.appendChild(scroller);
  syncLatestPlayButtons();
  initLatestScroll(container);
}

function syncLatestPlayButtons() {
  const container = document.getElementById("latestMount");
  if (!container) return;
  const buttons = container.querySelectorAll('.rp-playbtn');
  const currentBeat = window.__CURRENT_BEAT__;
  const isPlaying = window.globalPlayer?.isPlaying?.() || (window.__DOPE_TONE_AUDIO__ &&!window.__DOPE_TONE_AUDIO__.paused);

  buttons.forEach(btn => {
    const icon = btn.querySelector('.rp-icon');
    const card = btn.closest('.rp-card');
    const active = currentBeat?.id == btn.dataset.beatId && isPlaying;
    if (icon) icon.innerHTML = active? PAUSE_SVG : PLAY_SVG;
    btn.classList.toggle('rp-active',!!active);
    if (card) card.classList.toggle('active',!!active);
  });
}

function initLatestScroll(container) {
  let isDown = false, startX = 0, scrollLeft = 0, dragDistance = 0;

  container.addEventListener('mousedown', (e) => {
    if (e.target.closest('.rp-playbtn')) return;
    isDown = true; isDragging = false; dragDistance = 0;
    container.classList.add('is-dragging');
    startX = e.pageX;
    scrollLeft = container.scrollLeft;
  });

  window.addEventListener('mouseup', () => {
    if (!isDown) return;
    isDown = false;
    container.classList.remove('is-dragging');
    setTimeout(() => { isDragging = false; dragDistance = 0; }, 80);
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDown) return;
    e.preventDefault();
    const walk = e.pageX - startX;
    dragDistance = Math.abs(walk);
    if (dragDistance > dragThreshold) isDragging = true;
    if (isDragging) container.scrollLeft = scrollLeft - walk;
  });

  let touchStartX = 0, touchStartPos = 0;
  container.addEventListener('touchstart', (e) => {
    if (e.target.closest('.rp-playbtn')) return;
    touchStartX = e.touches[0].clientX;
    touchStartPos = container.scrollLeft;
    isDragging = false; dragDistance = 0;
  }, { passive: true });

  container.addEventListener('touchmove', (e) => {
    const delta = e.touches[0].clientX - touchStartX;
    dragDistance = Math.abs(delta);
    if (dragDistance > dragThreshold) isDragging = true;
    if (isDragging) container.scrollLeft = touchStartPos - delta;
  }, { passive: true });

  container.addEventListener('touchend', () => {
    setTimeout(() => { isDragging = false; dragDistance = 0; }, 80);
  }, { passive: true });
}

document.addEventListener("playerPlay", () => setTimeout(syncLatestPlayButtons, 30));
document.addEventListener("playerPause", () => setTimeout(syncLatestPlayButtons, 30));
document.addEventListener("trackChange", () => setTimeout(syncLatestPlayButtons, 30));

window.renderLatest = renderLatest;
