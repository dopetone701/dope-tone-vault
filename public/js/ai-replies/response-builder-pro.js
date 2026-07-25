// response-builder-pro.js - V7 FORTH LEARNING - The Closer - Never Hallucinates + Sales Intelligence
import { getMemoryPro, getTasteVectorPro, getSalesReadinessPro, saveMemoryPro } from './conversation-memory-pro.js';
import { getBeatTruth } from './beat-engine-pro.js';

const LICENSES_V7 = {
  free: { name: "FREE TAGGED", price: "$0", files: "MP3 Tagged", streams: "YouTube / Non-Profit only", stems: "No", note: "Must credit Prod. by Dopetone" },
  basic: { name: "BASIC", price: "$9-$29", files: "MP3 + WAV untagged", streams: "Up to 5,000 streams", videos: "1 music video", stems: "No" },
  pro: { name: "PRO - Most Popular 🔥", price: "$25-$75", files: "MP3 + WAV + Trackouts", streams: "Up to 50,000 streams", videos: "2 videos", stems: "Yes" },
  exclusive: { name: "EXCLUSIVE 👑", price: "$104-$303", files: "Full ownership - beat removed from store", streams: "Unlimited", stems: "Yes + Full Rights" }
};

function getRealBeatMeta(beat){
  if(!beat) return { bpm: null, key: null, price: null, name: null, link: null };
  // NEVER GUESS - use only beat object truth
  const truth = getBeatTruth(beat.title) || beat;
  return {
    bpm: truth.bpm || beat.bpm || null,
    key: truth.key || beat.key || null,
    price: truth.display_price || truth.price || truth.basic_price || beat.display_price || beat.price || null,
    name: truth.title || beat.title || null,
    link: truth.url || truth.link || beat.url || beat.checkout_url || `/beat/${(truth.title||'').toLowerCase().replace(/\s+/g,'-')}`,
    genre: truth.genre || beat.genre || null,
    is_free: truth.is_free || beat.is_free || false
  };
}

function buildBeatLine(beat, index=0){
  const meta = getRealBeatMeta(beat);
  if(!meta.name) return null;
  let line = `${index+1}. ${meta.name.toUpperCase()}`;
  if(meta.genre) line += ` - ${meta.genre}`;
  if(meta.bpm) line += ` | ${meta.bpm} BPM`;
  if(meta.key) line += ` | ${meta.key}`;
  if(meta.price) line += ` | $${meta.price}`;
  if(beat.play_count) line += ` | ${beat.play_count} plays`;
  return { line, meta };
}

export function buildResponsePro({intent, entities, beatsResult}){
  const beats = beatsResult?.beats||[];
  const memory = getMemoryPro();
  const taste = getTasteVectorPro();
  const sales_score = getSalesReadinessPro();
  const genre = entities.genre || beatsResult?.genre || taste.topGenre || 'beat';

  let text = '';
  let options = [];
  let action = null; // for frontend to trigger checkout etc

  // --- FORTH LEARNING: Log viewed beats ---
  if(beats.length){
    saveMemoryPro({ beats: beats.map(b=> b.title||b.id), beat_viewed: beats[0]?.id||beats[0]?.title });
  }

  if(intent==='correction'){
    text = `My bad fam 🙏 Got it, learning that now. Thanks for correcting me - vault updated. What else you need?`;
    options = ["Show me corrected list 👀","Recent drops 🔥","Talk to creator 👨‍🔧"];
    return { text, options, beats, fallback: beatsResult?.fallback, meta: { learning: true } };
  }

  if(intent.startsWith('objection_')){
    const obj = entities.objection;
    if(obj==='price' || obj==='free_request'){
      text = `I feel you on budget 💰 Look, you can start with Basic $${LICENSES_V7.basic.price} - you still get WAV + instant delivery. You can upgrade later to stems. Wanna see beats under $${entities.price_max||'30'}?`;
      options = [`Beats under $${entities.price_max||'30'} 💰`, "Pro $25-$75 🔥","Explain licences 📜","Yes, need this 🔥"];
    } else if(obj==='needs_stems'){
      text = `Bet, you need stems to cook properly 🔥 That's Pro licence ${LICENSES_V7.pro.price} - you get full trackouts. Basic won't cut it for you. Want me to show only Pro beats?`;
      options = ["Show Pro only 🔥","What Pro includes? 📜","Yes, need this 🔥"];
    } else if(obj==='wrong_vibe'){
      text = `Say less, that vibe was off. Tell me what you really feeling - moody? aggressive? Or drop an artist like "Drake x Russ"? I learn from this 🔥`;
      options = ["Dark 🌑","Melodic 💙","Hype 🔥","Pain 😔","Drake x Russ 💫"];
    }
    return { text, options, beats, fallback: true };
  }

  if(intent==='how_are_you'){
    text = sales_score > 40
     ? `I'm good fam! Still got that ${taste.topGenre||genre} vibe saved for you 🔥 Ready to lock one?`
      : "I'm good fam, ready to cook you heat 🔥 What vibe today?";
    options = taste.topGenre? [`More ${taste.topGenre} 🔥`,"R&B 💙","EDM ⚡","Afrobeat 🌍","Amapiano 🪘","Recent drops 👀"] : ["Trap 🔥","R&B 💙","EDM ⚡","Afrobeat 🌍","Amapiano 🪘","Recent drops 👀"];
  }
  else if(intent==='recent'){
    if(!beats.length){
      text = "Fresh drops loading... what genre you feeling? 🔥";
      options = ["Trap 🔥","R&B 💙","EDM ⚡","Afrobeat 🌍","Amapiano 🪘"];
    } else {
      const lines = beats.map((b,i)=> buildBeatLine(b,i)?.line).filter(Boolean).join('\n');
      text = `FRESHEST DROPS - just landed 🚀\n${lines}\n\nWhich one you jackin?`;
      options = ["Yes, need this 🔥","Next 3 ➡️","Show licence 📜","What we have? 👀"];
      action = { type: 'show_beats', beats: beats.map(b=> getRealBeatMeta(b)) };
    }
  }
  else if(intent==='next_page'){
    if(!beats.length){
      text = `No more ${genre} left in this page fam, but vault is deep 🔥 Want me to switch genre or show best sellers?`;
      options = ["Best sellers 🔥","Show trap 🔥","R&B 💙","Recent drops 👀","Custom? Connect creator 👨‍🔧"];
    } else {
      const lines = beats.map((b,i)=> buildBeatLine(b,i)?.line).filter(Boolean).join('\n');
      text = `NEXT 3 ${genre.toUpperCase()} for you 👇\n${lines}\n\nTap "need this" to lock it 🔥`;
      options = ["Yes, need this 🔥","Show licence 📜","Next 3 ➡️","Custom? Connect creator 👨‍🔧"];
      action = { type: 'show_beats', beats: beats.map(b=> getRealBeatMeta(b)) };
    }
  }
  else if(intent==='buy_intent'){
    // SALES CLOSER LOGIC
    const firstMeta = beats[0]? getRealBeatMeta(beats[0]) : null;
    if(sales_score > 70 && firstMeta){
      text = `Let's get you paid 💳\n${firstMeta.name} - $${firstMeta.price}\n\nMost artists go Pro $${LICENSES_V7.pro.price} for trackouts. Basic is cool for demo.\n\nReady? Click checkout and it's instant delivery 👇\n${firstMeta.link}`;
      options = [`Checkout ${firstMeta.name} 💳`, "Pro $25-$75 🔥","Basic $9-$29","Show licence 📜"];
      action = { type: 'checkout', beat: firstMeta, license: 'pro' };
      saveMemoryPro({ objection: null }); // clear
    } else {
      text = `Say less 🔥 Which licence you want?\n\nBASIC ${LICENSES_V7.basic.price} - ${LICENSES_V7.basic.files}, ${LICENSES_V7.basic.streams}\nPRO ${LICENSES_V7.pro.price} 🔥 - ${LICENSES_V7.pro.files}, ${LICENSES_V7.pro.streams}\nEXCLUSIVE ${LICENSES_V7.exclusive.price} 👑 - Own it forever\n\nWhich one fits your budget?`;
      options = ["Basic $9-$29","Pro $25-$75 🔥","Exclusive 👑","Show licence 📜"];
    }
  }
  else if(intent==='need_beat'){
    if(!beats.length){
      text = taste.topGenre
       ? `I got you on ${taste.topGenre} but need more specifics - what mood? Dark, melodic, hype? Or name an artist you sound like?`
        : "We got you. What beat you like? Type like 'dark drill 142 bpm' or pick below 👇";
      options = ["Trap 🔥","R&B 💙","EDM ⚡","Afrobeat 🌍","Future Bass 🚀","Amapiano 🪘","Recent drops 👀"];
    } else {
      const lines = beats.map((b,i)=> buildBeatLine(b,i)?.line).filter(Boolean).join('\n');
      const hasFree = beats.some(b=> b.is_free || b.price==0);
      // Personalized intro based on taste
      let intro = sales_score > 60? `Based on your taste for ${taste.topGenre||genre} 🔥` : `Top ${beats.length} ${genre} matches for you`;
      text = `${intro} - handpicked:\n${lines}${hasFree? '\n\nFree tagged version available too 😊' : ''}\n\nWhich one hitting?`;
      options = ["Yes, need this 🔥","Show licence 📜","Next 3 ➡️", sales_score > 50? "Checkout now 💳" : "Custom? Connect creator 👨‍🔧"];
      action = { type: 'show_beats', beats: beats.map(b=> getRealBeatMeta(b)) };
    }
  }
  else if(intent==='what_we_have'){
    text = `VAULT INVENTORY 🔥\nWe got: Trap, Drill, R&B, EDM, Afrobeat, Amapiano, Future Bass, Dubstep, Pop, Dancehall\n\n${taste.topGenre? `You been on ${taste.topGenre} heavy - want more ${taste.topGenre}?` : 'What you need today?'}`;
    options = taste.topGenre? [`More ${taste.topGenre} 🔥`,"R&B 💙","EDM ⚡","Afrobeat 🌍","Amapiano 🪘","Recent drops 👀"] : ["Trap 🔥","R&B 💙","EDM ⚡","Afrobeat 🌍","Amapiano 🪘","Future Bass 🚀","Recent drops 👀"];
  }
  else if(intent==='licence'){
    text = `LICENCES EXPLAINED 📜\n\nFREE ${LICENSES_V7.free.price} - ${LICENSES_V7.free.files} - ${LICENSES_V7.free.streams}\nBASIC ${LICENSES_V7.basic.price} - ${LICENSES_V7.basic.files} - ${LICENSES_V7.basic.streams}\nPRO ${LICENSES_V7.pro.price} 🔥 - ${LICENSES_V7.pro.files} - ${LICENSES_V7.pro.streams} + ${LICENSES_V7.pro.stems?'Stems':''}\nEXCLUSIVE ${LICENSES_V7.exclusive.price} 👑 - ${LICENSES_V7.exclusive.files}\n\nWhich beat you want it for?`;
    options = ["Basic $9-$29","Pro $25-$75 🔥","Exclusive 👑","Yes, need this 🔥"];
  }
  else if(intent==='pricing'){
    const budget = entities.price_max || taste.budget;
    text = budget
     ? `Bet, you got $${budget} budget 💰\nBASIC $${LICENSES_V7.basic.price} - gets you started\nPRO $${LICENSES_V7.pro.price} - best value with stems\n\nI filtered beats under $${budget} for you 👇`
      : `PRICING 💳\nBasic ${LICENSES_V7.basic.price}, Pro ${LICENSES_V7.pro.price} 🔥 (most artists pick this), Exclusive ${LICENSES_V7.exclusive.price} 👑\n\nInstant delivery + contract. What's your budget?`;
    options = budget? [`Show under $${budget} 💰`,"Pro $25-$75 🔥","Basic $9-$29","Checkout now 💳"] : ["Show beats under $30 💰","Pro $25-$75 🔥","Exclusive 👑","Yes, need this 🔥"];
  }
  else if(intent.startsWith('technical')){
    text = "Got you - quick fix 🔧 Tell me beat name + email you used. I reset link now - valid 24h, check spam folder. If checkout failed, try PayPal link.";
    options = ["My link expired","No sound","Checkout failed","Talk to creator 👨‍🔧"];
  }
  else if(intent==='custom'){
    text = "Bet, custom $250 - 36h delivery, WAV + stems + 2 revisions 🔥 Connecting you to private live chat with Dopetone engineer 🤫 Hang tight.";
    options = ["Yes, connect me 👨‍🔧","Show me available first 👀"];
    action = { type: 'open_live_chat' };
  }
  else {
    text = taste.topGenre
     ? `Welcome back - still got that ${taste.topGenre} heat for you 🔥 Want me to drop your personal top 3?`
      : "We got you. What beat you like? Type like 'melodic trap 140bpm' or pick below 👇";
    options = ["Trap 🔥","R&B 💙","EDM ⚡","Afrobeat 🌍","Amapiano 🪘","Recent drops 👀","Pop ✨"];
  }

  // SAVE OBJECTION FOR LEARNING
  if(entities.objection){
    saveMemoryPro({ objection: entities.objection });
  }

  return { text, options, beats, fallback: beatsResult?.fallback, action, sales_score, taste };
}
