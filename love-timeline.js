const STORAGE_KEY = 'love-story-timeline-posts';
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const postsList = document.getElementById('postsList');
const postForm = document.getElementById('postForm');
const viewerNameInput = document.getElementById('viewerName');
const storyTextInput = document.getElementById('storyText');
const mediaInput = document.getElementById('mediaInput');
const uploadStatus = document.getElementById('uploadStatus');

const samplePosts = [
  {
    id: crypto.randomUUID(),
    authorName: 'Aarav & Naina',
    createdAt: new Date().toISOString(),
    story: 'We met under the stars during a rainy evening and knew this would become a story worth telling forever.',
    media: '',
    comments: [
      {
        id: crypto.randomUUID(),
        author: 'Mira',
        text: 'This feels so heartfelt and beautiful.',
        createdAt: new Date().toISOString(),
        replies: []
      }
    ]
  }
];

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatDate(value) {
  return new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

function getSignedInName() {
  const storedUser = localStorage.getItem('love-gifts-auth-user');
  if (!storedUser) return 'Guest';

  try {
    const parsedUser = JSON.parse(storedUser);
    return parsedUser?.name?.trim() || 'Guest';
  } catch (error) {
    return 'Guest';
  }
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function setUploadStatus(message, isError = false) {
  if (!uploadStatus) return;
  uploadStatus.textContent = message;
  uploadStatus.style.color = isError ? '#c0392b' : '#756273';
}

function getPosts() {
  const savedPosts = localStorage.getItem(STORAGE_KEY);
  if (!savedPosts) return samplePosts;
  try {
    return JSON.parse(savedPosts);
  } catch (error) {
    return samplePosts;
  }
}

function savePosts(posts) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
}

function renderComment(comment, post, depth = 0) {
  const activeName = (viewerNameInput.value.trim() || getSignedInName()).trim();
  const canReply = activeName === post.authorName;
  return `
    <div class="comment-item" style="margin-left:${depth * 16}px;">
      <div class="comment-meta">
        <strong>${escapeHtml(comment.author)}</strong>
        <span>${formatDate(comment.createdAt)}</span>
      </div>
      <p>${escapeHtml(comment.text)}</p>
      ${canReply ? `<button class="reply-btn" data-post-id="${post.id}" data-comment-id="${comment.id}">Reply</button>` : ''}
      ${comment.replies && comment.replies.length ? comment.replies.map((reply) => renderComment(reply, post, depth + 1)).join('') : ''}
      ${canReply ? `<form class="reply-form" data-post-id="${post.id}" data-comment-id="${comment.id}">
        <input type="text" class="reply-name" placeholder="Your name" value="${escapeHtml(activeName)}" required />
        <textarea class="reply-text" placeholder="Write a reply..." required></textarea>
        <button type="submit" class="btn btn-primary">Reply</button>
      </form>` : ''}
    </div>
  `;
}

function renderPosts() {
  const currentName = (viewerNameInput.value.trim() || getSignedInName()).trim();
  if (!viewerNameInput.value.trim()) {
    viewerNameInput.value = currentName;
  }

  const posts = getPosts();
  if (!posts.length) {
    postsList.innerHTML = '<p class="small-note">No stories yet. Share your first memory.</p>';
    return;
  }

  postsList.innerHTML = posts
    .slice()
    .reverse()
    .map((post) => {
      const isVideo = post.mediaType === 'video';
      return `
        <article class="story-post">
          <div class="post-header">
            <h3>${escapeHtml(post.authorName)}</h3>
            <span class="post-time">${formatDate(post.createdAt)}</span>
          </div>
          <p class="story-text">${escapeHtml(post.story)}</p>
          ${post.media ? (isVideo ? `<video class="story-video" controls src="${post.media}"></video>` : `<img class="story-media" src="${post.media}" alt="${escapeHtml(post.story)}" />`) : ''}
          <div class="comments-box">
            <form class="comment-form" data-post-id="${post.id}">
              <input type="text" class="comment-name" placeholder="Your name" value="${escapeHtml(currentName)}" required />
              <textarea class="comment-text" placeholder="Write a comment..." required></textarea>
              <button type="submit" class="btn btn-primary">Comment</button>
            </form>
            <div class="comment-list">
              ${post.comments && post.comments.length ? post.comments.map((comment) => renderComment(comment, post)).join('') : '<p class="small-note">No comments yet. Be the first to share your thoughts.</p>'}
            </div>
          </div>
        </article>
      `;
    })
    .join('');
}

postForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const authorName = (viewerNameInput.value.trim() || getSignedInName()).trim();
  const story = storyTextInput.value.trim();
  const file = mediaInput.files[0];

  if (!authorName || !story) return;

  if (file && file.size > MAX_FILE_SIZE_BYTES) {
    setUploadStatus('Please choose a file smaller than 5 MB.', true);
    return;
  }

  let mediaUrl = '';
  let mediaType = '';

  if (file) {
    mediaUrl = await readFileAsDataUrl(file);
    mediaType = file.type.startsWith('video') ? 'video' : 'image';
  }

  const posts = getPosts();
  posts.push({
    id: crypto.randomUUID(),
    authorName,
    createdAt: new Date().toISOString(),
    story,
    media: mediaUrl,
    mediaType,
    comments: []
  });

  savePosts(posts);
  postForm.reset();
  viewerNameInput.value = getSignedInName();
  storyTextInput.value = '';
  setUploadStatus('Maximum file size: 5 MB.');
  renderPosts();
});

postsList.addEventListener('submit', (event) => {
  const form = event.target.closest('.comment-form');
  if (!form) return;

  event.preventDefault();
  const postId = form.dataset.postId;
  const nameInput = form.querySelector('.comment-name');
  const textInput = form.querySelector('.comment-text');
  const author = nameInput.value.trim();
  const text = textInput.value.trim();

  if (!author || !text) return;

  const posts = getPosts();
  const post = posts.find((item) => item.id === postId);
  if (!post) return;

  post.comments.push({
    id: crypto.randomUUID(),
    author,
    text,
    createdAt: new Date().toISOString(),
    replies: []
  });

  savePosts(posts);
  renderPosts();
});

postsList.addEventListener('submit', (event) => {
  const form = event.target.closest('.reply-form');
  if (!form) return;

  event.preventDefault();
  const postId = form.dataset.postId;
  const commentId = form.dataset.commentId;
  const nameInput = form.querySelector('.reply-name');
  const textInput = form.querySelector('.reply-text');
  const author = nameInput.value.trim();
  const text = textInput.value.trim();

  if (!author || !text) return;

  const posts = getPosts();
  const post = posts.find((item) => item.id === postId);
  if (!post) return;

  const addReply = (comments) => {
    for (const comment of comments) {
      if (comment.id === commentId) {
        comment.replies.push({
          id: crypto.randomUUID(),
          author,
          text,
          createdAt: new Date().toISOString(),
          replies: []
        });
        return true;
      }
      if (comment.replies && comment.replies.length && addReply(comment.replies)) {
        return true;
      }
    }
    return false;
  };

  addReply(post.comments);
  savePosts(posts);
  renderPosts();
});

postsList.addEventListener('click', (event) => {
  const button = event.target.closest('.reply-btn');
  if (!button) return;

  const form = postsList.querySelector(`.reply-form[data-post-id="${button.dataset.postId}"][data-comment-id="${button.dataset.commentId}"]`);
  if (form) {
    form.classList.toggle('open');
  }
});

viewerNameInput.addEventListener('input', () => {
  renderPosts();
});

mediaInput.addEventListener('change', () => {
  const file = mediaInput.files[0];
  if (!file) {
    setUploadStatus('Maximum file size: 5 MB.');
    return;
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    setUploadStatus('Please choose a file smaller than 5 MB.', true);
  } else {
    setUploadStatus('Maximum file size: 5 MB.');
  }
});

viewerNameInput.value = getSignedInName();
setUploadStatus('Maximum file size: 5 MB.');
renderPosts();
