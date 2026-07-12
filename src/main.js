import './styles.css';
import {
  initFirebaseService,
  onAuthStateChanged,
  getCurrentUser,
  getUserHandle,
  createPost,
  getPost,
  updatePost,
  deletePost,
  subscribeToPosts,
  toggleLike,
  isPostLiked,
  toggleSave,
  isPostSaved,
  addComment,
  deleteComment,
  subscribeToComments,
  uploadAttachment,
  deleteAttachment,
  createUserProfile,
  getUserProfile,
  updateUserProfile,
  uploadAvatar
} from './firebase-service.js';

const COMPONENTS = [
  'sddm', 'plasma', 'aurorae', 'kvantum', 'gtk', 'icons', 'cursors',
  'colorscheme', 'wallpaper', 'eww', 'waybar', 'rofi', 'conky', 'terminal',
  'hyprland', 'sway', 'dotfiles', 'full-rice'
];

const FILE_LIMIT = 950_000;

const seedPosts = [
  {
    id: 'seed-1',
    author: 'voidmaintainer',
    handle: 'voidmaintainer',
    title: 'black terminal rice index skeleton',
    component: 'full-rice',
    distro: 'arch',
    wm: 'sway',
    license: 'mit',
    summary: 'starter specimen showing the expected shape: screenshots, config notes, component tags, comments, saves. replace this with real public submissions when backend lands.',
    tags: ['terminal', 'red-black', 'pixel-font', 'prototype'],
    links: ['https://store.kde.org/', 'https://www.gnome-look.org/'],
    attachments: [],
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now() - 86400000,
    likesCount: 1,
    savesCount: 0,
    commentsCount: 1,
    comments: [
      { id: crypto.randomUUID(), author: 'indexbot', text: 'seed post. local-only. delete when real submissions exist.', createdAt: Date.now() - 86000000 }
    ]
  }
];

let state = {
  query: '',
  component: 'all',
  sort: 'hot',
  handle: 'anonymous-rice-ghoul',
  composerOpen: false,
  drafts: { attachments: [] },
  posts: [],
  userLikes: new Set(),
  userSaves: new Set(),
  firebaseReady: false,
  firebaseUser: null
};

async function init() {
  const { isFirebaseConfigured } = await import('./firebase-init.js');
  
  if (isFirebaseConfigured()) {
    try {
      await initFirebaseService(false);
      onAuthStateChanged(handleAuthChange);
      state.firebaseReady = true;
    } catch (e) {
      console.warn('[ricehub] Firebase init failed, falling back to localStorage:', e);
      state.firebaseReady = false;
      loadLocalDb();
    }
  } else {
    console.log('[ricehub] Running in localStorage mode (no Firebase config)');
    state.firebaseReady = false;
    loadLocalDb();
  }
  
  render();
  bindEvents();
}

function handleAuthChange(user) {
  state.firebaseUser = user;
  if (user) {
    state.handle = user.displayName || user.uid;
    loadUserProfile();
  } else {
    state.handle = localStorage.getItem('ricehub.handle.v1') || 'anonymous-rice-ghoul';
    loadLocalDb();
  }
  render();
}

async function loadUserProfile() {
  if (!state.firebaseUser) return;
  try {
    const profile = await getUserProfile(state.firebaseUser.uid);
    if (profile) {
      state.handle = profile.handle;
    } else {
      await createUserProfile({ handle: state.handle });
    }
  } catch (e) {
    console.warn('[ricehub] Failed to load user profile:', e);
  }
}

function loadLocalDb() {
  const DB_KEY = 'ricehub.db.v1';
  const USER_KEY = 'ricehub.handle.v1';
  
  const raw = localStorage.getItem(DB_KEY);
  if (!raw) {
    state.posts = seedPosts;
    saveLocalDb();
  } else {
    try {
      const parsed = JSON.parse(raw);
      state.posts = Array.isArray(parsed.posts) ? parsed.posts : seedPosts;
    } catch {
      state.posts = seedPosts;
      saveLocalDb();
    }
  }
  
  state.handle = localStorage.getItem(USER_KEY) || 'anonymous-rice-ghoul';
}

function saveLocalDb() {
  const DB_KEY = 'ricehub.db.v1';
  localStorage.setItem(DB_KEY, JSON.stringify({ posts: state.posts, createdAt: Date.now() }));
  localStorage.setItem('ricehub.handle.v1', state.handle);
}

function setHandle(value) {
  const next = clean(value).replace(/\s+/g, '-').slice(0, 32) || 'anonymous-rice-ghoul';
  state.handle = next;
  
  if (state.firebaseReady && state.firebaseUser) {
    updateUserProfile({ handle: next }).catch(console.error);
  } else {
    localStorage.setItem('ricehub.handle.v1', next);
  }
  
  render();
}

function clean(value) {
  return String(value ?? '').trim();
}

function esc(value) {
  return String(value ?? '').replace(/[&<>'"]/g, ch => {
    if (ch === '&') return '&';
    if (ch === '<') return '<';
    if (ch === '>') return '>';
    if (ch === "'") return "\'";
    if (ch === '"') return '"';
    return ch;
  });
}

function timeAgo(ts) {
  if (!ts) return 'unknown';
  const diff = Date.now() - (ts.toMillis ? ts.toMillis() : ts);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  return new Date(ts.toMillis ? ts.toMillis() : ts).toLocaleDateString();
}

function postScore(post) {
  return (post.likesCount || 0) * 4 + (post.commentsCount || 0) * 2 + (post.savesCount || 0) * 3;
}

function filteredPosts() {
  const q = state.query.toLowerCase();
  let posts = [...state.posts];
  
  if (state.component !== 'all') {
    posts = posts.filter(p => p.component === state.component);
  }
  
  if (q) {
    posts = posts.filter(p => 
      [p.title, p.author, p.handle, p.summary, p.component, p.distro, p.wm, ...(p.tags || [])]
        .join(' ').toLowerCase().includes(q)
    );
  }
  
  posts.sort((a, b) => {
    if (state.sort === 'new') return b.createdAt - a.createdAt;
    if (state.sort === 'saved') return (b.savesCount || 0) - (a.savesCount || 0);
    return postScore(b) - postScore(a) || b.createdAt - a.createdAt;
  });
  
  return posts;
}

function render() {
  const root = document.getElementById('app');
  const posts = filteredPosts();
  
  root.innerHTML = `
    <header class="topbar">
      <a class="brand" href="#" data-action="home">
        <span class="sigil">░</span>
        <span><b>ricehub</b><small>linux theming social index</small></span>
      </a>
      <nav>
        ${state.firebaseReady ? `
          <span data-action="auth-status" class="auth-badge">${state.firebaseUser ? `🔓 @${esc(state.handle)}` : '🔒 sign in'}</span>
        ` : `
          <span class="auth-badge local-mode">local storage</span>
        `}
        <button data-action="toggle-composer">${state.composerOpen ? 'close composer' : 'post rice'}</button>
        <button data-action="export">export db</button>
        <label class="import-label">import<input id="import-file" type="file" accept="application/json"></label>
      </nav>
    </header>

    <main class="shell">
      <section class="hero panel">
        <div>
          <p class="eyebrow">/home/share/.themes</p>
          <h1>a living index for linux rice.</h1>
          <p class="lead">post plasma themes, sddm screens, kvantum configs, icon packs, wallpapers, widgets, screenshots, dotfiles. like the good ones. save the ones you will pretend to install later.</p>
        </div>
        <aside class="statbox" aria-label="local database stats">
          <span><b>${state.posts.length}</b> posts</span>
          <span><b>${new Set(state.posts.map(p => p.component)).size}</b> components</span>
          <span><b>${state.posts.reduce((n, p) => n + (p.attachments?.length || 0), 0)}</b> assets</span>
          <span><b>${state.posts.reduce((n, p) => n + (p.commentsCount || 0), 0)}</b> comments</span>
        </aside>
      </section>

      <section class="identity panel">
        <label>posting as <input id="handle-input" value="${esc(state.handle)}" maxlength="32"></label>
        <p>${state.firebaseReady ? 'firebase mode. changes sync across devices.' : 'local-first prototype. nothing leaves this browser yet. export json if you want to keep the little creature alive.'}</p>
      </section>

      ${state.composerOpen ? composerHtml() : ''}

      <section class="filters panel">
        <input id="search" placeholder="search tags, wm, distro, title..." value="${esc(state.query)}">
        <select id="component-filter">
          <option value="all">all components</option>
          ${COMPONENTS.map(c => `<option value="${c}" ${state.component === c ? 'selected' : ''}>${c}</option>`).join('')}
        </select>
        <select id="sort-filter">
          <option value="hot" ${state.sort === 'hot' ? 'selected' : ''}>hot</option>
          <option value="new" ${state.sort === 'new' ? 'selected' : ''}>new</option>
          <option value="saved" ${state.sort === 'saved' ? 'selected' : ''}>saved first</option>
        </select>
      </section>

      <section class="feed" aria-live="polite">
        ${posts.length ? posts.map(postHtml).join('') : emptyHtml()}
      </section>
    </main>
  `;
  
  bindEvents();
  bindPostEvents();
}

function composerHtml() {
  return `
    <section class="composer panel">
      <div class="section-title"><span>new specimen</span><button data-action="toggle-composer">close</button></div>
      <form id="post-form">
        <div class="grid2">
          <label>title<input name="title" required maxlength="90" placeholder="catppuccin-but-worse plasma port"></label>
          <label>component<select name="component">${COMPONENTS.map(c => `<option value="${c}">${c}</option>`).join('')}</select></label>
          <label>distro<input name="distro" placeholder="arch, nixos, fedora..."></label>
          <label>wm/de<input name="wm" placeholder="kde, hyprland, sway..."></label>
          <label>license<input name="license" placeholder="mit, gpl, cc-by, unknown"></label>
          <label>links<input name="links" placeholder="repo/demo/source urls, comma separated"></label>
        </div>
        <label>summary<textarea name="summary" required rows="4" placeholder="what is it, what does it skin, install notes, caveats"></textarea></label>
        <label>tags<input name="tags" placeholder="red-black, bitmap, gruvbox, brutalist"></label>
        <label class="file-drop">attachments<input id="asset-input" type="file" multiple accept="image/*,.css,.scss,.conf,.json,.yaml,.yml,.toml,.txt,.sh,.md,.kvconfig,.colors,.tar,.gz,.zip"></label>
        <div id="draft-assets" class="draft-assets">${draftAssetsHtml()}</div>
        <button class="primary" type="submit">publish locally</button>
      </form>
    </section>
  `;
}

function draftAssetsHtml() {
  if (!state.drafts.attachments.length) return '<p>no attachments staged.</p>';
  return state.drafts.attachments.map(a => `
    <div class="asset-chip">
      <span>${a.kind === 'image' && a.dataUrl ? `<img src="${a.dataUrl}" alt="">` : '▤'}</span>
      <b>${esc(a.name)}</b>
      <small>${formatBytes(a.size)} · ${esc(a.kind)}</small>
    </div>
  `).join('');
}

function postHtml(post) {
  const liked = state.userLikes.has(post.id);
  const saved = state.userSaves.has(post.id);
  const isOwner = state.firebaseReady && state.firebaseUser && post.handle === state.firebaseUser.uid;
  
  return `
    <article class="post panel" data-post-id="${post.id}">
      <div class="post-head">
        <div>
          <p class="eyebrow">${esc(post.component)} / ${esc(post.wm || 'wm?')} / ${esc(post.distro || 'distro?')}</p>
          <h2>${esc(post.title)}</h2>
        </div>
        <span class="age">${timeAgo(post.createdAt)}</span>
      </div>
      <p class="summary">${esc(post.summary)}</p>
      <div class="meta">
        <span>by @${esc(post.author)}</span>
        <span>license: ${esc(post.license || 'unknown')}</span>
      </div>
      ${(post.tags || []).length ? `<div class="tags">${post.tags.map(t => `<button data-action="tag" data-tag="${esc(t)}">#${esc(t)}</button>`).join('')}</div>` : ''}
      ${assetGalleryHtml(post.attachments || [])}
      ${linksHtml(post.links || [])}
      <div class="actions">
        <button data-action="like" data-post-id="${post.id}">${liked ? 'unlike' : 'like'} <b>${post.likesCount || 0}</b></button>
        <button data-action="save" data-post-id="${post.id}">${saved ? 'saved' : 'save'} <b>${post.savesCount || 0}</b></button>
        <button data-action="copy-link" data-post-id="${post.id}">copy id</button>
        ${isOwner ? `<button data-action="delete" data-post-id="${post.id}">delete</button>` : ''}
      </div>
      <details class="comments" ${post.commentsCount ? 'open' : ''}>
        <summary>comments (${post.commentsCount || 0})</summary>
        <div class="comment-list" data-comments-for="${post.id}"></div>
        <form class="comment-form" data-post-id="${post.id}">
          <input name="text" required maxlength="400" placeholder="leave install notes, praise, warnings...">
          <button type="submit">comment</button>
        </form>
      </details>
    </article>
  `;
}

function assetGalleryHtml(assets) {
  if (!assets.length) return '<div class="no-assets">no files attached</div>';
  return `<div class="assets">${assets.map(a => {
    if (a.kind === 'image' && a.url) return `<a href="${a.url}" target="_blank" class="shot"><img src="${a.url}" alt="${esc(a.name)}"><span>${esc(a.name)}</span></a>`;
    if (a.url) return `<a download="${esc(a.name)}" href="${a.url}" class="file-card"><b>▤ ${esc(a.name)}</b><small>${formatBytes(a.size)} · download</small></a>`;
    return `<div class="file-card"><b>▤ ${esc(a.name)}</b><small>${formatBytes(a.size)} · metadata only</small></div>`;
  }).join('')}</div>`;
}

function linksHtml(links) {
  const cleanLinks = links.filter(Boolean);
  if (!cleanLinks.length) return '';
  return `<div class="links">${cleanLinks.map((l, i) => `<a target="_blank" rel="noreferrer" href="${esc(l)}">link ${i + 1}</a>`).join('')}</div>`;
}

function emptyHtml() {
  return `<div class="empty panel"><h2>no matching rice.</h2><p>loosen the filter or post the first specimen.</p></div>`;
}

function bindEvents() {
  document.querySelectorAll('[data-action="toggle-composer"]').forEach(btn => 
    btn.addEventListener('click', () => { state.composerOpen = !state.composerOpen; render(); })
  );
  
  document.getElementById('handle-input')?.addEventListener('change', e => setHandle(e.target.value));
  document.getElementById('search')?.addEventListener('input', e => { state.query = e.target.value; render(); });
  document.getElementById('component-filter')?.addEventListener('change', e => { state.component = e.target.value; render(); });
  document.getElementById('sort-filter')?.addEventListener('change', e => { state.sort = e.target.value; render(); });
  
  document.querySelector('[data-action="export"]')?.addEventListener('click', exportDb);
  document.getElementById('import-file')?.addEventListener('change', importDb);
  document.getElementById('asset-input')?.addEventListener('change', stageFiles);
  document.getElementById('post-form')?.addEventListener('submit', submitPost);
  
  // Auth status click
  document.querySelector('[data-action="auth-status"]')?.addEventListener('click', () => {
    alert(state.firebaseReady ? 
      (state.firebaseUser ? 'signed in as ' + state.handle + '. firebase auth configured.' : 'not signed in. configure VITE_FIREBASE_* env vars and deploy to enable auth.') :
      'localStorage mode. no firebase configured.'
    );
  });
}

function bindPostEvents() {
  document.querySelectorAll('[data-action="like"]').forEach(btn => 
    btn.addEventListener('click', () => handlePostAction('like', btn.dataset.postId))
  );
  document.querySelectorAll('[data-action="save"]').forEach(btn => 
    btn.addEventListener('click', () => handlePostAction('save', btn.dataset.postId))
  );
  document.querySelectorAll('[data-action="copy-link"]').forEach(btn => 
    btn.addEventListener('click', () => navigator.clipboard?.writeText(btn.dataset.postId))
  );
  document.querySelectorAll('[data-action="delete"]').forEach(btn => 
    btn.addEventListener('click', () => handlePostAction('delete', btn.dataset.postId))
  );
  document.querySelectorAll('.comment-form').forEach(form => 
    form.addEventListener('submit', (e) => handleCommentSubmit(e, form.dataset.postId))
  );
  document.querySelectorAll('[data-action="tag"]').forEach(btn => 
    btn.addEventListener('click', () => { state.query = btn.dataset.tag; render(); })
  );
  
  // Load comments for each post
  document.querySelectorAll('.comment-list').forEach(el => {
    const postId = el.dataset.commentsFor;
    if (state.firebaseReady && state.firebaseUser) {
      subscribeToComments(postId, (comments) => {
        el.innerHTML = comments.length ? 
          comments.map(c => `<p><b>@${esc(c.author)}</b> <span>${timeAgo(c.createdAt)}</span><br>${esc(c.text)}</p>`).join('') :
          '<p class="muted">no comments. pristine and suspicious.</p>';
      });
    } else {
      const post = state.posts.find(p => p.id === postId);
      if (post?.comments?.length) {
        el.innerHTML = post.comments.map(c => `<p><b>@${esc(c.author)}</b> <span>${timeAgo(c.createdAt)}</span><br>${esc(c.text)}</p>`).join('');
      } else {
        el.innerHTML = '<p class="muted">no comments. pristine and suspicious.</p>';
      }
    }
  });
}

async function handlePostAction(action, postId) {
  if (state.firebaseReady && state.firebaseUser) {
    try {
      if (action === 'like') {
        await toggleLike(postId);
        const liked = await isPostLiked(postId);
        state.userLikes.set(postId, liked);
      } else if (action === 'save') {
        await toggleSave(postId);
        const saved = await isPostSaved(postId);
        state.userSaves.set(postId, saved);
      } else if (action === 'delete') {
        if (!confirm('delete this post?')) return;
        await deletePost(postId);
        state.posts = state.posts.filter(p => p.id !== postId);
      }
      render();
    } catch (e) {
      alert(`action failed: ${e.message}`);
    }
  } else {
    // Local mode
    const post = state.posts.find(p => p.id === postId);
    if (!post) return;
    
    if (action === 'like') {
      post.likes = post.likes || [];
      const i = post.likes.indexOf(state.handle);
      if (i >= 0) post.likes.splice(i, 1);
      else post.likes.push(state.handle);
      post.likesCount = post.likes.length;
    } else if (action === 'save') {
      post.saves = post.saves || [];
      const i = post.saves.indexOf(state.handle);
      if (i >= 0) post.saves.splice(i, 1);
      else post.saves.push(state.handle);
      post.savesCount = post.saves.length;
    } else if (action === 'delete') {
      if (!confirm('delete this post?')) return;
      state.posts = state.posts.filter(p => p.id !== postId);
    }
    saveLocalDb();
    render();
  }
}

async function handleCommentSubmit(event, postId) {
  event.preventDefault();
  const input = event.currentTarget.elements.text;
  const text = clean(input.value);
  if (!text) return;
  
  if (state.firebaseReady && state.firebaseUser) {
    try {
      await addComment(postId, text);
      input.value = '';
      render();
    } catch (e) {
      alert(`comment failed: ${e.message}`);
    }
  } else {
    const post = state.posts.find(p => p.id === postId);
    if (!post) return;
    post.comments = post.comments || [];
    post.comments.push({
      id: crypto.randomUUID(),
      author: state.handle,
      text,
      createdAt: Date.now()
    });
    post.commentsCount = post.comments.length;
    saveLocalDb();
    render();
  }
}

async function stageFiles(event) {
  const files = [...event.target.files];
  const staged = [];
  
  for (const file of files) {
    const kind = file.type.startsWith('image/') ? 'image' : 'file';
    const item = { id: crypto.randomUUID(), name: file.name, type: file.type || 'application/octet-stream', size: file.size, kind };
    if (file.size <= FILE_LIMIT) item.dataUrl = await readAsDataUrl(file);
    staged.push(item);
  }
  
  state.drafts.attachments = staged;
  render();
}

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function submitPost(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  
  const postData = {
    title: clean(form.get('title')),
    component: clean(form.get('component')),
    distro: clean(form.get('distro')),
    wm: clean(form.get('wm')),
    license: clean(form.get('license')) || 'unknown',
    summary: clean(form.get('summary')),
    tags: clean(form.get('tags')).split(',').map(t => t.trim().replace(/^#/, '')).filter(Boolean),
    links: clean(form.get('links')).split(',').map(l => l.trim()).filter(Boolean),
    attachments: state.drafts.attachments
  };
  
  if (state.firebaseReady && state.firebaseUser) {
    try {
      // Upload attachments first
      const postId = await createPost(postData);
      for (const attachment of state.drafts.attachments) {
        if (attachment.dataUrl) {
          const blob = await (await fetch(attachment.dataUrl)).blob();
          const file = new File([blob], attachment.name, { type: attachment.type });
          await uploadAttachment(postId, file);
        }
      }
      state.drafts.attachments = [];
      state.composerOpen = false;
      render();
    } catch (e) {
      alert(`publish failed: ${e.message}`);
    }
  } else {
    // Local mode
    const post = {
      id: crypto.randomUUID(),
      author: state.handle,
      handle: state.handle,
      ...postData,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      likesCount: 0,
      savesCount: 0,
      commentsCount: 0,
      likes: [],
      saves: [],
      comments: []
    };
    state.posts.unshift(post);
    state.drafts.attachments = [];
    state.composerOpen = false;
    saveLocalDb();
    render();
  }
}

function exportDb() {
  const blob = new Blob([JSON.stringify({ posts: state.posts, createdAt: Date.now() }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ricehub-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importDb(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const imported = JSON.parse(reader.result);
      if (!Array.isArray(imported.posts)) throw new Error('missing posts[]');
      state.posts = imported.posts;
      saveLocalDb();
      render();
    } catch (err) {
      alert(`bad ricehub export: ${err.message}`);
    }
  };
  reader.readAsText(file);
}

function formatBytes(bytes) {
  if (!bytes) return '0b';
  if (bytes < 1024) return `${bytes}b`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}kb`;
  return `${(bytes / 1024 / 1024).toFixed(1)}mb`;
}

init();

export { state };