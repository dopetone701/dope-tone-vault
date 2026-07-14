// ===============================
// TRENDING SECTION (FILTER WIRED SAFE + MOST PLAYED + SCROLL SAFE)
// ===============================
import { globalFilter } from './global-filter.js';

export function renderTrending() {
  const container = document.getElementById("trendingGrid")
  if (!container ||!window.store?.beats?.length) return

  // TOP 10 BY PLAYS - uses same beats but sorted
  let all = [...window.store.beats]
  // sort by real plays if you have it, else fallback to trending filter
  all.sort((a,b)=>{
    const pa = a.play_count?? a.plays?? a.total_plays?? 0
    const pb = b.play_count?? b.plays?? b.total_plays?? 0
    return pb - pa
  })
  // if no play counts, use your normal trending filter then take top 10
  let beats = all[0]?.play_count!= null || all[0]?.plays!= null? all.slice(0,10) : globalFilter.filterBeats(all, 'trending').slice(0,10)

  container.innerHTML = ""
  let activeBeatId = null

  beats.slice(0, 4).forEach((beat, i) => {
    container.appendChild(createCard(beat, i))
  })

  let pointer = 4
  let rotIndex = 0

  setInterval(() => {
    const cards = [...container.querySelectorAll(".trending-card")]
    if (!cards.length) return
    let card = null
    for (let i = 0; i < cards.length; i++) {
      const tryCard = cards[(rotIndex + i) % cards.length]
      if (!tryCard.classList.contains("active")) {
        card = tryCard
        rotIndex = (rotIndex + i + 1) % cards.length
        break
      }
    }
    if (!card) {
      card = cards[rotIndex]
      rotIndex = (rotIndex + 1) % cards.length
    }
    if (card.classList.contains("active")) return
    card.classList.add("fade-out")
    setTimeout(() => {
      const beat = beats[pointer % beats.length]
      const beatIndex = pointer % beats.length
      pointer++
      updateCard(card, beat, beatIndex)
      card.classList.remove("fade-out")
      card.classList.add("fade-in")
      setTimeout(() => card.classList.remove("fade-in"), 200)
    }, 200)
  }, 1800)

  function createCard(beat, index) {
    const card = document.createElement("div")
    card.className = "trending-card"
    card.dataset.id = beat.id
    card.dataset.index = index
    card.innerHTML = `
      <img src="${beat.cover_url || beat.image || 'images/studio.jpg'}" draggable="false" />
      <button class="trending-play"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></button>
      <div class="trending-info">
        <div class="trending-title">${beat.title}</div>
        <div class="trending-genre">${beat.genre || "Unknown"}</div>
      </div>
    `
    attachProTap(card, beat, index)
    attachNavigation(card, beat)
    return card
  }

  function updateCard(card, beat, index) {
    card.dataset.id = beat.id
    card.dataset.index = index
    card.querySelector("img").src = beat.cover_url || beat.image || 'images/studio.jpg'
    card.querySelector(".trending-title").textContent = beat.title
    card.querySelector(".trending-genre").textContent = beat.genre || "Unknown"
    card.querySelector(".trending-play").innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`
    attachProTap(card, beat, index)
    attachNavigation(card, beat)
  }

  function attachProTap(card, beat, index) {
    const btn = card.querySelector(".trending-play")
    const doPlay = (e)=>{ e.stopPropagation(); window.globalPlayer.play(index, [...beats], "trending") }
    btn.onclick = doPlay
    let sx=0,sy=0,st=0,moved=false
    card.addEventListener('touchstart', e=>{ const t=e.touches[0]; sx=t.clientX; sy=t.clientY; st=Date.now(); moved=false }, {passive:true})
    card.addEventListener('touchmove', e=>{ const t=e.touches[0]; if(Math.abs(t.clientX-sx)>12||Math.abs(t.clientY-sy)>12) moved=true }, {passive:true})
    card.addEventListener('touchend', e=>{
      if(e.target.closest(".trending-play")) return
      if(moved) return
      if(Date.now()-st>400) return
      e.preventDefault()
      doPlay(e)
    }, {passive:false})
  }

  function attachNavigation(card, beat) {
    function addToCart() {
      let cart = JSON.parse(localStorage.getItem("dopetone_cart")) || []
      const cartBeat = { id: beat.id, title: beat.title, cover: beat.cover_url, cover_url: beat.cover_url, genre: beat.genre, bpm: beat.bpm, audio: beat.mp3_url || beat.audio, mp3_url: beat.mp3_url, mood: beat.mood, key: beat.key, type: beat.type }
      if(!cart.find(item => item.id == beat.id)){ cart.push(cartBeat); localStorage.setItem("dopetone_cart", JSON.stringify(cart)) }
    }
    card.ondblclick = (e) => { if (e.target.closest(".trending-play")) return; addToCart(); window.location.href = `licence-page.html?id=${beat.id}` }
    let lastTap=0
    card.addEventListener("touchend", (e) => {
      if (e.target.closest(".trending-play")) return
      const now = Date.now()
      if(now-lastTap<350){ e.preventDefault(); addToCart(); window.location.href=`licence-page.html?id=${beat.id}` }
      lastTap=now
    }, { passive:false })
  }

  document.addEventListener("playerPlay", (e) => {
    const { index, listId } = e.detail
    const currentBeat = beats[index]
    if (!currentBeat) return
    activeBeatId = (listId==="trending")? currentBeat.id : null
    document.querySelectorAll(".trending-card").forEach(card => {
      const btn = card.querySelector(".trending-play")
      if (listId==="trending" && card.dataset.id == activeBeatId) {
        card.classList.add("active")
        btn.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/></svg>`
      } else {
        card.classList.remove("active")
        btn.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`
      }
    })
  })

  document.addEventListener("playerPause", () => {
    document.querySelectorAll(".trending-play").forEach(btn => {
      btn.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`
    })
  })
}
