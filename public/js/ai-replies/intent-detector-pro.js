// intent-detector-pro.js - V7 FORTH LEARNING - Self-Training + Taste Aware + Correction Detection
import { TRAINING_DATA } from './training-data.js';
import { getMemoryPro, getTasteVectorPro, learnFromCorrection } from './conversation-memory-pro.js';

function normalize(s){ return (s||'').toLowerCase().trim(); }

// --- V7 ENTITY EXTRACTION - PRO LEVEL ---
function extractEntitiesV7(text){
  let t = normalize(text);
  let e = { genre:null, mood:null, bpm:null, bpm_range:null, key:null, price_max:null, q:null, artist_type:null, objection:null };

  // 1. GENRES - expanded for your store
  const genres = [
    {k:["future bass","fb"], v:"future bass"}, {k:["afrobeat","afro beat","afro"], v:"afrobeat"},
    {k:["amapiano","piano"], v:"amapiano"}, {k:["dancehall","dance hall"], v:"dancehall"},
    {k:["dubstep"], v:"dubstep"}, {k:["edm","house"], v:"edm"},
    {k:["r&b","rnb","r and b"], v:"r&b"}, {k:["pop"], v:"pop"},
    {k:["trap","trapp"], v:"trap"}, {k:["drill","dril"], v:"drill"},
    {k:["plug","pluggnb","plugnb"], v:"plug"}, {k:["rage","yeat type"], v:"rage"},
    {k:["detroit","flint"], v:"detroit"}, {k:["lofi","lo-fi"], v:"lofi"},
    {k:["boom bap","90s"], v:"boom bap"}
  ];
  for(let g of genres){ if(g.k.some(k=> t.includes(k))){ e.genre=g.v; break; } }

  // 2. ARTIST TYPE - "Drake x Travis" language
  const artists = ["drake","travis","future","baby keem","gunna","lil baby","21 savage","roddy ricch","pop smoke","yeat","playboi carti","lil uzi","juice wrld","emotional","russ","brent"];
  for(let a of artists){ if(t.includes(a)){ e.artist_type=a; break; } }

  // 3. MOOD
  const moods = ["sad","happy","motivational","energetic","dark","melodic","chill","hype","pain","emotional","hard","soft","aggressive","smooth","romantic","vibe","angry","uplifting"];
  for(let m of moods){ if(t.includes(m)){ e.mood=m; break; } }

  // 4. BPM - smart range
  let bpmM = t.match(/(\d{2,3})\s*bpm/) || t.match(/(\d{2,3})\s*-\s*(\d{2,3})/);
  if(bpmM){
    e.bpm = parseInt(bpmM[1]);
    if(bpmM[2]) e.bpm_range = {min: parseInt(bpmM[1]), max: parseInt(bpmM[2])};
  }
  // "140ish" "around 150"
  let bpmFuzzy = t.match(/(?:around|about|~)\s*(\d{2,3})/);
  if(bpmFuzzy &&!e.bpm) { e.bpm = parseInt(bpmFuzzy[1]); e.bpm_range = {min: e.bpm-5, max: e.bpm+5}; }

  // 5. KEY
  let keyM = t.match(/\b([a-g][#b]?\s*m?)\b/i);
  if(keyM && ['a','b','c','d','e','f','g'].includes(keyM[1][0].toLowerCase())) e.key = keyM[1].toUpperCase();

  // 6. BUDGET / PRICE
  let priceM = t.match(/(?:under|below|budget|max)\s*\$?(\d+)/) || t.match(/\$(\d+)/);
  if(priceM) e.price_max = parseInt(priceM[1]);
  if(t.includes('cheap') &&!e.price_max) e.price_max = 30;
  if(t.includes('free') && t.includes('beat')) e.objection = 'free_request';

  // 7. OBJECTION DETECTION - for sales learning
  if(/expensive|too much|pricey|broke/.test(t)) e.objection='price';
  if(/not.*what i want|not.*this|different/.test(t)) e.objection='wrong_vibe';
  if(/need.*wav|need.*trackout|need.*stems/.test(t)) e.objection='needs_stems';

  // 8. QUERY TAGS
  let qs = ["guitar","flute","piano","choir","bell","vocal","808","keys","pad","bass","recent","latest","newest","new","hard","dark"];
  let found = qs.filter(k=> t.includes(k));
  if(found.length) e.q = found.join(' ');

  return e;
}

function scoreIntentV7(text, trainingItem, memory){
  let t = normalize(text);
  let pat = normalize(trainingItem.text);
  let score = 0;

  if(t === pat) score += 100;
  if(t.includes(pat)) score += 50;

  let tWords = t.split(/\W+/).filter(w=>w.length>2);
  let pWords = pat.split(/\W+/).filter(w=>w.length>2);
  let overlap = tWords.filter(w=> pWords.includes(w)).length;
  score += overlap * 15;

  // BOOST FROM LEARNING LOG - if this intent was successful before
  try{
    const log = JSON.parse(localStorage.getItem('dt_learning_log')||'[]');
    const similar = log.filter(l=> l.text && t.includes(l.text.split(' ')[0]) && l.intent===trainingItem.intent);
    if(similar.length) score += similar.length * 5;
  }catch{}

  // BOOST FROM TASTE VECTOR - if genre matches taste
  if(memory && trainingItem.entities?.genre && memory.taste?.genres[trainingItem.entities.genre]) {
    score += memory.taste.genres[trainingItem.entities.genre] * 3;
  }

  return score;
}

export function detectIntentPro(text){
  const t = normalize(text);
  const rawEntities = extractEntitiesV7(text);
  const memory = getMemoryPro();
  const taste = getTasteVectorPro();

  // === 0. CORRECTION DETECTION - FORTH LEARNING ===
  // "no bro its 142 not 140" "wrong key" "that's not drill"
  const correctionM = t.match(/(?:no|wrong|not|actually).*?(\d{2,3}).*?(?:not|but).*?(\d{2,3})/) || t.match(/its (\d{2,3}) not (\d{2,3})/);
  if(correctionM || /no.*wrong|that's not|not.*drill|not.*trap/i.test(t)){
    if(correctionM){
      learnFromCorrection(correctionM[2], correctionM[1], 'bpm');
    }
    return { intent:'correction', confidence:99, entities: rawEntities, raw:text, t, source:'correction-detector', learning:true };
  }

  // === 1. BUY INTENT - with memory ===
  if(/(?:buy|purchase|checkout|need this|want this|lock it|cop this|send.*link|how.*pay|pay.*now)/i.test(text) || (t.split(' ').length <= 3 && /(?:yes|yeah|bet|let's go|do it)/i.test(t))){
    let entities = {...rawEntities};
    if(!entities.genre && taste.topGenre) entities.genre = taste.topGenre;
    return { intent:'buy_intent', confidence:98, entities, raw:text, t, source:'buy-rule-v7' };
  }

  // === 2. RECENT / LATEST ===
  if(/recent|latest|newest|new drop|just dropped|fresh|today|what's new/.test(t)){
    return { intent:'recent', confidence:100, entities: {...rawEntities, q:'recent'}, raw:text, t, source:'recent-rule' };
  }

  // === 3. PAGINATION ===
  if(/next\s*3|more|show\s*more|next\s*page|^next$|another\s*3/i.test(t)){
    return { intent:'next_page', confidence:100, entities: {...rawEntities, genre: rawEntities.genre || taste.topGenre || memory.taste?.genres? Object.keys(memory.taste.genres)[0] : null}, raw:text, t, source:'pagination-v7' };
  }

  // === 4. VOCAB CACHE V2 - WITH INTENT + GENRE WEIGHTS ===
  try{
    let localVocab = JSON.parse(localStorage.getItem('dt_vocab_cache_v2')||'{}');
    let words = t.split(/\W+/);
    for(let w of words){
      if(localVocab[w]?.genres){
        let topG = Object.entries(localVocab[w].genres).sort((a,b)=>b[1]-a[1])[0];
        if(topG && topG[1] >= 2){
          rawEntities.genre = rawEntities.genre || topG[0];
          return { intent:'need_beat', confidence: 75 + topG[1]*5, entities: rawEntities, raw:text, t, source:'vocab-v2-genre', vocabWord:w };
        }
      }
    }
  }catch{}

  // === 5. CLASSIC TRAINING DATA SCORING V7 ===
  let best = { intent:'unknown', score:0, match:null };
  let scores = {};
  for(let item of TRAINING_DATA){
    let s = scoreIntentV7(text, item, memory);
    scores[item.intent] = (scores[item.intent]||0) + s;
    if(s > best.score){ best = { intent:item.intent, score:s, match:item }; }
  }
  let sorted = Object.entries(scores).sort((a,b)=>b[1]-a[1]);
  let finalIntent = sorted[0]?.[0] || 'unknown';
  let confidence = sorted[0]?.[1] || 0;

  // === 6. GRAMMAR RULES V7 - SALES FOCUSED ===
  if(/how are you|how you doing|sup bro|whats up|yo/.test(t)) finalIntent='how_are_you';
  if(/custom|make me a beat|cook me|make.*for me|can you make/.test(t)) finalIntent='custom';
  if(/licen|terms|rights|basic.*licen|pro.*licen|exclusive|spotify|youtube|streams|how many streams/.test(t)) finalIntent='licence';
  if(/how much|price|cost|how much.*beat|what.*cost/.test(t)) finalIntent='pricing';
  if(/download|link.*expir|can't.*download|didn't.*get.*beat/.test(t)) finalIntent='technical_download';
  if(/can't.*play|no.*sound|player.*not/.test(t)) finalIntent='technical_play';
  if(/checkout|payment|card.*declin|paypal/.test(t)) finalIntent='technical_checkout';
  if(rawEntities.genre || rawEntities.artist_type || /need.*beat|want.*beat|show.*beat|what.*have|give me.*beat|need sumn|need something|got.*beat|cook.*up/.test(t)) finalIntent='need_beat';
  if(/what.*have|what.*got|show.*catalog|inventory|all.*beats/.test(t)) finalIntent='what_we_have';
  if(rawEntities.objection) finalIntent = 'objection_' + rawEntities.objection;

  // === 7. FALLBACK LEARNING ===
  if(finalIntent==='unknown' && t.length>3){
    finalIntent='need_beat';
    if(!rawEntities.genre &&!rawEntities.q) {
      rawEntities.q = t.split(/\W+/).filter(w=>w.length>2).slice(0,4).join(' ');
      // Use taste as fallback
      if(taste.topGenre) rawEntities.genre = taste.topGenre;
    }
  }

  return {
    intent:finalIntent,
    confidence: Math.min(100, confidence),
    entities: rawEntities,
    raw:text,
    t,
    bestMatch:best.match,
    scores: sorted.slice(0,3),
    source:'v7-forth-learning',
    taste: taste,
    sales_score: memory.sales?.readiness_score || 0
  };
}

if(typeof window!=='undefined'){ window.DopeIntentPro = { detectIntentPro }; }
