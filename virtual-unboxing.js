const gifts = [
  {
    id: 'rose-bouquet',
    name: 'Rose Bouquet',
    price: '₹799',
    rating: '4.9 ★',
    image: 'https://images.unsplash.com/photo-1526047932273-341f2a7631f9?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'teddy-bear',
    name: 'Teddy Bear',
    price: '₹599',
    rating: '4.8 ★',
    image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'chocolate',
    name: 'Chocolate',
    price: '₹349',
    rating: '4.7 ★',
    image: 'https://images.unsplash.com/photo-1511381939415-ef5b08c73f80?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'jewellery',
    name: 'Jewellery',
    price: '₹1299',
    rating: '5.0 ★',
    image: 'https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'gift-box',
    name: 'Gift Box',
    price: '₹999',
    rating: '4.9 ★',
    image: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=800&q=80'
  }
];

const optionsContainer = document.getElementById('giftOptions');
const revealContainer = document.getElementById('giftReveal');
const openGiftBtn = document.getElementById('openGiftBtn');
const restartGiftBtn = document.getElementById('restartGiftBtn');
const scene = document.querySelector('.gift-box-scene');
const confetti = document.getElementById('confetti');

let selectedGift = gifts[0];
let audioContext;

function ensureAudioContext() {
  if (!audioContext) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    audioContext = new AudioCtx();
  }
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  return audioContext;
}

function playTone(frequency, duration, type = 'sine', volume = 0.04, delay = 0) {
  const ctx = ensureAudioContext();
  if (!ctx) return;

  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, ctx.currentTime + delay);
  gainNode.gain.setValueAtTime(volume, ctx.currentTime + delay);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delay + duration);

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.start(ctx.currentTime + delay);
  oscillator.stop(ctx.currentTime + delay + duration);
}

function playClickSound() {
  playTone(720, 0.08, 'square', 0.02);
  playTone(860, 0.05, 'triangle', 0.015, 0.04);
}

function playOpeningSound() {
  playTone(440, 0.14, 'triangle', 0.025);
  playTone(560, 0.12, 'sine', 0.02, 0.06);
}

function playCelebrationSound() {
  playTone(523.25, 0.14, 'triangle', 0.03);
  playTone(659.25, 0.12, 'sine', 0.025, 0.08);
  playTone(783.99, 0.16, 'triangle', 0.02, 0.16);
}

function renderOptions() {
  optionsContainer.innerHTML = gifts.map((gift) => `
    <button class="gift-option ${gift.id === selectedGift.id ? 'active' : ''}" data-gift="${gift.id}">
      ${gift.name}
    </button>
  `).join('');
}

function createConfetti() {
  confetti.innerHTML = '';
  const colors = ['#ff4d6d', '#ff7a9b', '#ffd166', '#ffffff'];
  for (let i = 0; i < 24; i += 1) {
    const piece = document.createElement('span');
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.top = `${Math.random() * 20}px`;
    piece.style.background = colors[i % colors.length];
    piece.style.animationDelay = `${Math.random() * 0.2}s`;
    confetti.appendChild(piece);
  }
}

function createSparkles() {
  const sparklePositions = [
    { left: '18%', top: '20%' },
    { left: '78%', top: '24%' },
    { left: '26%', top: '72%' },
    { left: '74%', top: '72%' }
  ];

  sparklePositions.forEach((position, index) => {
    const sparkle = document.createElement('span');
    sparkle.className = 'sparkle';
    sparkle.style.left = position.left;
    sparkle.style.top = position.top;
    sparkle.style.animationDelay = `${index * 0.08}s`;
    confetti.appendChild(sparkle);
  });
}

function triggerEffects() {
  createConfetti();
  createSparkles();
}

function revealGift() {
  playOpeningSound();
  scene.classList.add('open');
  triggerEffects();

  const gift = gifts.find((item) => item.id === selectedGift.id);
  revealContainer.innerHTML = `
    <div class="reveal-card">
      <img src="${gift.image}" alt="${gift.name}" />
      <h3>${gift.name}</h3>
      <div class="reveal-price">${gift.price}</div>
      <div class="reveal-rating">${gift.rating}</div>
      <div class="reveal-actions">
        <button>Add to Cart</button>
        <button>Buy Now</button>
        <button>Add to Wishlist</button>
      </div>
    </div>
  `;

  requestAnimationFrame(() => {
    const revealCard = revealContainer.querySelector('.reveal-card');
    if (revealCard) {
      revealCard.classList.add('visible');
      playCelebrationSound();
    }
  });
}

function resetGift() {
  scene.classList.remove('open');
  scene.classList.remove('closing');
  confetti.innerHTML = '';
  revealContainer.innerHTML = '<div class="gift-reveal-empty">Choose a gift and open it to reveal your surprise.</div>';
  revealContainer.querySelector('.gift-reveal-empty')?.classList.remove('hidden');
}

optionsContainer.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-gift]');
  if (!button) return;
  selectedGift = gifts.find((gift) => gift.id === button.dataset.gift);
  renderOptions();
  resetGift();
});

openGiftBtn.addEventListener('click', () => {
  if (!selectedGift) return;
  playClickSound();
  revealGift();
});

restartGiftBtn.addEventListener('click', () => {
  resetGift();
  renderOptions();
});

renderOptions();
resetGift();
