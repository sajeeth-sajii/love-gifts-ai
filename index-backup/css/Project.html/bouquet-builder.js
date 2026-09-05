const flowers = [
  { id: 'rose', name: 'Rose', price: 120, icon: '🌹', color: '#ff5d73' },
  { id: 'tulip', name: 'Tulip', price: 90, icon: '🌷', color: '#ff8f3f' },
  { id: 'lily', name: 'Lily', price: 110, icon: '🪻', color: '#ee7ea7' },
  { id: 'sunflower', name: 'Sunflower', price: 85, icon: '🌻', color: '#ffbf3d' },
  { id: 'orchid', name: 'Orchid', price: 140, icon: '🌸', color: '#9a6cff' }
];

const state = Object.fromEntries(flowers.map((flower) => [flower.id, 0]));
const flowerList = document.getElementById('flowerList');
const totalPriceEl = document.getElementById('totalPrice');
const previewAreaEl = document.getElementById('previewArea');
const selectionSummaryEl = document.getElementById('selectionSummary');
const cartMessageEl = document.getElementById('cartMessage');

function renderFlowers() {
  flowerList.innerHTML = flowers.map((flower) => {
    const quantity = state[flower.id];
    return `
      <div class="flower-item">
        <div class="flower-meta">
          <div class="flower-icon">${flower.icon}</div>
          <div>
            <div class="flower-name">${flower.name}</div>
            <div class="flower-price">₹${flower.price} each</div>
          </div>
        </div>
        <div class="qty-controls">
          <button class="qty-btn" data-action="minus" data-flower="${flower.id}">−</button>
          <span class="qty-value">${quantity}</span>
          <button class="qty-btn" data-action="plus" data-flower="${flower.id}">+</button>
        </div>
      </div>
    `;
  }).join('');
}

function buildPreviewSvg(selectedFlowers) {
  if (selectedFlowers.length === 0) {
    return `
      <svg viewBox="0 0 280 220" role="img" aria-label="Empty bouquet preview">
        <rect x="55" y="150" width="170" height="34" rx="16" fill="#f7d7e8"></rect>
        <text x="140" y="120" text-anchor="middle" fill="#8a5f71" font-size="18" font-family="Segoe UI, sans-serif">Pick flowers to start</text>
      </svg>
    `;
  }

  const stems = selectedFlowers.map((flower, index) => {
    const x = 95 + (index % 3) * 38 + (index % 2 ? 12 : 0);
    const y = 160 - Math.min(index, 2) * 16;
    return `
      <g>
        <line x1="${x}" y1="166" x2="${x}" y2="${y}" stroke="#4b8746" stroke-width="5" stroke-linecap="round"></line>
        <circle cx="${x}" cy="${y}" r="18" fill="${flower.color}"></circle>
      </g>
    `;
  }).join('');

  return `
    <svg viewBox="0 0 280 220" role="img" aria-label="Bouquet preview">
      <rect x="55" y="150" width="170" height="34" rx="16" fill="#f7d7e8"></rect>
      ${stems}
    </svg>
  `;
}

function updatePreview() {
  const selectedFlowers = flowers.filter((flower) => state[flower.id] > 0);
  const total = selectedFlowers.reduce((sum, flower) => sum + flower.price * state[flower.id], 0);
  totalPriceEl.textContent = `₹${total}`;
  previewAreaEl.innerHTML = buildPreviewSvg(selectedFlowers);

  if (selectedFlowers.length === 0) {
    selectionSummaryEl.innerHTML = '<p>No flowers selected yet.</p>';
    return;
  }

  const lines = selectedFlowers.map((flower) => `${flower.name}: ${state[flower.id]}`).join('<br>');
  selectionSummaryEl.innerHTML = `<strong>Selected flowers:</strong><br>${lines}`;
}

function resetBouquet() {
  flowers.forEach((flower) => {
    state[flower.id] = 0;
  });
  cartMessageEl.textContent = '';
  renderFlowers();
  updatePreview();
}

function addToCart() {
  const selectedFlowers = flowers.filter((flower) => state[flower.id] > 0);
  if (selectedFlowers.length === 0) {
    cartMessageEl.textContent = 'Please choose at least one flower.';
    return;
  }

  const total = selectedFlowers.reduce((sum, flower) => sum + flower.price * state[flower.id], 0);
  cartMessageEl.textContent = `Bouquet added to cart for ₹${total}.`;
}

flowerList.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;

  const { action, flower } = button.dataset;
  if (action === 'plus') {
    state[flower] += 1;
  } else if (action === 'minus') {
    state[flower] = Math.max(0, state[flower] - 1);
  }

  cartMessageEl.textContent = '';
  renderFlowers();
  updatePreview();
});

document.getElementById('resetBouquet').addEventListener('click', resetBouquet);
document.getElementById('addToCartBtn').addEventListener('click', addToCart);

renderFlowers();
updatePreview();
