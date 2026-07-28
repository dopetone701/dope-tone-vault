const VAULT_API = "https://emails-api.dopetone701.workers.dev";
let vaultStep = 'email';
let tempEmail = '';
let tempName = '';
let isTyping = false;

function joinVault() {
  const input = document.getElementById('vault-email');
  const btn = input.nextElementSibling;
  const label = document.querySelector('.dt-footer-right > span');
  const termsBox = document.getElementById('vault-terms');
  const check = document.getElementById('vault-agree-check');
  const val = input.value.trim();

  if (vaultStep === 'email') {
    if (!val.includes('@')) {
      input.style.border = '1px solid #ff2d78';
      input.animate([{transform:'translateX(-4px)'},{transform:'translateX(4px)'},{transform:'translateX(0)'}], {duration:250});
      return;
    }
    tempEmail = val.toLowerCase();
    wipe(input, btn, () => {
      vaultStep = 'name';
      label.textContent = 'Input your full name';
      input.type = 'text';
      input.value = '';
      input.placeholder = 'Full name';
    });

  } else if (vaultStep === 'name') {
    if (val.length < 2) { input.style.border = '1px solid #ff2d78'; return; }
    tempName = val;
    wipe(input, btn, () => {
      vaultStep = 'terms';
      label.textContent = 'By continuing you agree to our terms';
      label.style.fontSize = '10px'; label.style.opacity = '0.6';
      input.value = ''; input.placeholder = 'Check box to agree'; input.type = 'text'; input.disabled = true;
      termsBox.style.display = 'flex';
      btn.style.opacity = '0.3'; btn.style.pointerEvents = 'none';
      check.checked = false;
      check.onchange = () => {
        if (check.checked &&!isTyping) {
          isTyping = true;
          input.disabled = false; input.value = '';
          typeWord(input, 'AGREE', () => {
            btn.style.opacity = '1'; btn.style.pointerEvents = 'auto'; isTyping = false;
          });
        } else if (!check.checked) {
          input.value = ''; btn.style.opacity = '0.3'; btn.style.pointerEvents = 'none';
        }
      };
    });

  } else if (vaultStep === 'terms') {
    // SEND TO BACKEND
    sendVaultToBackend(tempEmail, tempName);

    termsBox.style.display = 'none';
    label.textContent = `${tempName} • in vault`;
    label.style.fontSize = '12px'; label.style.opacity = '1'; label.style.textTransform = 'uppercase';
    input.value = ''; input.placeholder = `Bingo! Welcome ${tempName.split(' ')[0]} 🔥`;
    input.style.border = '1px solid #00ff9d'; input.disabled = true;
    btn.style.opacity = '0.3'; btn.style.pointerEvents = 'none';

    setTimeout(() => {
      input.disabled = false; input.placeholder = 'Email'; input.type = 'email'; input.style.border = '';
      btn.style.opacity = '1'; btn.style.pointerEvents = 'auto'; vaultStep = 'email';
    }, 4000);
  }
}

async function sendVaultToBackend(email, name){
  try{
    const res = await fetch(`${VAULT_API}/api/emails/subscribe`, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ email, name, source: 'footer_vault' })
    });
    const data = await res.json();
    console.log('[Vault] Saved:', data);
    // Refresh your control-center emails table if open
    window.dispatchEvent(new CustomEvent('cc_dashboard_refresh'));
  }catch(err){
    console.error('[Vault] Failed:', err);
  }
}

function typeWord(input, word, cb) {
  let i = 0; input.value = '';
  const interval = setInterval(() => { input.value += word[i]; i++; if (i >= word.length) { clearInterval(interval); if (cb) cb(); } }, 120);
}
function wipe(input, btn, cb) {
  btn.animate([{transform:'translateX(0)'},{transform:'translateX(-60px)'},{transform:'translateX(0)'}], {duration:400});
  input.animate([{opacity:1, transform:'translateX(0)'},{opacity:0, transform:'translateX(-15px)'}], {duration:180}).onfinish = () => {
    input.value = ''; input.animate([{opacity:0, transform:'translateX(15px)'},{opacity:1, transform:'translateX(0)'}], {duration:180}); cb();
  };
}
document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('vault-email');
  if (input) input.addEventListener('keypress', e => { if (e.key === 'Enter' &&!isTyping) joinVault(); });
});
