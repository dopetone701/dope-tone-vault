// public/js/ai-replies/mood-detector.js
export function detectMood(text){
  const t = text.toLowerCase();
  const angryWords = ['fuck','shit','bitch','asshole','scam','fake','wack','trash','angry','mad','annoyed','bullshit','stupid','dumb'];
  const happyWords = ['love','fire','hard','dope','lit','amazing','great','best','thanks','thank you','appreciate','🔥','❤️','💙'];
  const filthyWords = ['fuck','shit','nigga','bitch','ass','damn']; // we detect but reply calm

  if(angryWords.some(w=> t.includes(w))) return 'angry';
  if(filthyWords.some(w=> t.includes(w))) return 'filthy';
  if(happyWords.some(w=> t.includes(w))) return 'happy';
  if(t.includes('!') && t.length < 20) return 'hype';
  if(t.includes('?') && t.includes('beat')) return 'curious';
  return 'neutral';
}
