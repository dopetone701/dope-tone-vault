// checkout-paypal.js - PAYPAL PRO MAX - 50% PROMO ARMED - D1 SAFE
const PAYPAL_WORKER_URL = 'https://pay-pal-api.dopetone701.workers.dev';
const PROMO_API = 'https://emails-api.dopetone701.workers.dev';

const calcPro = (b) => Number((Number(b) * 49 / 19).toFixed(2));
const calcExclusive = (b) => Number((Number(b) * 199 / 19).toFixed(2));

let isCheckingOut = false;

const safeParse = (key, fallback) => {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
  catch { return fallback; }
};
const safeStringify = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } };

function proToast(msg, type = 'info'){
  let el = document.getElementById('dt-pro-toast');
  if(!el){
    el = document.createElement('div'); el.id = 'dt-pro-toast';
    el.style.cssText = `position:fixed;bottom:28px;left:50%;transform:translateX(-50%);background:#0f0f0f;color:#fff;padding:14px 22px;border-radius:14px;z-index:9999999;font:600 13px/1.2 system-ui;border:1px solid #2a2a2a;box-shadow:0 10px 30px rgba(0,0,0,.6);max-width:90vw;`;
    document.body.appendChild(el);
  }
  el.style.borderColor = type==='error' ? '#ff3b3b' : type==='ok' ? '#00ffc6' : '#2a2a2a';
  el.textContent = msg; el.style.display = 'block'; el.style.opacity = '1';
  clearTimeout(el._t); el._t = setTimeout(()=>{ el.style.opacity='0'; setTimeout(()=>el.style.display='none',300); }, 4000);
}

if(!document.getElementById('dt-checkout-style')){
  const s = document.createElement('style'); s.id = 'dt-checkout-style';
  s.textContent = `
    @keyframes dt-spin { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
    .dt-gear { display:inline-block; animation: dt-spin 0.8s linear infinite; margin-left:8px; font-size:15px; vertical-align:middle; }
    #checkoutBtn[disabled]{ opacity:0.65 !important; cursor:wait !important; pointer-events:none !important; filter:grayscale(.2); }
    #checkoutBtn.is-loading{ cursor:wait !important; background: linear-gradient(135deg, #2a2a2a, #111) !important; border-color:#00ffc6 !important; }
    #checkoutBtn.is-loading .dt-gear{ color:#00ffc6; }
  `;
  document.head.appendChild(s);
}

export async function createStripeCheckout(e){
  if(e){ e.preventDefault(); e.stopPropagation(); }
  if(isCheckingOut) return;

  let licences = safeParse("dopetone_licences", {});
  let cart = safeParse("dopetone_cart", []);
  if(!Array.isArray(cart) || cart.length===0){ proToast("Cart is empty", "error"); return; }

  let beatsToCheckout = cart.filter(b => licences[String(b.id)] || licences[b.id]);
  if(beatsToCheckout.length===0){ proToast("Select a licence first", "error"); return; }

  // === CHECK PROMO FROM LOCAL STORAGE / INPUT ===
  let activePromoCode = localStorage.getItem('dopetone_active_promo') || document.getElementById('promoInput')?.value?.toUpperCase() || '';
  let discountMult = 1;
  let promoValid = null;

  if(activePromoCode){
    try{
      const r = await fetch(`${PROMO_API}/api/promo/validate`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({code: activePromoCode})
      });
      const d = await r.json();
      if(d.valid){
        promoValid = d;
        discountMult = (100 - d.discount)/100; // 0.5 for 50%
        proToast(`🔥 ${activePromoCode} - ${d.discount}% OFF applied`, "ok");
      } else {
        proToast(`Promo ${activePromoCode} invalid: ${d.error}`, "error");
        activePromoCode=''; localStorage.removeItem('dopetone_active_promo');
      }
    }catch{}
  }

  const hasPaid = beatsToCheckout.some(b=>{
    const lic = licences[String(b.id)] || licences[b.id];
    return lic && lic.name!=='FREE' && lic.name!=='Free' && Number(lic.price)>0;
  });

  if(!hasPaid){ proToast("Free beats don't need checkout", "ok"); return; }

  isCheckingOut = true;
  const btn = document.getElementById('checkoutBtn');
  const originalHTML = btn ? btn.innerHTML : '';
  if(btn){
    btn.disabled = true; btn.classList.add('is-loading');
    btn.innerHTML = `Redirecting to PayPal <span class="dt-gear">⚙️</span>`;
  }

  // Recalculate with 50% math if promo valid
  let licencesToSend = {};
  beatsToCheckout.forEach(b=>{
    const lic = licences[String(b.id)] || licences[b.id];
    if(!lic) return;
    let finalPrice = Number(lic.price) || 0;
    const base = Number(b.price) || Number(b.basic_price) || 19;
    if(lic.name === 'Pro') finalPrice = calcPro(base);
    if(lic.name === 'Exclusive') finalPrice = calcExclusive(base);
    if(lic.name === 'Basic' && !lic.price) finalPrice = base;
    if(lic.name === 'FREE' || lic.name === 'Free' || finalPrice<=0) return;
    
    // APPLY 50% DISCOUNT REAL TIME
    if(promoValid){
      finalPrice = Number((finalPrice * discountMult).toFixed(2));
    }

    licencesToSend[b.id] = { name: lic.name, price: finalPrice, title: b.title || b.beat_title || `Beat ${b.id}`, original_price: lic.price };
  });

  if(Object.keys(licencesToSend).length===0){
    proToast("No paid licences", "error");
    if(btn){ btn.disabled=false; btn.classList.remove('is-loading'); btn.innerHTML=originalHTML; }
    isCheckingOut=false; return;
  }

  const pendingPayload = {
    timestamp: Date.now(),
    beats: beatsToCheckout,
    licences: licencesToSend,
    promo_code: activePromoCode || null,
    discount_applied: promoValid?.discount || 0,
    user_id: localStorage.getItem("dopetone_user_id") || "anonymous"
  };
  safeStringify("dopetone_pending_checkout", pendingPayload);

  let history = safeParse("dopetone_history", []);
  beatsToCheckout.forEach(b=>{
    const lic = licencesToSend[b.id]; if(!lic) return;
    if(!history.find(h=> String(h.beat_id)===String(b.id) && h.license_type===lic.name)){
      history.push({
        beat_id: parseInt(b.id),
        beat_title: b.title || '',
        license_type: lic.name,
        amount: Math.round(Number(lic.price)*100),
        timestamp: Date.now(),
        user_id: pendingPayload.user_id,
        promo_code: activePromoCode || null
      });
    }
  });
  safeStringify("dopetone_history", history);

  const controller = new AbortController();
  const timeout = setTimeout(()=>controller.abort(), 15000);

  try {
    const customerEmail = localStorage.getItem("dopetone_user_email") || document.querySelector('#customerEmail')?.value || null;
    const customerName = localStorage.getItem("dopetone_user_name") || document.querySelector('#customerName')?.value || "";

    const res = await fetch(`${PAYPAL_WORKER_URL}/create-paypal-order`, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        licences: licencesToSend,
        cart: beatsToCheckout,
        user_id: pendingPayload.user_id,
        email: customerEmail,
        customer_email: customerEmail,
        name: customerName,
        customer_name: customerName,
        promo_code: activePromoCode || null,
        discount: promoValid?.discount || 0
      }),
      signal: controller.signal
    });

    clearTimeout(timeout);
    let data; try{ data = await res.json(); } catch { const t = await res.text(); throw new Error(t.slice(0,200)); }
    if(!res.ok) throw new Error(data.error || `Worker ${res.status}`);

    if(data.url){
      proToast("Redirecting to PayPal...", "ok");
      // Mark promo as used AFTER redirect will happen via success page, but save for webhook
      if(activePromoCode){
        localStorage.setItem('dopetone_pending_promo_use', activePromoCode);
      }
      setTimeout(()=>{ window.location.href = data.url; }, 350);
      return;
    } else throw new Error(data.error || 'No checkout URL');

  } catch(err){
    clearTimeout(timeout);
    proToast(`Checkout failed: ${err.message}`, "error");
    if(btn){
      btn.disabled = false; btn.classList.remove('is-loading');
      btn.innerHTML = originalHTML || `Checkout ${Object.keys(licencesToSend).length} Tracks`;
    }
    isCheckingOut = false;
  }
}

export function setupCheckout(){
  if(window.__dt_checkout_bound_paypal) return;
  window.__dt_checkout_bound_paypal = true;
  document.addEventListener('click', (e)=>{
    const btn = e.target.closest('#checkoutBtn');
    if(btn){ createStripeCheckout(e); }
  }, { capture:true });
  const direct = document.getElementById('checkoutBtn');
  if(direct && !direct.dataset.bound){
    direct.dataset.bound="1";
    direct.addEventListener('click', createStripeCheckout);
  }
  const observer = new MutationObserver(()=>{
    const b = document.getElementById('checkoutBtn');
    if(b && !b.dataset.bound){
      b.dataset.bound="1";
      b.addEventListener('click', createStripeCheckout);
    }
  });
  observer.observe(document.body, { childList:true, subtree:true });
}

window.createStripeCheckout = createStripeCheckout;
window.createPaypalCheckout = createStripeCheckout;
window.setupCheckout = setupCheckout;
export const createPaypalCheckout = createStripeCheckout;

if(document.readyState === 'loading'){ document.addEventListener('DOMContentLoaded', setupCheckout); }
else { setupCheckout(); }
