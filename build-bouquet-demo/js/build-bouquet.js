(function(){
  const state = { items: {} };

  function $(sel, root=document){ return root.querySelector(sel) }
  function $all(sel, root=document){ return Array.from(root.querySelectorAll(sel)) }

  function formatPrice(n){ return parseFloat(n).toFixed(0) }

  function updateSummary(){
    const totalItems = Object.values(state.items).reduce((s,x)=>s+x.qty,0)
    const totalPrice = Object.values(state.items).reduce((s,x)=>s + x.qty * x.price,0)
    $('#totalItems').textContent = totalItems
    $('#totalPrice').textContent = formatPrice(totalPrice)
  }

  function renderPreview(){
    const wrap = $('.bouquet-preview')
    wrap.innerHTML = ''
    Object.keys(state.items).forEach(type=>{
      const itm = state.items[type]
      const pill = document.createElement('div')
      pill.className = 'flower-pill'
      pill.innerHTML = `<img src="${itm.src}" alt="${type}"><div>${type} x ${itm.qty} — ₹${itm.price}</div>`
      const remove = document.createElement('button')
      remove.className = 'remove'
      remove.textContent = 'Remove'
      remove.addEventListener('click', ()=>{
        delete state.items[type]
        updateSummary(); renderPreview()
      })
      pill.appendChild(remove)
      wrap.appendChild(pill)
    })
  }

  function attachControls(){
    $all('.flower-card').forEach(card=>{
      const type = card.dataset.type
      const price = Number(card.dataset.price)
      const img = card.querySelector('img').src
      const countEl = card.querySelector('.count')

      card.querySelector('.inc').addEventListener('click', ()=>{
        countEl.textContent = Number(countEl.textContent) + 1
      })
      card.querySelector('.dec').addEventListener('click', ()=>{
        countEl.textContent = Math.max(0, Number(countEl.textContent) - 1)
      })
      card.querySelector('.add').addEventListener('click', ()=>{
        const qty = Number(countEl.textContent)
        if(qty <= 0) return
        if(!state.items[type]) state.items[type] = { qty:0, price:price, src:img }
        state.items[type].qty += qty
        countEl.textContent = '0'
        updateSummary(); renderPreview()
      })
    })

    $('#clearBtn').addEventListener('click', ()=>{ state.items = {}; updateSummary(); renderPreview() })
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ()=>{ attachControls(); updateSummary(); })
  else { attachControls(); updateSummary(); }

  window.BuildBouquet = { state }
})();
