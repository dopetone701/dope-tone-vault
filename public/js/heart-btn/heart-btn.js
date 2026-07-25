// heart-btn.js - plugs into cc-charts.js event system + backend
const API_URL = '/api/stats/like'; // change if needed

export function initHeartButtons() {
  const buttons = document.querySelectorAll('[data-heart-btn]');

  buttons.forEach(btn => {
    const beatId = String(btn.dataset.postId || btn.dataset.beatId || btn.dataset.beat_id || '');
    if (!beatId) return;

    const likedBeats = JSON.parse(localStorage.getItem('dopetone_likes') || '{}');
    if (likedBeats[beatId]) {
      btn.classList.add('liked');
      btn.setAttribute('aria-pressed', 'true');
    }

    btn.addEventListener('click', async () => {
      if (btn.disabled) return;
      const likesMap = JSON.parse(localStorage.getItem('dopetone_likes') || '{}');
      const wasLiked = !!likesMap[beatId];
      const newLiked = !wasLiked;

      // optimistic
      btn.classList.toggle('liked', newLiked);
      btn.setAttribute('aria-pressed', String(newLiked));
      btn.classList.add('animate');
      setTimeout(() => btn.classList.remove('animate'), 300);

      if (newLiked) likesMap[beatId] = Date.now();
      else delete likesMap[beatId];
      localStorage.setItem('dopetone_likes', JSON.stringify(likesMap));
      localStorage.setItem('dopetone_likes_count', String(Object.keys(likesMap).length));
      const total = Object.keys(likesMap).length;

      window.dispatchEvent(new CustomEvent('cc_like_updated', {
        detail: { beat_id: beatId, beatId: beatId, liked: newLiked, count: total, perBeat: likesMap }
      }));
      window.dispatchEvent(new CustomEvent('cc_player_like_sync', {
        detail: { total: total, beat_id: beatId, beatId: beatId, liked: newLiked }
      }));

      try {
        await fetch(API_URL, {
          method: 'POST',
          headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ beat_id: beatId, action: newLiked? 'like' : 'unlike' })
        });
      } catch(e) {}
    });
  });
}

if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', initHeartButtons);
}
