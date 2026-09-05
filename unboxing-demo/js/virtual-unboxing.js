(function(){
  const RIBBON_MS = 420;
  const BOX_MS = 620;

  function initUnboxes(root=document){
    root.querySelectorAll('.virtual-unbox').forEach(el=>{
      const btn = el.querySelector('.unbox-trigger');
      const giftImg = el.querySelector('.gift img');
      const boxImg = el.querySelector('.box-image');

      if(el.dataset.giftSrc && giftImg) giftImg.src = el.dataset.giftSrc;
      if(el.dataset.boxSrc && boxImg) boxImg.src = el.dataset.boxSrc;

      let busy = false;
      btn.addEventListener('click', ()=>{
        if(busy) return;
        busy = true;
        el.classList.add('opening');

        // ribbon opens first
        el.classList.add('ribbon-open');
        setTimeout(()=>{
          // then box opens
          el.classList.add('box-open');
        }, RIBBON_MS);

        setTimeout(()=>{
          // finally show gift
          el.classList.add('gift-show');
          el.classList.remove('opening');
          busy = false;
        }, RIBBON_MS + BOX_MS);
      });
    });
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', ()=> initUnboxes());
  } else initUnboxes();

  window.VirtualUnbox = { init: initUnboxes };
})();
