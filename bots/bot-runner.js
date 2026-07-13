#!/usr/bin/env node
/**
 * ricehub bot runner — Firebase Admin SDK
 * runs on cron/github actions, no browser, no cookies
 * 
 * usage: node bot-runner.js
 * env: FIREBASE_SERVICE_ACCOUNT (JSON string) or GOOGLE_APPLICATION_CREDENTIALS (file path)
 * 
 * install: npm install firebase-admin dotenv
 */

import 'dotenv/config';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { randomUUID } from 'crypto';

// ============================================================
// INITIALIZATION
// ============================================================

function initFirebase() {
  if (getApps().length > 0) {
    return { app: getApps()[0] };
  }

  let credential;
  
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      credential = cert(sa);
    } catch (e) {
      console.error('❌ Invalid FIREBASE_SERVICE_ACCOUNT JSON:', e.message);
      process.exit(1);
    }
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    credential = cert(process.env.GOOGLE_APPLICATION_CREDENTIALS);
  } else {
    console.error('❌ No Firebase credentials found. Set FIREBASE_SERVICE_ACCOUNT or GOOGLE_APPLICATION_CREDENTIALS');
    process.exit(1);
  }

  const app = initializeApp({ credential });
  console.log(`✅ Firebase initialized: ${app.options.projectId}`);
  return { app };
}

const { app } = initFirebase();
const db = getFirestore(app);
const auth = getAuth(app);

// ============================================================
// CONFIGURATION
// ============================================================

const CONFIG = {
  botCount: 8,
  maxPostsPerBot: 2,
  maxInteractionsPerBot: 5,
  postChance: 0.4,
  interactionChance: 0.7,
  collections: {
    posts: 'posts',
    users: 'users',
    postLikes: 'post_likes',
    postSaves: 'post_saves',
    comments: 'comments',
    botState: 'bot_state',
  },
  components: [
    'sddm', 'plasma', 'aurorae', 'kvantum', 'gtk', 'icons', 'cursors',
    'colorscheme', 'wallpaper', 'eww', 'waybar', 'rofi', 'conky', 'terminal',
    'hyprland', 'sway', 'dotfiles', 'full-rice'
  ],
  distros: ['arch', 'fedora', 'nixos', 'debian', 'opensuse', 'ubuntu', 'gentoo', 'void', 'any'],
  wms: ['hyprland', 'sway', 'kde plasma', 'gnome', 'bspwm', 'i3', 'awesome', 'qtile', 'river', 'any'],
  licenses: ['mit', 'gpl-3.0', 'cc-by-4.0', 'cc0', 'apache-2.0', 'bsd-3-clause', 'unknown'],
};

// ============================================================
// BOT PERSONALITIES — distinct voices, interests, quirks
// ============================================================

const BOT_PERSONALITIES = [
  {
    id: 'drainpipe',
    handle: 'drainpipe',
    email: 'ricebot+drainpipe@ricehub.local',
    password: 'ricebot123',
    bio: 'minimalist. arch. sway. dots at github.com/drainpipe',
    personality: 'terse, technical, obsessed with minimalism and performance. speaks in fragments. dislikes bloat.',
    interests: ['terminal', 'sway', 'minimal', 'arch', 'performance', 'dots'],
    components: ['terminal', 'dotfiles', 'full-rice', 'sway'],
    commentStyle: [
      'clean.',
      'what font?',
      'rice goals.',
      'dots when?',
      'minimal and fast.',
      'config share?',
    ],
    postFrequency: 0.3,
    interactionStyle: 'sparse but meaningful',
  },
  {
    id: 'mew',
    handle: 'mew',
    email: 'ricebot+mew@ricehub.local',
    password: 'ricebot123',
    bio: 'hopping between kde, gnome, hyprland. collector of color schemes.',
    personality: 'enthusiastic explorer, tries everything, shares discoveries. warm, curious, asks questions.',
    interests: ['kde', 'gnome', 'hyprland', 'colorschemes', 'hopping', 'exploration'],
    components: ['plasma', 'gtk', 'hyprland', 'colorscheme', 'wallpaper'],
    commentStyle: [
      'love this color palette!',
      'been wanting to try this wm',
      'how\'s the config maintenance?',
      'gorgeous screenshots',
      'adding to my rotation',
      'what bar is that?',
    ],
    postFrequency: 0.5,
    interactionStyle: 'enthusiastic and curious',
  },
  {
    id: 'uuum',
    handle: 'uuum',
    email: 'ricebot+uuum@ricehub.local',
    password: 'ricebot123',
    bio: 'kvantum theme porter. plasma enthusiast. fedora daily driver.',
    personality: 'technical expert on theming engines. opinionated about kvantum vs aurorae. helpful but precise.',
    interests: ['kvantum', 'plasma', 'kde', 'theming', 'fedora', 'porting'],
    components: ['kvantum', 'plasma', 'aurorae', 'colorscheme'],
    commentStyle: [
      'kvantum handles rounded corners better',
      'aurorae version when?',
      'the padding on the titlebar looks off',
      'ported this to kvantum last week',
      'plasma 6.1 handles this natively now',
      'check the svg rendering on hidpi',
    ],
    postFrequency: 0.4,
    interactionStyle: 'technical and opinionated',
  },
  {
    id: 'hal1x',
    handle: 'hal1x',
    email: 'ricebot+hal1x@ricehub.local',
    password: 'ricebot123',
    bio: 'rw-designer regular. 200+ cursor themes archived. nixos + hyprland.',
    personality: 'obsessive collector, knows every cursor theme. pedantic about hotspots and animation frames.',
    interests: ['cursors', 'rw-designer', 'nixos', 'hyprland', 'animation', 'collecting'],
    components: ['cursors', 'icons', 'hyprland', 'nixos'],
    commentStyle: [
      'hotspot is 2px off on the resize cursor',
      'animated cursors lag on wayland without this patch',
      'have the full set archived',
      'rw-designer id 142392 has the fixed version',
      'xcursor format limitations...',
      '32px vs 48px scaling issue on hyprland',
    ],
    postFrequency: 0.35,
    interactionStyle: 'pedantic and knowledgeable',
  },
  {
    id: 'godsfavoritewizard',
    handle: 'godsfavoritewizard',
    email: 'ricebot+wizard@ricehub.local',
    password: 'ricebot123',
    bio: 'sddm theme creator. love greeters. arch + kde plasma.',
    personality: 'artistic, cares about first impressions. greetd vs sddm debates. animations matter.',
    interests: ['sddm', 'greeter', 'animation', 'art', 'plasma', 'arch'],
    components: ['sddm', 'plasma', 'wallpaper', 'animation'],
    commentStyle: [
      'the greeter animation is smooth',
      'background transition could be smoother',
      'sddm > greetd for animations',
      'made a similar theme last month',
      'plasma integration looks clean',
      'what\'s the qml performance like?',
    ],
    postFrequency: 0.3,
    interactionStyle: 'artistic and detail-oriented',
  },
  {
    id: 'runawxy',
    handle: 'runawxy',
    email: 'ricebot+runawxy@ricehub.local',
    password: 'ricebot123',
    bio: 'dots manager. stow + chezmoi. sync across 5 machines.',
    personality: 'automation obsessed. declarative everything. nix flakes evangelist. hates manual config.',
    interests: ['dotfiles', 'chezmoi', 'stow', 'nix', 'flakes', 'declarative', 'sync'],
    components: ['dotfiles', 'full-rice', 'terminal', 'hyprland', 'nixos'],
    commentStyle: [
      'chezmoi template for this?',
      'nix flake when?',
      'declarative or gtfo',
      'syncs across my 5 machines',
      'stow is showing its age',
      'flake.nix or it didn\'t happen',
    ],
    postFrequency: 0.25,
    interactionStyle: 'automation-obsessed, nix-pilled',
  },
  {
    id: 'hexy',
    handle: 'hexy',
    email: 'ricebot+hexy@ricehub.local',
    password: 'ricebot123',
    bio: 'wallpaper curator. 4k only. unsplash, wallhaven, custom renders.',
    personality: 'visual curator. knows resolution, color theory, sources. shares links. aesthetic-first.',
    interests: ['wallpaper', '4k', '5k', 'unsplash', 'wallhaven', 'renders', 'aesthetic'],
    components: ['wallpaper', 'colorscheme', 'gtk', 'plasma'],
    commentStyle: [
      'source? need this in 5k',
      'wallhaven id?',
      'the color palette matches the theme perfectly',
      'rendered a 8k version last night',
      'unsplash photographer credit?',
      'matches catppuccin mocha palette',
    ],
    postFrequency: 0.45,
    interactionStyle: 'visual curator, source-obsessed',
  },
  {
    id: 'lvl99npckiller',
    handle: 'lvl99npckiller',
    email: 'ricebot+lvl99@ricehub.local',
    password: 'ricebot123',
    bio: 'eww bar wizard. literate config. waybar refugee.',
    personality: 'eww evangelist. knows elisp-like syntax inside out. performance obsessed. hates waybar.',
    interests: ['eww', 'yuck', 'literate-config', 'waybar', 'performance', 'widgets'],
    components: ['eww', 'waybar', 'hyprland', 'rofi', 'terminal'],
    commentStyle: [
      'eww polls are lighter than waybar modules',
      'literate config makes this maintainable',
      'waybar refugee here too',
      'the yuck syntax is growing on me',
      'poll interval 1000ms is fine for this',
      'no gtk dependency is the win',
    ],
    postFrequency: 0.35,
    interactionStyle: 'technical evangelist, performance-focused',
  },
];

// ============================================================
// THEME POST TEMPLATES
// ============================================================

const THEME_POSTS = [
  {
    title: 'nordic-kde plasma + kvantum complete',
    component: 'plasma',
    distro: 'fedora',
    wm: 'kde plasma',
    license: 'gpl-3.0',
    summary: 'full nord-themed kde desktop. includes color scheme, kvantum theme (rounded + square variants), sddm greeter, and matching wallpaper. tested on plasma 6.1.',
    tags: ['nord', 'kde', 'plasma', 'kvantum', 'blue', 'minimal'],
    links: ['https://store.kde.org/p/2104923/'],
  },
  {
    title: 'tokyo-night hyprland + eww bar',
    component: 'full-rice',
    distro: 'arch',
    wm: 'hyprland',
    license: 'mit',
    summary: 'tokyo night port for hyprland. eww bar with workspace indicators, media controls, system tray. includes rofi, waybar alternative, and wallpaper.',
    tags: ['tokyo-night', 'hyprland', 'eww', 'wayland', 'purple', 'anime'],
    links: ['https://github.com/tokyo-night/hyprland-rice'],
  },
  {
    title: 'catppuccin-mocha sddm greeter',
    component: 'sddm',
    distro: 'nixos',
    wm: 'hyprland',
    license: 'cc-by-4.0',
    summary: 'catppuccin mocha theme for sddm. animated background, rounded inputs, custom font. works with plasma, greetd, or standalone.',
    tags: ['catppuccin', 'sddm', 'mocha', 'pink', 'animated'],
    links: ['https://github.com/catppuccin/sddm'],
  },
  {
    title: 'material-you cursors for wayland/x11',
    component: 'cursors',
    distro: 'arch',
    wm: 'sway',
    license: 'cc-by-4.0',
    summary: 'google material you cursor theme ported to linux. 48 cursors, all states animated. 3 sizes (24/32/48). works on sway, hyprland, kde, gnome.',
    tags: ['material', 'google', 'animated', 'wayland', 'x11', 'cursors'],
    links: ['https://www.rw-designer.com/cursor-set/material-you'],
  },
  {
    title: 'gruvbox-material kvantum + gtk',
    component: 'kvantum',
    distro: 'debian',
    wm: 'kde plasma',
    license: 'gpl-3.0',
    summary: 'gruvbox material port for kvantum. matches gtk theme perfectly. includes dark/light variants, 4 accent colors. plasma integration.',
    tags: ['gruvbox', 'kvantum', 'gtk', 'warm', 'retro', 'brown'],
    links: ['https://store.kde.org/p/1403928/'],
  },
  {
    title: 'rose-pine dawn gtk + gnome-shell',
    component: 'gtk',
    distro: 'fedora',
    wm: 'gnome',
    license: 'mit',
    summary: 'rose pine dawn (light variant) for gtk3/gtk4 + gnome shell. includes nautilus, gedit, terminal colors. gnome 46 compatible.',
    tags: ['rose-pine', 'dawn', 'light', 'gtk', 'gnome', 'pink'],
    links: ['https://rosepine-theme.github.io/'],
  },
  {
    title: 'everforest eww bar + rofi',
    component: 'eww',
    distro: 'arch',
    wm: 'bspwm',
    license: 'mit',
    summary: 'everforest green theme for eww. sidebar bar with workspaces, sysinfo, media, calendar. matching rofi launcher. bspwm config included.',
    tags: ['everforest', 'eww', 'bspwm', 'green', 'nature', 'rofi'],
    links: ['https://github.com/everforest-theme/eww'],
  },
  {
    title: 'dracula-pro plasma + konsole',
    component: 'plasma',
    distro: 'opensuse',
    wm: 'kde plasma',
    license: 'mit',
    summary: 'official dracula pro theme for kde plasma. color scheme, kvantum, konsole profile, yakuake skin. all 4 dracula variants.',
    tags: ['dracula', 'plasma', 'konsole', 'purple', 'dark', 'pro'],
    links: ['https://draculatheme.com/kde'],
  },
  {
    title: 'nordic-walls: 50+ 4k wallpapers',
    component: 'wallpaper',
    distro: 'any',
    wm: 'any',
    license: 'cc0',
    summary: 'curated nordic color palette wallpapers. 50+ images, 4k/5k resolution. mountains, fjords, auroras, minimal gradients. cc0 - free for any use.',
    tags: ['nordic', 'wallpaper', '4k', 'nature', 'cc0', 'minimal'],
    links: ['https://github.com/nordic-walls/wallpapers'],
  },
  {
    title: 'monochrome dotfiles: chezmoi + nix',
    component: 'dotfiles',
    distro: 'nixos',
    wm: 'hyprland',
    license: 'mit',
    summary: 'monochrome dotfiles managed with chezmoi + nix flakes. hyprland, eww, rofi, kitty, fish, nvim. fully declarative. syncs across machines.',
    tags: ['dotfiles', 'chezmoi', 'nix', 'hyprland', 'monochrome', 'declarative'],
    links: ['https://github.com/monochrome-dots/dots'],
  },
];

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function getTimestamp() {
  return Timestamp.now();
}

// ============================================================
// BOT MANAGEMENT
// ============================================================

async function ensureBotExists(bot) {
  try {
    // Check if user exists by email
    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(bot.email);
      console.log(`  ✓ ${bot.handle} already exists (${userRecord.uid})`);
    } catch (e) {
      if (e.code === 'auth/user-not-found') {
        userRecord = await auth.createUser({
          email: bot.email,
          password: bot.password,
          displayName: bot.handle,
          emailVerified: true,
        });
        console.log(`  ✅ Created ${bot.handle} (${userRecord.uid})`);
      } else {
        throw e;
      }
    }

    // Ensure user profile exists in Firestore
    const userRef = db.collection(CONFIG.collections.users).doc(userRecord.uid);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      await userRef.set({
        handle: bot.handle,
        bio: bot.bio,
        avatarUrl: '',
        links: [],
        createdAt: getTimestamp(),
        updatedAt: getTimestamp(),
      });
      console.log(`  ✅ Created profile for ${bot.handle}`);
    }

    return { uid: userRecord.uid, ...bot };
  } catch (error) {
    console.error(`  ❌ Failed for ${bot.handle}:`, error.message);
    return null;
  }
}

async function ensureAllBots() {
  console.log('\n🤖 Ensuring all bots exist...');
  const bots = [];
  
  for (const bot of BOT_PERSONALITIES) {
    const result = await ensureBotExists(bot);
    if (result) bots.push(result);
    await sleep(100); // Rate limiting
  }
  
  console.log(`✅ ${bots.length}/${BOT_PERSONALITIES.length} bots ready\n`);
  return bots;
}

// ============================================================
// POSTING
// ============================================================

async function createPost(bot, theme) {
  const postRef = db.collection(CONFIG.collections.posts).doc();
  const postId = postRef.id;
  
  const post = {
    ...theme,
    id: postId,
    handle: bot.uid,
    author: bot.handle,
    createdAt: getTimestamp(),
    updatedAt: getTimestamp(),
    likesCount: 0,
    savesCount: 0,
    commentsCount: 0,
    attachments: [],
  };
  
  await postRef.set(post);
  console.log(`  📝 ${bot.handle} posted: "${theme.title}"`);
  return postId;
}

async function maybePost(bot) {
  if (Math.random() > CONFIG.postChance) return null;
  
  const postCount = 1 + Math.floor(Math.random() * CONFIG.maxPostsPerBot);
  const shuffled = shuffle(THEME_POSTS);
  const postIds = [];
  
  for (let i = 0; i < postCount && i < shuffled.length; i++) {
    const postId = await createPost(bot, shuffled[i]);
    postIds.push(postId);
    await sleep(200);
  }
  
  return postIds;
}

// ============================================================
// INTERACTIONS
// ============================================================

async function likePost(bot, postId) {
  const likeRef = db.collection(CONFIG.collections.postLikes).doc(`${bot.uid}_${postId}`);
  const likeDoc = await likeRef.get();
  const postRef = db.collection(CONFIG.collections.posts).doc(postId);
  
  await db.runTransaction(async (transaction) => {
    const postDoc = await transaction.get(postRef);
    if (!postDoc.exists) throw new Error('Post not found');
    
    const currentLikes = postDoc.data().likesCount || 0;
    
    if (likeDoc.exists) {
      transaction.delete(likeRef);
      transaction.update(postRef, { likesCount: currentLikes - 1 });
    } else {
      transaction.set(likeRef, {
        postId,
        handle: bot.uid,
        createdAt: getTimestamp(),
      });
      transaction.update(postRef, { likesCount: currentLikes + 1 });
    }
  });
  
  console.log(`  ❤️ ${bot.handle} ${likeDoc.exists ? 'unliked' : 'liked'} ${postId}`);
}

async function savePost(bot, postId) {
  const saveRef = db.collection(CONFIG.collections.postSaves).doc(`${bot.uid}_${postId}`);
  const saveDoc = await saveRef.get();
  const postRef = db.collection(CONFIG.collections.posts).doc(postId);
  
  await db.runTransaction(async (transaction) => {
    const postDoc = await transaction.get(postRef);
    if (!postDoc.exists) throw new Error('Post not found');
    
    const currentSaves = postDoc.data().savesCount || 0;
    
    if (saveDoc.exists) {
      transaction.delete(saveRef);
      transaction.update(postRef, { savesCount: currentSaves - 1 });
    } else {
      transaction.set(saveRef, {
        postId,
        handle: bot.uid,
        createdAt: getTimestamp(),
      });
      transaction.update(postRef, { savesCount: currentSaves + 1 });
    }
  });
  
  console.log(`  💾 ${bot.handle} ${saveDoc.exists ? 'unsaved' : 'saved'} ${postId}`);
}

async function commentPost(bot, postId, text) {
  const commentRef = db.collection(CONFIG.collections.comments).doc();
  const comment = {
    id: commentRef.id,
    postId,
    handle: bot.uid,
    author: bot.handle,
    text,
    createdAt: getTimestamp(),
  };
  
  const postRef = db.collection(CONFIG.collections.posts).doc(postId);
  
  await db.runTransaction(async (transaction) => {
    const postDoc = await transaction.get(postRef);
    if (!postDoc.exists) throw new Error('Post not found');
    
    const currentComments = postDoc.data().commentsCount || 0;
    transaction.set(commentRef, comment);
    transaction.update(postRef, { commentsCount: currentComments + 1 });
  });
  
  console.log(`  💬 ${bot.handle} commented on ${postId}: "${text}"`);
}

async function getAllPostIds() {
  const snapshot = await db.collection(CONFIG.collections.posts)
    .orderBy('createdAt', 'desc')
    .limit(100)
    .get();
  
  return snapshot.docs.map(d => d.id);
}

async function runInteractions(bot, allPostIds) {
  if (allPostIds.length === 0) return;
  
  const interactionCount = 1 + Math.floor(Math.random() * CONFIG.maxInteractionsPerBot);
  const shuffled = shuffle(allPostIds);
  
  for (let i = 0; i < interactionCount && i < shuffled.length; i++) {
    if (Math.random() > CONFIG.interactionChance) continue;
    
    const postId = shuffled[i];
    
    // Don't interact with own posts
    const postDoc = await db.collection(CONFIG.collections.posts).doc(postId).get();
    if (!postDoc.exists || postDoc.data().handle === bot.uid) continue;
    
    const action = randomChoice(['like', 'save', 'comment']);
    
    try {
      if (action === 'like') {
        await likePost(bot, postId);
      } else if (action === 'save') {
        await savePost(bot, postId);
      } else if (action === 'comment') {
        await commentPost(bot, postId, randomChoice(bot.commentStyle));
      }
      await sleep(150);
    } catch (error) {
      console.error(`  ❌ Interaction failed for ${bot.handle}:`, error.message);
    }
  }
}

// ============================================================
// BOT STATE TRACKING
// ============================================================

async function updateBotState(bot, stats) {
  const stateRef = db.collection(CONFIG.collections.botState).doc(bot.uid);
  await stateRef.set({
    handle: bot.handle,
    lastRun: getTimestamp(),
    totalPosts: FieldValue.increment(stats.posts || 0),
    totalLikes: FieldValue.increment(stats.likes || 0),
    totalSaves: FieldValue.increment(stats.saves || 0),
    totalComments: FieldValue.increment(stats.comments || 0),
  }, { merge: true });
}

// ============================================================
// MAIN RUNNER
// ============================================================

async function run() {
  console.log('╔═══════════════════════════════════════════════╗');
  console.log('║       ricehub bot runner                     ║');
  console.log('║       Firebase Admin SDK - no browser needed ║');
  console.log('╚═══════════════════════════════════════════════╝');
  console.log(`\n🕐 Started at: ${new Date().toISOString()}`);
  
  try {
    // Ensure bots exist
    const bots = await ensureAllBots();
    
    // Get existing posts for interaction
    const allPostIds = await getAllPostIds();
    console.log(`📚 Found ${allPostIds.length} existing posts\n`);
    
    // Run each bot
    for (const bot of bots) {
      console.log(`\n🤖 Running ${bot.handle}...`);
      const stats = { posts: 0, likes: 0, saves: 0, comments: 0 };
      
      // Maybe post
      const newPostIds = await maybePost(bot);
      if (newPostIds) stats.posts = newPostIds.length;
      
      // Interact with others
      await runInteractions(bot, allPostIds);
      
      // Update bot state
      await updateBotState(bot, stats);
      
      console.log(`  ✅ ${bot.handle} done (posts: ${stats.posts})`);
      await sleep(500);
    }
    
    console.log('\n╔═══════════════════════════════════════════════╗');
    console.log('║       ✨ Run complete                        ║');
    console.log(`║       ${new Date().toISOString()}                    ║`);
    console.log('╚═══════════════════════════════════════════════╝');
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down...');
  process.exit(0);
});

run().catch(console.error);