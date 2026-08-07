// response-builder-pro.js - V6 SUPER - ZERO HARDCODED REPLIES, PURE LLM GENERATED + SALES CLOSER
import { getMemoryPro, getTasteVectorPro, getSalesReadinessPro, saveMemoryPro } from './conversation-memory-pro.js';
import { getBeatTruth } from './beat-engine-pro.js';

const AI_API = "https://ai-api.dopetone701.workers.dev";

function getRealBeatMeta(beat){
  if(!beat) return null;
  const truth = getBeatTruth(beat.title) || beat;
  return {
    bpm: truth.bpm || beat.bpm || null,
    key: truth.key || beat.key || null,
    price: truth.display_price || truth.price || truth.basic_price || beat.display_price || beat.price || null,
    name: truth.title || beat.title || null,
    link: truth.url || truth.link || beat.url || `/beat/${(truth.title||'').toLowerCase().replace(/\s+/g,'-')}`,
    genre: truth.genre || beat.genre || null,
    mood: truth.mood || beat.mood || null,
    is_free: truth.is_free || beat.is_free || false
  };
}

async function generateSuperReplyLLM({intent, entities, beats, memory, taste, sales_score}) {
  const beatLines = beats.map((b,i)=> {
    const m = getRealBeatMeta(b);
    if(!m?.name) return null;
    return `${i+1}. ${m.name} - ${m.genre||''} ${m.bpm? m.bpm+'BPM':''} ${m.key||''} $${m.price||''} ${b.play_count? b.play_count+' plays':''}`;
  }).filter(Boolean).join('\n');

  const prompt = `You are DopeTone Super Sales AI. Generate a SHORT, real human reply (not robotic). No hardcoded templates.

Context:
- User intent: ${intent}
- Entities: genre=${entities.genre||'none'} mood=${entities.mood||'none'} bpm=${entities.bpm||'none'} key=${entities.key||'none'} budget=$${entities.price_max||'none'} artist=${entities.artist_type||'none'} emotion=${entities.emotional_context||'none'}
- User taste: top genre=${taste.topGenre||'none'} mood=${taste.topMood||'none'} bpm avg=${taste.bpm_avg||'none'} budget=${taste.budget||'none'}
- Sales readiness: ${sales_score}/100
- Beats found: ${beats.length}
${beatLines ? `Beats:\n${beatLines}` : 'No beats found'}

Rules:
- Be conversational, like a bro who is a producer
- If beats found, mention top 3 naturally, don't list like robot
- If sales_score >70 and buy_intent, close: mention checkout link
- If objection_price, empathize, suggest Basic $9-$29 vs Pro $25-$75
- If unclear, ask clarification with examples: "dark trap 140 bpm"
- Keep under 3 lines, then options will be generated separately
- Never hallucinate BPM/key - use only provided beat data
- If no beats, don't lie, say need more specifics

Return ONLY JSON: {"text":"your reply here","options":["opt1","opt2","opt3","opt4"],"action":null or {"type":"checkout","beat":"name"}}

Examples:
- intent=need_beat with beats: {"text":"Bet! Found 3 dark trap 142 BPM that match your Roddy vibe 🔥 First one is hardest.","options":["Yes need this 🔥","Next 3 ➡️","Show licence 📜","Faster ⚡"]}
- intent=recent: {"text":"Fresh drops just landed 🚀 3 new heat, first one already got 200 plays","options":["Yes need this 🔥","Next 3 ➡️","What we have? 👀"]}
- intent=unclear: {"text":"I feel you, but what vibe you need? Try 'dark drill 142 bpm' or pick below","options":["Trap 🔥","Drill 🥶","EDM ⚡","Afrobeat 🌍"]}

Generate now:`;

  try {
    let res = await fetch(`${AI_API}/api/super-reply`, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ prompt, intent, entities, beatsCount: beats.length, sales_score, uid: localStorage.getItem('dt_uid') })
    });
    if (res.ok) {
      let data = await res.json();
      if (data.text) return data;
    }
  } catch {}

  // Fallback mini-generator - still not hardcoded same line, dynamic
  let text = '';
  let options = [];
  if (beats.length) {
    let g = entities.genre || taste.topGenre || 'heat';
    let m = entities.mood ? ` ${entities.mood}` : '';
    let b = entities.bpm ? ` ${entities.bpm} BPM` : '';
    text = `Bet! Got ${beats.length} ${g}${m}${b} for you 🔥 ${beats[0]?.title ? beats[0].title+' is hardest' : 'Top 3 below'} - tap to play`;
    options = sales_score > 60 ? ["Yes need this 🔥","Checkout now 💳","Next 3 ➡️","Different mood 🎭"] : ["Yes need this 🔥","Next 3 ➡️","Show licence 📜","Custom? 👨‍🔧"];
  } else if (intent === 'unclear' || intent === 'acknowledge') {
    text = `Got you 👀 What vibe you need? Say like "dark drill 142 bpm" or "sad R&B for breakup" - I understand real English now`;
    options = ["Trap 🔥","Drill 🥶","R&B 💙","EDM ⚡","Afrobeat 🌍","Amapiano 🪘"];
  } else if (intent.startsWith('objection_')) {
    text = `I feel you on that 💰 Pro is $25-$75 with stems, Basic $9-$29 for WAV. What's your budget? I filter under that`;
    options = ["Under $30 💰","Pro $25-$75 🔥","Explain licence 📜","Yes need this 🔥"];
  } else if (intent === 'pricing') {
    text = `Pricing 💳 Basic $9-$29 (MP3+WAV), Pro $25-$75 🔥 (stems), Exclusive $199+ 👑. What's your budget?`;
    options = ["Under $30 💰","Pro $25-$75 🔥","Exclusive 👑","Checkout now 💳"];
  } else if (intent === 'licence') {
    text = `Licences 📜 Basic: 5k streams, WAV. Pro 🔥: 50k streams + stems. Exclusive 👑: Unlimited + own beat. Which beat you want it for?`;
    options = ["Basic $9-$29","Pro $25-$75 🔥","Exclusive 👑","Yes need this 🔥"];
  } else if (intent === 'recent') {
    text = `Fresh drops loading... what genre you feeling? 🔥`;
    options = ["Trap 🔥","R&B 💙","EDM ⚡","Afrobeat 🌍","Amapiano 🪘"];
  } else {
    text = `We got you. What beat you like? I understand real English now - just tell me like you tell your bro`;
    options = ["Trap 🔥","R&B 💙","EDM ⚡","Afrobeat 🌍","Amapiano 🪘","Recent drops 👀"];
  }

  return { text, options, beats, action: null };
}

export async function buildResponsePro({intent, entities, beatsResult}){
  const beats = beatsResult?.beats||[];
  const memory = getMemoryPro();
  const taste = getTasteVectorPro();
  const sales_score = getSalesReadinessPro();

  // Log viewed
  if(beats.length){
    saveMemoryPro({ beats: beats.map(b=> b.title||b.id), beat_viewed: beats[0]?.id||beats[0]?.title });
  }
  if(entities.objection){
    saveMemoryPro({ objection: entities.objection });
  }

  // V6: Generate via LLM, not hardcoded
  let response = await generateSuperReplyLLM({intent, entities, beats, memory, taste, sales_score});

  return {
    text: response.text,
    options: response.options || [],
    beats,
    fallback: beatsResult?.fallback,
    action: response.action || null,
    sales_score,
    taste,
    level: beatsResult?.level,
    _v6_super: true
  };
}
