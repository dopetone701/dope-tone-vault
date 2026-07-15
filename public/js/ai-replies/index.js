// public/js/ai-replies/index.js - GIANT BRAIN - 200 STARTER -> SCALABLE TO 10K
import { detectMood } from './mood-detector.js';
import { GREETINGS } from './greetings.js';
import { BEAT_INQUIRY } from './beat-inquiry.js';
import { PRICING } from './pricing.js';
import { LICENSING } from './licensing.js';
import { CUSTOM } from './custom-beats.js';
import { TECHNICAL } from './technical.js';
import { SATISFACTION } from './satisfaction-loop.js';

const ALL_POOLS = {
  greetings: GREETINGS,
  beats: BEAT_INQUIRY,
  pricing: PRICING,
  licensing: LICENSING,
  custom: CUSTOM,
  technical: TECHNICAL,
  satisfaction: SATISFACTION
};

export function getAIReply(userMessage) {
  const msg = userMessage.toLowerCase();
  const mood = detectMood(msg); // angry, happy, filthy, hype, sad, neutral

  let pool = 'greetings';
  let replies = [];

  if (/(price|cost|how much|\$|dollar|cheap|expensive)/.test(msg)) pool = 'pricing';
  else if (/(license|licence|rights|wav|mp3|stems|exclusive|lease)/.test(msg)) pool = 'licensing';
  else if (/(custom|make me|need beat|create|like.*beat|similar to)/.test(msg)) pool = 'custom';
  else if (/(download|not working|error|link|can't play|bug)/.test(msg)) pool = 'technical';
  else if (/(beat|fire|hard|drill|trap|afro|type beat)/.test(msg)) pool = 'beats';
  else if (/(hi|hello|yo|wassup|hey|sup|good morning|good evening)/.test(msg)) pool = 'greetings';

  // MOOD OVERRIDE - this makes it human
  if (mood === 'angry' || mood === 'filthy') {
    replies = [
      `My bad fam 🙏 I feel you, we gonna fix that private right now - Creators on it`,
      `Respect your honesty 💙 Frustrating I know, let me flag this private for Creators`,
      `You right to feel that way ⚡ Let's make it right - private reply incoming, stay with me`,
      `Hear you loud! No cap we got you - private solution OTW, breathe with me`,
      `Damn, my apologies G 🙏 That's not the Dope Tone way - private fix coming`
    ];
  } else if (mood === 'happy' || mood === 'hype') {
    replies = [
      `Yooo you hyped! 🔥🔥 That energy what we live for - more fire OTW private`,
      `Love that vibe! 💙 You family now, private goodies incoming`,
      `That's the spirit! 🚀 Private reply with something special for you`,
      `You made our day fr! ✨ Creators gonna bless you private`,
    ];
  } else {
    replies = ALL_POOLS[pool] || GREETINGS;
  }

  // Prevent repeat
  let lastIdx = parseInt(localStorage.getItem(`ai_idx_${pool}`) || '-1');
  let idx;
  do { idx = Math.floor(Math.random() * replies.length); } while (idx === lastIdx && replies.length > 1);
  localStorage.setItem(`ai_idx_${pool}`, String(idx));

  const baseReply = replies[idx];

  // Satisfaction loop - 40% chance to add follow-up question to keep convo alive like human
  if (Math.random() > 0.6) {
    const follow = SATISFACTION[Math.floor(Math.random() * SATISFACTION.length)];
    return `${baseReply}\n\n${follow}`;
  }

  return baseReply;
}
