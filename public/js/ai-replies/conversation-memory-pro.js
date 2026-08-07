// conversation-memory-pro.js - V6 SUPER - 10-Turn Window + Never Falls Off + Cross-Device Sync
const KEY = 'dt_super_memory_v6';
const HISTORY_KEY = 'dt_chat_history_v6';
const VOCAB_KEY = 'dt_vocab_cache_v6_super'; // isolated

const DEFAULT_MEMORY = {
  version: 'v6-super',
  lastChat: 0,
  chatCount: 0,
  page: 0,
  taste: {
    genres: {}, // { drill: 5.2 } weighted with decay
    moods: {},
    bpm_range: { min: 999, max: 0, avg: 0, history: [] },
    keys: {},
    artist_types: {},
    emotional_context: {}
  },
  context_window: [], // Last 10 real turns: [{role, text, intent, genre, ts}]
  budget: { max: null, history: [] },
  intent_history: [], // last 50
  beats: [], // last viewed
  sales: {
    readiness_score: 0,
    objections: [],
    last_intent: null,
    viewed_beats: [],
    cart_attempts: 0
  },
  corrections: 0,
  uid: null
};

function loadMemory() {
  try {
    let raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULT_MEMORY);
    let m = JSON.parse(raw);
    // Migrate v7 -> v6 super
    if (m.taste && !m.context_window) m.context_window = [];
    if (m.page == null) m.page = 0;
    return m;
  } catch { return structuredClone(DEFAULT_MEMORY); }
}

function decayTaste(genres) {
  // Decay old tastes by 10% per day - keeps recent taste strong
  let now = Date.now();
  let last = parseInt(localStorage.getItem('dt_taste_last_decay')||'0');
  if (now - last > 24*60*60*1000) {
    for (let k in genres) genres[k] = genres[k] * 0.9;
    localStorage.setItem('dt_taste_last_decay', now.toString());
  }
  return genres;
}

function updateTaste(m, o) {
  m.taste.genres = decayTaste(m.taste.genres);
  if (o.genre) m.taste.genres[o.genre] = (m.taste.genres[o.genre]||0) + 3;
  if (o.mood) m.taste.moods[o.mood] = (m.taste.moods[o.mood]||0) + 2;
  if (o.key) m.taste.keys[o.key] = (m.taste.keys[o.key]||0) + 1;
  if (o.artist_type) m.taste.artist_types[o.artist_type] = (m.taste.artist_types[o.artist_type]||0) + 3;
  if (o.emotional_context) m.taste.emotional_context[o.emotional_context] = (m.taste.emotional_context[o.emotional_context]||0) + 2;
  if (o.bpm) {
    m.taste.bpm_range.history.push(o.bpm);
    if (m.taste.bpm_range.history.length > 20) m.taste.bpm_range.history.shift();
    m.taste.bpm_range.min = Math.min(...m.taste.bpm_range.history);
    m.taste.bpm_range.max = Math.max(...m.taste.bpm_range.history);
    m.taste.bpm_range.avg = Math.round(m.taste.bpm_range.history.reduce((a,b)=>a+b,0)/m.taste.bpm_range.history.length);
  }
  if (o.price_max) {
    m.budget.history.push(o.price_max);
    if (m.budget.history.length > 10) m.budget.history.shift();
    m.budget.max = o.price_max;
  }
}

function calcSales(m) {
  let score = 0;
  if (m.chatCount > 2) score += 15;
  if (Object.keys(m.taste.genres).length > 0) score += 15;
  if (m.budget.max) score += 25;
  if (m.beats.length > 0) score += 10;
  if (m.sales.viewed_beats.length >= 2) score += 20;
  if (m.intent_history.slice(-3).some(i=>i.intent==='buy_intent')) score += 30;
  if (m.sales.objections.includes('price')) score -= 10;
  m.sales.readiness_score = Math.min(100, Math.max(0, score));
  return m.sales.readiness_score;
}

export function getMemoryPro() {
  return loadMemory();
}

export function saveMemoryPro(o) {
  let m = loadMemory();

  if (o.pageIncrement != null) { m.page = (m.page||0) + o.pageIncrement; delete o.pageIncrement; }
  if (o.page != null) m.page = o.page;

  // Update taste
  updateTaste(m, o);

  // Context window - NEVER FALLS OFF, keeps 10 turns
  if (o.lastUserText || o.assistantText) {
    let entry = {
      role: o.lastUserText ? 'user' : 'assistant',
      text: o.lastUserText || o.assistantText,
      intent: o.intent || null,
      genre: o.genre || null,
      ts: Date.now()
    };
    m.context_window.push(entry);
    if (m.context_window.length > 10) m.context_window.shift();
    
    // Also save to history key for LLM prompt
    try {
      let hist = JSON.parse(localStorage.getItem(HISTORY_KEY)||'[]');
      hist.push(entry);
      if (hist.length > 10) hist.shift();
      localStorage.setItem(HISTORY_KEY, JSON.stringify(hist));
    } catch {}
  }

  if (o.intent) {
    m.intent_history.push({ intent: o.intent, genre: o.genre||null, ts: Date.now() });
    if (m.intent_history.length > 50) m.intent_history.shift();
    m.sales.last_intent = o.intent;
  }
  if (o.beat_viewed) {
    m.sales.viewed_beats.push({ id: o.beat_viewed, at: Date.now() });
    if (m.sales.viewed_beats.length > 20) m.sales.viewed_beats.shift();
  }
  if (o.objection) {
    m.sales.objections.push(o.objection);
    if (m.sales.objections.length > 10) m.sales.objections.shift();
  }
  if (o.beats) m.beats = o.beats.slice(0, 10);

  m.lastChat = Date.now();
  m.chatCount = (m.chatCount||0)+1;
  m.uid = localStorage.getItem('dt_uid')||m.uid||'anon';

  calcSales(m);
  localStorage.setItem(KEY, JSON.stringify(m));

  // Sync to D1 + Vectorize (waitUntil)
  try {
    fetch('https://ai-api.dopetone701.workers.dev/api/memory', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ uid: m.uid, ...m, event: o, v6: true })
    }).catch(()=>{});
  } catch {}
}

export function getTasteVectorPro() {
  const m = loadMemory();
  const topGenre = Object.entries(m.taste.genres).sort((a,b)=>b[1]-a[1])[0]?.[0]||null;
  const topMood = Object.entries(m.taste.moods).sort((a,b)=>b[1]-a[1])[0]?.[0]||null;
  const topArtist = Object.entries(m.taste.artist_types).sort((a,b)=>b[1]-a[1])[0]?.[0]||null;
  const topEmotion = Object.entries(m.taste.emotional_context).sort((a,b)=>b[1]-a[1])[0]?.[0]||null;
  return { topGenre, topMood, topArtist, topEmotion, bpm_avg: m.taste.bpm_range.avg, budget: m.budget.max, full: m.taste, context_window: m.context_window };
}

export function learnFromCorrection(wrongFact, correctFact, type='bpm') {
  let m = loadMemory();
  m.corrections++;
  localStorage.setItem(KEY, JSON.stringify(m));
  console.warn(`[V6 SUPER LEARNING] Correction ${type}: ${wrongFact} -> ${correctFact}`);
  // Send to D1 for retraining
  try {
    fetch('https://ai-api.dopetone701.workers.dev/api/correction', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ user_text: wrongFact, genre: correctFact, intent: 'correction', by: 'user-correction-v6', type })
    }).catch(()=>{});
  } catch {}
}

export function getSalesReadinessPro(){ return loadMemory().sales.readiness_score; }
export function getLastChatTime(){ return loadMemory().lastChat||0; }
export function shouldGreetPro(){
  const last = getLastChatTime();
  if (!last) return true;
  return (Date.now() - last) > 10*60*60*1000;
}
export function getLastGenrePro(){ return getTasteVectorPro().topGenre; }
export function getLastBeatsPro(){ return loadMemory().beats||[]; }
export function getPagePro(){ return loadMemory().page||0; }
