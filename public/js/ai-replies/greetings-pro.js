// public/js/ai-replies/greetings-pro.js - V7 FORTH LEARNING - Memory-Aware Closer Greeting
import { shouldGreetPro, getMemoryPro, getTasteVectorPro, getSalesReadinessPro } from './conversation-memory-pro.js';

const BASE_OPTS = ["Trap 🔥","R&B 💙","EDM ⚡","Afrobeat 🌍","Future Bass 🚀","Dubstep 🔊","Amapiano 🪘","Pop ✨","Dancehall 🔥","What we have? 👀"];

function buildPersonalizedOptions(taste){
  if(!taste ||!taste.topGenre) return BASE_OPTS;
  // Put his favorite genres first - this is learning
  const top = taste.topGenre;
  const topMood = taste.topMood;
  const personalized = [];

  if(top) personalized.push(`More ${top} 🔥`);
  if(taste.topArtist) personalized.push(`${taste.topArtist} type 💫`);
  if(topMood) personalized.push(`${topMood} ${topMood==='dark'?'🌑':topMood==='melodic'?'💙':'🔥'}`);

  // Fill rest with base but remove duplicates
  const rest = BASE_OPTS.filter(o=>!o.toLowerCase().includes((top||'').toLowerCase()));
  return [...personalized,...rest].slice(0, 8);
}

export function getGreetingPro(parsed){
  const t = (parsed?.t||'').toLowerCase();
  const memory = getMemoryPro();
  const taste = getTasteVectorPro();
  const sales_score = getSalesReadinessPro();
  const isReturning = memory.chatCount > 1;
  const lastGenre = taste.topGenre;
  const lastBeats = memory.beats||[];
  const hoursSince = (Date.now() - (memory.lastChat||0)) / (1000*60*60);

  // 1. HOW ARE YOU - now personal
  const isHow = /how are you|how you doing|you good|sup|what's up|how are u/.test(t);
  if(isHow){
    if(isReturning && lastGenre){
      return {
        text: `I'm good fam, still got that ${lastGenre} heat on deck for you 🔥 ${sales_score > 60? `You left ${lastBeats[0]||'a banger'} in cart - wanna lock it?` : 'What vibe we cookin today?'}`,
        options: buildPersonalizedOptions(taste),
        greeted: true,
        meta: { type: 'returning_how', sales_score }
      };
    }
    return {
      text: "I'm good fam, ready to cook you heat 🔥 What vibe today?",
      options: BASE_OPTS,
      greeted: true
    };
  }

  // 2. 10HR RULE - but now SMART
  if(shouldGreetPro()){
    // If returning after 10+ hours with history
    if(isReturning && lastGenre && hoursSince >= 10){
      return {
        text: `Welcome back fam 👋 You were on ${lastGenre}${taste.topMood?` ${taste.topMood}`:''} last time - I saved it. ${lastBeats.length?`Still got ${lastBeats[0]} for you.` : ''} What we cookin today? 👇`,
        options: buildPersonalizedOptions(taste),
        greeted: true,
        meta: { type: '10hr_returning', genre: lastGenre }
      };
    }
    // If returning with high sales intent - CLOSE
    if(isReturning && sales_score > 70){
      return {
        text: `Yo welcome back 🔥 You were THIS close to checkout on ${lastBeats[0]||lastGenre||'that heat'}. I held the link for you - ready to lock it now? 💳`,
        options: ["Yes, checkout now 💳", `More ${lastGenre||'Trap'} 🔥`, "Show licence 📜", "Recent drops 👀"],
        greeted: true,
        meta: { type: 'high_intent_returning', sales_score }
      };
    }
    // First hit short - buy driver
    if(t.length < 25 &&!parsed?.entities?.genre){
      if(isReturning){
        return {
          text: `Hey fam 👋 Back again - let's get you that ${lastGenre||'beat'} today. Pick below 👇`,
          options: buildPersonalizedOptions(taste),
          greeted: true
        };
      }
      return {
        text: "Hey fam 👋 Got heat ready. What beat you like? Select below 👇",
        options: BASE_OPTS,
        greeted: true
      };
    }
  }

  // 3. NO GREET - but inject memory for intent detector
  return null;
}

export function getGenreOptions(){
  try{
    const taste = getTasteVectorPro();
    return buildPersonalizedOptions(taste);
  }catch{
    return BASE_OPTS;
  }
}

// V7 NEW: Micro-greeting for mid-conversation re-engagement (if user idle 3min)
export function getNudgePro(){
  const sales_score = getSalesReadinessPro();
  const taste = getTasteVectorPro();
  if(sales_score > 65){
    return { text: `Still here 👀 That ${taste.topGenre||'beat'} still available - want me to hold checkout link for you?`, options: ["Yes, hold it 🔒","Show licence 📜","Next 3 ➡️"] };
  }
  return null;
}
