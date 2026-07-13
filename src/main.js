/**
 * ricehub — macintosh 90s terminal webcore aesthetic
 * linux theming social index with profiles, auth, news, theme of the day
 */

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

// ===== Theme Management =====

function initTheme() {
  const savedTheme = localStorage.getItem('ricehub-theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = savedTheme || (prefersDark ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', theme);
  return theme;
}

// Initialize theme immediately
initTheme();

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('ricehub-theme', newTheme);
  return newTheme;
}

// ===== SEO & Meta Tag Management =====

const BASE_URL = 'https://numbpill3d.github.io/ricehub';
const SITE_NAME = 'ricehub';
const SITE_DESCRIPTION = 'linux theming social index - discover and share kde plasma, gtk, hyprland, sway, waybar, rofi, terminal rice themes';

function updateMetaTags(meta) {
  const { title, description, url, image, type = 'website', card = 'summary_large_image' } = meta;
  
  // Update document title
  document.title = title || `${SITE_NAME} // linux theming social index`;
  
  // Update or create meta tags
  const updateTag = (selector, attr, value) => {
    if (!value) return;
    let el = document.querySelector(selector);
    if (!el) {
      el = document.createElement('meta');
      if (selector.startsWith('meta[property') || selector.startsWith('meta[name')) {
        const match = selector.match(/\[(property|name)="([^"]+)"\]/);
        if (match) {
          el.setAttribute(match[1], match[2]);
        }
      }
      document.head.appendChild(el);
    }
    el.setAttribute(attr, value);
  };
  
  // Standard meta tags
  updateTag('meta[name="description"]', 'content', description);
  updateTag('meta[name="twitter:card"]', 'content', card);
  updateTag('meta[name="twitter:title"]', 'content', title);
  updateTag('meta[name="twitter:description"]', 'content', description);
  updateTag('meta[name="twitter:image"]', 'content', image);
  updateTag('meta[property="og:title"]', 'content', title);
  updateTag('meta[property="og:description"]', 'content', description);
  updateTag('meta[property="og:image"]', 'content', image);
  updateTag('meta[property="og:url"]', 'content', url);
  updateTag('meta[property="og:type"]', 'content', type);
  updateTag('link[rel="canonical"]', 'href', url);
  
  // Update JSON-LD schema
  updateJsonLd(meta);
}

function updateJsonLd(meta) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': meta.type === 'article' ? 'BlogPosting' : 'WebPage',
    name: meta.title,
    description: meta.description,
    url: meta.url,
    image: meta.image,
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      logo: {
        '@type': 'ImageObject',
        url: `${BASE_URL}/icon-192.png`
      }
    },
    ...(meta.type === 'article' && {
      author: {
        '@type': 'Person',
        name: meta.author || 'ricehub community'
      },
      datePublished: meta.datePublished,
      dateModified: meta.dateModified,
      articleSection: meta.section || 'Linux Theming',
      keywords: meta.tags?.join(', ') || 'linux, ricing, themes, kde, gtk, hyprland, sway'
    })
  };
  
  let script = document.getElementById('json-ld-dynamic');
  if (!script) {
    script = document.createElement('script');
    script.id = 'json-ld-dynamic';
    script.type = 'application/ld+json';
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(schema, null, 2);
}

function getViewMeta(view, data = {}) {
  const baseMeta = {
    title: `${SITE_NAME} // linux theming social index`,
    description: SITE_DESCRIPTION,
    url: BASE_URL,
    image: `${BASE_URL}/og-image.png`,
    type: 'website',
    card: 'summary_large_image'
  };
  
  switch (view) {
    case 'home':
      return {
        ...baseMeta,
        title: 'ricehub // linux theming social index',
        description: 'discover and share linux ricing themes: kde plasma, gtk, hyprland, sway, waybar, rofi, terminal, and more. profiles, auth, comments, saves, likes.',
        url: BASE_URL + '/',
      };
      
    case 'feed':
      return {
        ...baseMeta,
        title: 'all themes - ricehub',
        description: 'browse all linux ricing themes. filter by component: kde plasma, gtk, hyprland, sway, waybar, rofi, terminal, sddm, kvantum, and more.',
        url: BASE_URL + '/#feed',
      };
      
    case 'composer':
      return {
        ...baseMeta,
        title: 'post a theme - ricehub',
        description: 'share your linux rice theme with the community. include screenshots, config files, and installation notes.',
        url: BASE_URL + '/#composer',
      };
      
    case 'profile':
      return {
        ...baseMeta,
        title: `@${data.handle} - ricehub`,
        description: `${data.bio || 'linux ricer'} · ${data.postCount || 0} themes · joined ${data.joined || 'recently'}`,
        url: BASE_URL + `/#profile/${data.handle}`,
        type: 'profile',
        author: data.handle,
      };
      
    case 'post':
      return {
        ...baseMeta,
        title: `${data.title} - ricehub`,
        description: data.summary || SITE_DESCRIPTION,
        url: BASE_URL + `/#post/${data.id}`,
        image: data.image || baseMeta.image,
        type: 'article',
        author: data.author,
        datePublished: data.createdAt,
        dateModified: data.updatedAt,
        section: data.component,
        tags: data.tags,
      };
      
    case 'auth':
      return {
        ...baseMeta,
        title: 'sign in - ricehub',
        description: 'sign in or create an account to like, save, comment, and post themes on ricehub.',
        url: BASE_URL + '/#auth',
        type: 'webpage',
      };
      
    default:
      return baseMeta;
  }
}

function setViewMeta(view, data = {}) {
  const meta = getViewMeta(view, data);
  updateMetaTags(meta);
}

const COMPONENTS = [
  'sddm', 'plasma', 'aurorae', 'kvantum', 'gtk', 'icons', 'cursors',
  'colorscheme', 'wallpaper', 'eww', 'waybar', 'rofi', 'conky', 'terminal',
  'hyprland', 'sway', 'dotfiles', 'full-rice'
];

const FILE_LIMIT = 950_000;

const EXTERNAL_LINKS = [
  { name: 'rw-designer', url: 'https://www.rw-designer.com/', desc: 'cursor & icon library' },
  { name: 'KDE Store', url: 'https://store.kde.org/', desc: 'plasma themes, widgets, wallpapers' },
  { name: 'pling', url: 'https://www.pling.com/', desc: 'gtk themes, icons, cursors, more' },
  { name: 'gnome-look', url: 'https://www.gnome-look.org/', desc: 'gtk/gnome themes & extensions' },
  { name: 'xfce-look', url: 'https://www.xfce-look.org/', desc: 'xfce themes & panels' },
  { name: 'arch wiki', url: 'https://wiki.archlinux.org/title/Desktop_environment', desc: 'desktop environment guide' },
  { name: 'reddit r/unixporn', url: 'https://reddit.com/r/unixporn', desc: 'rice showcase community' },
  { name: 'dotfiles.github.io', url: 'https://dotfiles.github.io/', desc: 'dotfile collections' },
];

const NEWS_ITEMS = [
  { title: 'ricehub v0.2 launched', date: '2026-07-12', body: 'profiles, auth, theme of the day, and external link directory now live. firebase backend optional — localStorage mode still works.' },
  { title: 'KDE Plasma 6.1 theming updates', date: '2026-07-10', body: 'new kvantum engine improvements, better Aurorae compatibility. check KDE Store for updated themes.' },
  { title: 'new cursor themes on rw-designer', date: '2026-07-08', body: 'fresh cursor packs uploaded: material-you, macos-sonoma, nordic-minimal. all free download.' },
  { title: 'hyprland 0.43 rice guide', date: '2026-07-05', body: 'updated config patterns for animations, workspace rules, and plugin ecosystem. see dotfiles.github.io.' },
];

const THEME_OF_DAY = {
  name: 'nordic-kde',
  author: 'elkowar',
  component: 'plasma',
  description: 'clean nord-colored plasma theme with matching kvantum, sddm, and wallpaper. minimal, readable, perfect for long coding sessions.',
  tags: ['nord', 'minimal', 'kde', 'blue'],
  links: ['https://store.kde.org/p/1234567/'],
  screenshot: null,
  date: '2026-07-12'
};

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
    attachments: [
      { id: crypto.randomUUID(), name: 'sway-terminal-screenshot.png', type: 'image/png', size: 245760, kind: 'image', url: 'https://raw.githubusercontent.com/numbpill3d/ricehub/main/assets/screenshots/sway-terminal.png' },
      { id: crypto.randomUUID(), name: 'waybar-config.json', type: 'application/json', size: 3072, kind: 'file', url: 'https://raw.githubusercontent.com/numbpill3d/ricehub/main/assets/configs/waybar-config.json' }
    ],
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now() - 86400000,
    likesCount: 3,
    savesCount: 1,
    commentsCount: 2,
    comments: [
      { id: crypto.randomUUID(), author: 'indexbot', text: 'seed post. local-only. delete when real submissions exist.', createdAt: Date.now() - 86000000 },
      { id: crypto.randomUUID(), author: 'ricer42', text: 'clean setup. what font is that?', createdAt: Date.now() - 82000000 }
    ]
  },
  {
    id: 'seed-2',
    author: 'plasma_tinkerer',
    handle: 'plasma_tinkerer',
    title: 'nordic-kde plasma theme + kvantum',
    component: 'plasma',
    distro: 'fedora',
    wm: 'kde plasma',
    license: 'gpl-3.0',
    summary: 'complete nord-themed plasma desktop. includes color scheme, window decorations (kvantum), sddm theme, and matching wallpaper. tested on plasma 6.1.',
    tags: ['nord', 'kde', 'plasma', 'kvantum', 'blue'],
    links: ['https://store.kde.org/p/1234567/'],
    attachments: [
      { id: crypto.randomUUID(), name: 'nordic-kde-desktop.png', type: 'image/png', size: 512000, kind: 'image', url: 'https://raw.githubusercontent.com/numbpill3d/ricehub/main/assets/screenshots/nordic-kde.png' },
      { id: crypto.randomUUID(), name: 'nordic-kde.kvconfig', type: 'application/octet-stream', size: 12288, kind: 'file', url: 'https://raw.githubusercontent.com/numbpill3d/ricehub/main/assets/configs/nordic-kde.kvconfig' },
      { id: crypto.randomUUID(), name: 'nordic-sddm-theme.tar.gz', type: 'application/gzip', size: 896000, kind: 'file', url: 'https://raw.githubusercontent.com/numbpill3d/ricehub/main/assets/themes/nordic-sddm.tar.gz' }
    ],
    createdAt: Date.now() - 172800000,
    updatedAt: Date.now() - 172800000,
    likesCount: 12,
    savesCount: 5,
    commentsCount: 3,
    comments: []
  },
  {
    id: 'seed-3',
    author: 'cursor_hoarder',
    handle: 'cursor_hoarder',
    title: 'material-you cursors for linux',
    component: 'cursors',
    distro: 'nixos',
    wm: 'hyprland',
    license: 'cc-by-4.0',
    summary: 'ported google material you cursor theme to x11/wayland. 48 cursors, all states animated. works on hyprland, sway, kde, gnome.',
    tags: ['material', 'google', 'animated', 'wayland', 'x11'],
    links: ['https://www.rw-designer.com/cursor-set/material-you'],
    attachments: [
      { id: crypto.randomUUID(), name: 'material-you-cursors-preview.png', type: 'image/png', size: 180000, kind: 'image', url: 'https://raw.githubusercontent.com/numbpill3d/ricehub/main/assets/screenshots/material-you-cursors.png' },
      { id: crypto.randomUUID(), name: 'material-you-cursors.tar.gz', type: 'application/gzip', size: 2457600, kind: 'file', url: 'https://raw.githubusercontent.com/numbpill3d/ricehub/main/assets/cursors/material-you-cursors.tar.gz' }
    ],
    createdAt: Date.now() - 259200000,
    updatedAt: Date.now() - 259200000,
    likesCount: 8,
    savesCount: 3,
    commentsCount: 1,
    comments: []
  }
];

const seedUsers = [
  { id: 'user-1', handle: 'voidmaintainer', bio: 'building ricehub. arch | sway | terminal minimalist', avatarUrl: '', links: ['https://github.com/voidmaintainer'], createdAt: Date.now() - 8640000000 },
  { id: 'user-2', handle: 'plasma_tinkerer', bio: 'kde plasma enthusiast. kvantum theme porter. fedora user.', avatarUrl: '', links: ['https://store.kde.org/usermanager/search.php?username=plasma_tinkerer'], createdAt: Date.now() - 5184000000 },
  { id: 'user-3', handle: 'cursor_hoarder', bio: 'collecting cursors since 2003. rw-designer regular. nixos + hyprland.', avatarUrl: '', links: ['https://www.rw-designer.com/user/cursor_hoarder'], createdAt: Date.now() - 31536000000 },
];

let state = {
  view: 'home',
  query: '',
  component: 'all',
  sort: 'hot',
  handle: 'anonymous-rice-ghoul',
  composerOpen: false,
  drafts: { attachments: [] },
  posts: [],
  users: [],
  currentProfile: null,
  userLikes: new Set(),
  userSaves: new Set(),
  firebaseReady: false,
  firebaseUser: null,
  authMode: 'login',
  authEmail: '',
  authPassword: '',
  authConfirmPassword: '',
  authHandle: '',
  themeOfDay: THEME_OF_DAY,
  newsItems: NEWS_ITEMS,
  externalLinks: EXTERNAL_LINKS
};

async function init() {
  const { isFirebaseConfigured } = await import('./firebase-init.js');
  
  // Initialize local data
  state.posts = [...seedPosts];
  state.users = [...seedUsers];
  
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
  
  // Check hash for view routing
  const hash = window.location.hash.slice(1);
  if (hash) state.view = hash;
  
  render();
  bindEvents();
  
  // Listen for hash changes
  window.addEventListener('hashchange', () => {
    state.view = window.location.hash.slice(1) || 'home';
    render();
  });
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
      await createUserProfile({ handle: state.handle, bio: '', links: [] });
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
  return String(value ?? '').replace(/[&<>'"]/g, ch => ({
    '&': '&',
    '<': '<',
    '>': '>',
    "'": "\'",
    '"': '"'
  }[ch]));
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

function getRecentUsers(limit = 5) {
  return [...state.users].sort((a, b) => b.createdAt - a.createdAt).slice(0, limit);
}

function getThemeOfDay() {
  return state.themeOfDay;
}

async function loadUserLikesAndSaves() {
  if (!state.firebaseReady || !state.firebaseUser) return;
  
  try {
    const { query, where, getDocs, collection } = await import('firebase/firestore');
    const { getFirestoreInstance } = await import('./firebase-init.js');
    const db = getFirestoreInstance();
    
    if (db) {
      const likesSnap = await getDocs(query(collection(db, 'post_likes'), where('handle', '==', state.firebaseUser.uid)));
      state.userLikes = new Set(likesSnap.docs.map(d => d.data().postId));
      
      const savesSnap = await getDocs(query(collection(db, 'post_saves'), where('handle', '==', state.firebaseUser.uid)));
      state.userSaves = new Set(savesSnap.docs.map(d => d.data().postId));
    }
  } catch (e) {
    console.warn('[ricehub] Failed to load user likes/saves:', e);
  }
  
  render();
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
  
  if (!postData.title || !postData.summary) {
    alert('title and summary required');
    return;
  }
  
  if (state.firebaseReady && state.firebaseUser) {
    try {
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

function setView(view) {
  state.view = view;
  window.location.hash = view;
  setViewMeta(view, { handle: state.handle });
}

function formatBytes(bytes) {
  if (!bytes) return '0b';
  if (bytes < 1024) return `${bytes}b`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}kb`;
  return `${(bytes / 1024 / 1024).toFixed(1)}mb`;
}

// ── render functions ──

function render() {
  const root = document.getElementById('app');
  
  if (state.view === 'profile') {
    root.innerHTML = profileViewHtml();
  } else if (state.view === 'auth') {
    root.innerHTML = authViewHtml();
  } else {
    root.innerHTML = homeViewHtml();
  }
  
  bindEvents();
  bindViewEvents();
}

function homeViewHtml() {
  const posts = filteredPosts();
  const recentUsers = getRecentUsers(5);
  const themeOfDay = getThemeOfDay();
  
  // Set meta tags for home view
  setViewMeta('home');
  
  return `
    <header class="topbar">
      <a class="brand" href="#home" data-action="home">
        <span class="sigil">░</span>
        <span><b>ricehub</b><small>linux theming social index</small></span>
      </a>
      <nav>
        ${state.firebaseReady ? `
          <span data-action="auth-status" class="auth-badge">${state.firebaseUser ? `🔓 @${esc(state.handle)}` : '🔒 sign in'}</span>
        ` : `
          <span class="auth-badge local-mode">local storage</span>
        `}
        <button data-action="toggle-theme" aria-label="Toggle dark mode" title="Toggle theme">
          ${document.documentElement.getAttribute('data-theme') === 'dark' ? '☀️' : '🌙'}
        </button>
        <button data-action="toggle-composer">${state.composerOpen ? 'close composer' : 'post theme'}</button>
        <button data-action="export">export db</button>
        <label class="import-label">import<input id="import-file" type="file" accept="application/json"></label>
      </nav>
    </header>

    <main class="shell" role="main">
      <!-- news bar -->
      <section class="news-bar panel" aria-labelledby="news-heading">
        <div class="news-header">
          <span class="eyebrow" id="news-heading">📰 news</span>
          <span class="news-date">${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</span>
        </div>
        <div class="news-items">
          ${state.newsItems.map(n => `
            <article class="news-item">
              <h4>${esc(n.title)}</h4>
              <p class="news-meta">${esc(n.date)}</p>
              <p>${esc(n.body)}</p>
            </article>
          `).join('')}
        </div>
      </section>

      <div class="main-grid">
        <!-- left column -->
        <div class="main-col">
          <!-- theme of the day -->
          <section class="theme-of-day panel" aria-labelledby="theme-of-day-heading">
            <div class="theme-header">
              <span class="eyebrow" id="theme-of-day-heading">⭐ theme of the day</span>
              <span class="theme-date">${esc(themeOfDay.date)}</span>
            </div>
            <div class="theme-content">
              <div class="theme-info">
                <h3>${esc(themeOfDay.name)}</h3>
                <p class="theme-meta">by @${esc(themeOfDay.author)} · ${esc(themeOfDay.component)}</p>
                <p class="theme-desc">${esc(themeOfDay.description)}</p>
                <div class="theme-tags">
                  ${themeOfDay.tags.map(t => `<span class="tag">#${esc(t)}</span>`).join('')}
                </div>
                ${themeOfDay.links.length ? `
                  <div class="theme-links">
                    ${themeOfDay.links.map(l => `<a href="${esc(l)}" target="_blank" rel="noopener">${esc(l)}</a>`).join('')}
                  </div>
                ` : ''}
              </div>
            </div>
          </section>

          <!-- latest posts -->
          <section class="latest-posts panel" aria-labelledby="latest-posts-heading">
            <div class="section-header">
              <span class="eyebrow" id="latest-posts-heading">🆕 latest posts</span>
              <a href="#feed" data-action="view-feed" class="view-all">view all</a>
            </div>
            <div class="feed" role="feed">
              ${posts.slice(0, 5).length ? posts.slice(0, 5).map(postHtml).join('') : emptyHtml()}
            </div>
          </section>
        </div>

        <!-- right sidebar -->
        <aside class="sidebar" role="complementary">
          <!-- new members -->
          <section class="panel" aria-labelledby="new-members-heading">
            <div class="section-header">
              <span class="eyebrow" id="new-members-heading">👤 new members</span>
            </div>
            <ul class="user-list">
              ${recentUsers.map(u => `
                <li class="user-item" data-user="${esc(u.handle)}" role="button" tabindex="0" aria-label="View @${esc(u.handle)}'s profile">
                  <div class="user-avatar">${esc(u.handle[0].toUpperCase())}</div>
                  <div class="user-info">
                    <strong>@${esc(u.handle)}</strong>
                    <span class="user-meta">${esc(u.bio || 'no bio yet')}</span>
                  </div>
                </li>
              `).join('')}
            </ul>
          </section>

          <!-- external links -->
          <section class="panel" aria-labelledby="resources-heading">
            <div class="section-header">
              <span class="eyebrow" id="resources-heading">🔗 resources</span>
            </div>
            <ul class="link-list">
              ${state.externalLinks.map(l => `
                <li>
                  <a href="${esc(l.url)}" target="_blank" rel="noopener noreferrer">
                    <strong>${esc(l.name)}</strong>
                    <span>${esc(l.desc)}</span>
                  </a>
                </li>
              `).join('')}
            </ul>
          </section>

          <!-- stats -->
          <section class="panel" aria-labelledby="stats-heading">
            <div class="section-header">
              <span class="eyebrow" id="stats-heading">📊 stats</span>
            </div>
            <div class="statbox">
              <span><b>${state.posts.length}</b> themes</span>
              <span><b>${new Set(state.posts.map(p => p.component)).size}</b> components</span>
              <span><b>${state.posts.reduce((n, p) => n + (p.attachments?.length || 0), 0)}</b> assets</span>
              <span><b>${state.posts.reduce((n, p) => n + (p.commentsCount || 0), 0)}</b> comments</span>
              <span><b>${state.users.length}</b> members</span>
            </div>
          </section>
        </aside>
      </div>

      <!-- identity -->
      <section class="identity panel" aria-labelledby="identity-heading">
        <label id="identity-heading">posting as <input id="handle-input" value="${esc(state.handle)}" maxlength="32"></label>
        <p>${state.firebaseReady ? 'firebase mode. changes sync across devices.' : 'local-first prototype. nothing leaves this browser yet. export json if you want to keep the little creature alive.'}</p>
      </section>

      ${state.composerOpen ? composerHtml() : ''}

      <section class="filters panel" aria-labelledby="filters-heading">
        <label for="search" class="visually-hidden">Search themes</label>
        <input id="search" placeholder="search tags, wm, distro, title..." value="${esc(state.query)}" aria-label="Search themes by tags, window manager, distro, or title">
        <label for="component-filter" class="visually-hidden">Filter by component</label>
        <select id="component-filter" aria-label="Filter by component type">
          <option value="all">all components</option>
          ${COMPONENTS.map(c => `<option value="${c}" ${state.component === c ? 'selected' : ''}>${c}</option>`).join('')}
        </select>
        <label for="sort-filter" class="visually-hidden">Sort by</label>
        <select id="sort-filter" aria-label="Sort posts by">
          <option value="hot" ${state.sort === 'hot' ? 'selected' : ''}>hot</option>
          <option value="new" ${state.sort === 'new' ? 'selected' : ''}>new</option>
          <option value="saved" ${state.sort === 'saved' ? 'selected' : ''}>saved first</option>
        </select>
      </section>
    </main>
  `;
}

function profileViewHtml() {
  const profile = state.currentProfile;
  if (!profile) return '<div class="panel"><p>user not found</p><button data-action="view-home">← back</button></div>';
  
  const userPosts = state.posts.filter(p => p.handle === profile.handle);
  
  // Set meta tags for profile view
  const joined = profile.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long' }) : 'recently';
  setViewMeta('profile', { 
    handle: profile.handle, 
    bio: profile.bio, 
    postCount: userPosts.length,
    joined 
  });
  
  return `
    <header class="topbar">
      <a class="brand" href="#home" data-action="home">
        <span class="sigil">░</span>
        <span><b>ricehub</b><small>linux theming social index</small></span>
      </a>
      <nav>
        ${state.firebaseReady ? `
          <span data-action="auth-status" class="auth-badge">${state.firebaseUser ? `🔓 @${esc(state.handle)}` : '🔒 sign in'}</span>
        ` : `<span class="auth-badge local-mode">local storage</span>`}
        <button data-action="toggle-theme" aria-label="Toggle dark mode" title="Toggle theme">
          ${document.documentElement.getAttribute('data-theme') === 'dark' ? '☀️' : '🌙'}
        </button>
        <button data-action="view-home">← home</button>
      </nav>
    </header>

    <main class="shell" role="main">
      <section class="profile-header panel" aria-labelledby="profile-name">
        <div class="profile-avatar-large" aria-hidden="true">${esc(profile.handle[0].toUpperCase())}</div>
        <h2 id="profile-name">@${esc(profile.handle)}</h2>
        <p class="profile-bio">${esc(profile.bio || 'no bio yet')}</p>
        ${profile.links.length ? `
          <div class="profile-links">
            ${profile.links.map(l => `<a href="${esc(l)}" target="_blank" rel="noopener noreferrer">${esc(l)}</a>`).join('')}
          </div>
        ` : ''}
        <p class="profile-meta">joined ${timeAgo(profile.createdAt)} · ${userPosts.length} themes</p>
      </section>

      <section class="panel" aria-labelledby="user-themes-heading">
        <div class="section-header">
          <span class="eyebrow" id="user-themes-heading">📦 themes by @${esc(profile.handle)}</span>
        </div>
        <div class="feed" role="feed">
          ${userPosts.length ? userPosts.map(postHtml).join('') : '<p class="muted">no themes posted yet</p>'}
        </div>
      </section>
    </main>
  `;
}

function authViewHtml() {
  setViewMeta('auth');
  
  return `
    <header class="topbar">
      <a class="brand" href="#home" data-action="home">
        <span class="sigil">░</span>
        <span><b>ricehub</b><small>linux theming social index</small></span>
      </a>
      <nav>
        <button data-action="toggle-theme" aria-label="Toggle dark mode" title="Toggle theme">
          ${document.documentElement.getAttribute('data-theme') === 'dark' ? '☀️' : '🌙'}
        </button>
        <button data-action="view-home">← home</button>
      </nav>
    </header>

    <main class="shell" role="main">
      <section class="auth-panel panel" aria-labelledby="auth-heading">
        <h2 id="auth-heading">${state.authMode === 'login' ? 'sign in' : 'create account'}</h2>
        <p class="auth-subtitle">${state.authMode === 'login' ? 'enter your credentials' : 'join the ricehub community'}</p>
        
        <form id="auth-form">
          ${state.authMode === 'signup' ? `
            <label for="auth-handle">
              handle
              <input id="auth-handle" name="handle" type="text" required maxlength="32" placeholder="your-handle" autocomplete="username">
            </label>
          ` : ''}
          <label for="auth-email">
            email
            <input id="auth-email" name="email" type="email" required placeholder="you@example.com" autocomplete="email">
          </label>
          <label for="auth-password">
            password
            <input id="auth-password" name="password" type="password" required minlength="6" placeholder="••••••••" autocomplete="${state.authMode === 'login' ? 'current-password' : 'new-password'}">
          </label>
          ${state.authMode === 'signup' ? `
            <label for="auth-confirm">
              confirm password
              <input id="auth-confirm" name="confirmPassword" type="password" required minlength="6" placeholder="••••••••" autocomplete="new-password">
            </label>
          ` : ''}
          <button class="primary" type="submit">${state.authMode === 'login' ? 'sign in' : 'create account'}</button>
        </form>
        
        <p class="auth-switch">
          ${state.authMode === 'login' 
            ? `no account? <button data-action="switch-auth" data-mode="signup">create one</button>`
            : `already have an account? <button data-action="switch-auth" data-mode="login">sign in</button>`
          }
        </p>
        
        ${!state.firebaseReady ? `
          <p class="auth-notice">⚠️ firebase not configured. auth requires VITE_FIREBASE_* env vars and deployment.</p>
        ` : ''}
      </section>
    </main>
  `;
}

function composerHtml() {
  setViewMeta('composer');
  
  return `
    <section class="composer panel" aria-labelledby="composer-heading">
      <div class="section-header">
        <span class="eyebrow" id="composer-heading">📝 new theme</span>
        <button data-action="toggle-composer">close</button>
      </div>
      <form id="post-form">
        <div class="grid2">
          <label for="post-title">title<input id="post-title" name="title" required maxlength="90" placeholder="nordic-kde plasma theme + kvantum"></label>
          <label for="post-component">component<select id="post-component" name="component">${COMPONENTS.map(c => `<option value="${c}">${c}</option>`).join('')}</select></label>
          <label for="post-distro">distro<input id="post-distro" name="distro" placeholder="arch, nixos, fedora..."></label>
          <label for="post-wm">wm/de<input id="post-wm" name="wm" placeholder="kde, hyprland, sway..."></label>
          <label for="post-license">license<input id="post-license" name="license" placeholder="mit, gpl, cc-by, unknown"></label>
          <label for="post-links">links<input id="post-links" name="links" placeholder="repo/demo/source urls, comma separated"></label>
        </div>
        <label for="post-summary">summary<textarea id="post-summary" name="summary" required rows="4" placeholder="what is it, what does it theme, install notes, caveats"></textarea></label>
        <label for="post-tags">tags<input id="post-tags" name="tags" placeholder="nord, kde, plasma, kvantum, blue"></label>
        <label class="file-drop">attachments<input id="asset-input" type="file" multiple accept="image/*,.css,.scss,.conf,.json,.yaml,.yml,.toml,.txt,.sh,.md,.kvconfig,.colors,.tar,.gz,.zip"></label>
        <div id="draft-assets" class="draft-assets">${draftAssetsHtml()}</div>
        <button class="primary" type="submit">publish</button>
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
          <h3>${esc(post.title)}</h3>
        </div>
        <span class="age">${timeAgo(post.createdAt)}</span>
      </div>
      <p class="summary">${esc(post.summary)}</p>
      <div class="meta">
        <span>by <a href="#profile/${esc(post.handle)}" data-action="view-profile" data-handle="${esc(post.handle)}">@${esc(post.author)}</a></span>
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
        ${state.firebaseReady && state.firebaseUser ? `
          <form class="comment-form" data-post-id="${post.id}">
            <input name="text" required maxlength="400" placeholder="leave install notes, praise, warnings...">
            <button type="submit">comment</button>
          </form>
        ` : state.firebaseReady ? `
          <p class="muted"><button data-action="switch-auth" data-mode="login">sign in</button> to comment.</p>
        ` : `
          <p class="muted">comments require firebase backend.</p>
        `}
      </details>
    </article>
  `;
}

function assetGalleryHtml(assets) {
  if (!assets.length) return '<div class="no-assets">no files attached</div>';
  return `<div class="assets">${assets.map(a => {
    if (a.kind === 'image' && (a.dataUrl || a.url)) {
      const url = a.url || a.dataUrl;
      return `<a href="${esc(url)}" target="_blank" class="shot"><img src="${esc(url)}" alt="${esc(a.name)}"><span>${esc(a.name)}</span></a>`;
    }
    if (a.url) return `<a download="${esc(a.name)}" href="${esc(a.url)}" class="file-card"><b>▤ ${esc(a.name)}</b><small>${formatBytes(a.size)} · download</small></a>`;
    if (a.dataUrl) return `<a download="${esc(a.name)}" href="${esc(a.dataUrl)}" class="file-card"><b>▤ ${esc(a.name)}</b><small>${formatBytes(a.size)} · download</small></a>`;
    return `<div class="file-card"><b>▤ ${esc(a.name)}</b><small>${formatBytes(a.size)} · metadata only</small></div>`;
  }).join('')}</div>`;
}

function linksHtml(links) {
  const cleanLinks = links.filter(Boolean);
  if (!cleanLinks.length) return '';
  return `<div class="links">${cleanLinks.map((l, i) => `<a target="_blank" rel="noopener" href="${esc(l)}">link ${i + 1}</a>`).join('')}</div>`;
}

function emptyHtml() {
  return `<div class="empty panel"><h3>no matching themes.</h3><p>loosen the filter or post the first specimen.</p></div>`;
}

function exportDb() {
  const blob = new Blob([JSON.stringify({ posts: state.posts, users: state.users, createdAt: Date.now() }, null, 2)], { type: 'application/json' });
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
      if (Array.isArray(imported.users)) state.users = imported.users;
      saveLocalDb();
      render();
    } catch (err) {
      alert(`bad ricehub export: ${err.message}`);
    }
  };
  reader.readAsText(file);
}

// ── event binding ──

function bindEvents() {
  // Global events that persist across views
  document.querySelectorAll('[data-action="home"]').forEach(btn => 
    btn.addEventListener('click', e => { e.preventDefault(); setView('home'); })
  );
  
  document.querySelectorAll('[data-action="view-home"]').forEach(btn => 
    btn.addEventListener('click', () => setView('home'))
  );
  
  document.querySelectorAll('[data-action="view-feed"]').forEach(btn => 
    btn.addEventListener('click', () => { setView('feed'); })
  );
  
  document.querySelectorAll('[data-action="toggle-composer"]').forEach(btn => 
    btn.addEventListener('click', () => { 
      state.composerOpen = !state.composerOpen; 
      if (state.composerOpen) {
        setViewMeta('composer');
      } else {
        setViewMeta('home', { handle: state.handle });
      }
      render(); 
    })
  );
  
  // Theme toggle
  document.querySelector('[data-action="toggle-theme"]')?.addEventListener('click', () => {
    toggleTheme();
    render();
  });
  
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
    if (state.firebaseReady) {
      setView(state.firebaseUser ? 'profile' : 'auth');
    } else {
      alert(state.firebaseUser ? `signed in as ${state.handle}. firebase auth configured.` : 'firebase not configured. set VITE_FIREBASE_* env vars and deploy to enable auth.');
    }
  });
  
  // Tag clicks
  document.querySelectorAll('[data-action="tag"]').forEach(btn => 
    btn.addEventListener('click', () => { state.query = btn.dataset.tag; render(); })
  );
  
  // Profile links
  document.querySelectorAll('[data-action="view-profile"]').forEach(a => 
    a.addEventListener('click', (e) => { e.preventDefault(); viewProfile(a.dataset.handle); })
  );
}

function bindViewEvents() {
  // Auth form
  document.getElementById('auth-form')?.addEventListener('submit', handleAuthSubmit);
  document.querySelectorAll('[data-action="switch-auth"]').forEach(btn => 
    btn.addEventListener('click', () => { state.authMode = btn.dataset.mode; render(); })
  );
  
  // Post actions
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
  
  // Comments
  document.querySelectorAll('.comment-form').forEach(form => 
    form.addEventListener('submit', (e) => handleCommentSubmit(e, form.dataset.postId))
  );
  
  // Load comments for visible posts
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
  
  // User profile clicks
  document.querySelectorAll('[data-action="view-profile"]').forEach(el => {
    el.addEventListener('click', (e) => { e.preventDefault(); viewProfile(el.dataset.handle); });
  });
  document.querySelectorAll('.user-item').forEach(li => {
    li.addEventListener('click', () => viewProfile(li.dataset.user));
  });
}

async function handleAuthSubmit(event) {
  event.preventDefault();
  if (!state.firebaseReady) {
    alert('firebase not configured. cannot authenticate.');
    return;
  }
  
  const form = new FormData(event.currentTarget);
  const email = form.get('email');
  const password = form.get('password');
  
  if (state.authMode === 'signup') {
    const handle = clean(form.get('handle'));
    const confirm = form.get('confirmPassword');
    if (!handle) { alert('handle required'); return; }
    if (password !== confirm) { alert('passwords do not match'); return; }
    if (password.length < 6) { alert('password too short (min 6)'); return; }
    
    try {
      const { getAuth, createUserWithEmailAndPassword, updateProfile } = await import('firebase/auth');
      const { getAuthInstance } = await import('./firebase-init.js');
      const auth = getAuthInstance();
      
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: handle });
      await createUserProfile({ handle, bio: '', links: [] });
      alert('account created! welcome to ricehub.');
      state.authMode = 'login';
      render();
    } catch (e) {
      alert(`signup failed: ${e.message}`);
    }
  } else {
    try {
      const { getAuth, signInWithEmailAndPassword } = await import('firebase/auth');
      const { getAuthInstance } = await import('./firebase-init.js');
      const auth = getAuthInstance();
      await signInWithEmailAndPassword(auth, email, password);
      // auth state listener will handle the rest
    } catch (e) {
      alert(`sign in failed: ${e.message}`);
    }
  }
}

function viewProfile(handle) {
  const profile = state.users.find(u => u.handle === handle);
  if (profile) {
    state.currentProfile = profile;
    state.view = 'profile';
    window.location.hash = `profile/${handle}`;
    const userPosts = state.posts.filter(p => p.handle === profile.handle);
    const joined = profile.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long' }) : 'recently';
    setViewMeta('profile', { 
      handle: profile.handle, 
      bio: profile.bio, 
      postCount: userPosts.length,
      joined 
    });
    render();
  }
}

// ── start ──

init();

// Set initial meta tags based on hash
window.addEventListener('load', () => {
  const hash = window.location.hash.slice(1) || 'home';
  const view = hash.split('/')[0];
  setViewMeta(view, { handle: state.handle });
});

export { state }; // for debugging