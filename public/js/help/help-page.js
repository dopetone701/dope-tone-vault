// help-page.js - CONNECTED TO TICKETS API - FINAL
import { MAIN_API } from '../cc-config.js'; // keep if you have

const TICKETS_API = "https://support-tickets-api.dopetone701.workers.dev";

document.addEventListener('DOMContentLoaded', () => {
  // FAQ accordion - fixed minus icon
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

  // Top cards scroll
  document.querySelectorAll('[data-scroll]').forEach(card=>{
    card.style.cursor='pointer';
    card.addEventListener('click',()=>{
      document.getElementById(card.dataset.scroll)?.scrollIntoView({behavior:'smooth'});
    });
  });

  // Search
  const searchInput = document.getElementById('searchInput');
  if(searchInput){
    searchInput.addEventListener('input', (e)=>{
      const q = e.target.value.toLowerCase();
      document.querySelectorAll('.acc, #licenseSection, #termsSection, #privacySection').forEach(el=>{
        const txt = el.textContent.toLowerCase();
        el.style.display = txt.includes(q) || q==='' ? '' : 'none';
      });
    });
  }

  // ===== TICKET SUBMIT - CONNECTED TO YOUR cc-tickets.js SYSTEM =====
  const sendBtn = document.getElementById('sendTicket');
  if(sendBtn){
    sendBtn.addEventListener('click', async () => {
      const name = document.getElementById('tName')?.value.trim();
      const email = document.getElementById('tEmail')?.value.trim();
      const orderId = document.getElementById('tOrder')?.value.trim();
      const category = document.getElementById('tCat')?.value;
      const message = document.getElementById('tMsg')?.value.trim();
      const statusEl = document.getElementById('ticketStatus');

      if(!name || !email || !message){
        if(statusEl){
          statusEl.style.display='block';
          statusEl.style.color='#ef4444';
          statusEl.textContent='Please fill name, email and message.';
        }
        return;
      }

      sendBtn.disabled=true;
      sendBtn.textContent='SENDING...';
      if(statusEl){
        statusEl.style.display='block';
        statusEl.style.color='#888';
        statusEl.textContent='Sending to vault...';
      }

      try{
        const res = await fetch(`${TICKETS_API}/api/tickets/create`, {
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body: JSON.stringify({
            name: name,
            username: name,
            email: email,
            subject: `${category} - Order ${orderId || 'no-id'}`,
            message: `Category: ${category}\nOrder: ${orderId}\nEmail: ${email}\n\n${message}`,
            priority: category==='Payment Issue' || category==='Order / Delivery' ? 'High' : 'Medium',
            status: 'open',
            source: 'help_page',
            created_at: new Date().toISOString()
          })
        });

        const data = await res.json();
        if(!res.ok || !data.success) throw new Error(data.error || 'Failed');

        if(statusEl){
          statusEl.style.color='#10b981';
          statusEl.textContent='✅ Ticket sent! We reply in <12h. Check email. ID: ' + (data.id || data.ticket?.id || '');
        }
        // clear
        document.getElementById('tMsg').value='';
        document.getElementById('tOrder').value='';

        // trigger live refresh in dashboard if open in other tab
        window.dispatchEvent(new CustomEvent('cc_dashboard_refresh'));
        
        // also refresh tickets list if this page has it
        if(window.refreshTickets) window.refreshTickets();

      }catch(err){
        console.error(err);
        if(statusEl){
          statusEl.style.color='#ef4444';
          statusEl.textContent='❌ Failed: ' + err.message + ' - Try WhatsApp +971524082460';
        }
      }finally{
        sendBtn.disabled=false;
        sendBtn.textContent='SEND TICKET';
      }
    });
  }
});
