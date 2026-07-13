/** 
 * ricehub — 90s linux forum/webcore aesthetic
 * linux theming social index with category browsing, profiles, auth
 */

import './styles.css';
import {
  initFirebaseService,
  onAuthStateChanged,
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
  document.title = title || `${SITE_NAME} // linux theming social index`;
  
  const updateTag = (selector, attr, value) => {
    if (!value) return;
    let el = document.querySelector(selector);
    if (!el) {
      el = document.createElement('meta');
      if (selector.startsWith('meta[property') || selector.startsWith('meta[name')) {
        const match = selector.match(/\[(property|name)="([^"]+)"\]/);
        if (match) el.setAttribute(match[1], match[2]);
      }
      document.head.appendChild(el);
    }
    el.setAttribute(attr, value);
  };
  
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
      logo: { '@type': 'ImageObject', url: `${BASE_URL}/icon-192.png` }
    },
    ...(meta.type === 'article' && {
      author: { '@type': 'Person', name: meta.author || 'ricehub community' },
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
    case 'home': return { ...baseMeta, title: 'ricehub // linux theming social index', description: 'discover and share linux ricing themes: kde plasma, gtk, hyprland, sway, waybar, rofi, terminal, and more. profiles, auth, comments, saves, likes.', url: BASE_URL + '/' };
    case 'feed': return { ...baseMeta, title: 'all themes - ricehub', description: 'browse all linux ricing themes. filter by component: kde plasma, gtk, hyprland, sway, waybar, rofi, terminal, sddm, kvantum, and more.', url: BASE_URL + '/#feed' };
    case 'category': return { ...baseMeta, title: `${data.name} - ricehub`, description: `browse ${data.name.toLowerCase()} themes and configurations`, url: BASE_URL + `/#category/${data.id}` };
    case 'composer': return { ...baseMeta, title: 'post a theme - ricehub', description: 'share your linux rice theme with the community. include screenshots, config files, and installation notes.', url: BASE_URL + '/#composer' };
    case 'profile': return { ...baseMeta, title: `@${data.handle} - ricehub`, description: `${data.bio || 'linux ricer'} · ${data.postCount || 0} themes · joined ${data.joined || 'recently'}`, url: BASE_URL + `/#profile/${data.handle}`, type: 'profile', author: data.handle };
    case 'post': return { ...baseMeta, title: `${data.title} - ricehub`, description: data.summary || SITE_DESCRIPTION, url: BASE_URL + `/#post/${data.id}`, image: data.image || baseMeta.image, type: 'article', author: data.author, datePublished: data.createdAt, dateModified: data.updatedAt, section: data.component, tags: data.tags };
    case 'auth': return { ...baseMeta, title: 'sign in - ricehub', description: 'sign in or create an account to like, save, comment, and post themes on ricehub.', url: BASE_URL + '/#auth', type: 'webpage' };
    default: return baseMeta;
  }
}

function setViewMeta(view, data = {}) {
  const meta = getViewMeta(view, data);
  updateMetaTags(meta);
}

// ===== Categories (KDE Store style) =====
const CATEGORIES = [
  { id: 'plasma', name: 'Plasma', icon: '◆', desc: 'Desktop themes, colors, widgets', count: 0 },
  { id: 'kvantum', name: 'Kvantum', icon: '◇', desc: 'Window decorations, styles', count: 0 },
  { id: 'aurorae', name: 'Aurorae', icon: '◈', desc: 'Window decoration themes', count: 0 },
  { id: 'sddm', name: 'SDDM', icon: '◇', desc: 'Login screen themes', count: 0 },
  { id: 'gtk', name: 'GTK', icon: '◆', desc: 'GTK2/3/4 themes, variants', count: 0 },
  { id: 'icons', name: 'Icons', icon: '◆', desc: 'Icon themes, cursors', count: 0 },
  { id: 'cursors', name: 'Cursors', icon: '◇', desc: 'Mouse cursor themes', count: 0 },
  { id: 'colorscheme', name: 'Color Schemes', icon: '◆', desc: 'System color palettes', count: 0 },
  { id: 'wallpaper', name: 'Wallpapers', icon: '◇', desc: 'Background images', count: 0 },
  { id: 'waybar', name: 'Waybar', icon: '◆', desc: 'Wayland bar configs', count: 0 },
  { id: 'rofi', name: 'Rofi', icon: '◇', desc: 'Launcher themes', count: 0 },
  { id: 'eww', name: 'Eww', icon: '◆', desc: 'Eww widget configs', count: 0 },
  { id: 'conky', name: 'Conky', icon: '◇', desc: 'System monitor configs', count: 0 },
  { id: 'terminal', name: 'Terminal', icon: '◆', desc: 'Shell prompts, color schemes', count: 0 },
  { id: 'hyprland', name: 'Hyprland', icon: '◆', desc: 'Window manager configs', count: 0 },
  { id: 'sway', name: 'Sway', icon: '◇', desc: 'WM configs, bar setups', count: 0 },
  { id: 'dotfiles', name: 'Dotfiles', icon: '◆', desc: 'Full rice repos', count: 0 },
  { id: 'full-rice', name: 'Complete Rice', icon: '◇', desc: 'All-in-one setups', count: 0 },
];

const COMPONENTS = CATEGORIES.map(c => c.id);
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
  { title: 'ricehub v0.3 launched', date: '2026-07-13', body: 'category browsing, denser feed, KDE Store-style nav. full localStorage + Firebase dual mode.' },
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
  date: '2026-07-13'
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
  },
  {
    id: 'seed-4',
    author: 'voidmaintainer',
    handle: 'voidmaintainer',
    title: 'gruvbox waybar + rofi + terminal',
    component: 'waybar',
    distro: 'arch',
    wm: 'hyprland',
    license: 'mit',
    summary: 'gruvbox material dark waybar config with matching rofi launcher and kitty terminal colors. includes workspaces, media, battery, network modules.',
    tags: ['gruvbox', 'waybar', 'rofi', 'kitty', 'hyprland'],
    links: ['https://github.com/voidmaintainer/dotfiles'],
    attachments: [
      { id: crypto.randomUUID(), name: 'gruvbox-waybar.png', type: 'image/png', size: 156000, kind: 'image', url: 'https://raw.githubusercontent.com/numbpill3d/ricehub/main/assets/screenshots/gruvbox-waybar.png' },
      { id: crypto.randomUUID(), name: 'config.jsonc', type: 'application/json', size: 8192, kind: 'file', url: 'https://raw.githubusercontent.com/numbpill3d/ricehub/main/assets/configs/waybar-gruvbox.jsonc' }
    ],
    createdAt: Date.now() - 345600000,
    updatedAt: Date.now() - 345600000,
    likesCount: 15,
    savesCount: 8,
    commentsCount: 4,
    comments: []
  },
  {
    id: 'seed-5',
    author: 'plasma_tinkerer',
    handle: 'plasma_tinkerer',
    title: 'catppuccin mocha plasma + kvantum',
    component: 'kvantum',
    distro: 'arch',
    wm: 'kde plasma',
    license: 'gpl-3.0',
    summary: 'catppuccin mocha port for plasma. kvantum window decoration, color scheme, sddm theme, konsole profile. warm pastel aesthetic.',
    tags: ['catppuccin', 'mocha', 'plasma', 'kvantum', 'pastel'],
    links: ['https://store.kde.org/p/2345678/'],
    attachments: [
      { id: crypto.randomUUID(), name: 'catppuccin-plasma.png', type: 'image/png', size: 420000, kind: 'image', url: 'https://raw.githubusercontent.com/numbpill3d/ricehub/main/assets/screenshots/catppuccin-plasma.png' },
      { id: crypto.randomUUID(), name: 'catppuccin-mocha.kvconfig', type: 'application/octet-stream', size: 15360, kind: 'file', url: 'https://raw.githubusercontent.com/numbpill3d/ricehub/main/assets/configs/catppuccin-mocha.kvconfig' }
    ],
    createdAt: Date.now() - 432000000,
    updatedAt: Date.now() - 432000000,
    likesCount: 22,
    savesCount: 11,
    commentsCount: 5,
    comments: []
  },
  {
    id: 'seed-6',
    author: 'cursor_hoarder',
    handle: 'cursor_hoarder',
    title: 'dracula gtk theme + icons',
    component: 'gtk',
    distro: 'fedora',
    wm: 'gnome',
    license: 'gpl-3.0',
    summary: 'dracula theme ported to gtk3/4 with matching icon theme. supports gnome, xfce, mate, cinnamon. includes chrome/firefox theme.',
    tags: ['dracula', 'gtk3', 'gtk4', 'icons', 'gnome'],
    links: ['https://draculatheme.com/gtk'],
    attachments: [
      { id: crypto.randomUUID(), name: 'dracula-gtk.png', type: 'image/png', size: 280000, kind: 'image', url: 'https://raw.githubusercontent.com/numbpill3d/ricehub/main/assets/screenshots/dracula-gtk.png' },
      { id: crypto.randomUUID(), name: 'dracula-gtk-theme.tar.xz', type: 'application/x-xz', size: 1024000, kind: 'file', url: 'https://raw.githubusercontent.com/numbpill3d/ricehub/main/assets/themes/dracula-gtk.tar.xz' }
    ],
    createdAt: Date.now() - 518400000,
    updatedAt: Date.now() - 518400000,
    likesCount: 18,
    savesCount: 7,
    commentsCount: 3,
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
  externalLinks: EXTERNAL_LINKS,
  categories: CATEGORIES
};

async function init() {
  const { isFirebaseConfigured } = await import('./firebase-init.js');
  state.posts = [...seedPosts];
  state.users = [...seedUsers];
  updateCategoryCounts();
  
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
  
  const hash = window.location.hash.slice(1);
  if (hash) state.view = hash;
  
  render();
  bindEvents();
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
    if (profile) state.handle = profile.handle;
    else await createUserProfile({ handle: state.handle, bio: '', links: [] });
  } catch (e) { console.warn('[ricehub] Failed to load user profile:', e); }
}

function loadLocalDb() {
  const DB_KEY = 'ricehub.db.v1';
  const USER_KEY = 'ricehub.handle.v1';
  const raw = localStorage.getItem(DB_KEY);
  if (!raw) { state.posts = seedPosts; saveLocalDb(); }
  else {
    try {
      const parsed = JSON.parse(raw);
      state.posts = Array.isArray(parsed.posts) ? parsed.posts : seedPosts;
    } catch { state.posts = seedPosts; saveLocalDb(); }
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
  if (state.firebaseReady && state.firebaseUser) updateUserProfile({ handle: next }).catch(console.error);
  else localStorage.setItem('ricehub.handle.v1', next);
  render();
}

function clean(value) { return String(value ?? '').trim(); }
function esc(value) { return String(value ?? '').replace(/[&<>'"]/g, ch => ({ '&': '&', '<': '<', '>': '>', "'": "\\'", '"': '"' }[ch])); }

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
  if (state.component !== 'all') posts = posts.filter(p => p.component === state.component);
  if (q) posts = posts.filter(p => [p.title, p.author, p.handle, p.summary, p.component, p.distro, p.wm, ...(p.tags || [])].join(' ').toLowerCase().includes(q));
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

function getThemeOfDay() { return state.themeOfDay; }

function updateCategoryCounts() {
  state.categories.forEach(c => {
    c.count = state.posts.filter(p => p.component === c.id).length;
  });
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
  } catch (e) { console.warn('[ricehub] Failed to load user likes/saves:', e); }
  render();
}

async function handlePostAction(action, postId) {
  if (state.firebaseReady && state.firebaseUser) {
    try {
      if (action === 'like') { await toggleLike(postId); const liked = await isPostLiked(postId); state.userLikes.set(postId, liked); }
      else if (action === 'save') { await toggleSave(postId); const saved = await isPostSaved(postId); state.userSaves.set(postId, saved); }
      else if (action === 'delete') { if (!confirm('delete this post?')) return; await deletePost(postId); state.posts = state.posts.filter(p => p.id !== postId); }
      render();
    } catch (e) { alert(`action failed: ${e.message}`); }
  } else {
    const post = state.posts.find(p => p.id === postId);
    if (!post) return;
    if (action === 'like') { post.likes = post.likes || []; const i = post.likes.indexOf(state.handle); if (i >= 0) post.likes.splice(i, 1); else post.likes.push(state.handle); post.likesCount = post.likes.length; }
    else if (action === 'save') { post.saves = post.saves || []; const i = post.saves.indexOf(state.handle); if (i >= 0) post.saves.splice(i, 1); else post.saves.push(state.handle); post.savesCount = post.saves.length; }
    else if (action === 'delete') { if (!confirm('delete this post?')) return; state.posts = state.posts.filter(p => p.id !== postId); }
    saveLocalDb(); render();
  }
}

async function handleCommentSubmit(event, postId) {
  event.preventDefault();
  const input = event.currentTarget.elements.text;
  const text = clean(input.value);
  if (!text) return;
  if (state.firebaseReady && state.firebaseUser) {
    try { await addComment(postId, text); input.value = ''; render(); }
    catch (e) { alert(`comment failed: ${e.message}`); }
  } else {
    const post = state.posts.find(p => p.id === postId);
    if (!post) return;
    post.comments = post.comments || [];
    post.comments.push({ id: crypto.randomUUID(), author: state.handle, text, createdAt: Date.now() });
    post.commentsCount = post.comments.length;
    saveLocalDb(); render();
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
  state.drafts.attachments = staged; render();
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
  if (!postData.title || !postData.summary) { alert('title and summary required'); return; }
  
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
    } catch (e) { alert(`publish failed: ${e.message}`); }
  } else {
    const post = { id: crypto.randomUUID(), author: state.handle, handle: state.handle, ...postData, createdAt: Date.now(), updatedAt: Date.now(), likesCount: 0, savesCount: 0, commentsCount: 0, likes: [], saves: [], comments: [] };
    state.posts.unshift(post);
    state.drafts.attachments = [];
    state.composerOpen = false;
    saveLocalDb();
    render();
  }
}

function setView(view) { state.view = view; window.location.hash = view; setViewMeta(view, { handle: state.handle }); }

function formatBytes(bytes) {
  if (!bytes) return '0b';
  if (bytes < 1024) return `${bytes}b`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}kb`;
  return `${(bytes / 1024 / 1024).toFixed(1)}mb`;
}

// ===== Render Functions =====
function render() {
  const root = document.getElementById('app');
  if (state.view.startsWith('category/')) root.innerHTML = categoryViewHtml();
  else if (state.view === 'profile') root.innerHTML = profileViewHtml();
  else if (state.view === 'auth') root.innerHTML = authViewHtml();
  else if (state.view === 'feed') root.innerHTML = feedViewHtml();
  else root.innerHTML = homeViewHtml();
  bindEvents();
  bindViewEvents();
}

// ---- Category Navigation Bar (replaces macOS menubar) ----
function categoryNavHtml() {
  const activeCategory = state.view.startsWith('category/') ? state.view.split('/')[1] : (state.view === 'feed' ? 'all' : 'home');
  return `
    <nav class="category-nav" role="navigation" aria-label="Theme categories">
      <a href="#home" class="nav-brand" data-action="home"><span class="sigil">░</span><strong>ricehub</strong></a>
      <div class="nav-divider">|</div>
      <a href="#feed" class="nav-item ${activeCategory === 'all' ? 'active' : ''}" data-action="view-feed">All Themes</a>
      <div class="nav-divider">|</div>
      <div class="nav-dropdown">
        <button class="nav-item dropdown-toggle" aria-expanded="false" aria-haspopup="true">Categories ▼</button>
        <div class="dropdown-menu" role="menu">
          ${state.categories.map(c => `
            <a href="#category/${c.id}" class="dropdown-item ${activeCategory === c.id ? 'active' : ''}" role="menuitem" data-action="view-category" data-category="${c.id}">
              <span class="cat-icon">${c.icon}</span>
              <span class="cat-name">${c.name}</span>
              <span class="cat-count">${c.count}</span>
            </a>
          `).join('')}
        </div>
      </div>
      <div class="nav-spacer"></div>
      <a href="#feed?sort=new" class="nav-item ${state.sort === 'new' ? 'active' : ''}" data-action="view-feed" data-sort="new">New</a>
      <a href="#feed?sort=hot" class="nav-item ${state.sort === 'hot' ? 'active' : ''}" data-action="view-feed" data-sort="hot">Hot</a>
      <a href="#feed?sort=saved" class="nav-item ${state.sort === 'saved' ? 'active' : ''}" data-action="view-feed" data-sort="saved">Saved</a>
      <div class="nav-divider">|</div>
      ${state.firebaseReady ? `
        <span class="auth-badge ${state.firebaseUser ? '' : 'guest'}">${state.firebaseUser ? `🔓 @${esc(state.handle)}` : '🔒 sign in'}</span>
      ` : `<span class="auth-badge local">local storage</span>`}
      <button data-action="toggle-theme" aria-label="Toggle theme" title="Toggle theme" class="theme-btn">
        ${document.documentElement.getAttribute('data-theme') === 'dark' ? '☀️' : '🌙'}
      </button>
      ${state.firebaseReady && state.firebaseUser ? `<a href="#profile/${esc(state.handle)}" class="nav-item profile-link">Profile</a>` : ''}
    </nav>
  `;
}

function homeViewHtml() {
  const posts = filteredPosts();
  const recentUsers = getRecentUsers(5);
  const themeOfDay = getThemeOfDay();
  setViewMeta('home');
  
  return `
    ${categoryNavHtml()}
    <main class="shell" role="main">
      <div class="hero-section">
        <div class="hero-main">
          <!-- Theme of the Day -->
          <section class="theme-of-day panel" aria-labelledby="tod-heading">
            <header class="panel-header">
              <span class="eyebrow" id="tod-heading">⭐ Theme of the Day</span>
              <span class="theme-date">${esc(themeOfDay.date)}</span>
            </header>
            <div class="tod-grid">
              <div class="tod-content">
                <h3>${esc(themeOfDay.name)}</h3>
                <p class="theme-meta">by @${esc(themeOfDay.author)} · ${esc(themeOfDay.component)}</p>
                <p class="theme-desc">${esc(themeOfDay.description)}</p>
                <div class="theme-tags">${themeOfDay.tags.map(t => `<span class="tag">#${esc(t)}</span>`).join('')}</div>
                ${themeOfDay.links.length ? `<div class="theme-links">${themeOfDay.links.map(l => `<a href="${esc(l)}" target="_blank" rel="noopener">${esc(l)}</a>`).join('')}</div>` : ''}
              </div>
              <div class="tod-screenshot">
                ${themeOfDay.screenshot ? `<img src="${esc(themeOfDay.screenshot)}" alt="${esc(themeOfDay.name)}">` : '<div class="placeholder-shot">📷</div>'}
              </div>
            </div>
          </section>
          
          <!-- News Ticker -->
          <section class="news-ticker panel" aria-labelledby="news-heading">
            <header class="panel-header">
              <span class="eyebrow" id="news-heading">📰 News</span>
              <span class="news-date">${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</span>
            </header>
            <div class="news-list">
              ${state.newsItems.slice(0, 3).map(n => `<article class="news-item"><h4>${esc(n.title)}</h4><p class="news-meta">${esc(n.date)}</p><p>${esc(n.body)}</p></article>`).join('')}
            </div>
          </section>
        </div>
        
        <aside class="hero-sidebar">
          <!-- Stats -->
          <section class="panel stats-panel" aria-labelledby="stats-heading">
            <header class="panel-header"><span class="eyebrow" id="stats-heading">📊 Stats</span></header>
            <div class="statgrid">
              <div class="stat"><strong>${state.posts.length}</strong><span>themes</span></div>
              <div class="stat"><strong>${state.categories.filter(c => c.count > 0).length}</strong><span>categories</span></div>
              <div class="stat"><strong>${state.posts.reduce((n, p) => n + (p.attachments?.length || 0), 0)}</strong><span>assets</span></div>
              <div class="stat"><strong>${state.posts.reduce((n, p) => n + (p.commentsCount || 0), 0)}</strong><span>comments</span></div>
              <div class="stat"><strong>${state.users.length}</strong><span>members</span></div>
            </div>
          </section>
          
          <!-- New Members -->
          <section class="panel" aria-labelledby="members-heading">
            <header class="panel-header"><span class="eyebrow" id="members-heading">👤 New Members</span></header>
            <ul class="user-list-compact">
              ${recentUsers.map(u => `<li class="user-item" data-user="${esc(u.handle)}" role="button" tabindex="0"><span class="avatar">${esc(u.handle[0].toUpperCase())}</span><div><strong>@${esc(u.handle)}</strong><small>${esc(u.bio || 'no bio')}</small></div></li>`).join('')}
            </ul>
          </section>
          
          <!-- Quick Links -->
          <section class="panel" aria-labelledby="links-heading">
            <header class="panel-header"><span class="eyebrow" id="links-heading">🔗 Resources</span></header>
            <ul class="link-list-compact">
              ${state.externalLinks.map(l => `<li><a href="${esc(l.url)}" target="_blank" rel="noopener noreferrer"><strong>${esc(l.name)}</strong><span>${esc(l.desc)}</span></a></li>`).join('')}
            </ul>
          </section>
        </aside>
      </div>
      
      <!-- Latest Posts - Dense Grid -->
      <section class="feed-section panel" aria-labelledby="feed-heading">
        <header class="panel-header">
          <span class="eyebrow" id="feed-heading">🆕 Latest Themes</span>
          <a href="#feed" data-action="view-feed" class="view-all">View All ${state.posts.length} →</a>
        </header>
        <div class="feed-grid" role="feed">
          ${posts.slice(0, 12).length ? posts.slice(0, 12).map(postHtml).join('') : emptyHtml()}
        </div>
      </section>
      
      <!-- Identity Bar -->
      <section class="identity panel" aria-labelledby="identity-heading">
        <label id="identity-heading">Posting as <input id="handle-input" value="${esc(state.handle)}" maxlength="32"></label>
        <p>${state.firebaseReady ? 'Firebase mode — changes sync across devices.' : 'Local-first prototype. Nothing leaves this browser. Export JSON to persist.'}</p>
      </section>
      
      ${state.composerOpen ? composerHtml() : ''}
      
      <section class="filters panel" aria-labelledby="filters-heading">
        <label for="search" class="visually-hidden">Search themes</label>
        <input id="search" placeholder="Search tags, WM, distro, title..." value="${esc(state.query)}" aria-label="Search themes">
        <label for="component-filter" class="visually-hidden">Filter by component</label>
        <select id="component-filter" aria-label="Filter by component">
          <option value="all">All Components</option>
          ${COMPONENTS.map(c => `<option value="${c}" ${state.component === c ? 'selected' : ''}>${c}</option>`).join('')}
        </select>
        <label for="sort-filter" class="visually-hidden">Sort by</label>
        <select id="sort-filter" aria-label="Sort posts">
          <option value="hot" ${state.sort === 'hot' ? 'selected' : ''}>Hot</option>
          <option value="new" ${state.sort === 'new' ? 'selected' : ''}>New</option>
          <option value="saved" ${state.sort === 'saved' ? 'selected' : ''}>Saved First</option>
        </select>
      </section>
    </main>
  `;
}

function categoryViewHtml() {
  const catId = state.view.split('/')[1];
  const category = state.categories.find(c => c.id === catId);
  if (!category) return homeViewHtml();
  
  const posts = state.posts.filter(p => p.component === catId).sort((a, b) => b.createdAt - a.createdAt);
  setViewMeta('category', category);
  
  return `
    ${categoryNavHtml()}
    <main class="shell" role="main">
      <header class="category-header panel">
        <div class="cat-header-content">
          <span class="cat-icon-large">${category.icon}</span>
          <div>
            <h2>${esc(category.name)}</h2>
            <p class="cat-desc">${esc(category.desc)} · <strong>${posts.length}</strong> themes</p>
          </div>
        </div>
        <div class="cat-filters">
          <select id="cat-sort" aria-label="Sort ${category.name} themes">
            <option value="new" ${state.sort === 'new' ? 'selected' : ''}>Newest</option>
            <option value="hot" ${state.sort === 'hot' ? 'selected' : ''}>Hot</option>
            <option value="saved" ${state.sort === 'saved' ? 'selected' : ''}>Most Saved</option>
          </select>
        </div>
      </header>
      <section class="feed-section panel">
        <div class="feed-grid" role="feed">
          ${posts.length ? posts.map(postHtml).join('') : '<div class="empty panel"><h3>No themes in this category yet.</h3><p>Be the first to post a ' + category.name.toLowerCase() + ' theme.</p></div>'}
        </div>
      </section>
    </main>
  `;
}

function feedViewHtml() {
  const posts = filteredPosts();
  const sortMap = { hot: 'Hot', new: 'Newest', saved: 'Most Saved' };
  const currentSort = sortMap[state.sort] || 'Hot';
  setViewMeta('feed');
  
  return `
    ${categoryNavHtml()}
    <main class="shell" role="main">
      <header class="category-header panel">
        <h2>All Themes</h2>
        <p class="cat-desc">${posts.length} themes · Sorted by ${currentSort}</p>
      </header>
      <section class="feed-section panel">
        <div class="feed-grid" role="feed">
          ${posts.length ? posts.map(postHtml).join('') : emptyHtml()}
        </div>
      </section>
    </main>
  `;
}

function profileViewHtml() {
  const profile = state.currentProfile;
  if (!profile) return '<div class="panel"><p>User not found</p><button data-action="view-home">← Back</button></div>';
  
  const userPosts = state.posts.filter(p => p.handle === profile.handle);
  const joined = profile.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long' }) : 'recently';
  setViewMeta('profile', { handle: profile.handle, bio: profile.bio, postCount: userPosts.length, joined });
  
  return `
    ${categoryNavHtml()}
    <main class="shell" role="main">
      <section class="profile-header panel" aria-labelledby="profile-name">
        <div class="profile-avatar-large" aria-hidden="true">${esc(profile.handle[0].toUpperCase())}</div>
        <h2 id="profile-name">@${esc(profile.handle)}</h2>
        <p class="profile-bio">${esc(profile.bio || 'no bio yet')}</p>
        ${profile.links.length ? `<div class="profile-links">${profile.links.map(l => `<a href="${esc(l)}" target="_blank" rel="noopener noreferrer">${esc(l)}</a>`).join('')}</div>` : ''}
        <p class="profile-meta">Joined ${timeAgo(profile.createdAt)} · ${userPosts.length} themes</p>
      </section>
      <section class="panel" aria-labelledby="user-themes-heading">
        <header class="panel-header"><span class="eyebrow" id="user-themes-heading">📦 Themes by @${esc(profile.handle)}</span></header>
        <div class="feed-grid" role="feed">
          ${userPosts.length ? userPosts.map(postHtml).join('') : '<p class="muted">No themes posted yet</p>'}
        </div>
      </section>
    </main>
  `;
}

function authViewHtml() {
  setViewMeta('auth');
  return `
    ${categoryNavHtml()}
    <main class="shell" role="main">
      <section class="auth-panel panel" aria-labelledby="auth-heading">
        <h2 id="auth-heading">${state.authMode === 'login' ? 'Sign In' : 'Create Account'}</h2>
        <p class="auth-subtitle">${state.authMode === 'login' ? 'Enter your credentials' : 'Join the ricehub community'}</p>
        <form id="auth-form">
          ${state.authMode === 'signup' ? `<label for="auth-handle">Handle<input id="auth-handle" name="handle" type="text" required maxlength="32" placeholder="your-handle" autocomplete="username"></label>` : ''}
          <label for="auth-email">Email<input id="auth-email" name="email" type="email" required placeholder="you@example.com" autocomplete="email"></label>
          <label for="auth-password">Password<input id="auth-password" name="password" type="password" required minlength="6" placeholder="••••••••" autocomplete="${state.authMode === 'login' ? 'current-password' : 'new-password'}"></label>
          ${state.authMode === 'signup' ? `<label for="auth-confirm">Confirm Password<input id="auth-confirm" name="confirmPassword" type="password" required minlength="6" placeholder="••••••••" autocomplete="new-password"></label>` : ''}
          <button class="primary" type="submit">${state.authMode === 'login' ? 'Sign In' : 'Create Account'}</button>
        </form>
        <p class="auth-switch">${state.authMode === 'login' ? `No account? <button data-action="switch-auth" data-mode="signup">Create one</button>` : `Already have an account? <button data-action="switch-auth" data-mode="login">Sign in</button>`}</p>
        ${!state.firebaseReady ? `<p class="auth-notice">⚠️ Firebase not configured. Auth requires VITE_FIREBASE_* env vars and deployment.</p>` : ''}
      </section>
    </main>
  `;
}

function composerHtml() {
  setViewMeta('composer');
  return `
    <section class="composer panel" aria-labelledby="composer-heading">
      <header class="panel-header">
        <span class="eyebrow" id="composer-heading">📝 New Theme</span>
        <button data-action="toggle-composer">Close</button>
      </header>
      <form id="post-form">
        <div class="grid2">
          <label for="post-title">Title<input id="post-title" name="title" required maxlength="90" placeholder="nordic-kde plasma theme + kvantum"></label>
          <label for="post-component">Component<select id="post-component" name="component">${COMPONENTS.map(c => `<option value="${c}">${c}</option>`).join('')}</select></label>
          <label for="post-distro">Distro<input id="post-distro" name="distro" placeholder="arch, nixos, fedora..."></label>
          <label for="post-wm">WM/DE<input id="post-wm" name="wm" placeholder="kde, hyprland, sway..."></label>
          <label for="post-license">License<input id="post-license" name="license" placeholder="mit, gpl, cc-by, unknown"></label>
          <label for="post-links">Links<input id="post-links" name="links" placeholder="repo/demo/source urls, comma separated"></label>
        </div>
        <label for="post-summary">Summary<textarea id="post-summary" name="summary" required rows="4" placeholder="What is it, what does it theme, install notes, caveats"></textarea></label>
        <label for="post-tags">Tags<input id="post-tags" name="tags" placeholder="nord, kde, plasma, kvantum, blue"></label>
        <label class="file-drop">Attachments<input id="asset-input" type="file" multiple accept="image/*,.css,.scss,.conf,.json,.yaml,.yml,.toml,.txt,.sh,.md,.kvconfig,.colors,.tar,.gz,.zip,.xz"></label>
        <div id="draft-assets" class="draft-assets">${draftAssetsHtml()}</div>
        <button class="primary" type="submit">Publish</button>
      </form>
    </section>
  `;
}

function draftAssetsHtml() {
  if (!state.drafts.attachments.length) return '<p>No attachments staged.</p>';
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
  const firstImage = post.attachments?.find(a => a.kind === 'image' && (a.url || a.dataUrl));
  
  return `
    <article class="post-card panel" data-post-id="${post.id}">
      ${firstImage ? `
        <a href="#post/${post.id}" class="post-thumb" style="background-image: url('${esc(firstImage.url || firstImage.dataUrl)}')" aria-label="View ${esc(post.title)}"></a>
      ` : '<div class="post-thumb placeholder">📷</div>'}
      <div class="post-body">
        <header class="post-head">
          <div class="post-meta">
            <span class="post-component">${esc(post.component)}</span>
            <span class="post-distro">${esc(post.distro || '?')}</span>
            <span class="post-wm">${esc(post.wm || '?')}</span>
          </div>
          <h3 class="post-title"><a href="#post/${post.id}" data-action="view-post" data-post-id="${post.id}">${esc(post.title)}</a></h3>
        </header>
        <p class="post-summary">${esc(post.summary)}</p>
        <footer class="post-footer">
          <div class="post-author">
            <a href="#profile/${esc(post.handle)}" data-action="view-profile" data-handle="${esc(post.handle)}">@${esc(post.author)}</a>
            <span class="post-age">${timeAgo(post.createdAt)}</span>
            <span class="post-license">${esc(post.license || 'unknown')}</span>
          </div>
          ${(post.tags || []).length ? `<div class="post-tags">${post.tags.slice(0, 4).map(t => `<button data-action="tag" data-tag="${esc(t)}">#${esc(t)}</button>`).join('')}${post.tags.length > 4 ? `<span>+${post.tags.length - 4}</span>` : ''}</div>` : ''}
          <div class="post-actions">
            <button data-action="like" data-post-id="${post.id}" class="action-btn ${liked ? 'active' : ''}" aria-pressed="${liked}">♥ ${post.likesCount || 0}</button>
            <button data-action="save" data-post-id="${post.id}" class="action-btn ${saved ? 'active' : ''}" aria-pressed="${saved}">◆ ${post.savesCount || 0}</button>
            <button data-action="comment" data-post-id="${post.id}" class="action-btn">💬 ${post.commentsCount || 0}</button>
            ${isOwner ? `<button data-action="delete" data-post-id="${post.id}" class="action-btn danger">✕</button>` : ''}
          </div>
        </footer>
      </div>
    </article>
  `;
}

function assetGalleryHtml(assets) {
  if (!assets.length) return '<div class="no-assets">No files attached</div>';
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
  return `<div class="links">${cleanLinks.map((l, i) => `<a target="_blank" rel="noopener" href="${esc(l)}">Link ${i + 1}</a>`).join('')}</div>`;
}

function emptyHtml() {
  return `<div class="empty panel"><h3>No matching themes.</h3><p>Loosen the filter or post the first specimen.</p></div>`;
}

function exportDb() {
  const blob = new Blob([JSON.stringify({ posts: state.posts, users: state.users, createdAt: Date.now() }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `ricehub-${new Date().toISOString().slice(0, 10)}.json`;
  a.click(); URL.revokeObjectURL(url);
}

function importDb(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const imported = JSON.parse(reader.result);
      if (!Array.isArray(imported.posts)) throw new Error('Missing posts[]');
      state.posts = imported.posts;
      if (Array.isArray(imported.users)) state.users = imported.users;
      updateCategoryCounts();
      saveLocalDb(); render();
    } catch (err) { alert(`Bad ricehub export: ${err.message}`); }
  };
  reader.readAsText(file);
}

// ===== Event Binding =====
function bindEvents() {
  document.querySelectorAll('[data-action="home"]').forEach(btn => btn.addEventListener('click', e => { e.preventDefault(); setView('home'); }));
  document.querySelectorAll('[data-action="view-feed"]').forEach(btn => btn.addEventListener('click', () => { 
    if (btn.dataset.sort) state.sort = btn.dataset.sort; 
    setView('feed'); 
  }));
  document.querySelectorAll('[data-action="view-category"]').forEach(btn => btn.addEventListener('click', e => { e.preventDefault(); state.view = `category/${btn.dataset.category}`; window.location.hash = state.view; render(); }));
  
  document.querySelectorAll('[data-action="toggle-composer"]').forEach(btn => btn.addEventListener('click', () => { state.composerOpen = !state.composerOpen; if (state.composerOpen) setViewMeta('composer'); else setViewMeta('home', { handle: state.handle }); render(); }));
  document.querySelector('[data-action="toggle-theme"]')?.addEventListener('click', () => { toggleTheme(); render(); });
  
  document.getElementById('handle-input')?.addEventListener('change', e => setHandle(e.target.value));
  document.getElementById('search')?.addEventListener('input', e => { state.query = e.target.value; render(); });
  document.getElementById('component-filter')?.addEventListener('change', e => { state.component = e.target.value; render(); });
  document.getElementById('sort-filter')?.addEventListener('change', e => { state.sort = e.target.value; render(); });
  document.getElementById('cat-sort')?.addEventListener('change', e => { state.sort = e.target.value; render(); });
  
  document.querySelector('[data-action="export"]')?.addEventListener('click', exportDb);
  document.getElementById('import-file')?.addEventListener('change', importDb);
  document.getElementById('asset-input')?.addEventListener('change', stageFiles);
  document.getElementById('post-form')?.addEventListener('submit', submitPost);
  
  document.querySelector('[data-action="auth-status"]')?.addEventListener('click', () => {
    if (state.firebaseReady) setView(state.firebaseUser ? 'profile' : 'auth');
    else alert(state.firebaseUser ? `Signed in as ${state.handle}. Firebase auth configured.` : 'Firebase not configured. Set VITE_FIREBASE_* env vars and deploy to enable auth.');
  });
  
  document.querySelectorAll('[data-action="tag"]').forEach(btn => btn.addEventListener('click', () => { state.query = btn.dataset.tag; render(); }));
  document.querySelectorAll('[data-action="view-profile"]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); viewProfile(a.dataset.handle); }));
  document.querySelectorAll('.user-item').forEach(li => li.addEventListener('click', () => viewProfile(li.dataset.user)));
}

function bindViewEvents() {
  document.getElementById('auth-form')?.addEventListener('submit', handleAuthSubmit);
  document.querySelectorAll('[data-action="switch-auth"]').forEach(btn => btn.addEventListener('click', () => { state.authMode = btn.dataset.mode; render(); }));
  
  document.querySelectorAll('[data-action="like"]').forEach(btn => btn.addEventListener('click', () => handlePostAction('like', btn.dataset.postId)));
  document.querySelectorAll('[data-action="save"]').forEach(btn => btn.addEventListener('click', () => handlePostAction('save', btn.dataset.postId)));
  document.querySelectorAll('[data-action="copy-link"]').forEach(btn => btn.addEventListener('click', () => navigator.clipboard?.writeText(btn.dataset.postId)));
  document.querySelectorAll('[data-action="delete"]').forEach(btn => btn.addEventListener('click', () => handlePostAction('delete', btn.dataset.postId)));
  document.querySelectorAll('[data-action="comment"]').forEach(btn => btn.addEventListener('click', () => { /* comments expand on post click */ }));
  
  document.querySelectorAll('.comment-form').forEach(form => form.addEventListener('submit', e => handleCommentSubmit(e, form.dataset.postId)));
  
  document.querySelectorAll('.comment-list').forEach(el => {
    const postId = el.dataset.commentsFor;
    if (state.firebaseReady && state.firebaseUser) {
      subscribeToComments(postId, comments => {
        el.innerHTML = comments.length ? comments.map(c => `<p><b>@${esc(c.author)}</b> <span>${timeAgo(c.createdAt)}</span><br>${esc(c.text)}</p>`).join('') : '<p class="muted">No comments. Pristine and suspicious.</p>';
      });
    } else {
      const post = state.posts.find(p => p.id === postId);
      if (post?.comments?.length) el.innerHTML = post.comments.map(c => `<p><b>@${esc(c.author)}</b> <span>${timeAgo(c.createdAt)}</span><br>${esc(c.text)}</p>`).join('');
      else el.innerHTML = '<p class="muted">No comments. Pristine and suspicious.</p>';
    }
  });
  
  document.querySelectorAll('[data-action="view-profile"]').forEach(el => el.addEventListener('click', e => { e.preventDefault(); viewProfile(el.dataset.handle); }));
  document.querySelectorAll('.user-item').forEach(li => li.addEventListener('click', () => viewProfile(li.dataset.user)));
  
  // Dropdown toggle
  document.querySelector('.dropdown-toggle')?.addEventListener('click', e => {
    e.stopPropagation();
    const menu = e.target.nextElementSibling;
    const expanded = e.target.getAttribute('aria-expanded') === 'true';
    e.target.setAttribute('aria-expanded', !expanded);
    menu.style.display = expanded ? 'none' : 'block';
  });
  document.addEventListener('click', () => {
    document.querySelectorAll('.dropdown-menu').forEach(m => m.style.display = 'none');
    document.querySelectorAll('.dropdown-toggle').forEach(t => t.setAttribute('aria-expanded', 'false'));
  });
}

async function handleAuthSubmit(event) {
  event.preventDefault();
  if (!state.firebaseReady) { alert('Firebase not configured. Cannot authenticate.'); return; }
  const form = new FormData(event.currentTarget);
  const email = form.get('email'), password = form.get('password');
  if (state.authMode === 'signup') {
    const handle = clean(form.get('handle')), confirm = form.get('confirmPassword');
    if (!handle) { alert('Handle required'); return; }
    if (password !== confirm) { alert('Passwords do not match'); return; }
    if (password.length < 6) { alert('Password too short (min 6)'); return; }
    try {
      const { getAuth, createUserWithEmailAndPassword, updateProfile } = await import('firebase/auth');
      const { getAuthInstance } = await import('./firebase-init.js');
      const cred = await createUserWithEmailAndPassword(getAuthInstance(), email, password);
      await updateProfile(cred.user, { displayName: handle });
      await createUserProfile({ handle, bio: '', links: [] });
      alert('Account created! Welcome to ricehub.');
      state.authMode = 'login'; render();
    } catch (e) { alert(`Signup failed: ${e.message}`); }
  } else {
    try {
      const { getAuth, signInWithEmailAndPassword } = await import('firebase/auth');
      const { getAuthInstance } = await import('./firebase-init.js');
      await signInWithEmailAndPassword(getAuthInstance(), email, password);
    } catch (e) { alert(`Sign in failed: ${e.message}`); }
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
    setViewMeta('profile', { handle: profile.handle, bio: profile.bio, postCount: userPosts.length, joined });
    render();
  }
}

// ===== Start =====
init();
window.addEventListener('load', () => {
  const hash = window.location.hash.slice(1) || 'home';
  const view = hash.split('/')[0];
  setViewMeta(view, { handle: state.handle });
});

export { state };