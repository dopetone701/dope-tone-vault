// public/js/help/faq.js - ONLY FAQ logic, no other feature
export function initFAQ() {
  const accordions = document.querySelectorAll('#faqSection .acc');
  const search = document.getElementById('searchInput');
  if (!accordions.length) {
    console.warn('[faq] no accordions found');
    return;
  }

  accordions.forEach(acc => {
    acc.addEventListener('click', () => {
      const isOpen = acc.classList.contains('open');
      // close all
      document.querySelectorAll('#faqSection .acc').forEach(x => {
        x.classList.remove('open');
        const p = x.querySelector('.plus');
        if (p) p.textContent = '+';
      });
      // open clicked if was closed
      if (!isOpen) {
        acc.classList.add('open');
        const p = acc.querySelector('.plus');
        if (p) p.textContent = '−';
      }
    });
  });

  if (!search) return;

  search.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase().trim();
    accordions.forEach(acc => {
      const text = acc.textContent.toLowerCase();
      const match = !q || text.includes(q);
      acc.style.display = match ? 'block' : 'none';
      if (q && match) {
        acc.classList.add('open');
        const plus = acc.querySelector('.plus');
        if (plus) plus.textContent = '−';
      } else if (!q) {
        acc.classList.remove('open');
        const plus = acc.querySelector('.plus');
        if (plus) plus.textContent = '+';
      }
    });
  });
}
