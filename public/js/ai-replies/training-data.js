// public/js/ai-replies/training-data.js - V7 FORTH LEARNING - Self-Expanding from Real Chats
// BASE SEED - Keep your core 100, system learns the other 900 from users

export const BASE_TRAINING_DATA = [
  // GREET - 40
  {text:"hi", intent:"greet", entities:{}},
  {text:"hey", intent:"greet", entities:{}},
  {text:"yo", intent:"greet", entities:{}},
  {text:"hello", intent:"greet", entities:{}},
  {text:"how are you", intent:"how_are_you", entities:{}},
  {text:"how you doing", intent:"how_are_you", entities:{}},
  {text:"whats good", intent:"greet", entities:{}},
  {text:"you there", intent:"greet", entities:{}},
  {text:"are you online", intent:"greet", entities:{}},
  {text:"sup bro", intent:"greet", entities:{}},
  {text:"yo dopetone", intent:"greet", entities:{}},
  {text:"wassup", intent:"greet", entities:{}},

  // NEED BEAT - PRODUCER SLANG V7 - This is how they REALLY talk
  {text:"i need a beat", intent:"need_beat", entities:{}},
  {text:"need sumn hard", intent:"need_beat", entities:{mood:"hard"}},
  {text:"need sumn for my tape", intent:"need_beat", entities:{}},
  {text:"cook me sum", intent:"need_beat", entities:{}},
  {text:"got that drip?", intent:"need_beat", entities:{}},
  {text:"need that pain shit", intent:"need_beat", entities:{mood:"pain"}},
  {text:"need sumn like Roddy Ricch", intent:"need_beat", entities:{artist_type:"roddy ricch", mood:"pain"}},
  {text:"Roddy Ricch pain 142 bpm", intent:"need_beat", entities:{artist_type:"roddy ricch", mood:"pain", bpm:"142"}},
  {text:"need trap beat", intent:"need_beat", entities:{genre:"trap"}},
  {text:"need drill beat 142", intent:"need_beat", entities:{genre:"drill", bpm:"142"}},
  {text:"dark drill Cm", intent:"need_beat", entities:{genre:"drill", mood:"dark", key:"Cm"}},
  {text:"aggressive drill Fm 140", intent:"need_beat", entities:{genre:"drill", mood:"aggressive", key:"Fm", bpm:"140"}},
  {text:"need edm beat", intent:"need_beat", entities:{genre:"edm"}},
  {text:"need afrobeat", intent:"need_beat", entities:{genre:"afrobeat"}},
  {text:"need amapiano beat", intent:"need_beat", entities:{genre:"amapiano"}},
  {text:"need dancehall beat", intent:"need_beat", entities:{genre:"dancehall"}},
  {text:"need r&b beat", intent:"need_beat", entities:{genre:"r&b"}},
  {text:"need future bass beat", intent:"need_beat", entities:{genre:"future bass"}},
  {text:"need dubstep beat", intent:"need_beat", entities:{genre:"dubstep"}},
  {text:"need pop beat", intent:"need_beat", entities:{genre:"pop"}},
  {text:"need rage beat yeat type", intent:"need_beat", entities:{genre:"rage", artist_type:"yeat"}},
  {text:"need plugnb", intent:"need_beat", entities:{genre:"plug"}},
  {text:"drake x travis type", intent:"need_beat", entities:{artist_type:"drake", q:"drake travis"}},
  {text:"travis scott type beat", intent:"need_beat", entities:{artist_type:"travis"}},
  {text:"gunna type beat", intent:"need_beat", entities:{artist_type:"gunna"}},
  {text:"what you have", intent:"what_we_have", entities:{}},
  {text:"what do you have", intent:"what_we_have", entities:{}},
  {text:"show me what you got", intent:"what_we_have", entities:{}},
  {text:"show catalog", intent:"what_we_have", entities:{}},
  {text:"sad trap beat", intent:"need_beat", entities:{genre:"trap", mood:"sad"}},
  {text:"happy trap", intent:"need_beat", entities:{genre:"trap", mood:"happy"}},
  {text:"dark trap 95 bpm Cm", intent:"need_beat", entities:{genre:"trap", mood:"dark", bpm:"95", key:"Cm"}},
  {text:"i want that sad shit for my heartbreak tape under 30 bucks Cm", intent:"need_beat", entities:{genre:"trap", mood:"sad", price_max:"30", key:"Cm"}},
  {text:"edm 145 bpm Cm price 19", intent:"need_beat", entities:{genre:"edm", bpm:"145", key:"Cm"}},
  {text:"future type beat", intent:"need_beat", entities:{artist_type:"future"}},
  {text:"drake type beat", intent:"need_beat", entities:{artist_type:"drake"}},
  {text:"guitar with flute beat", intent:"need_beat", entities:{q:"guitar flute"}},
  {text:"under $30 cheap beats", intent:"need_beat", entities:{price_max:"30"}},
  {text:"beats under 50", intent:"need_beat", entities:{price_max:"50"}},
  {text:"cheap beats with stems", intent:"need_beat", entities:{price_max:"30", q:"stems"}},

  // LICENCE 100
  {text:"what is basic licence", intent:"licence", entities:{}},
  {text:"what is pro licence", intent:"licence", entities:{}},
  {text:"what is exclusive", intent:"licence", entities:{}},
  {text:"can i use on spotify", intent:"licence", entities:{}},
  {text:"can i use on youtube", intent:"licence", entities:{}},
  {text:"how many streams", intent:"licence", entities:{}},
  {text:"do i get stems", intent:"licence", entities:{}},
  {text:"terms of use", intent:"licence", entities:{}},
  {text:"stems included", intent:"licence", entities:{}},
  {text:"difference between basic and pro", intent:"licence", entities:{}},
  {text:"basic vs pro", intent:"licence", entities:{}},

  // PRICING + OBJECTIONS - V7
  {text:"how much is basic", intent:"pricing", entities:{}},
  {text:"how much is pro", intent:"pricing", entities:{}},
  {text:"beat price", intent:"pricing", entities:{}},
  {text:"too expensive", intent:"objection_price", entities:{objection:"price"}},
  {text:"you got cheaper?", intent:"objection_price", entities:{objection:"price"}},
  {text:"free beat?", intent:"objection_free_request", entities:{objection:"free_request"}},
  {text:"send free", intent:"objection_free_request", entities:{objection:"free_request"}},

  // TECHNICAL
  {text:"can't download", intent:"technical_download", entities:{}},
  {text:"link expired", intent:"technical_download", entities:{}},
  {text:"beat not playing", intent:"technical_play", entities:{}},
  {text:"checkout failed", intent:"technical_checkout", entities:{}},

  // CUSTOM
  {text:"custom beat", intent:"custom", entities:{}},
  {text:"make me a beat", intent:"custom", entities:{}},
  {text:"cook me custom", intent:"custom", entities:{}},

  // BUY INTENT
  {text:"i need this", intent:"buy_intent", entities:{}},
  {text:"buy this", intent:"buy_intent", entities:{}},
  {text:"how to buy", intent:"buy_intent", entities:{}},
  {text:"send link", intent:"buy_intent", entities:{}},
  {text:"yes need this", intent:"buy_intent", entities:{}},
  {text:"lock it", intent:"buy_intent", entities:{}},
  {text:"cop this", intent:"buy_intent", entities:{}},
];

// FORTH LEARNING CORE - Merges real user chats
function getLearnedDataFromStorage(){
  let learned = [];
  try{
    // 1. From learning log (what users actually typed)
    let log = JSON.parse(localStorage.getItem('dt_learning_log')||'[]');
    // Only high confidence logs that led to engagement
    log.forEach(entry=>{
      if(entry.text && entry.text.length > 3 && entry.text.length < 60){
        // Deduplicate against base
        if(!BASE_TRAINING_DATA.some(b=> b.text.toLowerCase() === entry.text.toLowerCase())){
          learned.push({
            text: entry.text.toLowerCase(),
            intent: entry.intent,
            entities: { genre: entry.genre||null, learned: true, sales_score: entry.sales_score||0 },
            source: 'learned_log',
            weight: 1 + (entry.sales_score||0)/50 // Sales = higher weight
          });
        }
      }
    });

    // 2. From vocab cache v2 - words that converted
    let vocab = JSON.parse(localStorage.getItem('dt_vocab_cache_v2')||'{}');
    Object.entries(vocab).forEach(([word, data])=>{
      if(data.count >= 3){ // Word seen 3+ times
        let topIntent = Object.entries(data.intents||{}).sort((a,b)=>b[1]-a[1])[0];
        let topGenre = Object.entries(data.genres||{}).sort((a,b)=>b[1]-a[1])[0];
        if(topIntent && topIntent[1] >= 2){
          learned.push({
            text: word,
            intent: topIntent[0],
            entities: { genre: topGenre?.[0]||null, learned_vocab: true },
            source: 'learned_vocab',
            weight: data.count
          });
        }
      }
    });
  }catch(e){ console.log('learned data err', e); }
  return learned;
}

// V7 EXPORT - This is what intent-detector now uses
export function getTrainingDataPro(){
  const learned = getLearnedDataFromStorage();
  // Merge base + learned, learned gets boosted
  return [...BASE_TRAINING_DATA, ...learned];
}

// Legacy export for compatibility
export const TRAINING_DATA = BASE_TRAINING_DATA;

// V7 LISTS - Expanded
export const GENRE_LIST = ["trap","r&b","edm","afrobeat","future bass","dubstep","amapiano","pop","dancehall","drill","plug","rage","detroit","lofi","boom bap"];
export const MOOD_LIST = ["sad","happy","motivational","energetic","dark","melodic","chill","hype","pain","emotional","hard","soft","aggressive","smooth","romantic","vibe"];
export const ARTIST_LIST = ["drake","travis","future","gunna","lil baby","21 savage","roddy ricch","pop smoke","yeat","playboi carti","juice wrld","russ","brent","lil uzi","baby keem"];

// V7 ADMIN TOOLS - Run in console to export for retraining
export function exportLearningData(){
  const learned = getLearnedDataFromStorage();
  const corrections = JSON.parse(localStorage.getItem('dt_corrections')||'[]');
  const data = {
    base_count: BASE_TRAINING_DATA.length,
    learned_count: learned.length,
    learned,
    corrections,
    vocab: JSON.parse(localStorage.getItem('dt_vocab_cache_v2')||'{}'),
    taste: JSON.parse(localStorage.getItem('dt_pro_memory_v7')||'{}'),
    exported_at: new Date().toISOString()
  };
  console.log('=== DOPETONE V7 LEARNING EXPORT ===');
  console.log(JSON.stringify(data, null, 2));
  // Auto download
  try{
    let blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
    let url = URL.createObjectURL(blob);
    let a = document.createElement('a');
    a.href = url;
    a.download = `dopetone-v7-learning-${Date.now()}.json`;
    a.click();
  }catch{}
  return data;
}

export function resetLearning(){
  if(confirm('Reset all learned data? Base stays.')){
    localStorage.removeItem('dt_learning_log');
    localStorage.removeItem('dt_vocab_cache_v2');
    localStorage.removeItem('dt_corrections');
    localStorage.removeItem('dt_learning_log');
    console.log('Learning reset - base intact');
  }
}

if(typeof window!=='undefined'){
  window.DopeTrainingV7 = { getTrainingDataPro, exportLearningData, resetLearning, BASE_TRAINING_DATA };
  // Auto-sync to worker weekly
  try{
    const lastSync = localStorage.getItem('dt_last_learning_sync')||0;
    if(Date.now() - lastSync > 7*24*60*60*1000){
      const data = getLearnedDataFromStorage();
      if(data.length > 10){
        fetch('https://ai-api.dopetone701.workers.dev/api/learn', {
          method:'POST',
          body: JSON.stringify({ uid: localStorage.getItem('dt_uid'), learned: data }),
          headers:{'Content-Type':'application/json'}
        }).catch(()=>{});
        localStorage.setItem('dt_last_learning_sync', Date.now());
      }
    }
  }catch{}
}
