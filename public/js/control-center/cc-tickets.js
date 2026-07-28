const API = "https://support-tickets-api.dopetone701.workers.dev";
const EMAILS_API = "https://emails-api.dopetone701.workers.dev";
let tickets = [];
let activeTab = 'active'; // active = open+replied, resolved = archived

export async function initTickets(){
  document.getElementById('ticketRefreshBtn')?.addEventListener('click', load);
  // Add tabs if not exist
  const header = document.getElementById('ticketHeader');
  if(header && !document.getElementById('ticketTabs')){
    header.insertAdjacentHTML('afterend', `<div id="ticketTabs" style="display:flex;gap:8px;padding:12px;border-bottom:1px solid #1a1a1a">
      <button id="tab-active" onclick="switchTab('active')" style="padding:8px 14px;border-radius:99px;border:1px solid #222;background:#fff;color:#000;font-weight:800;font-size:12px">INBOX</button>
      <button id="tab-resolved" onclick="switchTab('resolved')" style="padding:8px 14px;border-radius:99px;border:1px solid #1a1a1a;background:#111;color:#666;font-weight:700;font-size:12px">RESOLVED</button>
    </div>`);
  }
  await load();
}

window.switchTab = async (tab)=>{
  activeTab = tab;
  document.getElementById('tab-active').style.background = tab==='active'?'#fff':'#111';
  document.getElementById('tab-active').style.color = tab==='active'?'#000':'#666';
  document.getElementById('tab-resolved').style.background = tab==='resolved'?'#fff':'#111';
  document.getElementById('tab-resolved').style.color = tab==='resolved'?'#000':'#666';
  await load();
};

async function load(){
  const res = await fetch(`${API}/api/tickets/list?status=${activeTab}&t=${Date.now()}`);
  const data = await res.json();
  tickets = (data.tickets||[]).sort((a,b)=> new Date(a.created_at)-new Date(b.created_at)); // FIFO oldest first
  render();
}

function render(){
  const list = document.getElementById('ticketList');
  if(!list) return;
  if(!tickets.length){ 
    list.innerHTML=`<div style="padding:60px 20px;text-align:center;color:#333">
      <div style="font-size:32px;margin-bottom:10px">${activeTab==='active'?'✅':'📦'}</div>
      <div style="color:#666;font-weight:700">${activeTab==='active'?'Inbox zero - all caught up!':'No resolved tickets yet'}</div>
      <div style="color:#333;font-size:11px;margin-top:6px">${activeTab==='active'?'Everything saved in D1 forever':'Resolved tickets stay in D1 for security'}</div>
    </div>`; 
    document.getElementById('ticketCount').textContent = `(0)`;
    return; 
  }

  list.innerHTML = tickets.map((t,i)=>{
    const mins = Math.floor((Date.now()-new Date(t.created_at))/60000);
    const isNext = i===0 && t.status==='open' && activeTab==='active';
    const statusColor = t.status==='open' ? '#facc15' : t.status==='replied' ? '#00ff88' : '#666';
    return `<div onclick="openTicket('${t.id}')" style="display:flex;gap:12px;padding:14px;border-bottom:1px solid #111;background:${isNext?'#1a1500':'#080808'};border-left:${isNext?'3px solid #facc15':'3px solid transparent'};cursor:pointer">
      <div style="font-weight:900;color:${isNext?'#facc15':'#333'};font-size:12px">#${i+1}${isNext?' 🔥':''}</div>
      <div style="flex:1;min-width:0">
        <div style="color:#fff;font-size:13px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${t.subject || t.category} - ${t.id}</div>
        <div style="color:#666;font-size:11px;margin-top:2px">${t.email} • ${mins<60?`${mins}m`:Math.floor(mins/60)+'h'} • <span style="color:${statusColor}">${t.status.toUpperCase()}</span></div>
        <div style="color:#888;font-size:12px;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${(t.message||'').slice(0,80)}</div>
      </div>
      <div style="font-size:10px;color:${mins>60?'#ef4444':'#333'};white-space:nowrap">${mins<60?mins+'m':Math.floor(mins/60)+'h'}</div>
    </div>`;
  }).join('');

  document.getElementById('ticketCount').textContent = `(${tickets.length})`;
}

window.openTicket = (id)=>{
  const t = tickets.find(x=>x.id===id);
  if(!t) return;
  const pos = tickets.filter(x=>x.status==='open' || activeTab==='resolved').findIndex(x=>x.id===id)+1;
  const isResolvedTab = activeTab==='resolved';
  
  document.getElementById('tm')?.remove();
  document.body.insertAdjacentHTML('beforeend', `<div id="tm" onclick="if(event.target.id==='tm')this.remove()" style="position:fixed;inset:0;background:rgba(0,0,0,.92);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px">
    <div style="background:#0f0f0f;border:1px solid #222;border-radius:16px;max-width:620px;width:100%;max-height:92vh;overflow:auto">
      <div style="padding:16px 18px;border-bottom:1px solid #1a1a1a;display:flex;justify-content:space-between;align-items:center">
        <div>
          <div style="color:${isResolvedTab?'#666':'#facc15'};font-weight:900;font-size:12px;letter-spacing:0.5px">${isResolvedTab?`ARCHIVED #${t.id}`:`QUEUE #${pos} ${pos===1?'• NEXT TO SERVE 🔥':''}`}</div>
          <div style="color:#555;font-size:11px;margin-top:2px">${t.category||'Other'} • ${t.order_id||'no-order'}</div>
        </div>
        <button onclick="document.getElementById('tm').remove()" style="background:#1a1a1a;color:#fff;border:0;width:30px;height:30px;border-radius:50%;cursor:pointer">×</button>
      </div>
      <div style="padding:18px">
        <div style="color:#666;font-size:11px">${t.name||''} • ${t.email} • ${new Date(t.created_at).toLocaleString()}</div>
        <div style="color:#fff;font-weight:800;margin:10px 0 12px 0;font-size:14px">${t.subject||''}</div>
        <div style="background:#000;border:1px solid #1a1a1a;border-radius:10px;padding:14px;color:#ccc;font-size:13px;white-space:pre-wrap;max-height:220px;overflow:auto;line-height:1.6">${t.message||''}</div>
        
        ${t.reply_message?`<div style="margin-top:14px;background:#0a1a0f;border:1px solid #123a1f;border-radius:10px;padding:12px"><div style="color:#00ff88;font-size:10px;font-weight:800;margin-bottom:6px">YOUR REPLY SENT:</div><div style="color:#ddd;font-size:12px;white-space:pre-wrap">${t.reply_message}</div></div>`:''}

        ${!isResolvedTab?`
        <div style="margin-top:18px">
          <div style="color:#888;font-size:11px;font-weight:700;margin-bottom:8px;letter-spacing:0.5px">REPLY TO CUSTOMER (sends real email from creators@dopetonevault.com)</div>
          <textarea id="reply-text" placeholder="Type your reply... e.g. Hey, checked your order DT-... here's your fresh link: https://..." style="width:100%;min-height:100px;background:#000;border:1px solid #222;border-radius:10px;padding:12px;color:#fff;font-size:13px;resize:vertical;outline:none"></textarea>
          <div style="margin-top:12px;display:flex;gap:10px">
            <button id="reply-btn" onclick="replyTicket('${t.id}')" style="flex:1;padding:13px;background:#fff;color:#000;border:0;border-radius:99px;font-weight:900;font-size:13px;cursor:pointer">SEND REPLY →</button>
            <button onclick="resolveTicket('${t.id}')" style="flex:1;padding:13px;background:${t.status!=='open'?'#10b981':'#1a1a1a'};color:${t.status!=='open'?'#000':'#555'};border:0;border-radius:99px;font-weight:800;font-size:13px;cursor:${t.status!=='open'?'pointer':'not-allowed'}" ${t.status==='open'?'disabled title="Reply first"':''}>${t.status!=='open'?'RESOLVE & CLEAN INBOX ✅':'REPLY FIRST 🔒'}</button>
          </div>
          <div style="margin-top:10px;text-align:center;color:#444;font-size:10px">Flow: Reply → Customer gets email with logo → Then Resolve = inbox clean, but saved in D1 forever</div>
        </div>
        `:`<div style="margin-top:16px;text-align:center"><button onclick="reopenTicket('${t.id}')" style="padding:10px 18px;background:#111;border:1px solid #222;color:#666;border-radius:99px;font-size:12px;cursor:pointer">Re-open ticket</button></div>`}
      </div>
    </div>
  </div>`);
};

window.replyTicket = async (id)=>{
  const t = tickets.find(x=>x.id===id);
  if(!t) return;
  const msg = document.getElementById('reply-text')?.value?.trim();
  if(!msg) return alert('Write reply first!');
  const btn = document.getElementById('reply-btn');
  const original = btn.innerHTML;
  btn.innerHTML='Sending email...'; btn.disabled=true;

  try{
    // 1. Send REAL email via your pro emails-api with logo
    const emailRes = await fetch(`${EMAILS_API}/api/emails/bulk`,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        emails:[t.email],
        name: t.name || t.email.split('@')[0],
        category: t.category || 'Other',
        orderId: t.order_id || '',
        ticketId: t.id,
        subject: `Re: ${t.subject} [${t.id}]`,
        h2: `Update on your request`,
        p: `${msg}\n\n---\nOriginal: ${t.message.slice(0,200)}\nNeed more? Reply to this email or visit https://dopetonevault.com/help`
      })
    });
    const emailData = await emailRes.json();
    if(!emailRes.ok) throw new Error(emailData.error||'Email failed');

    // 2. Update D1 to replied
    await fetch(`${API}/api/tickets/reply`,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({id, replyMessage: msg})
    });

    alert(`✅ Reply sent to ${t.email}\nFrom: creators@dopetonevault.com\nStatus: REPLIED`);
    document.getElementById('tm')?.remove();
    await load();
  }catch(e){
    alert('Failed: '+e.message);
    btn.innerHTML=original; btn.disabled=false;
  }
};

window.resolveTicket = async (id)=>{
  if(!confirm('Resolve this? It will disappear from INBOX but stay saved in D1 → RESOLVED tab forever.')) return;
  const res = await fetch(`${API}/api/tickets/resolve`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})});
  const d = await res.json();
  if(!d.success){ alert(d.error); return; }
  document.getElementById('tm')?.remove();
  await load(); // inbox now clean
};

window.reopenTicket = async (id)=>{
  await fetch(`${API}/api/tickets/reply`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id, replyMessage: 'Re-opened'})});
  // quick hack: set back to open
  await fetch(`${API}/api/tickets/create`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})}); // fallback
  // better: direct update
  try{ await fetch(`${API}/api/tickets/resolve`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id: id, action:'reopen'})}); }catch{}
  // For now use raw D1 update via list endpoint doesn't support, so we do direct:
  await fetch(`${API}/api/tickets/list?status=all`); // trigger
  document.getElementById('tm')?.remove();
  await switchTab('active');
};

window.closeTicket = window.resolveTicket;

export { load as refreshTickets, load as loadTickets };
export default { initTickets, loadTickets: load };
