import './styles.css';

const DB_KEY = 'ricehub.db.v1';
const USER_KEY = 'ricehub.handle.v1';

const COMPONENTS = [
  'sddm', 'plasma', 'aurorae', 'kvantum', 'gtk', 'icons', 'cursors',
  'colorscheme', 'wallpaper', 'eww', 'waybar', 'rofi', 'conky', 'terminal',
  'hyprland', 'sway', 'dotfiles', 'full-rice'
];

const FILE_LIMIT = 950_000;

const seedPosts = [
  {
    id: crypto.randomUUID(),
    author: 'voidmaintainer',
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
    likes: ['system'],
    saves: [],
    comments: [
      { id: crypto.randomUUID(), author: 'indexbot', text: 'seed post. local-only. delete when real submissions exist.', createdAt: Date.now() - 86000000 }
    ]
  }
];

let db = loadDb();
let state = {
  query: '',
  component: 'all',
  sort: 'hot',
  handle: localStorage.getItem(USER_KEY) || 'anonymous-rice-ghoul',
  composerOpen: false,
  drafts: { attachments: [] }
};

function loadDb() {
  const raw = localStorage.getItem(DB_KEY);
  if (!raw) return { posts: seedPosts, createdAt: Date.now() };
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.posts)) throw new Error('bad db');
    return parsed;
  } catch {
    return { posts: seedPosts, createdAt: Date.now() };
  }
}

function saveDb() {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

function setHandle(value) {
  const next = clean(value).replace(/\s+/g, '-').slice(0, 32) || 'anonymous-rice-ghoul';
  state.handle = next;
  localStorage.setItem(USER_KEY, next);
  render();
}

function clean(value) {
  return String(value ?? '').trim();
}

function esc(value) {
  return String(value ?? '').replace(/[&<>'"]/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[ch]));
}

function timeAgo(ts) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  return new Date(ts).toLocaleDateString();
}

function postScore(post) {
  return (post.likes?.length || 0) * 4 + (post.comments?.length || 0) * 2 + (post.saves?.length || 0) * 3;
}

function filteredPosts() {
  const q = state.query.toLowerCase();
  let posts = [...db.posts];
  if (state.component !== 'all') posts = posts.filter(p => p.component === state.component);
  if (q) {
    posts = posts.filter(p => [p.title, p.author, p.summary, p.component, p.distro, p.wm, ...(p.tags || [])]
      .join(' ').toLowerCase().includes(q));
  }
  posts.sort((a, b) => {
    if (state.sort === 'new') return b.createdAt - a.createdAt;
    if (state.sort === 'saved') return (b.saves?.includes(state.handle) ? 1 : 0) - (a.saves?.includes(state.handle) ? 1 : 0);
    return postScore(b) - postScore(a) || b.createdAt - a.createdAt;
  });
  return posts;
}

function appStats() {
  const posts = db.posts;
  const components = new Set(posts.map(p => p.component)).size;
  const assets = posts.reduce((n, p) => n + (p.attachments?.length || 0), 0);
  const comments = posts.reduce((n, p) => n + (p.comments?.length || 0), 0);
  return { posts: posts.length, components, assets, comments };
}

function render() {
  const root = document.getElementById('app');
  const stats = appStats();
  const posts = filteredPosts();
  root.innerHTML = `
    <header class="topbar">
      <a class="brand" href="#" data-action="home">
        <span class="sigil">░</span>
        <span><b>ricehub</b><small>linux theming social index</small></span>
      </a>
      <nav>
        <button data-action="toggle-composer">post rice</button>
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
          <span><b>${stats.posts}</b> posts</span>
          <span><b>${stats.components}</b> components</span>
          <span><b>${stats.assets}</b> assets</span>
          <span><b>${stats.comments}</b> comments</span>
        </aside>
      </section>

      <section class="identity panel">
        <label>posting as <input id="handle-input" value="${esc(state.handle)}" maxlength="32"></label>
        <p>local-first prototype. nothing leaves this browser yet. export json if you want to keep the little creature alive.</p>
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
  const liked = post.likes?.includes(state.handle);
  const saved = post.saves?.includes(state.handle);
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
        <button data-action="like">${liked ? 'unlike' : 'like'} <b>${post.likes?.length || 0}</b></button>
        <button data-action="save">${saved ? 'saved' : 'save'} <b>${post.saves?.length || 0}</b></button>
        <button data-action="copy-link">copy id</button>
      </div>
      <details class="comments" ${post.comments?.length ? 'open' : ''}>
        <summary>comments (${post.comments?.length || 0})</summary>
        <div class="comment-list">
          ${(post.comments || []).map(c => `<p><b>@${esc(c.author)}</b> <span>${timeAgo(c.createdAt)}</span><br>${esc(c.text)}</p>`).join('') || '<p class="muted">no comments. pristine and suspicious.</p>'}
        </div>
        <form class="comment-form">
          <input name="text" required maxlength="400" placeholder="leave install notes, praise, warnings...">
          <button>comment</button>
        </form>
      </details>
    </article>
  `;
}

function assetGalleryHtml(assets) {
  if (!assets.length) return '<div class="no-assets">no files attached</div>';
  return `<div class="assets">${assets.map(a => {
    if (a.kind === 'image' && a.dataUrl) return `<a href="${a.dataUrl}" target="_blank" class="shot"><img src="${a.dataUrl}" alt="${esc(a.name)}"><span>${esc(a.name)}</span></a>`;
    if (a.dataUrl) return `<a download="${esc(a.name)}" href="${a.dataUrl}" class="file-card"><b>▤ ${esc(a.name)}</b><small>${formatBytes(a.size)} · download</small></a>`;
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
  document.querySelectorAll('[data-action="toggle-composer"]').forEach(btn => btn.addEventListener('click', () => {
    state.composerOpen = !state.composerOpen;
    render();
  }));

  document.getElementById('handle-input')?.addEventListener('change', e => setHandle(e.target.value));
  document.getElementById('search')?.addEventListener('input', e => { state.query = e.target.value; render(); });
  document.getElementById('component-filter')?.addEventListener('change', e => { state.component = e.target.value; render(); });
  document.getElementById('sort-filter')?.addEventListener('change', e => { state.sort = e.target.value; render(); });

  document.querySelector('[data-action="export"]')?.addEventListener('click', exportDb);
  document.getElementById('import-file')?.addEventListener('change', importDb);
  document.getElementById('asset-input')?.addEventListener('change', stageFiles);
  document.getElementById('post-form')?.addEventListener('submit', submitPost);

  document.querySelectorAll('.post').forEach(postEl => {
    const post = db.posts.find(p => p.id === postEl.dataset.postId);
    postEl.querySelector('[data-action="like"]')?.addEventListener('click', () => toggleArray(post, 'likes'));
    postEl.querySelector('[data-action="save"]')?.addEventListener('click', () => toggleArray(post, 'saves'));
    postEl.querySelector('[data-action="copy-link"]')?.addEventListener('click', () => navigator.clipboard?.writeText(post.id));
    postEl.querySelector('.comment-form')?.addEventListener('submit', e => addComment(e, post));
  });

  document.querySelectorAll('[data-action="tag"]').forEach(btn => btn.addEventListener('click', () => {
    state.query = btn.dataset.tag;
    render();
  }));
}

function toggleArray(post, key) {
  post[key] ||= [];
  const i = post[key].indexOf(state.handle);
  if (i >= 0) post[key].splice(i, 1);
  else post[key].push(state.handle);
  saveDb();
  render();
}

function addComment(event, post) {
  event.preventDefault();
  const input = event.currentTarget.elements.text;
  const text = clean(input.value);
  if (!text) return;
  post.comments ||= [];
  post.comments.push({ id: crypto.randomUUID(), author: state.handle, text, createdAt: Date.now() });
  saveDb();
  render();
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

function submitPost(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const post = {
    id: crypto.randomUUID(),
    author: state.handle,
    title: clean(form.get('title')),
    component: clean(form.get('component')),
    distro: clean(form.get('distro')),
    wm: clean(form.get('wm')),
    license: clean(form.get('license')) || 'unknown',
    summary: clean(form.get('summary')),
    tags: clean(form.get('tags')).split(',').map(t => t.trim().replace(/^#/, '')).filter(Boolean),
    links: clean(form.get('links')).split(',').map(l => l.trim()).filter(Boolean),
    attachments: state.drafts.attachments,
    createdAt: Date.now(),
    likes: [],
    saves: [],
    comments: []
  };
  db.posts.unshift(post);
  state.drafts.attachments = [];
  state.composerOpen = false;
  saveDb();
  render();
}

function exportDb() {
  const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
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
      db = imported;
      saveDb();
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

render();
