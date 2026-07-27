document.addEventListener('DOMContentLoaded', () => {
  const logo = document.getElementById('logoTrigger');
  const audio = document.getElementById('proTag');
  let playing = false;

  function playTag(){
    if(!audio) return;
    if(playing){ audio.pause(); audio.currentTime=0; logo.classList.remove('playing'); playing=false; return; }
    audio.currentTime=0; audio.volume=0.8;
    audio.play().then(()=>{ playing=true; logo.classList.add('playing'); }).catch(()=>{});
  }
  if(logo) logo.addEventListener('click', playTag);
  if(audio) audio.addEventListener('ended', ()=>{ playing=false; logo.classList.remove('playing'); });
});


// Locked pills toast
const toast = document.getElementById('pill-toast');
document.querySelectorAll('.pill.locked').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    const msg = btn.getAttribute('data-msg') || 'In the vault. Still cooking.';
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(()=> toast.classList.remove('show'), 3000);
  });
});
