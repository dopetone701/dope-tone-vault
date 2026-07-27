// ===============================
// 🌍 GLOBAL PLAYER - DOPE TONE PRO - GIANT FULL LENGTH + PERFECT HEART INJECTED
// This is your GIANT file with the WORKING heart system from FINAL file injected
// ===============================
const STATS_API = 'https://dopetone-stats.dopetone701.workers.dev';
function logBeatEvent(beatId, eventType) {
  if (!beatId) return;
  fetch(`${STATS_API}/api/stats/event`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ beatId: parseInt(beatId), eventType: eventType })
  }).catch(err => console.warn('[Stats] Event log failed:', err));
}
function logPlay(beatId) { logBeatEvent(beatId, 'play'); }
function logLike(id, liked){ if(!liked) return; fetch(`${STATS_API}/api/stats/event`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({beatId:parseInt(id),eventType:'like'})}).catch(()=>{}) }
function logDownload(beatId) { logBeatEvent(beatId, 'download'); }
function logCart(beatId, added) { if (added) logBeatEvent(beatId, 'cart'); }

// ===== 🔥 WORKING HEART - SINGLE SOURCE OF TRUTH FROM YOUR PERFECT FILE =====
function getLikes(){ try{ return JSON.parse(localStorage.getItem('dopetone_likes')||'{}') }catch(e){ return {} } }
function saveLikes(m){ localStorage.setItem('dopetone_likes', JSON.stringify(m)); localStorage.setItem('dopetone_likes_count', String(Object.keys(m).length)); }
function isLiked(id){ if(id==null) return false; const map=getLikes(); const s=String(id).trim(); return !!(map[s] || map[Number(s)]); }
function toggleLikeStorage(id){
  const m=getLikes(); const k=String(id).trim(); const n=Number(k);
  const nowLiked = !(m[k] || m[n]);
  if(nowLiked){ m[k]=Date.now(); m[n]=Date.now(); }
  else { Object.keys(m).forEach(key=>{ if(String(key).trim()===k || Number(key)===n) delete m[key] }); }
  saveLikes(m);
  return { liked: nowLiked, map: m, total: Object.keys(m).length }
}
// aliases for old code
function getLikesMap(){ return getLikes() }
function saveLikesMap(m){ saveLikes(m) }
function isBeatLiked(id){ return isLiked(id) }
function setBeatLiked(id, liked){ if(liked){ const r=toggleLikeStorage(id); if(!r.liked){ toggleLikeStorage(id); return toggleLikeStorage(id).map } return r.map } else { const m=getLikes(); const k=String(id).trim(); const n=Number(k); if(m[k]||m[n]){ return toggleLikeStorage(id).map } return m } }

document.addEventListener("DOMContentLoaded", () => {
  const audio = new Audio()
  audio.crossOrigin = "anonymous"
  audio.preload = 'auto'
  audio.playsInline = true
  audio.mozPreservesPitch = false
  audio.webkitPreservesPitch = false
  audio.setAttribute('data-keep-alive', 'true')
  window.__DOPE_TONE_AUDIO__ = audio
  window._globalAudio = audio

   // KEEP ALIVE IN DYNAMIC ISLAND / LOCK SCREEN
  window._shouldBePlaying = false;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) return; // DON'T PAUSE when minimized
    if (!document.hidden && window._shouldBePlaying && audio.paused && window.__CURRENT_BEAT__) {
      audio.play().catch(()=>{})
    }
  });
  audio.addEventListener('play', () => { window._shouldBePlaying = true; });
  audio.addEventListener('pause', () => {
    // if iOS pauses it in background, force resume
    if (document.hidden && window._shouldBePlaying) {
      setTimeout(() => audio.play().catch(()=>{}), 300);
    } else if (!document.hidden) {
      window._shouldBePlaying = false;
    }
  });


   if ('mediaSession' in navigator) {
    const setHandlers = () => {
      try {
        navigator.mediaSession.setActionHandler('play', () => { audio.play(); window._shouldBePlaying=true; });
        navigator.mediaSession.setActionHandler('pause', () => { audio.pause(); });
        navigator.mediaSession.setActionHandler('nexttrack', () => window.globalPlayer?.next());
        navigator.mediaSession.setActionHandler('previoustrack', () => window.globalPlayer?.prev());
        navigator.mediaSession.setActionHandler('seekbackward', (d) => { audio.currentTime = Math.max(audio.currentTime - (d.seekOffset||10),0); });
        navigator.mediaSession.setActionHandler('seekforward', (d) => { audio.currentTime = Math.min(audio.currentTime + (d.seekOffset||10), audio.duration); });
      } catch(e){}
    }
    setHandlers();
  }


  let playlist = []
  let originalPlaylist = []
  let currentIndex = -1
  let currentListId = null
  let currentTrackKey = null
  let currentWave = null
  let playedBeats = new Set();
  let isShuffled = localStorage.getItem('dt_shuffle') === 'true'
  let repeatMode = parseInt(localStorage.getItem('dt_repeat') || '0')

  const PLAY_ICON = "M8 5v14l11-7z";
  const PAUSE_ICON = "M6 19h4V5H6v14zm8-14v14h4V5h-4z";

  const playBtn = document.getElementById("gpPlay")
  const nextBtn = document.getElementById("gpNext")
  const prevBtn = document.getElementById("gpPrev")
  const shuffleBtn = document.getElementById("gpShuffle")
  const repeatBtn = document.getElementById("gpRepeat")
  const heartBtn = document.getElementById("gpHeart") || document.getElementById("loveTrackBtn")
  const downloadBtn = document.getElementById("gpDownload")
  const bar = document.getElementById("gpBar")
  const title = document.getElementById("gpTitle")
  const cover = document.getElementById("gpCover")
  const current = document.getElementById("gpCurrent")
  const duration = document.getElementById("gpDuration")
  const addBtn = document.getElementById("gpAdd")
  const mpAdd = document.getElementById("mpAdd")
  const mpPlay = document.getElementById("mpPlay")
  const mpPrev = document.getElementById("mpPrev")
  const mpNext = document.getElementById("mpNext")
  const mpHeart = document.getElementById("mpHeart") || document.getElementById("mpLike")
  const mpDownload = document.getElementById("mpDownload")
  const gpPlayPath = document.getElementById("gpPlayPath")
  const mpPlayPath = document.getElementById("mpPlayPath")

  if (!playBtn) { console.error('[Dopetone] Global player missing #gpPlay button'); return; }

  function applySavedState() {
    if (isShuffled) shuffleBtn?.classList.add("active")
    if (repeatMode === 1) repeatBtn?.classList.add("active")
    if (repeatMode === 2) repeatBtn?.classList.add("active", "repeat-one")
  }
  applySavedState()

  function updateMobilePlayerAura(song) {
    const player = document.getElementById('mobilePlayer');
    const coverImg = document.getElementById('mpCover');
    const titleEl = document.getElementById('mpTitle');
    const artistEl = document.getElementById('mpArtist');
    if (!player ||!song) return;
    const coverUrl = song.cover_url || song.cover || song.artwork || song.image || song.img;
    if (coverUrl) {
      player.style.backgroundImage = `url('${coverUrl}')`;
      if (coverImg) { coverImg.src = coverUrl; coverImg.alt = song.title || 'Album Cover'; }
      if (cover) cover.src = coverUrl;
    }
    if (titleEl) titleEl.textContent = song.title || 'Unknown';
    if (title) title.textContent = song.title || 'Unknown';
    if (artistEl) artistEl.textContent = song.artist || song.producer || 'Dope Tone';
  }

  function toggleShuffle(e) {
    e?.stopPropagation()
    isShuffled =!isShuffled
    localStorage.setItem('dt_shuffle', isShuffled)
    if (isShuffled) {
      repeatMode = 0
      localStorage.setItem('dt_repeat', '0')
      repeatBtn?.classList.remove("active", "repeat-one")
      repeatBtn?.setAttribute("title", "Enable repeat")
      const currentTrack = playlist[currentIndex]
      originalPlaylist = [...playlist]
      playlist = playlist.filter((_, i) => i!== currentIndex)
      for (let i = playlist.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[playlist[i], playlist[j]] = [playlist[j], playlist[i]]
      }
      if (currentTrack) playlist.unshift(currentTrack)
      currentIndex = 0
      shuffleBtn?.classList.add("active")
      shuffleBtn?.setAttribute("title", "Disable shuffle")
    } else {
      const currentTrack = playlist[currentIndex]
      playlist = [...originalPlaylist]
      currentIndex = playlist.findIndex(t => t.id === currentTrack?.id)
      if (currentIndex === -1) currentIndex = 0
      shuffleBtn?.classList.remove("active")
      shuffleBtn?.setAttribute("title", "Enable shuffle")
    }
    window.__CURRENT_INDEX__ = currentIndex
    document.dispatchEvent(new CustomEvent("playlistShuffled", { detail: { isShuffled } }))
  }

  function cycleRepeat(e) {
    e?.stopPropagation()
    repeatMode = (repeatMode + 1) % 3
    localStorage.setItem('dt_repeat', repeatMode)
    if (repeatMode!== 0 && isShuffled) {
      isShuffled = false
      localStorage.setItem('dt_shuffle', 'false')
      shuffleBtn?.classList.remove("active")
      shuffleBtn?.setAttribute("title", "Enable shuffle")
      const currentTrack = playlist[currentIndex]
      playlist = [...originalPlaylist]
      currentIndex = playlist.findIndex(t => t.id === currentTrack?.id)
      if (currentIndex === -1) currentIndex = 0
    }
    repeatBtn?.classList.remove("repeat-one", "active")
    if (repeatMode === 1) {
      repeatBtn?.classList.add("active")
      repeatBtn?.setAttribute("title", "Repeat: All")
    } else if (repeatMode === 2) {
      repeatBtn?.classList.add("active", "repeat-one")
      repeatBtn?.setAttribute("title", "Repeat: One")
    } else {
      repeatBtn?.setAttribute("title", "Enable repeat")
    }
  }

  function stopAll() {
    document.querySelectorAll(".wave-row").forEach(row => { if (row.__wave) row.__wave.seekTo(0) })
  }

  // 🔥 PERFECT HEART SYNC - FROM YOUR WORKING FILE
  function syncAll(beatId, forcedLiked){
    const liked = forcedLiked !== undefined ? forcedLiked : isLiked(beatId);
    const loveBtn=document.getElementById("loveTrackBtn")||document.getElementById("gpHeart");
    const mpBtn=document.getElementById("mpLike")||document.getElementById("mpHeart");
    [loveBtn, mpBtn].filter(Boolean).forEach(b=>{
      b.classList.toggle('active', liked);
      b.classList.toggle('liked', liked);
      b.setAttribute('aria-pressed', String(liked));
    });
    const lh=document.querySelector("#loveTrackBtn .love-heart");
    const mh=document.querySelector("#mpLike .love-heart");
    const lt=document.querySelector("#loveTrackBtn .love-text");
    if(lh) lh.textContent=liked?'♥':'♡';
    if(mh) mh.textContent=liked?'♥':'♡';
    if(lt) lt.textContent=liked?'LOVED':'LOVE IT';
    try{
      if(window.charts && window.charts.trade){
        const ds = window.charts.trade.data.datasets[1];
        if(ds && ds.data.length>0){
          const curId = window.currentBeatId || window.__CURRENT_BEAT__?.id;
          if(!curId || String(curId)===String(beatId)){
            if(window.currentBeatId){
              ds.data[ds.data.length-1] = liked ? 1 : 0;
              window.charts.trade.update('none');
            }
          }
        }
      }
    }catch(e){}
    const map=getLikes();
    const total=Object.keys(map).length;
    window.dispatchEvent(new CustomEvent('cc_like_updated',{detail:{beat_id:beatId, beatId:beatId, liked, count:total, perBeat:map}}));
    window.dispatchEvent(new CustomEvent('cc_player_like_sync',{detail:{total, beat_id:beatId, beatId:beatId, liked}}));
    window.dispatchEvent(new CustomEvent('cc_like_change',{detail:{beat_id:beatId, liked}}));
    const totalEl=document.getElementById('totalLikes'); if(totalEl) totalEl.textContent=String(total);
    return liked;
  }

  function loadTrack(index, silent = false) {
    const beat = playlist[index]
    if (!beat?.mp3_url) return
    const wasPlaying =!audio.paused
    const isNewTrack = audio.src!== beat.mp3_url
    if (isNewTrack) {
      audio.pause()
      audio.src = beat.mp3_url
      audio.dataset.beatId = beat.id
      audio.load()
    }
    currentIndex = index
    window.__CURRENT_INDEX__ = index
    window.__CURRENT_LIST__ = currentListId
    window.__CURRENT_BEAT__ = beat
    updateMobilePlayerAura(beat)
    beat.liked = syncAll(beat.id)
    if (!isNewTrack) { audio.currentTime = 0 }
    const row = document.querySelectorAll(".wave-row")[index]
    currentWave = row?.__wave || null
    if (!silent) {
      // keep original requestIdleCallback for GIANT compat
      const cb = () => {
        document.dispatchEvent(new CustomEvent("trackChange", { detail: beat }))
        localStorage.setItem('dt_cc_current', JSON.stringify({ id: beat.id, title: beat.title, cover: beat.cover_url, list: currentListId, timestamp: Date.now() }))
        window.dispatchEvent(new CustomEvent('cc_track_change', { detail: beat }))
        window.dispatchEvent(new CustomEvent('cc_track_selected', { detail: { beatId: beat.id } }))
               if ('mediaSession' in navigator) {
          navigator.mediaSession.metadata = new MediaMetadata({
            title: beat.title, 
            artist: beat.type || 'Dope Tone Vault',
            album: beat.genre || 'Dope Tone',
            artwork: [
              { src: beat.cover_url || 'images/logo.png', sizes: '96x96', type: 'image/png' },
              { src: beat.cover_url || 'images/logo.png', sizes: '128x128', type: 'image/png' },
              { src: beat.cover_url || 'images/logo.png', sizes: '512x512', type: 'image/png' }
            ]
          });
          navigator.mediaSession.playbackState = 'playing';
        }

        setTimeout(()=>syncAll(beat.id), 50)
      };
      if(window.requestIdleCallback) requestIdleCallback(cb); else setTimeout(cb,0);
    }
    if (wasPlaying || isNewTrack) {
      audio.play().catch(err => console.warn('[Player] Autoplay blocked:', err))
    }
  }

  function playTrack(index = 0, list = [], listId = "default") {
    window.refreshMobileHeart?.()
    if (list.length) {
      playlist = [...list]
      originalPlaylist = [...list]
      currentListId = listId
      if (isShuffled) {
        isShuffled = false
        localStorage.setItem('dt_shuffle', 'false')
        shuffleBtn?.classList.remove("active")
      }
    }
    if (!playlist.length ||!playlist[index]?.mp3_url) return
    const beat = playlist[index]
    const newTrackKey = `${currentListId}_${index}_${beat.id}`
    const isSameTrack = currentTrackKey === newTrackKey
    document.querySelectorAll(".playlist-track-play.active,.playlist-play-btn.active,.grid-play.active").forEach(btn => btn.classList.remove("active"))
    if (isSameTrack) {
      if (audio.paused) audio.play().catch(()=>{})
      else audio.pause()
      return
    }
    audio.pause()
    stopAll()
    requestAnimationFrame(() => {
      loadTrack(index)
      currentTrackKey = newTrackKey
      window.__ACTIVE_TRACK_KEY__ = newTrackKey
      if (window.location.pathname.includes('beats.html') && window.filterBeatsToSight) window.filterBeatsToSight([beat])
      audio.play().catch(e => { console.warn('[Player] Play failed:', e); setTimeout(() => audio.play().catch(()=>{}), 100) })
    })
  }

  const togglePlay = (e) => {
    e?.preventDefault(); e?.stopPropagation()
    if (!audio.src && playlist.length) { playTrack(0, playlist, currentListId); return }
    if (audio.paused) { audio.play().catch(err => console.warn('[Player] Play failed:', err)) }
    else { audio.pause() }
  }
  playBtn.addEventListener('click', togglePlay)
  mpPlay?.addEventListener('click', togglePlay)

  const handleNext = (e) => {
    e?.preventDefault(); e?.stopPropagation()
    if (!playlist.length) return
    if (repeatMode === 2) { audio.currentTime = 0; audio.play(); return }
    if (isShuffled) {
      let randomIndex; do { randomIndex = Math.floor(Math.random() * playlist.length) } while (playlist.length > 1 && randomIndex === currentIndex)
      currentIndex = randomIndex
    } else {
      if (currentIndex === playlist.length - 1) { if (repeatMode === 1) currentIndex = 0; else { audio.pause(); return } }
      else { currentIndex++ }
    }
    loadTrack(currentIndex)
    if (window.location.pathname.includes('beats.html')) {
      const currentBeat = playlist[currentIndex]
      if (currentBeat && window.filterBeatsToSight) window.filterBeatsToSight([currentBeat])
    }
    audio.play()
  }
  nextBtn.addEventListener('click', handleNext)
  mpNext && mpNext.addEventListener('click', handleNext)

  const handlePrev = (e) => {
    e?.preventDefault(); e?.stopPropagation()
    if (!playlist.length) return
    if (audio.currentTime > 3) { audio.currentTime = 0; return }
    if (isShuffled) {
      let randomIndex; do { randomIndex = Math.floor(Math.random() * playlist.length) } while (playlist.length > 1 && randomIndex === currentIndex)
      currentIndex = randomIndex
    } else { currentIndex = (currentIndex - 1 + playlist.length) % playlist.length }
    loadTrack(currentIndex)
    if (window.location.pathname.includes('beats.html')) {
      const currentBeat = playlist[currentIndex]
      if (currentBeat && window.filterBeatsToSight) window.filterBeatsToSight([currentBeat])
    }
    audio.play()
  }
  prevBtn.addEventListener('click', handlePrev)
  mpPrev && mpPrev.addEventListener('click', handlePrev)

  // 🔥 WORKING HEART HANDLER FROM YOUR PERFECT FILE
  function handleLike(e){
  e?.preventDefault(); e?.stopPropagation(); e?.stopImmediatePropagation();
  const beat=playlist[currentIndex]||window.__CURRENT_BEAT__; if(!beat) return
  const res=toggleLikeStorage(beat.id);
  beat.liked=res.liked;
  syncAll(beat.id, res.liked);

  // 🔥 SYNC TO VAULT LIKED PLAYLIST
  let likedIds = JSON.parse(localStorage.getItem('dt_liked_v1')||'[]');
  let vault = JSON.parse(localStorage.getItem('dt_vault_v1')||'[]');
  let likedPl = vault.find(p=>p.isLiked);
  if(!likedPl){
    likedPl = {id:'dt_liked_playlist', name:'Liked', isLiked:true, beats:[]};
    vault.unshift(likedPl);
  }
  if(res.liked){
    if(!likedIds.includes(String(beat.id)) &&!likedIds.includes(Number(beat.id))) likedIds.push(beat.id);
    if(!likedPl.beats.some(b=>String(b.id)===String(beat.id))) likedPl.beats.unshift(beat);
  } else {
    likedIds = likedIds.filter(id=>String(id)!==String(beat.id));
    likedPl.beats = likedPl.beats.filter(b=>String(b.id)!==String(beat.id));
  }
  localStorage.setItem('dt_liked_v1', JSON.stringify(likedIds));
  localStorage.setItem('dt_liked_ids', JSON.stringify(likedIds));
  localStorage.setItem('dt_vault_v1', JSON.stringify(vault));

  window.dispatchEvent(new Event('dt_vault_updated'));
  window.dispatchEvent(new Event('playlistsUpdated'));

  const btn=document.getElementById("loveTrackBtn"); if(btn){ btn.classList.add('animate'); setTimeout(()=>btn.classList.remove('animate'),300) }
  logLike(beat.id, res.liked);
}

  heartBtn?.addEventListener('click', handleLike)
  mpHeart?.addEventListener('click', handleLike)
  // UNKILLABLE DELEGATION FROM YOUR PERFECT FILE
  document.addEventListener('click', (e)=>{ if(e.target.closest('#loveTrackBtn')||e.target.closest('#gpHeart')) handleLike(e); }, true);
  document.addEventListener('click', (e)=>{ if(e.target.closest('#mpLike')||e.target.closest('#mpHeart')) handleLike(e); }, true);

  window.refreshMobileHeart=()=>{ const cur=playlist[currentIndex]||window.__CURRENT_BEAT__; if(cur) syncAll(cur.id) }
  window.isBeatLiked=isLiked;
  window.toggleBeatLike=(id)=>{ const r=toggleLikeStorage(id); syncAll(id, r.liked); return r.liked }

   const __PRO_DL__ = new Set();
  const handleDownload = async (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    e?.stopImmediatePropagation();

    const beat = playlist[currentIndex] || window.__CURRENT_BEAT__;
    if(!beat) return;

    // AUTH CHECK
    const isLoggedIn =!!(window.Auth?.user || JSON.parse(localStorage.getItem('dopetone_user')||'null'));
    if(!isLoggedIn){ window.Auth?.openModal(false); return; }

    const mode = (beat.monetization_mode||'').toLowerCase();
    const isFree = mode==='free' || mode==='hybrid' || beat.has_free_tagged==1 || beat.is_free==1 || beat.has_free_tagged===true || beat.is_free===true;

    // PAID = ADD TO CART + ACTIVE LIKE FEATURED
    if(!isFree){
      let cart = JSON.parse(localStorage.getItem('dopetone_cart')||'[]');
      if(!cart.find(x=>String(x.id)===String(beat.id))){
        cart.push(beat);
        localStorage.setItem('dopetone_cart', JSON.stringify(cart));

        // D1 report + UI update like featured
        const total = cart.length;
        localStorage.setItem('dopetone_cart_count', String(total));
        window.dispatchEvent(new CustomEvent('cc_cart_updated', {detail:{beat_id:beat.id, count: total}}));
        window.dispatchEvent(new CustomEvent('cc_player_cart_sync', {detail:{total, beat_id:beat.id, action:'cart'}}));
        window.dispatchEvent(new CustomEvent('cc_cart_change', {detail:{beat_id:beat.id, added:true}}));
        document.querySelectorAll('.cart-count').forEach(c=>{ c.textContent=total; c.style.display='flex'; });
        document.getElementById('cartItems') && (document.getElementById('cartItems').textContent=String(total));

        // make buttons active like featured buy btn
        document.getElementById('gpAdd')?.classList.add('active');
        document.getElementById('mpAdd')?.classList.add('active');
        document.getElementById('gpDownload')?.classList.add('active');
        document.getElementById('mpDownload')?.classList.add('active');
      }
      setTimeout(()=> location.href=`licence-page.html?id=${beat.id}`, 150);
      return;
    }

    // FREE/HYBRID = DIRECT DOWNLOAD + D1
    if(__PRO_DL__.has(String(beat.id))) return;
    __PRO_DL__.add(String(beat.id));
    const btn = e.currentTarget;
    const orig = btn.innerHTML;
    btn.innerHTML = `<span style="display:inline-block;width:14px;height:14px;border:2px solid #fff;border-top-color:transparent;border-radius:50%;animation:spin.6s linear infinite"></span>`;
    try{
      logDownload(beat.id);
      window.dispatchEvent(new CustomEvent('cc_downloaded',{detail:{beat_id:beat.id}}));
      fetch(`${STATS_API}/api/stats/track/${beat.id}/download`,{method:'POST',keepalive:true}).catch(()=>{});
      const r = await fetch(beat.mp3_url,{mode:'cors'});
      const b = await r.blob();
      const u = URL.createObjectURL(b);
      const a = document.createElement('a'); a.href=u; a.download=`${beat.title}_DopeTone_FREE.mp3`; document.body.appendChild(a); a.click();
      setTimeout(()=>{URL.revokeObjectURL(u); a.remove()},2000);
      btn.innerHTML=`✓`; setTimeout(()=>{btn.innerHTML=orig; __PRO_DL__.delete(String(beat.id))},2000);
    }catch{ btn.innerHTML=orig; __PRO_DL__.delete(String(beat.id)); }
  }

  document.getElementById('gpDownload')?.replaceWith(document.getElementById('gpDownload').cloneNode(true));
  document.getElementById('mpDownload')?.replaceWith(document.getElementById('mpDownload').cloneNode(true));
  document.getElementById('gpDownload')?.addEventListener('click', handleDownload);
  document.getElementById('mpDownload')?.addEventListener('click', handleDownload);

  downloadBtn?.addEventListener('click', handleDownload)
  mpDownload?.addEventListener('click', handleDownload)

  const handleAddToCart = async (e) => {
    e?.preventDefault(); e?.stopPropagation()
    const beat = playlist[currentIndex]; if (!beat) return
    const btn = e.currentTarget; const isAdded =!btn.classList.contains('active')
    btn.classList.toggle('active'); mpAdd?.classList.toggle('active', isAdded); addBtn?.classList.toggle('active', isAdded)
    logCart(beat.id, isAdded);
    window.dispatchEvent(new CustomEvent('cc_cart_change', { detail: { beat_id: beat.id, added: isAdded } }));
  }
  addBtn?.addEventListener('click', handleAddToCart)
  mpAdd?.addEventListener('click', handleAddToCart)
  shuffleBtn && shuffleBtn.addEventListener('click', toggleShuffle)
  repeatBtn && repeatBtn.addEventListener('click', cycleRepeat)

  function updatePlayIcons(isPlaying) {
    const icon = isPlaying? PAUSE_ICON : PLAY_ICON;
    if (gpPlayPath) gpPlayPath.setAttribute('d', icon);
    if (mpPlayPath) mpPlayPath.setAttribute('d', icon);
    document.getElementById("gpPlay")?.setAttribute("title", isPlaying? "Pause" : "Play");
    document.getElementById("mpPlay")?.setAttribute("title", isPlaying? "Pause" : "Play");
    document.body.classList.toggle("playing", isPlaying)
    const dropIcon = document.getElementById('dtPlayIcon'); if(dropIcon) dropIcon.className = isPlaying? 'fa-solid fa-pause' : 'fa-solid fa-play';
  }

  audio.addEventListener("play", () => {
    updatePlayIcons(true)
    const beatId = audio.dataset.beatId;
    if (beatId &&!playedBeats.has(beatId)) { logPlay(beatId); playedBeats.add(beatId); }
    localStorage.setItem('dt_cc_playing', 'true');
    window.dispatchEvent(new CustomEvent('cc_player_state', { detail: { playing: true } }));
    if (currentListId === 'grid') {
      document.querySelectorAll(".grid-play").forEach((b, i) => {
        if (i === currentIndex) { b.classList.add("active"); b.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="pointer-events:none;"><path d="${PAUSE_ICON}"/></svg>` }
        else { b.classList.remove("active"); b.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="pointer-events:none;"><path d="${PLAY_ICON}"/></svg>` }
      })
    }
    document.dispatchEvent(new CustomEvent("playerPlay", { detail: { index: currentIndex, listId: currentListId, beat: playlist[currentIndex] } }))
  })

  audio.addEventListener("pause", () => {
    updatePlayIcons(false)
    localStorage.setItem('dt_cc_playing', 'false');
    window.dispatchEvent(new CustomEvent('cc_player_state', { detail: { playing: false } }));
    if (currentListId === 'grid') {
      document.querySelectorAll(".grid-play").forEach(b => { b.classList.remove("active"); b.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="pointer-events:none;"><path d="${PLAY_ICON}"/></svg>` })
    }
    document.dispatchEvent(new Event("playerPause"))
  })

  function format(t) { const m = Math.floor(t / 60); const s = Math.floor(t % 60).toString().padStart(2, "0"); return m + ":" + s }
  audio.addEventListener("timeupdate", () => {
    if (!audio.duration) return
    const percent = audio.currentTime / audio.duration
    if (bar) bar.style.width = percent * 100 + "%"
    if (current) current.textContent = format(audio.currentTime)
    if (duration) duration.textContent = format(audio.duration)
    const mpBar = document.getElementById("mpBar"), mpCurrent = document.getElementById("mpCurrent"), mpDuration = document.getElementById("mpDuration")
    if (mpBar) mpBar.style.width = percent * 100 + "%"
    if (mpCurrent) mpCurrent.textContent = format(audio.currentTime)
    if (mpDuration) mpDuration.textContent = format(audio.duration)
    document.dispatchEvent(new CustomEvent("playerTimeUpdate", { detail: { index: currentIndex, percent, listId: currentListId } }))
  })

  audio.addEventListener("ended", () => { if (repeatMode === 2) { audio.currentTime = 0; audio.play() } else { handleNext() } })

  function setupSeeker(wrapId) {
    const progressWrap = document.getElementById(wrapId); if (!progressWrap) return
    function seekTo(clientX) { if (!audio.duration) return; const rect = progressWrap.getBoundingClientRect(); const clickX = clientX - rect.left; const percent = Math.max(0, Math.min(1, clickX / rect.width)); audio.currentTime = percent * audio.duration }
    progressWrap.addEventListener("click", e => seekTo(e.clientX))
    progressWrap.addEventListener("touchstart", e => { e.preventDefault(); seekTo(e.touches[0].clientX) }, { passive: false })
    let dragging = false
    progressWrap.addEventListener("mousedown", e => { dragging = true; seekTo(e.clientX) })
    document.addEventListener("mouseup", () => { dragging = false })
    document.addEventListener("mousemove", e => { if (!dragging) return; seekTo(e.clientX) })
    progressWrap.addEventListener("touchmove", e => { e.preventDefault(); seekTo(e.touches[0].clientX) }, { passive: false })
  }
  setupSeeker("gpProgress"); setupSeeker("mpProgress")

  window.globalPlayer = { play: playTrack, toggle: togglePlay, next: handleNext, prev: handlePrev, isPlaying: () =>!audio.paused, loadTrack: loadTrack, getCurrentIndex: () => currentIndex, getCurrentList: () => currentListId, getPlaylist: () => playlist, toggleShuffle: toggleShuffle, cycleRepeat: cycleRepeat, getShuffleState: () => isShuffled, getRepeatMode: () => repeatMode }
  window.playBeat = (id) => {
    const idx = playlist.findIndex(b=> String(b.id)===String(id));
    if(idx>=0) playTrack(idx, [], currentListId);
    else {
      const all = window.store?.beats || [];
      const b = all.find(x=> String(x.id)===String(id));
      if(b) playTrack(0, [b], 'single');
      else {
        const drops = window._dropsCache || [];
        for(const d of drops){
          const found = (d.promotion?.items||[]).find(x=> String(x.id)===String(id));
          if(found){ const list = d.promotion.items.map(it=>({id:it.id, title:it.title, cover_url:it.cover_url, mp3_url:it.audio_url||it.mp3_url||it.audio})); const fIdx = list.findIndex(x=> String(x.id)===String(id)); playTrack(fIdx>=0? fIdx:0, list, 'drop-zone'); break; }
        }
      }
    }
  };
  window.pauseBeat = () => audio.pause();

  if (window.location.pathname.includes('playlists.html')) {
    const recentBeats = JSON.parse(localStorage.getItem('recent_played') || '[]')
    if (recentBeats.length &&!window.__CURRENT_BEAT__) { playlist = recentBeats; originalPlaylist = [...recentBeats]; currentListId = 'recent'; loadTrack(0, true) }
  }
  if (window.location.pathname.includes('beats.html')) {
    const armRandomBeat = () => {
      if (window.store?.beats?.length &&!window.__CURRENT_BEAT__) {
        const randomIndex = Math.floor(Math.random() * window.store.beats.length)
        playlist = [...window.store.beats]; originalPlaylist = [...window.store.beats]; currentListId = 'all-beats'; loadTrack(randomIndex, true)
      }
    }
    if (window.store?.loaded) { armRandomBeat() }
    else { const checkStore = setInterval(() => { if (window.store?.loaded) { clearInterval(checkStore); armRandomBeat() } }, 50) }
  }

  const gpCoverEl = document.getElementById('gpCover'); const mpCoverEl = document.getElementById('mpCover'); const gpTitleEl = document.getElementById('gpTitle');
  function handlePlayerCoverClick(e){
    const beat = window.__CURRENT_BEAT__; if(!beat) return; e.stopPropagation();
    const drops = window._dropsCache || []; let foundDropId = null;
    for(const d of drops){ if((d.promotion?.items||[]).some(b=> String(b.id)===String(beat.id))){ foundDropId = d.id; break; } }
    if(foundDropId && window.openBeatCard){ window.openBeatCard(String(beat.id), foundDropId); }
    else if(window.openDropBeatModal){ window.openDropBeatModal(String(beat.id)); }
    else if(window.openBeatCard){ window.openBeatCard(String(beat.id), null); }
  }
  if(gpCoverEl){ gpCoverEl.style.cursor='pointer'; gpCoverEl.title='Open Drop Card'; gpCoverEl.addEventListener('click', handlePlayerCoverClick); }
  if(mpCoverEl){ mpCoverEl.style.cursor='pointer'; mpCoverEl.addEventListener('click', handlePlayerCoverClick); }
  if(gpTitleEl){ gpTitleEl.style.cursor='pointer'; gpTitleEl.addEventListener('click', handlePlayerCoverClick); }

  setTimeout(()=>{ try{ const s=JSON.parse(localStorage.getItem('dt_cc_current')||'null'); if(s?.id) syncAll(s.id); }catch(e){} },300);
  console.log('[Dopetone] GIANT + PERFECT HEART - FULL LENGTH READY - D1 + localStorage synced');
})

function initMobilePlayer() {
  const globalPlayer = document.getElementById('globalPlayerUI'), mobilePlayer = document.getElementById('mobilePlayer'), mpClose = document.getElementById('mpClose')
  if (!globalPlayer ||!mobilePlayer) return
  globalPlayer.addEventListener('click', (e) => {
    if (e.target.closest('.gp-controls button')) return
    if (e.target.closest('#gpAdd')) return
    if (e.target.closest('#loveTrackBtn')) return
    if (window.innerWidth > 768) return
    openMobilePlayer()
  })
  mpClose?.addEventListener('click', closeMobilePlayer)
  let startY = 0, isDragging = false, startTime = 0
  mobilePlayer.addEventListener('touchstart', (e) => {
    if (e.target.closest('#mpControls') || e.target.closest('#mpProgress')) return
    startY = e.touches[0].clientY; startTime = Date.now(); isDragging = true; mobilePlayer.style.transition = 'none'
  }, { passive: true })
  mobilePlayer.addEventListener('touchmove', (e) => {
    if (!isDragging) return
    const currentY = e.touches[0].clientY; const diff = currentY - startY
    if (diff > 0) { e.preventDefault(); const opacity = Math.max(0.3, 1 - (diff / 400)); mobilePlayer.style.transform = `translateY(${diff}px)`; mobilePlayer.style.opacity = opacity }
  }, { passive: false })
  mobilePlayer.addEventListener('touchend', (e) => {
    if (!isDragging) return
    isDragging = false
    const currentY = e.changedTouches[0].clientY; const diff = currentY - startY; const velocity = diff / (Date.now() - startTime)
    mobilePlayer.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease'
    if (diff > 120 || velocity > 0.5) { closeMobilePlayer() }
    else { mobilePlayer.style.transform = 'translateY(0)'; mobilePlayer.style.opacity = '1' }
  })
}
function openMobilePlayer() {
  const mobilePlayer = document.getElementById('mobilePlayer'); if (!mobilePlayer) return
  syncPlayerData(); mobilePlayer.classList.add('active'); document.body.style.overflow = 'hidden'
  mobilePlayer.style.transform = 'translateY(0)'; mobilePlayer.style.opacity = '1'; mobilePlayer.style.transition = 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.4s ease'
}
function closeMobilePlayer() {
  const mobilePlayer = document.getElementById('mobilePlayer'); if (!mobilePlayer) return
  mobilePlayer.classList.remove('active'); mobilePlayer.style.transform = 'translateY(100%)'; mobilePlayer.style.opacity = '0'; document.body.style.overflow = ''
  setTimeout(() => { mobilePlayer.style.transform = ''; mobilePlayer.style.opacity = ''; mobilePlayer.style.transition = '' }, 400)
}
function syncPlayerData() {
  const gpCover = document.getElementById('gpCover'), mpCover = document.getElementById('mpCover')
  if (gpCover && mpCover) mpCover.src = gpCover.src
  const gpTitle = document.getElementById('gpTitle'), mpTitle = document.getElementById('mpTitle')
  if (gpTitle && mpTitle) mpTitle.textContent = gpTitle.textContent
  const audio = window.__DOPE_TONE_AUDIO__
  if (audio) { const isPlaying =!audio.paused; const PLAY_ICON = "M8 5v14l11-7z", PAUSE_ICON = "M6 19h4V5H6v14zm8-14v14h4V5h-4z", icon = isPlaying? PAUSE_ICON : PLAY_ICON; document.getElementById("mpPlayPath")?.setAttribute('d', icon) }
  const gpBar = document.getElementById('gpBar'), mpBar = document.getElementById('mpBar'); if (gpBar && mpBar) mpBar.style.width = gpBar.style.width
  const gpCurrent = document.getElementById('gpCurrent'), mpCurrent = document.getElementById('mpCurrent'); if (gpCurrent && mpCurrent) mpCurrent.textContent = gpCurrent.textContent
  const gpDuration = document.getElementById('gpDuration'), mpDuration = document.getElementById('mpDuration'); if (gpDuration && mpDuration) mpDuration.textContent = gpDuration.textContent
  const mobilePlayer = document.getElementById('mobilePlayer'); if (mobilePlayer && gpCover) { mobilePlayer.style.backgroundImage = `url(${gpCover.src})` }
}
document.addEventListener('DOMContentLoaded', initMobilePlayer)


// === GLOBAL PLAYER DOWNLOAD = FEATURED DOWNLOAD ===
(() => {
  const STATS = "https://dopetone-stats.dopetone701.workers.dev";
  const active = new Set();

  async function track(beat){
    try{
      document.getElementById('totalDownloads') && (document.getElementById('totalDownloads').textContent = String((parseInt(document.getElementById('totalDownloads').textContent||'0')||0)+1));
      window.dispatchEvent(new CustomEvent('cc_downloaded', {detail:{beat_id:beat.id}}));
      fetch(`${STATS}/api/stats/track/${beat.id}/download`, {method:'POST', keepalive:true}).catch(()=>{});
    }catch{}
  }

  async function proDl(beat, btn){
    if(active.has(String(beat.id))) return;
    active.add(String(beat.id));
    const orig = btn.innerHTML;
    try{
      btn.disabled=true;
      btn.innerHTML=`<span style="width:14px;height:14px;border:2px solid #fff;border-top-color:transparent;border-radius:50%;display:inline-block;animation:spin .6s linear infinite"></span>`;
      await track(beat);
      const url = beat.mp3_url || beat.audio_url || beat.audio;
      const res = await fetch(url, {mode:'cors'});
      const blob = await res.blob();
      const bUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href=bUrl; a.download=`${beat.title.replace(/[^a-z0-9]/gi,'_')}_DopeTone_FREE.mp3`; a.click();
      setTimeout(()=>{URL.revokeObjectURL(bUrl); a.remove()},2000);
      btn.innerHTML=`✓`; btn.style.background='#10b981';
      setTimeout(()=>{btn.innerHTML=orig; btn.style.background=''; btn.disabled=false; active.delete(String(beat.id))},2500);
    }catch(e){
      const a=document.createElement('a'); a.href=beat.mp3_url; a.download=`${beat.title}.mp3`; a.target='_blank'; a.click();
      btn.innerHTML=orig; btn.disabled=false; active.delete(String(beat.id));
    }
  }

  function bind(){
    ['mpDownload','gpDownload'].forEach(id=>{
      const btn=document.getElementById(id);
      if(!btn || btn.dataset.proBound) return;
      btn.dataset.proBound="1";
      const clone=btn.cloneNode(true); btn.parentNode.replaceChild(clone, btn);
      clone.addEventListener('click', async (e)=>{
        e.preventDefault(); e.stopPropagation();
        const beat=window.__CURRENT_BEAT__; if(!beat) return;
        const mode=(beat.monetization_mode||'').toLowerCase();
        const isFree= mode==='free'||mode==='hybrid'||beat.has_free_tagged==1||beat.is_free;
        if(!isFree){ location.href=`licence-page.html?id=${beat.id}`; return; }
        await proDl(beat, clone);
      });
    });
  }

  setTimeout(bind,500);
  document.addEventListener('playerPlay', ()=>setTimeout(bind,100));
})();
