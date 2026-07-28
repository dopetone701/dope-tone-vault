// help-page.js - USER FRIENDLY - NO TICKET WORD - CLEARS ALL

const TICKETS_API = "https://support-tickets-api.dopetone701.workers.dev";
const EMAILS_API = "https://emails-api.dopetone701.workers.dev";

document.addEventListener('DOMContentLoaded', () => {
  // FAQ
  document.querySelectorAll('.acc h4').forEach(header => {
    header.style.cursor = 'pointer';
    header.addEventListener('click', () => {
      const acc = header.parentElement;
      const wasOpen = acc.classList.contains('open');
      document.querySelectorAll('.acc').forEach(a=>{
        a.classList.remove('open');
        const ans=a.querySelector('.ans');
        if(ans) ans.style.display='none';
        const plus=a.querySelector('.plus');
        if(plus) plus.textContent='+';
      });
      if(!wasOpen){
        acc.classList.add('open');
        const ans=acc.querySelector('.ans');
        if(ans) ans.style.display='block';
        const plus=header.querySelector('.plus');
        if(plus) plus.textContent='×';
      }
    });
  });

  document.querySelectorAll('[data-scroll]').forEach(card=>{
    card.style.cursor='pointer';
    card.addEventListener('click',()=>{
      document.getElementById(card.dataset.scroll)?.scrollIntoView({behavior:'smooth'});
    });
  });

  const searchInput = document.getElementById('searchInput');
  if(searchInput){
    searchInput.addEventListener('input', (e)=>{
      const q = e.target.value.toLowerCase();
      document.querySelectorAll('.acc, #licenseSection, #termsSection, #privacySection').forEach(el=>{
        const txt = el.textContent.toLowerCase();
        el.style.display = txt.includes(q) || q===''? '' : 'none';
      });
    });
  }

  // CATEGORY MESSAGES - user friendly, no ticket word
  const categoryMessages = {
    "Order / Delivery": "📦 Got it! We're checking your order delivery status. You'll get an update in your email in under 1 hour.",
    "License Question": "📄 License question received! Our team will clarify your license and email you the details shortly.",
    "Payment Issue": "💳 Payment issue noted! We're looking into it now. You'll get a confirmation email in a minute and we fix it in <1h.",
    "File / Stems Issue": "🎵 File issue received! We're checking your download link / stems. Fresh link coming to your email soon.",
    "Custom Beat": "🔥 Custom beat request! Love it. We're reviewing and will reply to your email with next steps.",
    "Other": "✅ Message sent! We got you - our team will reply to your email in under 1 hour."
  };

  const sendBtn = document.getElementById('sendTicket');
  if(sendBtn){
    sendBtn.textContent = 'SEND MESSAGE'; // CHANGE BUTTON TEXT

    sendBtn.addEventListener('click', async () => {
      const nameEl = document.getElementById('tName');
      const emailEl = document.getElementById('tEmail');
      const orderEl = document.getElementById('tOrder');
      const catEl = document.getElementById('tCat');
      const msgEl = document.getElementById('tMsg');
      const statusEl = document.getElementById('ticketStatus');

      const name = nameEl?.value.trim();
      const email = emailEl?.value.trim();
      const orderId = orderEl?.value.trim();
      const category = catEl?.value;
      const message = msgEl?.value.trim();

      if(!name ||!email ||!message){
        if(statusEl){
          statusEl.style.display='block';
          statusEl.style.color='#ef4444';
          statusEl.textContent='Please fill name, email and your message.';
        }
        return;
      }

      sendBtn.disabled=true;
      sendBtn.textContent='SENDING...';
      if(statusEl){
        statusEl.style.display='block';
        statusEl.style.color='#888';
        statusEl.textContent='Sending your message...';
      }

      try{
        // 1. CREATE TICKET IN D1 (backend still uses tickets, user doesn't see)
        const res = await fetch(`${TICKETS_API}/api/tickets/create`, {
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body: JSON.stringify({
            name, username: name, email,
            subject: `${category} - Order ${orderId || 'no-id'}`,
            message: `Category: ${category}\nOrder: ${orderId}\nEmail: ${email}\n\n${message}`,
            priority: category==='Payment Issue' || category==='Order / Delivery'? 'High' : 'Medium',
            status: 'open', source: 'help_page', created_at: new Date().toISOString()
          })
        });
        const data = await res.json();
        if(!res.ok ||!data.success) throw new Error(data.error || 'Failed');
        const ticketId = data.id || '';

        // 2. SEND REAL TIME EMAIL FROM creators@
               // 2. SEND REAL TIME EMAIL FROM creators@ - PRO TEMPLATE
        try{
          await fetch(`${EMAILS_API}/api/emails/bulk`, {
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body: JSON.stringify({
              emails: [email],
              name: name,
              category: category, // triggers smart template in emails-api
              orderId: orderId,
              ticketId: ticketId
            })
          });
        }catch(e){ console.log('Email failed but ticket saved', e) }

        // 3. USER FRIENDLY MESSAGE - NO TICKET WORD
        const friendlyMsg = categoryMessages[category] || categoryMessages["Other"];
        if(statusEl){
          statusEl.style.color='#10b981';
          statusEl.innerHTML = `${friendlyMsg}<br><span style="font-size:11px;color:#666">Email confirmation sent to ${email} from creators@dopetonevault.com</span>`;
        }

        // 4. CLEAR ALL FIELDS - NAME, EMAIL, ORDER, MESSAGE, CATEGORY RESET
        if(nameEl) nameEl.value='';
        if(emailEl) emailEl.value='';
        if(orderEl) orderEl.value='';
        if(msgEl) msgEl.value='';
        if(catEl) catEl.selectedIndex = 0; // reset to first category

        window.dispatchEvent(new CustomEvent('cc_dashboard_refresh'));
        if(window.refreshTickets) window.refreshTickets();

      }catch(err){
        console.error(err);
        if(statusEl){
          statusEl.style.color='#ef4444';
          statusEl.textContent='❌ Could not send - Please message us on WhatsApp +971524082460';
        }
      }finally{
        sendBtn.disabled=false;
        sendBtn.textContent='SEND MESSAGE'; // keep as MESSAGE not TICKET
      }
    });
  }
});
