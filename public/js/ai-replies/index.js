// index.js - V6 SUPER MASTER ROUTER - LLM First, No Hardcoded, Never Falls Off
import { getGreetingPro, getNudgePro } from './greetings-pro.js';
import { detectIntentPro } from './intent-detector-pro.js';
import { fetchBeatsPro, getBeatTruth } from './beat-engine-pro.js';
import { buildResponsePro } from './response-builder-pro.js';
import { saveMemoryPro, shouldGreetPro, getMemoryPro, getTasteVectorPro, getSalesReadinessPro } from './conversation-memory-pro.js';
import { getTrainingDataSuper } from './training-data.js';

function validateEntitiesWithTruth(entities, beats){
  if(!beats.length) return entities;
  const first = beats[0];
  const truth = getBeatTruth(first.title) || first;
  if(!entities.bpm && truth.bpm) entities._truth_bpm = truth.bpm;
  if(!entities.key && truth.key) entities._truth_key = truth.key;
  return entities;
}

export async function getAIReplyPro(userText=""){
  const startTime = Date.now();
  const memory = getMemoryPro();

  // 1. SUPER INTENT - LLM + Semantic
  let parsed = await detectIntentPro(userText);

  // 2. GREETING - only if not in buy flow and no explicit genre
  let greet = getGreetingPro(parsed);
  let isBuyFlow = parsed.intent==='buy_intent' || parsed.intent.startsWith('objection_') || parsed.intent==='correction';
  if(greet && shouldGreetPro() &&!isBuyFlow &&!parsed.entities.genre && parsed.intent!=='need_beat' && parsed.intent!=='recent' && parsed.intent!=='next_page'){
    saveMemoryPro({ intent: parsed.intent, genre: parsed.entities.genre, lastUserText: userText, page: 0 });
    return greet;
  }

  // 3. If unclear / low confidence - ASK, don't show wrong beats
  if(parsed.intent === 'unclear' || parsed.confidence < 65 || parsed.needs_clarification){
    saveMemoryPro({ intent: parsed.intent, lastUserText: userText });
    let response = await buildResponsePro({ intent: 'unclear', entities: parsed.entities, beatsResult: {beats:[]} });
    response._meta = { intent: parsed.intent, confidence: parsed.confidence, level:'clarification-v6-super', latency_ms: Date.now()-startTime };
    return response;
  }

  // 4. FETCH BEATS - V6 Super with strict lock
  let beatsResult = { beats:[], fallback:false, level:'none' };
  const shouldFetch = ['need_beat','what_we_have','recent','next_page','pricing','buy_intent'].includes(parsed.intent) || parsed.entities.genre || parsed.entities.artist_type || parsed.entities.q || parsed.entities.bpm || parsed.entities.emotional_context;

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
      emotional_context: parsed.entities.emotional_context || null,
      intent: parsed.intent,
      limit: parsed.intent==='buy_intent'? 1 : 3,
      page: parsed.intent==='next_page'? (memory.page||0)+1 : 0
    };

    beatsResult = await fetchBeatsPro(fetchParams);

    if(beatsResult.beats.length){
      parsed.entities = validateEntitiesWithTruth(parsed.entities, beatsResult.beats);
      saveMemoryPro({
        genre: fetchParams.genre,
        mood: fetchParams.mood,
        bpm: fetchParams.bpm || beatsResult.beats[0]?.bpm,
        key: fetchParams.key,
        price_max: fetchParams.price_max,
        artist_type: fetchParams.artist_type,
        emotional_context: fetchParams.emotional_context,
        beats: beatsResult.beats.map(b=> b.title||b.id),
        beat_viewed: beatsResult.beats[0]?.id||beatsResult.beats[0]?.title,
        intent: parsed.intent,
        lastUserText: userText,
        page: fetchParams.page
      });

      window.dispatchEvent(new CustomEvent('ai_top3', {
        detail: { beats: beatsResult.beats, genre: fetchParams.genre, level: beatsResult.level, sales_score: getSalesReadinessPro(), taste: taste }
      }));
    } else {
      saveMemoryPro({ intent: parsed.intent, genre: parsed.entities.genre, lastUserText: userText, objection: 'no_results' });
    }
  } else {
    saveMemoryPro({ intent: parsed.intent, lastUserText: userText, genre: parsed.entities.genre });
  }

  // 5. BUILD RESPONSE - LLM generated, zero hardcoded
  let response = await buildResponsePro({ intent: parsed.intent, entities: parsed.entities, beatsResult });

  response._meta = {
    intent: parsed.intent,
    confidence: parsed.confidence,
    sales_score: getSalesReadinessPro(),
    taste: getTasteVectorPro(),
    level: beatsResult.level,
    latency_ms: Date.now() - startTime,
    v: 'v6-super'
  };

  // Save assistant reply to context window
  saveMemoryPro({ assistantText: response.text, intent: parsed.intent });

  return response;
}

export async function getAIReply(userText){
  let r = await getAIReplyPro(userText);
  return `${r.text}\n\n${r.options.map(o=>`[${o}]`).join(' ')}`;
}

export function getIdleNudge(){
  const nudge = getNudgePro();
  if(nudge) return nudge;
  return null;
}

if(typeof window!=='undefined'){
  window.DopeAI_Pro = { getAIReplyPro, getAIReply, getIdleNudge };
  window.DopeAI_V6Super = { getAIReplyPro, version: 'V6 SUPER INTELLIGENCE - LLM + Vector + No Hardcode' };
  console.log(`DopeAI V6 SUPER READY - LLM first, admin 1000x, strict genre lock, zero hardcoded 🔥`);
}
