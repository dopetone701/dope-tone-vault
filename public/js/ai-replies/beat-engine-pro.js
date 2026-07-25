// beat-engine-pro.js - V7.1.1 FORTH LEARNING - TRAP BUG FIXED + STRICT GENRE LOCK
const AI_API = "https://ai-api.dopetone701.workers.dev";
import { getMemoryPro, getTasteVectorPro, getSalesReadinessPro } from './conversation-memory-pro.js';

let CATALOG_CACHE = null;
let CATALOG_CACHE_TIME = 0;

async function getCatalogCache(){
  if(CATALOG_CACHE && Date.now() - CATALOG_CACHE_TIME < 5*60*1000) return CATALOG_CACHE;
  try{
    let r = await fetch(`${AI_API}/api/recent?limit=100&t=${Date.now()}`, {cache:'no-store'});
    if(r.ok){
      let d = await r.json();
      let beats = d.beats || d.top3 || [];
      if(beats.length){
        CATALOG_CACHE = beats;
        CATALOG_CACHE_TIME = Date.now();
        // OVERWRITE polluted cache
        localStorage.setItem('dt_beats_cache', JSON.stringify(beats.slice(0,100)));
        return beats;
      }
    }
    let beats = window.__ALL_BEATS__ || JSON.parse(localStorage.getItem('dt_beats_cache')||'[]');
    if(beats.length){
      CATALOG_CACHE = beats;
      CATALOG_CACHE_TIME = Date.now();
      return beats;
    }
  }catch(e){ console.log('catalog cache err', e); }
  return CATALOG_CACHE || [];
}

function normalizeGenre(g){
  if(!g) return '';
  return g.toLowerCase().trim().replace(/🔥|⚡|💙|🌍|🪘/g,'').trim();
}

function rankBeatsV7(beats, context){
  const { taste, sales_score, entities, memory } = context;
  return beats.map(beat => {
    let score = 0;
    let reasons = [];
    let plays = beat.play_count || beat.plays || 0;
    score += Math.min(30, plays / 10); // FIX: was /100, now /10 so 100 plays = 10 pts, Temperature 100 should win

    if(taste.topGenre && (beat.genre||'').toLowerCase().includes(taste.topGenre)){
      // ONLY boost taste if user didn't explicitly ask different genre
      if(!entities.genre || (beat.genre||'').toLowerCase().includes(entities.genre.toLowerCase())){
        score += 25; reasons.push(`taste:${taste.topGenre}`);
      }
    }
    if(entities.genre && (beat.genre||'').toLowerCase().includes(normalizeGenre(entities.genre))){
      score += 50; reasons.push('exact_genre'); // HUGE boost for exact
    } else if(entities.genre && !(beat.genre||'').toLowerCase().includes(normalizeGenre(entities.genre))){
      score -= 100; reasons.push('wrong_genre'); // KILL wrong genre
    }
    if(entities.mood && (beat.mood||'').toLowerCase().includes(entities.mood)){ score += 20; }
    if(entities.q){
      let qWords = entities.q.toLowerCase().split(/\s+/);
      let beatText = (beat.title+' '+beat.genre).toLowerCase();
      let qMatch = qWords.filter(w=> beatText.includes(w)).length;
      score += qMatch * 10;
    }
    if(memory.sales?.viewed_beats?.some(v=> String(v.id) === String(beat.id||beat.title))){
      score -= 5;
    }
    return { ...beat, _rank_score: score, _rank_reasons: reasons };
  }).sort((a,b)=> b._rank_score - a._rank_score);
}

async function callRecommend(params, context){
  try{
    let qs = new URLSearchParams();
    Object.entries(params).forEach(([k,v])=>{
      if(v!=null && v!=='' && k!=='page' && k!=='intent' && k!=='bpm_range' && k!=='artist_type' && k!=='type') qs.set(k,v);
      if(k==='bpm_range' && v) { qs.set('bpm_min', v.min); qs.set('bpm_max', v.max); }
    });
    qs.set('limit', params.limit || 10);
    qs.set('offset', params.offset || 0);
    qs.set('t', Date.now());
    if(params.intent) qs.set('intent', params.intent);
    let res = await fetch(`${AI_API}/api/recommend?${qs.toString()}`, {cache:'no-store'});
    if(res.ok){
      let data = await res.json();
      let beats = data.top3 || data.beats || [];
      // CLIENT GENRE GUARD
      if(params.genre && params.genre!=='recent'){
        let g = normalizeGenre(params.genre);
        let filtered = beats.filter(b=> (b.genre||'').toLowerCase().includes(g));
        if(filtered.length) beats = filtered;
      }
      if(beats.length && context){
        beats = rankBeatsV7(beats, context);
      }
      return { beats: beats.slice(0, params.limit||3), fallback: !!data.fallback, level: data.level||'exact', all: beats };
    }
  }catch(e){ console.log('rec err',e); }
  return { beats:[], fallback:true, level:'error' };
}

export async function fetchBeatsPro({genre, mood, bpm, key, q, type, price_max, page=0, limit=3, intent='', artist_type, bpm_range}){
  let offset = page*limit;
  const memory = getMemoryPro();
  const taste = getTasteVectorPro();
  const sales_score = getSalesReadinessPro();
  
  // FIX 1: NEVER auto-inject genre when user says ok/hey/greet
  let isGreet = ['greet','acknowledge','unknown',''].includes(intent);
  let explicitGenre = !!genre;
  
  // FIX 2: Only inject taste if NO explicit genre AND not greet
  if(!genre && taste.topGenre && !isGreet && intent!=='recent'){
    // Don't inject if last memory was different genre
    if(!memory.genre || memory.genre === taste.topGenre){
      genre = taste.topGenre;
    }
  }

  const context = { taste, sales_score, entities: {genre, mood, bpm, key, q, price_max, artist_type, bpm_range}, memory };

  if(intent==='recent'){
    try{
      let r = await fetch(`${AI_API}/api/recent?limit=${limit}&offset=${offset}&t=${Date.now()}`, {cache:'no-store'});
      if(r.ok){
        let d = await r.json();
        let beats = d.top3||d.beats||[];
        beats = rankBeatsV7(beats, context);
        if(beats.length) return {beats: beats.slice(0,limit), fallback:false, level:'recent-v7.1.1'};
      }
    }catch{}
  }

  if(q || genre || artist_type){
    try{
      let searchQ = q || artist_type || genre || '';
      let s = await fetch(`${AI_API}/api/smart-search?q=${encodeURIComponent(searchQ)}&t=${Date.now()}`, {cache:'no-store'});
      if(s.ok){
        let sd = await s.json();
        if(sd.found && sd.beats?.length){
          // STRICT FILTER
          if(genre){
            let g = normalizeGenre(genre);
            sd.beats = sd.beats.filter(b=> (b.genre||'').toLowerCase().includes(g));
          }
          if(sd.beats.length){
            let ranked = rankBeatsV7(sd.beats, context);
            return {beats: ranked.slice(0,limit), fallback:false, level:'smart-'+sd.source+'-v7.1.1', genre:sd.genre};
          }
        }
      }
    }catch{}
  }

  let chains = [
    {genre, mood, bpm, key, q, price_max, artist_type, bpm_range},
    {genre, mood, artist_type},
    {genre, mood, q},
    {genre, mood},
    {genre},
    {artist_type},
    {q},
    {}
  ];

  for(let c of chains){
    let hasValues = Object.values(c).some(v=> v!=null && v!=='' && (typeof v!=='object' || Object.keys(v).length));
    if(!hasValues){
      let r = await callRecommend({limit:10, offset, intent}, context);
      if(r.beats.length) return {beats: r.beats.slice(0,limit), fallback: r.fallback, level:'top-ranked-v7.1.1'};
      continue;
    }
    let r = await callRecommend({...c, limit:10, offset, intent}, context);
    if(r.beats.length && r.beats.some(b=> b._rank_score > -50)) return {beats: r.beats.slice(0,limit), fallback:r.fallback, level:'chain-v7.1.1'};
  }

  try{
    let all = await getCatalogCache();
    if(all.length){
      let ranked = rankBeatsV7(all, context);
      let filtered = ranked.filter(b=> b._rank_score > -50).slice(offset, offset+limit);
      if(filtered.length) return { beats:filtered, fallback:true, level:'local-ranked-v7.1.1' };
    }
  }catch{}

  return { beats:[], fallback:true, level:'empty-v7.1.1' };
}

export function getBeatTruth(beatIdOrTitle){
  if(!CATALOG_CACHE) return null;
  return CATALOG_CACHE.find(b=> (b.id===beatIdOrTitle || b.title===beatIdOrTitle || b.title?.toLowerCase()===beatIdOrTitle?.toLowerCase())) || null;
}

if(typeof window!=='undefined'){ window.DopeBeatEnginePro = { fetchBeatsPro, getBeatTruth, rankBeatsV7 }; }
