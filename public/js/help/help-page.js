import { initFAQ } from './faq.js';
import { initLicense } from './license-help.js';
import { initTickets } from './tickets.js';

function safeInit(fn, name){
  try{ fn && fn(); console.log(`[help] ${name} ok`); }
  catch(e){ console.warn(`[help] ${name} failed`, e); }
}

document.addEventListener('DOMContentLoaded', ()=>{
  safeInit(initFAQ,'faq');
  safeInit(initLicense,'license');
  safeInit(initTickets,'tickets');

  document.querySelectorAll('[data-scroll]').forEach(card=>{
    card.addEventListener('click',()=>{
      const id=card.getAttribute('data-scroll');
      document.getElementById(id)?.scrollIntoView({behavior:'smooth'});
    });
  });
});
