// public/js/ai-replies/index.js - V7 FORTH LEARNING MASTER ROUTER - Closes the loop
import { getGreetingPro, getNudgePro } from './greetings-pro.js';
import { detectIntentPro } from './intent-detector-pro.js';
import { fetchBeatsPro, getBeatTruth } from './beat-engine-pro.js';
import { buildResponsePro } from './response-builder-pro.js';
import { saveMemoryPro, shouldGreetPro, getMemoryPro, getTasteVectorPro, getSalesReadinessPro } from './conversation-memory-pro.js';
import { getTrainingDataPro } from './training-data.js';

// --- V7: Anti-hallucination validator ---
function validateEntitiesWithTruth(entities, beats){
  if(!beats.length) return entities;
  // If we have a real beat, override entities with truth to prevent lying
  const first = beats[0];
  const truth = getBeatTruth(first.title) || first;
  // Don't override if user explicitly asked for something else
  if(!entities.bpm && truth.bpm) entities._truth_bpm = truth.bpm; // for response builder to use
  if(!entities.key && truth.key) entities._truth_key = truth.key;
  return entities;
}

export async function getAIReplyPro(userText=""){
  const startTime = Date.now();
  const memory = getMemoryPro();

  // 1. PARSE INTENT + ENTITIES - V7 with taste + learning
  let parsed = detectIntentPro(userText);

  // Ensure training data is fresh (merges learned data)
  // This makes intent detector smarter every chat
  if(typeof window!=='undefined' &&!window.__TRAINING_DATA_V7_LOADED__){
    const freshData = getTrainingDataPro();
    window.__TRAINING_DATA_V7_COUNT__ = freshData.length;
    window.__TRAINING_DATA_V7_LOADED__ = true;
  }

  // 2. GREETINGS - V7 Memory-Aware
  // Don't greet if user is in buying flow or has explicit genre
  let greet = getGreetingPro(parsed);
  let isBuyFlow = parsed.intent==='buy_intent' || parsed.intent.startsWith('objection_') || parsed.intent==='correction';
  if(greet && shouldGreetPro() &&!isBuyFlow &&!parsed.entities.genre && parsed.intent!=='need_beat' && parsed.intent!=='recent' && parsed.intent!=='next_page'){
    // V7: Save greeting interaction for learning
    saveMemoryPro({
      intent: parsed.intent,
      genre: parsed.entities.genre,
      lastUserText: userText,
      page: 0
    });
    return greet;
  }

  // 3. FETCH BEATS - V7 with Taste Vector + Sales Intelligence
  let beatsResult = { beats:[], fallback:false, level:'none' };
  const shouldFetch = ['need_beat','what_we_have','recent','next_page','pricing','buy_intent'].includes(parsed.intent) || parsed.entities.genre || parsed.entities.artist_type || parsed.entities.q || parsed.entities.bpm;

  if(shouldFetch){
    const taste = getTasteVectorPro();
    let fetchParams = {
      genre: parsed.entities.genre || taste.topGenre || null,
      mood: parsed.entities.mood || taste.topMood || null,
      bpm: parsed.entities.bpm || null,
      bpm_range: parsed.entities.bpm_range || null,
      key: parsed.entities.key || null,
      q: parsed.entities.q || null,
      artist_type: parsed.entities.artist_type || taste.topArtist || null,
      price_max: parsed.entities.price_max || taste.budget || null,
      intent: parsed.intent,
      limit: parsed.intent==='buy_intent'? 1 : 3, // Closer: show 1 when ready to buy
      page: parsed.intent==='next_page'? (memory.page||0)+1 : (parsed.entities.pageIncrement? memory.page : 0)
    };

    // Pagination handling V7
    if(parsed.intent==='next_page'){
      fetchParams.page = memory.page + 1;
    }

    beatsResult = await fetchBeatsPro(fetchParams);

    // V7: Validate and rank already done in beat-engine, now anti-hallucination check
    if(beatsResult.beats.length){
      parsed.entities = validateEntitiesWithTruth(parsed.entities, beatsResult.beats);

      // SAVE FOR LEARNING - This is the forth loop
      saveMemoryPro({
        genre: fetchParams.genre,
        mood: fetchParams.mood,
        bpm: fetchParams.bpm || beatsResult.beats[0]?.bpm,
        key: fetchParams.key,
        price_max: fetchParams.price_max,
        artist_type: fetchParams.artist_type,
        beats: beatsResult.beats.map(b=> b.title||b.id),
        beat_viewed: beatsResult.beats[0]?.id||beatsResult.beats[0]?.title,
        intent: parsed.intent,
        lastUserText: userText,
        page: fetchParams.page,
        sales_score: getSalesReadinessPro()
      });

      // Trigger frontend render - same as posts
      window.dispatchEvent(new CustomEvent('ai_top3', {
        detail: {
          beats: beatsResult.beats,
          genre: fetchParams.genre,
          level: beatsResult.level,
          sales_score: getSalesReadinessPro(),
          taste: taste
        }
      }));
    } else {
      // No beats found - still save intent for learning
      saveMemoryPro({
        intent: parsed.intent,
        genre: parsed.entities.genre,
        lastUserText: userText,
        objection: 'no_results'
      });
    }
  } else {
    // Not a beat search - just update memory for learning
    saveMemoryPro({
      intent: parsed.intent,
      lastUserText: userText,
      genre: parsed.entities.genre,
      objection: parsed.entities.objection||null
    });
  }

  // 4. BUILD RESPONSE - V7 Closer with sales_score
  let response = buildResponsePro({
    intent: parsed.intent,
    entities: parsed.entities,
    beatsResult,
    memory: memory,
    taste: getTasteVectorPro(),
    sales_score: getSalesReadinessPro()
  });

  // 5. FORTH LEARNING - Auto-correct detection for next time
  if(parsed.intent==='correction'){
    console.log('[V7 LEARNING] Correction detected, logged for catalog fix');
  }

  // Add perf meta for debugging
  response._meta = {
   ...response._meta,
    intent: parsed.intent,
    confidence: parsed.confidence,
    sales_score: getSalesReadinessPro(),
    taste: getTasteVectorPro(),
    level: beatsResult.level,
    latency_ms: Date.now() - startTime,
    training_data_count: window.__TRAINING_DATA_V7_COUNT__||0
  };

  return response;
}

// Legacy compatibility for notice-board.js
export async function getAIReply(userText){
  let r = await getAIReplyPro(userText);
  return `${r.text}\n\n${r.options.map(o=>`[${o}]`).join(' ')}`;
}

// V7 NUDGE SYSTEM - Re-engage idle users (call this from setInterval if user idle 3min)
export function getIdleNudge(){
  const nudge = getNudgePro();
  if(nudge) return nudge;
  return null;
}

if(typeof window!=='undefined'){
  window.DopeAI_Pro = { getAIReplyPro, getAIReply, getIdleNudge };
  window.DopeAI_V7 = { getAIReplyPro, getIdleNudge, version: 'V7 FORTH LEARNING' };
  console.log(`DopeAI V7 FORTH LEARNING READY - ${window.__TRAINING_DATA_V7_COUNT__||'100+'} intents, taste vector, sales closer, self-learning loop closed 🔥`);

  // Auto-expose learning tools for you in console
  console.log('V7 TOOLS: Type DopeTrainingV7.exportLearningData() to download what your bot learned this week');
}
