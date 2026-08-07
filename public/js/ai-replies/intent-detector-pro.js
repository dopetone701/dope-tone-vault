// intent-detector-pro.js - V6 SUPER INTELLIGENCE - Real English + LLM + Admin Semantic
import { getTrainingDataSuper, GENRE_CLUSTERS, MOOD_CLUSTERS } from './training-data.js';
import { getMemoryPro, getTasteVectorPro } from './conversation-memory-pro.js';

const AI_API = "https://ai-api.dopetone701.workers.dev";
let TRAINING_CACHE = null;
let TRAINING_CACHE_TIME = 0;

async function getSuperTraining() {
  if (TRAINING_CACHE && Date.now() - TRAINING_CACHE_TIME < 5*60*1000) return TRAINING_CACHE;
  TRAINING_CACHE = await getTrainingDataSuper();
  TRAINING_CACHE_TIME = Date.now();
  return TRAINING_CACHE;
}

function normalize(s){ return (s||'').toLowerCase().trim(); }

function extractEntitiesSuper(text) {
  let t = normalize(text);
  let e = { genre:null, mood:null, bpm:null, bpm_range:null, key:null, price_max:null, q:null, artist_type:null, emotional_context:null };

  // GENRE via clusters - semantic, not exact
  for (let [genre, aliases] of Object.entries(GENRE_CLUSTERS)) {
    if (aliases.some(a => t.includes(a))) { e.genre = genre; break; }
  }
  // MOOD via clusters
  for (let [mood, aliases] of Object.entries(MOOD_CLUSTERS)) {
    if (aliases.some(a => t.includes(a))) { e.mood = mood; break; }
  }

  // BPM smart
  let bpmM = t.match(/(\d{2,3})\s*bpm/) || t.match(/(\d{2,3})\s*-\s*(\d{2,3})/);
  if (bpmM) {
    e.bpm = parseInt(bpmM[1]);
    if (bpmM[2]) e.bpm_range = {min: parseInt(bpmM[1]), max: parseInt(bpmM[2])};
  }
  let fuzzy = t.match(/(?:around|about|~|faster than|slower than)\s*(\d{2,3})/);
  if (fuzzy && !e.bpm) e.bpm = parseInt(fuzzy[1]);

  // KEY
  let keyM = t.match(/\b([a-g][#b]?\s*m?)\b/i);
  if (keyM && /^[a-g]/i.test(keyM[1])) e.key = keyM[1].toUpperCase();

  // PRICE
  let priceM = t.match(/(?:under|below|budget|max)\s*\$?(\d+)/) || t.match(/\$(\d+)/);
  if (priceM) e.price_max = parseInt(priceM[1]);

  // Artist
  const artists = ["drake","travis","future","gunna","21 savage","roddy ricch","pop smoke","yeat","carti","uzi","juice wrld","brent","summer","russ"];
  for (let a of artists) if (t.includes(a)) { e.artist_type = a; break; }

  // Emotional context - NEW
  if (/breakup|heartbreak|ex|painful|depress/.test(t)) e.emotional_context = "breakup";
  if (/love|romantic|girlfriend|crush/.test(t)) e.emotional_context = "love";
  if (/gym|workout|hype|energy/.test(t)) e.emotional_context = "hype";

  // Q
  let qs = ["guitar","flute","piano","choir","bell","vocal","808","keys","pad","bass","recent","hard","dark"];
  let found = qs.filter(k=> t.includes(k));
  if (found.length) e.q = found.join(' ');

  return e;
}

async function callSuperLLM(userText, memory, taste) {
  const context = {
    lastGenre: taste.topGenre || memory.taste?.genres ? Object.keys(memory.taste.genres)[0] : null,
    lastMood: taste.topMood || null,
    chatHistory: (memory.intent_history||[]).slice(-5).map(h=> `${h.intent}:${h.genre}`).join(', '),
    bpmAvg: taste.bpm_avg || memory.taste?.bpm_range?.avg || null
  };

  const prompt = `You are DopeTone Super AI. Understand REAL human English.

Context: last genre=${context.lastGenre}, mood=${context.lastMood}, bpm avg=${context.bpmAvg}, history=${context.chatHistory}
User said: "${userText}"

Interpret correctly:
- "something faster" -> use last genre, bpm = avg+15
- "like last one but sadder" -> same genre, mood=sad
- "yo slime" -> if admin taught slime=drill, return drill
- "I need something dark for my breakup, 90 bpm" -> genre=trap/r&b, mood=dark/sad, bpm=90, emotional=breakup
- "yes" alone -> intent=acknowledge, NOT need_beat, genre=null
- "nvm" "ok" -> intent=acknowledge
- "what you have?" -> what_we_have
- "show recent" -> recent
- "this is expensive" -> objection_price

Return ONLY valid JSON: {"intent":"need_beat|what_we_have|recent|buy_intent|pricing|licence|custom|greet|acknowledge|objection_price|unclear","genre":null or genre string,"mood":null or mood,"bpm":null or number,"confidence":0.0-1.0,"needs_clarification":bool}

Confidence: 1.0 if explicit genre, 0.8 if slang but clear, <0.6 if vague.`;

  try {
    let res = await fetch(`${AI_API}/api/super-intent`, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ userText, context, prompt, uid: localStorage.getItem('dt_uid') })
    });
    if (res.ok) {
      let data = await res.json();
      if (data && data.intent) return data;
    }
  } catch {}

  // Fallback: Try admin semantic search
  try {
    let res = await fetch(`${AI_API}/api/semantic-correction?q=${encodeURIComponent(userText)}&t=${Date.now()}`);
    if (res.ok) {
      let data = await res.json();
      if (data.found && data.correction) {
        return {
          intent: data.correction.correct_intent || 'need_beat',
          genre: data.correction.correct_genre,
          mood: data.correction.correct_mood || null,
          bpm: null,
          confidence: 0.95,
          needs_clarification: false,
          source: 'admin-semantic-1000x'
        };
      }
    }
  } catch {}

  return null;
}

export async function detectIntentPro(text) {
  const t = normalize(text);
  const rawEntities = extractEntitiesSuper(text);
  const memory = getMemoryPro();
  const taste = getTasteVectorPro();

  // Fast path for super short acknowledgments - ANTI POLLUTION
  if (t.length <= 4 && /^(yes|yeah|ok|okay|bet|yep|yo|hi|hey|sup|nvm|nah)$/.test(t)) {
    return { intent: 'acknowledge', confidence: 99, entities: { genre: null, q: null }, raw: text, t, source: 'anti-pollution-short' };
  }

  // Call SUPER LLM first
  let superParsed = await callSuperLLM(text, memory, taste);
  if (superParsed && superParsed.confidence >= 0.65) {
    // Merge entities - LLM wins
    let entities = { ...rawEntities };
    if (superParsed.genre) entities.genre = superParsed.genre;
    if (superParsed.mood) entities.mood = superParsed.mood;
    if (superParsed.bpm) entities.bpm = superParsed.bpm;
    entities.emotional_context = superParsed.emotional_context || rawEntities.emotional_context;

    // Handle "faster/slower"
    if (/faster/.test(t) && taste.bpm_avg) entities.bpm = Math.round(taste.bpm_avg + 15);
    if (/slower/.test(t) && taste.bpm_avg) entities.bpm = Math.round(taste.bpm_avg - 15);

    return {
      intent: superParsed.intent,
      confidence: superParsed.confidence * 100,
      entities,
      raw: text,
      t,
      source: 'v6-super-llm',
      needs_clarification: superParsed.needs_clarification || false
    };
  }

  // If LLM low confidence or failed - use super training data with weighting
  let training = await getSuperTraining();
  let best = null;
  let bestScore = 0;
  let words = t.split(/\W+/).filter(w=> w.length>2);

  for (let item of training) {
    let score = 0;
    if (t === item.text) score += 100 * (item.weight/10);
    if (t.includes(item.text)) score += 50 * (item.weight/10);
    let overlap = words.filter(w=> item.text.includes(w)).length;
    score += overlap * 10 * (item.weight/10);
    
    if (score > bestScore) {
      bestScore = score;
      best = item;
    }
  }

  if (best && bestScore > 20) {
    let entities = { ...rawEntities, ...best.entities, genre: rawEntities.genre || best.entities.genre };
    return {
      intent: best.intent,
      confidence: Math.min(95, bestScore),
      entities,
      raw: text,
      t,
      source: `v6-super-training-${best.source}`,
      bestMatch: best
    };
  }

  // Final fallback - if has genre, it's need_beat, else unclear (DON'T guess)
  if (rawEntities.genre || rawEntities.artist_type || /need.*beat|want.*beat|show.*beat|give me/.test(t)) {
    return { intent: 'need_beat', confidence: 70, entities: rawEntities, raw: text, t, source: 'v6-fallback-genre' };
  }
  if (/recent|latest|newest|new drop/.test(t)) {
    return { intent: 'recent', confidence: 90, entities: rawEntities, raw: text, t, source: 'v6-fallback-recent' };
  }
  if (/how much|price|cost/.test(t)) return { intent: 'pricing', confidence: 85, entities: rawEntities, raw: text, t, source: 'v6-fallback-pricing' };
  if (/licen|rights|terms/.test(t)) return { intent: 'licence', confidence: 85, entities: rawEntities, raw: text, t, source: 'v6-fallback-licence' };

  return { intent: 'unclear', confidence: 40, entities: rawEntities, raw: text, t, source: 'v6-unclear-ask' };
}

if (typeof window !== 'undefined') { window.DopeIntentPro = { detectIntentPro }; }
