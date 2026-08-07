// greetings-pro.js - V6 SUPER - Memory-Aware + Sales Closer + No Hardcoded Spam
import { shouldGreetPro, getMemoryPro, getTasteVectorPro, getSalesReadinessPro } from './conversation-memory-pro.js';

const BASE_OPTS = ["Trap 🔥","Drill 🥶","R&B 💙","EDM ⚡","Afrobeat 🌍","Amapiano 🪘","Future Bass 🚀","Recent drops 👀"];

function buildPersonalizedOptions(taste){
  if(!taste ||!taste.topGenre) return BASE_OPTS;
  const top = taste.topGenre;
  const personalized = [];
  if(top) personalized.push(`More ${top} 🔥`);
  if(taste.topArtist) personalized.push(`${taste.topArtist} type 💫`);
  if(taste.topMood) personalized.push(`${taste.topMood} ${taste.topMood==='dark'?'🌑':'💙'}`);
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
  const hoursSince = (Date.now() - (memory.lastChat||0)) / (1000*60*60);

  // Short ack - don't greet
  if(t.length <= 4 && /^(yes|ok|bet|yo|hi|hey)$/.test(t)) return null;

  const isHow = /how are you|how you doing|you good|sup|what's up/.test(t);
  if(isHow){
    if(isReturning && lastGenre){
      return {
        text: `I'm good fam, still got that ${lastGenre} heat for you 🔥 ${sales_score > 60? `You left something in cart - lock it?` : 'What vibe today?'}`,
        options: buildPersonalizedOptions(taste),
        greeted: true
      };
    }
    return { text: "I'm good fam, ready to cook heat 🔥 What vibe today?", options: BASE_OPTS, greeted: true };
  }

  if(shouldGreetPro()){
    if(isReturning && lastGenre && hoursSince >= 10){
      return {
        text: `Welcome back fam 👋 You were on ${lastGenre}${taste.topMood?` ${taste.topMood}`:''} last time - saved it. What we cookin? 👇`,
        options: buildPersonalizedOptions(taste),
        greeted: true
      };
    }
    if(isReturning && sales_score > 70){
      return {
        text: `Yo welcome back 🔥 You were close to checkout - I held link. Ready to lock now? 💳`,
        options: ["Yes checkout now 💳", `More ${lastGenre||'Trap'} 🔥`, "Show licence 📜", "Recent drops 👀"],
        greeted: true
      };
    }
    if(t.length < 25 &&!parsed?.entities?.genre && parsed.intent !== 'need_beat'){
      return {
        text: isReturning ? `Hey fam 👋 Back again - let's get you that ${lastGenre||'beat'} today 👇` : "Hey fam 👋 Got heat ready. What beat you like? 👇",
        options: buildPersonalizedOptions(taste),
        greeted: true
      };
    }
  }
  return null;
}

export function getGenreOptions(){
  try{ return buildPersonalizedOptions(getTasteVectorPro()); }catch{ return BASE_OPTS; }
}

export function getNudgePro(){
  const sales_score = getSalesReadinessPro();
  const taste = getTasteVectorPro();
  if(sales_score > 65){
    return { text: `Still here 👀 That ${taste.topGenre||'beat'} still available - hold checkout link?`, options: ["Yes hold it 🔒","Show licence 📜","Next 3 ➡️"] };
  }
  return null;
}
