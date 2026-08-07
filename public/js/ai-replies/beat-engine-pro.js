// beat-engine-pro.js - V6 SUPER - STRICT GENRE LOCK + NO WRONG GENRE EVER + TASTE AWARE RANKING
const AI_API = "https://ai-api.dopetone701.workers.dev";
import { getMemoryPro, getTasteVectorPro, getSalesReadinessPro } from './conversation-memory-pro.js';

let CATALOG_CACHE = null;
let CATALOG_CACHE_TIME = 0;

async function getCatalogCache(){
  if(CATALOG_CACHE && Date.now() - CATALOG_CACHE_TIME < 2*60*1000) return CATALOG_CACHE;
  try{
    let r = await fetch(`${AI_API}/api/recent?limit=150&t=${Date.now()}`, {cache:'no-store'});
    if(r.ok){
      let d = await r.json();
      let beats = d.beats || d.top3 || [];
      if(beats.length){
        CATALOG_CACHE = beats;
        CATALOG_CACHE_TIME = Date.now();
        localStorage.setItem('dt_beats_cache', JSON.stringify(beats.slice(0,150)));
        return beats;
      }
    }
    let beats = window.__ALL_BEATS__ || JSON.parse(localStorage.getItem('dt_beats_cache')||'[]');
    if(beats.length){
      CATALOG_CACHE = beats;
      CATALOG_CACHE_TIME = Date.now();
      return beats;
    }
  }catch(e){}
  return CATALOG_CACHE || [];
}

function normalizeGenre(g){
  if(!g) return '';
  return g.toLowerCase().trim().replace(/🔥|⚡|💙|🌍|🪘|✨|👀/g,'').trim();
}

function rankBeatsSuper(beats, context){
  const { taste, sales_score, entities } = context;
  return beats.map(beat => {
    let score = 0;
    let reasons = [];
    let plays = beat.play_count || beat.plays || 0;
    score += Math.min(30, plays / 8); // plays matter

    // TASTE BOOST - only if no explicit genre conflict
    if(taste.topGenre && (beat.genre||'').toLowerCase().includes(taste.topGenre)){
      if(!entities.genre || (beat.genre||'').toLowerCase().includes(normalizeGenre(entities.genre))){
        score += 20; reasons.push(`taste:${taste.topGenre}`);
      }
    }

    // EXACT GENRE - huge boost, WRONG GENRE = kill
    if(entities.genre){
      let req = normalizeGenre(entities.genre);
      let beatGenre = (beat.genre||'').toLowerCase();
      if(beatGenre.includes(req)){
        score += 100; reasons.push('exact_genre');
      } else {
        score -= 500; reasons.push('wrong_genre_KILL'); // V6: -500 not -100, so wrong genre NEVER shows
      }
    }

    if(entities.mood && (beat.mood||'').toLowerCase().includes(entities.mood)){ score += 25; reasons.push('mood'); }
    if(entities.emotional_context && (beat.mood||'').toLowerCase().includes(entities.emotional_context)){ score += 15; }
    if(entities.q){
      let qWords = entities.q.toLowerCase().split(/\s+/);
      let beatText = (beat.title+' '+beat.genre+' '+(beat.tags||'')).toLowerCase();
      let qMatch = qWords.filter(w=> beatText.includes(w)).length;
      score += qMatch * 15;
    }
    if(entities.artist_type){
      let at = entities.artist_type.toLowerCase();
      let beatText = (beat.title+' '+(beat.tags||'')).toLowerCase();
      if(beatText.includes(at)) { score += 30; reasons.push(`artist:${at}`); }
    }
    if(entities.bpm && beat.bpm){
      let diff = Math.abs(parseInt(beat.bpm) - parseInt(entities.bpm));
      if(diff <= 3) score += 20;
      else if(diff <= 10) score += 10;
      else if(diff > 20) score -= 10;
    }
    // Avoid repeats
    if(context.memory.sales?.viewed_beats?.some(v=> String(v.id) === String(beat.id))){
      score -= 15; reasons.push('already_seen');
    }

    return { ...beat, _rank_score: score, _rank_reasons: reasons };
  })
  .filter(b=> b._rank_score > -100) // Remove killed wrong genres
  .sort((a,b)=> b._rank_score - a._rank_score);
}

async function callRecommendSuper(params, context){
  try{
    let qs = new URLSearchParams();
    Object.entries(params).forEach(([k,v])=>{
      if(v!=null && v!=='' && !['page','intent','bpm_range','type'].includes(k)) qs.set(k,v);
      if(k==='bpm_range' && v) { qs.set('bpm_min', v.min); qs.set('bpm_max', v.max); }
    });
    qs.set('limit', params.limit || 20); // fetch more for ranking
    qs.set('offset', params.offset || 0);
    qs.set('t', Date.now());
    if(params.intent) qs.set('intent', params.intent);
    qs.set('super', 'true'); // Tell worker to use V6 logic
    
    let res = await fetch(`${AI_API}/api/recommend?${qs.toString()}`, {cache:'no-store'});
    if(res.ok){
      let data = await res.json();
      let beats = data.top3 || data.beats || [];
      
      // CLIENT STRICT GUARD - second layer
      if(params.genre && params.genre!=='recent'){
        let g = normalizeGenre(params.genre);
        let filtered = beats.filter(b=> (b.genre||'').toLowerCase().includes(g));
        // If filtered has results, use filtered, else keep empty to trigger fallback (don't show wrong genre)
        if(filtered.length) beats = filtered;
        else if(beats.length && !data.fallback) beats = []; // Force empty if wrong genre returned
      }
      
      if(beats.length && context){
        beats = rankBeatsSuper(beats, context);
      }
      return { beats: beats.slice(0, params.limit||3), fallback: !!data.fallback, level: data.level||'exact', all: beats };
    }
  }catch(e){ console.log('super rec err',e); }
  return { beats:[], fallback:true, level:'error' };
}

export async function fetchBeatsPro({genre, mood, bpm, key, q, price_max, page=0, limit=3, intent='', artist_type, bpm_range, emotional_context}){
  let offset = page*limit;
  const memory = getMemoryPro();
  const taste = getTasteVectorPro();
  const sales_score = getSalesReadinessPro();
 
  let isGreet = ['greet','acknowledge','unclear',''].includes(intent);
  let explicitGenre = !!genre;
 
  // Taste injection - only if no explicit genre and not greet
  if(!genre && taste.topGenre && !isGreet && intent!=='recent'){
    if(!memory.taste?.genres || memory.taste.genres[taste.topGenre]){
      genre = taste.topGenre;
    }
  }

  const context = { taste, sales_score, entities: {genre, mood, bpm, key, q, price_max, artist_type, bpm_range, emotional_context}, memory };

  if(intent==='recent'){
    try{
      let r = await fetch(`${AI_API}/api/recent?limit=${limit}&offset=${offset}&super=true&t=${Date.now()}`, {cache:'no-store'});
      if(r.ok){
        let d = await r.json();
        let beats = d.top3||d.beats||[];
        beats = rankBeatsSuper(beats, context);
        if(beats.length) return {beats: beats.slice(0,limit), fallback:false, level:'recent-v6-super'};
      }
    }catch{}
  }

  // Smart search first - uses vectorize on worker
  if(q || artist_type || emotional_context){
    try{
      let searchQ = q || artist_type || emotional_context || genre || '';
      let s = await fetch(`${AI_API}/api/smart-search?q=${encodeURIComponent(searchQ)}&genre=${genre||''}&super=true&t=${Date.now()}`, {cache:'no-store'});
      if(s.ok){
        let sd = await s.json();
        if(sd.found && sd.beats?.length){
          if(genre){
            let g = normalizeGenre(genre);
            sd.beats = sd.beats.filter(b=> (b.genre||'').toLowerCase().includes(g));
          }
          if(sd.beats.length){
            let ranked = rankBeatsSuper(sd.beats, context);
            if(ranked.length) return {beats: ranked.slice(0,limit), fallback:false, level:'smart-vector-'+sd.source, genre:sd.genre};
          }
        }
      }
    }catch{}
  }

  // Super chain - genre strict first
  let chains = [
    {genre, mood, bpm, bpm_range, key, q, artist_type, price_max},
    {genre, mood, artist_type},
    {genre, mood},
    {genre, bpm},
    {genre},
    {artist_type},
    {q},
    {emotional_context},
    {} // last resort top plays
  ];

  for(let c of chains){
    let hasValues = Object.values(c).some(v=> v!=null && v!=='' && (typeof v!=='object' || Object.keys(v).length));
    if(!hasValues && c !== chains[chains.length-1]) continue; // skip empty unless last
    
    let r = await callRecommendSuper({...c, limit: limit*3, offset, intent}, context);
    if(r.beats.length && r.beats.some(b=> b._rank_score > -50)) {
      return {beats: r.beats.slice(0,limit), fallback:r.fallback, level:'chain-v6-super-'+r.level};
    }
  }

  // Local cache fallback
  try{
    let all = await getCatalogCache();
    if(all.length){
      let ranked = rankBeatsSuper(all, context);
      let filtered = ranked.filter(b=> b._rank_score > -50).slice(offset, offset+limit);
      if(filtered.length) return { beats:filtered, fallback:true, level:'local-ranked-v6-super' };
    }
  }catch{}

  return { beats:[], fallback:true, level:'empty-v6-super' };
}

export function getBeatTruth(beatIdOrTitle){
  if(!CATALOG_CACHE) return null;
  return CATALOG_CACHE.find(b=> (b.id===beatIdOrTitle || b.title===beatIdOrTitle || b.title?.toLowerCase()===beatIdOrTitle?.toLowerCase())) || null;
}

if(typeof window!=='undefined'){ window.DopeBeatEnginePro = { fetchBeatsPro, getBeatTruth, rankBeatsSuper }; }
