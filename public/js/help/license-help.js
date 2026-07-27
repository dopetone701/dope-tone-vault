// public/js/help/license-help.js - ONLY license table / RULES explanation
export function initLicense() {
  const section = document.getElementById('licenseSection');
  if (!section) return;

  // DNA RULES - same as vault.html - single source for support page
  const RULES = {
    free: { mp3: 'Tagged only', wav: false, stems: false, streams: 'No streaming', rights: 'Practice only' },
    basic: { mp3: '✔ Untagged', wav: true, stems: false, streams: '5,000', rights: 'Commercial limited' },
    pro: { mp3: '✔', wav: true, stems: true, streams: '50,000', rights: 'Monetization' },
    exclusive: { mp3: '✔', wav: true, stems: true, streams: 'Unlimited', rights: 'Full ownership • Removed' }
  };

  // optional: highlight row on hover is CSS, no JS needed
  // future: if you want dynamic price calc from licence-page.js, import calcPro / calcExclusive here
  console.log('[license-help] RULES loaded', RULES);

  // anchor highlight from URL #license
  if (location.hash.includes('license')) {
    section.style.outline = '1px solid rgba(255,30,60,0.35)';
    section.style.boxShadow = '0 0 30px rgba(255,30,60,0.15)';
    setTimeout(() => {
      section.style.outline = '';
      section.style.boxShadow = '';
    }, 2000);
  }
}
