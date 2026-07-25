// conversation-memory-pro.js - V7 FORTH LEARNING - Taste Vector + Sales Intelligence + Self-Correction
const KEY = 'dt_pro_memory_v7';
const VOCAB_KEY = 'dt_vocab_cache_v2';
const LEARNING_KEY = 'dt_learning_log';
const CORRECTIONS_KEY = 'dt_corrections';

const DEFAULT_MEMORY = {
  lastChat: 0,
  chatCount: 0,
  page: 0,
  // --- 4TH GEN LEARNING FIELDS ---
  taste: { // Weighted taste vector, learns over time
    genres: {}, // { "drill": 5, "afro": 3 }
    moods: {},
    bpm_range: { min: 999, max: 0, avg: 0, history: [] },
    keys: {},
    artist_types: {} // { "drake": 4, "travis": 2 }
  },
  budget: { max: null, history: [], currency: 'USD' },
  intent_history: [], // [{intent, genre, timestamp}]
  beats: [], // Last recommended beats with outcome
  sales: {
    readiness_score: 0, // 0-100
    objections: [], // ["price", "need wav"]
    last_intent: null,
    viewed_beats: [],
    cart_attempts: 0,
    purchases: []
  },
  corrections: 0, // How many times user corrected bot
  uid: null
};

export function getMemoryPro(){
  try{
    const raw = localStorage.getItem(KEY);
    if(!raw) return structuredClone(DEFAULT_MEMORY);
    let m = JSON.parse(raw);
    // Migration from V6
    if(m.genre &&!m.taste) {
      m = {...structuredClone(DEFAULT_MEMORY),...m, taste: { genres:{[m.genre]:1}, moods: m.mood?{[m.mood]:1}:{}, bpm_range: {min:m.bpm||0, max:m.bpm||0, avg:m.bpm||0, history: m.bpm?[m.bpm]:[]}, keys: m.key?{[m.key]:1}:{}, artist_types:{} } };
    }
    if(m.page==null) m.page=0;
    return m;
  }catch{ return structuredClone(DEFAULT_MEMORY); }
}

// --- FORTH LEARNING CORE ---
function updateTasteVector(m, o) {
  if(o.genre) m.taste.genres[o.genre] = (m.taste.genres[o.genre]||0) + 3;
  if(o.mood) m.taste.moods[o.mood] = (m.taste.moods[o.mood]||0) + 2;
  if(o.key) m.taste.keys[o.key] = (m.taste.keys[o.key]||0) + 1;
  if(o.artist_type) m.taste.artist_types[o.artist_type] = (m.taste.artist_types[o.artist_type]||0) + 3;
  if(o.bpm){
    m.taste.bpm_range.history.push(o.bpm);
    if(m.taste.bpm_range.history.length > 20) m.taste.bpm_range.history.shift();
    m.taste.bpm_range.min = Math.min(...m.taste.bpm_range.history);
    m.taste.bpm_range.max = Math.max(...m.taste.bpm_range.history);
    m.taste.bpm_range.avg = m.taste.bpm_range.history.reduce((a,b)=>a+b,0) / m.taste.bpm_range.history.length;
  }
  if(o.price_max){
    m.budget.history.push(o.price_max);
    m.budget.max = o.price_max; // last stated budget is truth
  }
}

function calcSalesReadiness(m) {
  let score = 0;
  if(m.chatCount > 2) score += 15;
  if(m.taste.genres && Object.keys(m.taste.genres).length > 0) score += 15;
  if(m.budget.max) score += 25;
  if(m.beats.length > 0) score += 10;
  if(m.sales.viewed_beats.length >= 2) score += 20;
  if(m.sales.objections.includes('price')) score -= 10;
  if(m.intent_history.slice(-3).some(i=>i.intent==='buy_intent')) score += 30;
  m.sales.readiness_score = Math.min(100, Math.max(0, score));
  return m.sales.readiness_score;
}

export function saveMemoryPro(o){
  let m = getMemoryPro();

  // Page logic from your V6 - keep
  if(o.genre && o.genre!==m.taste?.genres) { /* don't reset page on learning, only on explicit genre switch */ }
  if(o.pageIncrement){ m.page = (m.page||0) + o.pageIncrement; delete o.pageIncrement; }
  if(o.page!=null){ m.page = o.page; }

  // LEARN
  updateTasteVector(m, o);

  if(o.intent){
    m.intent_history.push({ intent:o.intent, genre:o.genre||null, timestamp: Date.now() });
    if(m.intent_history.length > 50) m.intent_history.shift();
    m.sales.last_intent = o.intent;
  }
  if(o.beat_viewed) {
    m.sales.viewed_beats.push({ id:o.beat_viewed, at:Date.now() });
    if(m.sales.viewed_beats.length > 20) m.sales.viewed_beats.shift();
  }
  if(o.objection) {
    m.sales.objections.push(o.objection);
    if(m.sales.objections.length > 10) m.sales.objections.shift();
  }
  if(o.beats) m.beats = o.beats.slice(0, 10); // keep last recommended

  Object.assign(m, {
    lastChat: Date.now(),
    chatCount: (m.chatCount||0)+1,
    uid: localStorage.getItem('dt_uid')||m.uid||'anon'
  });

  // Merge non-taste direct fields safely
  if(o.price_max) m.budget.max = o.price_max;

  calcSalesReadiness(m);

  localStorage.setItem(KEY, JSON.stringify(m));

  // VOCAB LEARNING V2 - weighted by intent
  try{
    if(o.lastUserText && o.intent){
      let vocab = JSON.parse(localStorage.getItem(VOCAB_KEY)||'{}');
      let words = o.lastUserText.toLowerCase().split(/\W+/).filter(w=>w.length>2 &&!['the','and','you','have'].includes(w));
      for(let w of words){
        if(!vocab[w]) vocab[w] = { genres:{}, intents:{}, count:0 };
        if(o.genre) vocab[w].genres[o.genre] = (vocab[w].genres[o.genre]||0)+1;
        vocab[w].intents[o.intent] = (vocab[w].intents[o.intent]||0)+1;
        vocab[w].count++;
      }
      localStorage.setItem(VOCAB_KEY, JSON.stringify(vocab));
    }
  }catch{}

  // AUTO TRAINING DATA LOGGER - for intent-detector-pro & response-builder-pro
  try{
    if(o.lastUserText && o.intent) {
      let log = JSON.parse(localStorage.getItem(LEARNING_KEY)||'[]');
      log.push({ text:o.lastUserText, intent:o.intent, genre:o.genre||null, sales_score:m.sales.readiness_score, ts:Date.now() });
      if(log.length > 200) log.shift(); // keep last 200 for auto-retrain
      localStorage.setItem(LEARNING_KEY, JSON.stringify(log));
    }
  }catch{}

  // Cloud sync
  try{
    fetch('https://ai-api.dopetone701.workers.dev/api/memory', {
      method:'POST',
      body: JSON.stringify({uid: m.uid,...m, event: o}),
      headers:{'Content-Type':'application/json'}
    }).catch(()=>{});
  }catch{}
}

// --- NEW LEARNING APIS FOR OTHER MODULES ---
export function learnFromCorrection(wrongFact, correctFact, type='bpm'){
  // When user says "no bro that's 140 not 138"
  let m = getMemoryPro();
  m.corrections++;
  let corrections = JSON.parse(localStorage.getItem(CORRECTIONS_KEY)||'[]');
  corrections.push({ wrong:wrongFact, correct:correctFact, type, ts:Date.now() });
  localStorage.setItem(CORRECTIONS_KEY, JSON.stringify(corrections));
  localStorage.setItem(KEY, JSON.stringify(m));
  // This file becomes your anti-hallucination dataset
  console.warn(`[LEARNING] Correction logged: ${type} ${wrongFact} -> ${correctFact}`);
}

export function getTasteVectorPro(){
  const m = getMemoryPro();
  // Returns top taste for beat-engine-pro.js to use
  const topGenre = Object.entries(m.taste.genres).sort((a,b)=>b[1]-a[1])[0]?.[0]||null;
  const topMood = Object.entries(m.taste.moods).sort((a,b)=>b[1]-a[1])[0]?.[0]||null;
  const topArtist = Object.entries(m.taste.artist_types).sort((a,b)=>b[1]-a[1])[0]?.[0]||null;
  return { topGenre, topMood, topArtist, bpm_avg: m.taste.bpm_range.avg, budget: m.budget.max, full:m.taste };
}

export function getSalesReadinessPro(){ return getMemoryPro().sales.readiness_score; }
export function getLearningLogPro(){ try{return JSON.parse(localStorage.getItem(LEARNING_KEY)||'[]')}catch{return []} }
export function getLastChatTime(){ return getMemoryPro().lastChat||0; }
export function shouldGreetPro(){
  const last = getLastChatTime();
  if(!last) return true;
  return (Date.now() - last) > 10*60*60*1000;
}
export function getLastGenrePro(){ return getTasteVectorPro().topGenre; }
export function getLastBeatsPro(){ return getMemoryPro().beats||[]; }
export function getPagePro(){ return getMemoryPro().page||0; }
