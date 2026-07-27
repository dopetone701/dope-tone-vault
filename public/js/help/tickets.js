// public/js/help/tickets.js - ONLY ticket form logic + D1 integration
export function initTickets() {
  const btn = document.getElementById('sendTicket');
  const status = document.getElementById('ticketStatus');
  const nameEl = document.getElementById('tName');
  const emailEl = document.getElementById('tEmail');
  const orderEl = document.getElementById('tOrder');
  const catEl = document.getElementById('tCat');
  const msgEl = document.getElementById('tMsg');

  if (!btn || !status) {
    console.warn('[tickets] form not found');
    return;
  }

  // Worker URLs - change to your real support endpoint later
  const SUPPORT_API = 'https://vault-orders-api.dopetone701.workers.dev';
  // TODO: create /api/support/ticket in your worker that inserts into D1 support_tickets table

  btn.addEventListener('click', async () => {
    const payload = {
      name: nameEl?.value.trim() || '',
      email: emailEl?.value.trim() || '',
      order_id: orderEl?.value.trim() || '',
      category: catEl?.value || 'Order / Delivery',
      message: msgEl?.value.trim() || '',
      created_at: new Date().toISOString(),
      source: 'help.html',
      page_url: location.href
    };

    // validation
    if (!payload.email || !payload.message) {
      status.style.display = 'block';
      status.style.color = '#FF1E3C';
      status.textContent = '⚠️ Email and message required';
      return;
    }
    if (!payload.email.includes('@')) {
      status.style.display = 'block';
      status.style.color = '#FF1E3C';
      status.textContent = '⚠️ Enter valid email';
      return;
    }

    status.style.display = 'block';
    status.style.color = '#9CA3AF';
    status.textContent = 'Sending ticket...';

    btn.disabled = true;
    btn.style.opacity = '0.6';
    btn.textContent = 'SENDING...';

    try {
      // REAL SEND - uncomment when worker ready:
      // const res = await fetch(`${SUPPORT_API}/api/support/ticket`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(payload)
      // });
      // const data = await res.json();
      // if (!res.ok) throw new Error(data.error || 'Failed');

      // MOCK for now - safe, no breakage
      console.log('[tickets] payload', payload);
      await new Promise(r => setTimeout(r, 900));

      status.style.color = '#00FFC6';
      status.innerHTML = `✅ Ticket received — we reply in 12-24h Dubai time.<br><small>To: ${payload.email} • Check inbox/spam</small>`;

      // clear message only
      if (msgEl) msgEl.value = '';

      // optional whatsapp quick contact
      // const waText = encodeURIComponent(`Hi Dope Tone, ticket ${payload.category}: ${payload.message} - Order ${payload.order_id} - ${payload.email}`);
      // window.open(`https://wa.me/971524082460?text=${waText}`, '_blank');

    } catch (err) {
      status.style.color = '#FF1E3C';
      status.textContent = `❌ Error: ${err.message} — email directly creators@dopetonevault.com with your order ID`;
      console.error('[tickets] error', err);
    } finally {
      btn.disabled = false;
      btn.style.opacity = '1';
      btn.textContent = 'SEND TICKET';
    }
  });
}
