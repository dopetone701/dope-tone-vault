// cc-tickets.js - FINAL - ALL BTNS WORKING - CLEAN
import { MAIN_API } from './cc-config.js';

const TICKETS_API = "https://support-tickets-api.dopetone701.workers.dev";

let allTicketsRaw = [];
let activeTicketFilter = 'all';
let ticketSearchQuery = '';
let ticketsLoading = false;

export async function initTickets() {
  console.log('[Tickets] init');

  // BTN: Refresh
  document.getElementById('ticketRefreshBtn')?.addEventListener('click', () => refreshTickets());

  // BTN: Search toggle
  const searchToggle = document.getElementById('ticketSearchToggle');
  const searchInput = document.getElementById('ticketSearchInput');
  searchToggle?.addEventListener('click', () => {
    if(!searchInput) return;
    const show = searchInput.style.display === 'none' ||!searchInput.style.display;
    searchInput.style.display = show? 'block' : 'none';
    if(show) searchInput.focus();
    else { searchInput.value=''; ticketSearchQuery=''; renderTickets({success:true, tickets: allTicketsRaw}); }
  });

  // BTN: Search input
  searchInput?.addEventListener('input', (e)=>{
    ticketSearchQuery = e.target.value.toLowerCase().trim();
    renderTickets({success:true, tickets: allTicketsRaw});
  });

  // BTN: Mark all read
  document.getElementById('ticketMarkAllBtn')?.addEventListener('click', async ()=>{
    document.querySelectorAll('.ticket-row').forEach(r=>{ r.style.opacity='0.6'; r.dataset.read='1'; });
    // optional: call API to mark answered
    try{
      for(const t of allTicketsRaw){
        if(t.status==='open'){
          await fetch(`${TICKETS_API}/api/tickets/status`,{method:'POST',mode:'cors',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:t.id,status:'answered'})});
        }
      }
    }catch{}
    setTimeout(()=>refreshTickets(), 800);
  });

  // BTN: Export CSV
  document.getElementById('ticketExportBtn')?.addEventListener('click', ()=>exportTicketsCSV());

  // BTN: Filter pills - works with BOTH selectors
  const pills = document.querySelectorAll('#ticketFilterBar.filter-pill, #ticketFilterBar.filter-pill,.filter-pill');
  pills.forEach(btn=>{
    btn.addEventListener('click', ()=>{
      pills.forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      activeTicketFilter = btn.dataset.filter || 'all';
      renderTickets({success:true, tickets: allTicketsRaw});
    });
  });

  await loadTickets();
  setInterval(()=>loadTickets(true), 15000);
}

export async function loadTickets(silent=false){
  if(ticketsLoading) return;
  ticketsLoading=true;
  const listEl = document.getElementById('ticketList');
  const skeleton = document.getElementById('ticketSkeleton');
  const refreshBtn = document.getElementById('ticketRefreshBtn');
  if(refreshBtn &&!silent) refreshBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
  if(skeleton &&!silent) skeleton.style.display='block';

  try{
    const res = await fetch(`${TICKETS_API}/api/tickets/list?t=${Date.now()}`,{mode:'cors',cache:'no-store'});
    if(!res.ok) throw new Error('HTTP '+res.status);
    const data = await res.json();
    if(data.success){
      allTicketsRaw = data.tickets || [];
      renderTickets(data);
    }
  }catch(err){
    console.error(err);
    if(listEl &&!silent) listEl.innerHTML = `<div style="padding:40px;text-align:center;color:#888"><p>Failed to fetch: ${err.message}</p><button onclick="window.ccTicketsRefresh()" style="margin-top:12px;padding:8px 16px;background:#fff;color:#000;border-radius:6px;border:0">Retry</button></div>`;
  }finally{
    ticketsLoading=false;
    if(refreshBtn) refreshBtn.innerHTML = '<i class="fa-solid fa-rotate"></i>';
    if(skeleton) skeleton.style.display='none';
  }
}

function renderTickets(data){
  const listEl = document.getElementById('ticketList');
  const countEl = document.getElementById('ticketCount');
  const footerCount = document.getElementById('ticketFooterCount');
  if(!listEl) return;

  let tickets = [...(data.tickets||[])];

  // counts
  const counts = {
    all: data.tickets.length,
    open: data.tickets.filter(t=>t.status==='open').length,
    answered: data.tickets.filter(t=>t.status==='answered').length,
    Critical: data.tickets.filter(t=>['critical','high'].includes((t.priority||'').toLowerCase())).length,
    Resolved: data.tickets.filter(t=>['resolved','closed'].includes((t.status||'').toLowerCase())).length
  };
  const set = (id,v)=>{ const el=document.getElementById(id); if(el) el.textContent=v; };
  set('t_all', counts.all); set('t_open', counts.open); set('t_ans', counts.answered); set('t_crit', counts.Critical); set('t_done', counts.Resolved);
  if(countEl) countEl.textContent = `(${tickets.length})`;
  if(footerCount) footerCount.textContent = `${tickets.length} tickets`;

  if(activeTicketFilter!=='all'){
    if(activeTicketFilter==='open') tickets=tickets.filter(t=>t.status==='open');
    else if(activeTicketFilter==='answered') tickets=tickets.filter(t=>t.status==='answered');
    else if(activeTicketFilter==='Critical') tickets=tickets.filter(t=>['critical','high'].includes((t.priority||'').toLowerCase()));
    else if(activeTicketFilter==='Resolved') tickets=tickets.filter(t=>['resolved','closed'].includes((t.status||'').toLowerCase()));
  }
  if(ticketSearchQuery){
    tickets=tickets.filter(t=>(t.subject||'').toLowerCase().includes(ticketSearchQuery)||(t.email||'').toLowerCase().includes(ticketSearchQuery)||(t.message||'').toLowerCase().includes(ticketSearchQuery));
  }

  if(!tickets.length){
    listEl.innerHTML = `<div style="padding:60px 20px;text-align:center;color:#444"><div style="width:48px;height:48px;border-radius:50%;background:#111;display:flex;align-items:center;justify-content:center;margin:0 auto 12px"><i class="fa-solid fa-inbox" style="font-size:20px"></i></div><p style="color:#888;font-size:13px">No tickets in ${activeTicketFilter}</p><p style="font-size:11px;color:#333;margin-top:4px">${ticketSearchQuery?'Search: '+ticketSearchQuery:'All caught up ✓ - Ready for real tickets'}</p></div>`;
    return;
  }

  listEl.innerHTML = tickets.map(t=>{
    const initial=(t.name||t.username||t.email||'U').charAt(0).toUpperCase();
    const pColor = {Critical:'#ef4444',High:'#ef4444',Medium:'#f59e0b',Low:'#555'}[t.priority]||'#555';
    const statusMap = {open:{bg:'#ef444422',color:'#ef4444',label:'OPEN'},answered:{bg:'#3b82f622',color:'#3b82f6',label:'REPLIED'},Resolved:{bg:'#10b98122',color:'#10b981',label:'DONE'},resolved:{bg:'#10b98122',color:'#10b981',label:'DONE'},closed:{bg:'#222',color:'#666',label:'CLOSED'}};
    const s=statusMap[t.status]||statusMap.open;
    return `<div class="ticket-row" data-id="${t.id}" style="display:flex;gap:12px;padding:14px 16px;border-bottom:1px solid #111;background:#080808;transition:.15s" onmouseenter="this.style.background='#0f0f0f';this.querySelector('.ticket-actions').style.opacity='1'" onmouseleave="this.style.background='#080808';this.querySelector('.ticket-actions').style.opacity='0'">
      <div style="width:36px;height:36px;border-radius:50%;background:#1a1a1a;border:1px solid #222;display:flex;align-items:center;justify-content:center;color:#888;font-weight:700;font-size:13px;flex-shrink:0">${initial}</div>
      <div style="flex:1;min-width:0"><div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap"><span style="color:#fff;font-weight:600;font-size:13px;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(t.subject||'Support')}</span><span style="padding:2px 6px;border-radius:4px;background:${s.bg};color:${s.color};font-size:9px;font-weight:700">${s.label}</span><span style="padding:2px 5px;border-radius:4px;background:${pColor}22;color:${pColor};font-size:9px">${(t.priority||'Medium').toUpperCase()}</span><span style="margin-left:auto;font-size:10px;color:#444">${timeAgo(t.created_at)}</span></div><div style="font-size:11px;color:#666;margin:3px 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(t.name||t.username||'')} • ${esc(t.email||'')}</div><div style="font-size:12px;color:#999;line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${esc((t.message||'').slice(0,120))}</div></div>
      <div class="ticket-actions" style="display:flex;flex-direction:column;gap:6px;opacity:0;transition:.15s"><button onclick="event.stopPropagation(); window.ccCloseTicket('${t.id}')" title="Close" style="width:28px;height:28px;border-radius:50%;background:#111;border:1px solid #222;color:#10b981;cursor:pointer"><i class="fa-solid fa-check" style="font-size:11px"></i></button><button onclick="event.stopPropagation(); window.ccOpenTicket('${t.id}')" title="View" style="width:28px;height:28px;border-radius:50%;background:#111;border:1px solid #222;color:#888;cursor:pointer"><i class="fa-solid fa-eye" style="font-size:11px"></i></button><button onclick="event.stopPropagation(); window.ccDeleteTicket('${t.id}')" title="Delete" style="width:28px;height:28px;border-radius:50%;background:#111;border:1px solid #222;color:#ef4444;cursor:pointer"><i class="fa-solid fa-trash" style="font-size:10px"></i></button></div></div>`;
  }).join('');
}

window.ccCloseTicket = async function(id){
  if(!confirm('Close '+id+'?')) return;
  const row=document.querySelector(`.ticket-row[data-id="${id}"]`);
  if(row) row.style.opacity='0.3';
  try{
    const res=await fetch(`${TICKETS_API}/api/tickets/close`,{method:'POST',mode:'cors',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,status:'closed'})});
    const d=await res.json(); if(!d.success) throw new Error(d.error);
    allTicketsRaw=allTicketsRaw.filter(t=>t.id!==id);
    renderTickets({success:true,tickets:allTicketsRaw});
  }catch(e){ alert('Close failed: '+e.message); if(row) row.style.opacity='1'; }
};

window.ccDeleteTicket = async function(id){
  if(!confirm('DELETE permanently '+id+'?')) return;
  try{
    await fetch(`${TICKETS_API}/api/tickets/delete`,{method:'POST',mode:'cors',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})});
    allTicketsRaw=allTicketsRaw.filter(t=>t.id!==id);
    renderTickets({success:true,tickets:allTicketsRaw});
  }catch(e){
    // fallback if no delete endpoint - use close
    window.ccCloseTicket(id);
  }
};

window.ccOpenTicket = function(id){
  const t=allTicketsRaw.find(x=>x.id===id);
  if(!t) return;
  const modal = document.getElementById('ticketModal') || document.createElement('div');
  if(!document.getElementById('ticketModal')){
    modal.id='ticketModal'; modal.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
    modal.innerHTML=`<div style="background:#0f0f0f;border:1px solid #222;border-radius:12px;max-width:600px;width:100%;max-height:80vh;overflow:auto"><div style="padding:16px;border-bottom:1px solid #222;display:flex;justify-content:space-between"><b style="color:#fff">Ticket</b><button onclick="this.closest('#ticketModal').remove()" style="background:#222;border:0;color:#fff;width:28px;height:28px;border-radius:50%">×</button></div><div id="ticketModalBody" style="padding:16px;color:#ccc;font-size:13px;line-height:1.6"></div></div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', (e)=>{ if(e.target===modal) modal.remove(); });
  }
  document.getElementById('ticketModalBody').innerHTML = `<p><b>ID:</b> ${t.id}</p><p><b>From:</b> ${esc(t.name||t.username||'')} &lt;${esc(t.email)}&gt;</p><p><b>Subject:</b> ${esc(t.subject)}</p><p><b>Priority:</b> ${esc(t.priority)} | <b>Status:</b> ${esc(t.status)}</p><p><b>Date:</b> ${t.created_at}</p><hr style="border:0;border-top:1px solid #222;margin:12px 0"><p style="white-space:pre-wrap">${esc(t.message)}</p><div style="margin-top:16px;display:flex;gap:8px"><button onclick="window.ccCloseTicket('${t.id}');document.getElementById('ticketModal')?.remove()" style="padding:8px 12px;background:#10b981;color:#000;border:0;border-radius:6px;font-weight:600">Mark Done</button><button onclick="window.ccDeleteTicket('${t.id}');document.getElementById('ticketModal')?.remove()" style="padding:8px 12px;background:#ef4444;color:#fff;border:0;border-radius:6px">Delete</button></div>`;
};

export async function refreshTickets(){ await loadTickets(false); }
function exportTicketsCSV(){ if(!allTicketsRaw.length) return alert('No tickets'); const rows=[['id','email','subject','status','priority','created_at'],...allTicketsRaw.map(t=>[t.id,t.email,`"${(t.subject||'').replace(/"/g,'""')}"`,t.status,t.priority,t.created_at])]; const csv=rows.map(r=>r.join(',')).join('\n'); const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'})); a.download=`tickets_${new Date().toISOString().slice(0,10)}.csv`; a.click(); }
function esc(s){ return (s||'').toString().replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function timeAgo(d){ if(!d) return ''; const sec=Math.floor((Date.now()-new Date(d).getTime())/1000); if(sec<60) return 'now'; if(sec<3600) return Math.floor(sec/60)+'m'; if(sec<86400) return Math.floor(sec/3600)+'h'; return Math.floor(sec/86400)+'d'; }
window.ccTicketsRefresh=refreshTickets;
window.ccDeleteTicket=window.ccDeleteTicket;
export default { initTickets, loadTickets, refreshTickets };
