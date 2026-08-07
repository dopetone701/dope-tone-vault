// training-data.js - V6 SUPER - NO STATIC POLLUTION, EMBEDDING CLUSTERS + ADMIN 1000x WEIGHT
// Purpose: Only seed truth, all learning from D1 + Vectorize, never localStorage spam

export const BASE_SEED = [
  // Only 20 ultra-clean seeds - no "yes" "yo" pollution
  {text:"trap", intent:"need_beat", entities:{genre:"trap"}, weight:10},
  {text:"drill", intent:"need_beat", entities:{genre:"drill"}, weight:10},
  {text:"edm", intent:"need_beat", entities:{genre:"edm"}, weight:10},
  {text:"afrobeat", intent:"need_beat", entities:{genre:"afrobeat"}, weight:10},
  {text:"amapiano", intent:"need_beat", entities:{genre:"amapiano"}, weight:10},
  {text:"r&b", intent:"need_beat", entities:{genre:"r&b"}, weight:10},
  {text:"future bass", intent:"need_beat", entities:{genre:"future bass"}, weight:10},
  {text:"plug", intent:"need_beat", entities:{genre:"plug"}, weight:10},
  {text:"rage", intent:"need_beat", entities:{genre:"rage"}, weight:10},
  {text:"recent drops", intent:"recent", entities:{}, weight:10},
  {text:"what you have", intent:"what_we_have", entities:{}, weight:10},
  {text:"buy this", intent:"buy_intent", entities:{}, weight:10},
  {text:"custom beat", intent:"custom", entities:{}, weight:10},
  {text:"licence", intent:"licence", entities:{}, weight:10},
  {text:"price", intent:"pricing", entities:{}, weight:10},
];

export const GENRE_CLUSTERS = {
  "trap": ["trap","trapp","trappy","hard trap","dark trap","melodic trap","sad trap","pain trap","boom bap","detroit"],
  "drill": ["drill","dril","uk drill","ny drill","dark drill","aggressive drill","slime","oat","drilly"],
  "edm": ["edm","house","dance","electronic","festival","big room"],
  "afrobeat": ["afro","afrobeat","afro beat","afrobeats","amafro"],
  "amapiano": ["amapiano","piano","amapiano log drum","sa house"],
  "r&b": ["r&b","rnb","r and b","soul","r&b slow","brent","summer walker type"],
  "future bass": ["future bass","fb","future","future bounce"],
  "plug": ["plug","plugnb","pluggnb","plug nb","plugg"],
  "rage": ["rage","yeat","yeat type","playboi carti","opium"],
  "dancehall": ["dancehall","dance hall","reggae","dancehall vibe"],
  "pop": ["pop","pop beat","pop type"],
  "lofi": ["lofi","lo-fi","chillhop","lofi chill"]
};

export const MOOD_CLUSTERS = {
  "dark": ["dark","evil","dystopian","horror","sinister"],
  "sad": ["sad","pain","heartbreak","emotional","breakup","depressing","melancholic"],
  "happy": ["happy","uplifting","joyful","energetic","positive","bright"],
  "hard": ["hard","aggressive","hype","angry","tough","street"],
  "chill": ["chill","smooth","mellow","laid back","relaxed","soft"],
  "romantic": ["romantic","love","lovey","sensual","intimate"]
};

// V6: Get training data from D1 ONLY - no localStorage pollution
export async function getTrainingDataSuper(fetchFn = fetch) {
  try {
    // 1. Base seed (weight 10)
    let data = [...BASE_SEED];
    
    // 2. Admin corrections - weight 1000 - NEVER FORGET
    try {
      let res = await fetchFn(`https://ai-api.dopetone701.workers.dev/api/corrections/all?t=${Date.now()}`, {cache:'no-store'});
      if (res.ok) {
        let json = await res.json();
        let corrections = json.corrections || [];
        for (let c of corrections) {
          if (!c.user_text || !c.correct_genre) continue;
          // Skip polluted single words like "yes" unless admin weight >=100
          if (c.user_text.length <= 3 && (c.weight||0) < 100) continue;
          
          data.push({
            text: c.user_text.toLowerCase(),
            intent: c.correct_intent || 'need_beat',
            entities: { genre: c.correct_genre, admin: true, mood: c.correct_mood || null },
            weight: 1000,
            source: 'admin-d1',
            embedding: c.embedding || null
          });
        }
      }
    } catch {}

    // 3. High-quality memory - only sales_score > 60, weight 50
    try {
      let res = await fetchFn(`https://ai-api.dopetone701.workers.dev/api/memory/top?min_score=60&limit=100&t=${Date.now()}`, {cache:'no-store'});
      if (res.ok) {
        let json = await res.json();
        for (let m of json.memories || []) {
          if (!m.normalized || m.normalized.length < 4) continue;
          if (['yes','yeah','ok','hi','hey','yo'].includes(m.normalized)) continue; // Anti-pollution
          data.push({
            text: m.normalized,
            intent: m.intent,
            entities: { genre: m.genre || null },
            weight: 50,
            source: 'high-quality-memory'
          });
        }
      }
    } catch {}

    return data;
  } catch (e) {
    console.log('Super training data fallback', e);
    return BASE_SEED;
  }
}

// Legacy compatibility - but now clean
export const TRAINING_DATA = BASE_SEED;
export function getTrainingDataPro() { return BASE_SEED; }

export const GENRE_LIST = Object.keys(GENRE_CLUSTERS);
export const MOOD_LIST = Object.keys(MOOD_CLUSTERS);

if (typeof window !== 'undefined') {
  window.DopeTrainingV6Super = { getTrainingDataSuper, BASE_SEED, GENRE_CLUSTERS };
}
