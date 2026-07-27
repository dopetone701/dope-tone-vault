// ===============================
// 🔥 MORE BUTTON - FIXED TO OPEN VAULT MODAL
// ===============================
if(!window.__DT_MORE_LOADED__){
window.__DT_MORE_LOADED__ = true;

const API_URL = window.API_URL || 'https://api.dopetonevault.com/api/beats';
const STATS_API = window.STATS_API || window.__DT_STATS_API__ || 'https://dopetone-stats.dopetone701.workers.dev';
window.__DT_STATS_API__ = STATS_API;
let __DT_CURRENT_BEAT__ = null;

function isFreeDownloadable(beat){
  if(!beat) return false;
  const m = (beat.monetization_mode||'').toLowerCase();
  return m==='free'||m==='hybrid'||beat.has_free_tagged==1||beat.is_free==1||beat.has_free_tagged===true||beat.is_free===true||beat.price==0||beat.price==='0';
}
function isLoggedIn(){ try{ return !!(window.Auth?.user || localStorage.getItem('dopetone_user')); }catch{ return false; } }
function getCart(){ try{ return JSON.parse(localStorage.getItem('dopetone_cart')||'[]'); }catch{ return []; } }
function saveCart(cart){ localStorage.setItem('dopetone_cart', JSON.stringify(cart)); localStorage.setItem('dopetone_cart_count', String(cart.length)); }

window.openDownloadGate = async function(beat){
  beat = beat || window.__CURRENT_BEAT__ || __DT_CURRENT_BEAT__;
  if(!beat) return;
  if(!isLoggedIn()){ window.Auth?.openModal(false); return; }
  if(!isFreeDownloadable(beat)){ let cart=getCart(); if(!cart.find(x=>String(x.id)===String(beat.id))){ cart.push(beat); saveCart(cart); } location.href=`licence-page.html?id=${beat.id}`; return; }
  try{
    fetch(`${STATS_API}/api/stats/track/${beat.id}/download`,{method:'POST',keepalive:true}).catch(()=>{});
    const proxyUrl = `${API_URL}/api/download/${beat.id}?url=${encodeURIComponent(beat.mp3_url||beat.url)}&title=${encodeURIComponent(beat.title)}`;
    const r=await fetch(proxyUrl); const b=await r.blob();
    const u=URL.createObjectURL(b); const a=document.createElement('a'); a.href=u; a.download=`${beat.title}_FREE.mp3`; document.body.appendChild(a); a.click(); setTimeout(()=>{URL.revokeObjectURL(u); a.remove();},2000);
  }catch(e){ window.open(beat.mp3_url||beat.url,'_blank'); }
};

document.addEventListener("DOMContentLoaded", ()=>{
  function setupMoreButton(){
    const openSheet=(e)=>{
      if(e) e.stopPropagation();
      const beat=window.__CURRENT_BEAT__; if(!beat) return;
      document.getElementById("proMenuSheet")?.remove();
      const isFree = isFreeDownloadable(beat);
      const sheet=document.createElement("div"); sheet.id="proMenuSheet";
      sheet.innerHTML=`<div class="sheet-backdrop"></div><div class="sheet-panel"><div class="sheet-handle"></div><div class="sheet-title">${beat.title}</div><button class="sheet-item" data-action="playlist">🎵 Create Playlist</button><button class="sheet-item" data-action="add_playlist">➕ Add To Playlist</button><button class="sheet-item" data-action="dopetone_cart">🛒 Add To Cart</button><button class="sheet-item" data-action="download">⬇ Free Download</button><button class="sheet-item" data-action="share">🔗 Share</button><button class="sheet-item buy" data-action="buy" ${isFree ? 'disabled style="opacity:0.35;pointer-events:none;filter:grayscale(1);"' : ''}>💳 ${isFree ? 'Free - No Purchase' : 'Buy Now'}</button></div>`;
      document.body.appendChild(sheet);
      sheet.querySelector(".sheet-backdrop").onclick=()=>sheet.remove();
      sheet.querySelectorAll(".sheet-item").forEach(btnEl=>{
        btnEl.onclick=()=>{
          const action=btnEl.dataset.action;
          if(action==="playlist"){ 
            sheet.remove();
            window.__PENDING_VAULT_BEAT__=beat;
            if(window.openVaultModal) window.openVaultModal(); 
            else if(window.openPlaylistModal) window.openPlaylistModal(beat);
            return; 
          }
          if(action==="add_playlist"){ 
            sheet.remove();
            // THIS NOW OPENS YOUR VAULT MODAL WITH LIST NAMES
            setTimeout(()=>{
              if(window.openAddToVaultModal) window.openAddToVaultModal(beat);
              else if(window.openAddToPlaylistModal) window.openAddToPlaylistModal(beat);
              else console.log('vault modal not loaded');
            }, 80);
            return; 
          }
          if(action==="dopetone_cart"){ if(!isLoggedIn()){ window.Auth?.openModal(false); sheet.remove(); return; } const cart=getCart(); if(!cart.find(x=>String(x.id)===String(beat.id))){ cart.push(beat); saveCart(cart); } sheet.remove(); return; }
          if(action==="download"){ sheet.remove(); setTimeout(()=>window.openDownloadGate(beat),80); return; }
          if(action==="share"){ sheet.remove(); return; }
          if(action==="buy"){ if(isFree) return; let cart=getCart(); if(!cart.find(x=>String(x.id)===String(beat.id))){ cart.push(beat); saveCart(cart); } location.href=`licence-page.html?id=${beat.id}`; sheet.remove(); return; }
          sheet.remove();
        };
      });
    };
    const mpMore=document.getElementById("mpMore"); const gpMore=document.getElementById("gpMore");
    if(mpMore){ const c=mpMore.cloneNode(true); mpMore.parentNode.replaceChild(c,mpMore); c.addEventListener("click",openSheet); }
    if(gpMore){ const c2=gpMore.cloneNode(true); gpMore.parentNode.replaceChild(c2,gpMore); c2.addEventListener("click",(e)=>{ e.stopPropagation(); const ex=document.getElementById("proMenuSheet"); if(ex){ ex.remove(); return; } document.getElementById("mpMore")?.click(); }); }
  }
  setupMoreButton();
});
}
