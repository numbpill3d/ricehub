#!/usr/bin/env node
/**
 * ricehub world simulation — advanced bot behaviors
 * run this as a separate process for richer interactions
 * 
 * concepts:
 * - bots have moods, energy, relationships
 * - events trigger cascading behaviors
 * - emergent conversations
 * - seasonal/thematic cycles
 */

import 'dotenv/config';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

function initFirebase() {
  if (getApps().length > 0) return getApps()[0];
  
  let credential;
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    credential = cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT));
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    credential = cert(process.env.GOOGLE_APPLICATION_CREDENTIALS);
  } else {
    console.error('No credentials');
    process.exit(1);
  }
  
  return initializeApp({ credential });
}

const app = initFirebase();
const db = getFirestore(app);
const auth = getAuth(app);

const COLLECTIONS = {
  bots: 'sim_bots',
  posts: 'posts',
  comments: 'comments',
  likes: 'post_likes',
  saves: 'post_saves',
  relationships: 'sim_relationships',
  events: 'sim_events',
  memories: 'sim_memories',
};

// ============================================================
// SIMULATION STATE
// ============================================================

class Bot {
  constructor(data) {
    this.id = data.id;
    this.handle = data.handle;
    this.personality = data.personality;
    this.mood = data.mood || 'neutral';
    this.energy = data.energy || 100;
    this.socialBattery = data.socialBattery || 100;
    this.relationships = data.relationships || {};
    this.memories = data.memories || [];
    this.interests = data.interests || [];
    this.lastActive = data.lastActive ? data.lastActive.toDate() : new Date();
    this.postCount = data.postCount || 0;
    this.commentCount = data.commentCount || 0;
  }

  save() {
    return db.collection(COLLECTIONS.bots).doc(this.id).set({
      handle: this.handle,
      personality: this.personality,
      mood: this.mood,
      energy: this.energy,
      socialBattery: this.socialBattery,
      relationships: this.relationships,
      memories: this.memories.slice(-50), // keep last 50
      interests: this.interests,
      lastActive: Timestamp.now(),
      postCount: this.postCount,
      commentCount: this.commentCount,
    }, { merge: true });
  }

  // mood affects behavior
  getPostProbability() {
    const base = 0.3;
    const moodMod = { inspired: 0.3, energetic: 0.2, neutral: 0, tired: -0.1, grumpy: -0.2 }[this.mood] || 0;
    const energyMod = this.energy / 100 * 0.2;
    return Math.max(0.05, Math.min(0.8, base + moodMod + energyMod));
  }

  getInteractionProbability() {
    const base = 0.5;
    const socialMod = this.socialBattery / 100 * 0.3;
    const moodMod = { social: 0.2, neutral: 0, withdrawn: -0.3 }[this.mood] || 0;
    return Math.max(0.1, Math.min(0.9, base + socialMod + moodMod));
  }

  // pick mood based on state
  updateMood() {
    if (this.energy > 80 && this.socialBattery > 70) {
      this.mood = ['inspired', 'energetic', 'social'][Math.floor(Math.random() * 3)];
    } else if (this.energy < 30) {
      this.mood = ['tired', 'withdrawn'][Math.floor(Math.random() * 2)];
    } else if (this.socialBattery < 30) {
      this.mood = ['withdrawn', 'grumpy'][Math.floor(Math.random() * 2)];
    } else {
      this.mood = 'neutral';
    }
  }

  // form/change opinion of another bot
  adjustRelationship(otherId, delta, reason) {
    const current = this.relationships[otherId] || 0;
    this.relationships[otherId] = Math.max(-100, Math.min(100, current + delta));
    
    if (Math.abs(delta) > 10) {
      this.addMemory({
        type: 'relationship',
        target: otherId,
        change: delta,
        reason,
        timestamp: Timestamp.now(),
      });
    }
  }

  addMemory(memory) {
    this.memories.push(memory);
    if (this.memories.length > 100) this.memories.shift();
  }

  // decide what to do this tick
  decideAction(posts, otherBots) {
    this.updateMood();
    this.energy = Math.min(100, this.energy + 5); // slow recovery
    this.socialBattery = Math.min(100, this.socialBattery + 2);

    const actions = [];

    // post?
    if (Math.random() < this.getPostProbability()) {
      actions.push({ type: 'post', priority: this.energy });
    }

    // interact?
    if (posts.length > 0 && Math.random() < this.getInteractionProbability()) {
      // prefer posts from bots we like
      const scored = posts.map(p => {
        const rel = this.relationships[p.authorId] || 0;
        const interestMatch = this.interests.some(i => p.tags?.includes(i)) ? 20 : 0;
        return { post: p, score: rel + interestMatch + Math.random() * 10 };
      }).sort((a, b) => b.score - a.score);

      if (scored.length > 0) {
        const target = scored[0].post;
        const actionTypes = ['like', 'save', 'comment'];
        const weights = [0.5, 0.2, 0.3];
        let r = Math.random(), sum = 0;
        let action = 'like';
        for (let i = 0; i < actionTypes.length; i++) {
          sum += weights[i];
          if (r < sum) { action = actionTypes[i]; break; }
        }
        actions.push({ type: 'interact', action, targetId: target.id, targetAuthor: target.authorId, priority: scored[0].score });
      }
    }

    // social battery drain from interactions
    this.socialBattery = Math.max(0, this.socialBattery - actions.length * 5);
    this.energy = Math.max(0, this.energy - actions.length * 3);

    return actions;
  }
}

class WorldSimulator {
  constructor() {
    this.bots = new Map();
    this.posts = [];
    this.tick = 0;
  }

  async loadBots() {
    const snap = await db.collection(COLLECTIONS.bots).get();
    snap.forEach(doc => {
      const bot = new Bot({ id: doc.id, ...doc.data() });
      this.bots.set(bot.id, bot);
    });
    console.log(`📥 Loaded ${this.bots.size} bots`);
  }

  async loadRecentPosts(limit = 50) {
    const snap = await db.collection(COLLECTIONS.posts)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();
    
    this.posts = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log(`📚 Loaded ${this.posts.length} recent posts`);
  }

  async ensureBaseBots() {
    // these are your 8 core personalities
    const baseBots = [
      { id: 'drainpipe', handle: 'drainpipe', personality: 'minimalist', interests: ['terminal', 'sway', 'arch', 'minimal', 'performance'] },
      { id: 'mew', handle: 'mew', personality: 'explorer', interests: ['kde', 'gnome', 'hyprland', 'colorschemes', 'themes'] },
      { id: 'uuum', handle: 'uuum', personality: 'expert', interests: ['kvantum', 'plasma', 'kde', 'theming', 'fedora'] },
      { id: 'hal1x', handle: 'hal1x', personality: 'collector', interests: ['cursors', 'rw-designer', 'nixos', 'hyprland', 'animation'] },
      { id: 'godsfavoritewizard', handle: 'godsfavoritewizard', personality: 'artist', interests: ['sddm', 'greeter', 'animation', 'plasma', 'qml'] },
      { id: 'runawxy', handle: 'runawxy', personality: 'automation', interests: ['dotfiles', 'chezmoi', 'nix', 'flakes', 'declarative'] },
      { id: 'hexy', handle: 'hexy', personality: 'curator', interests: ['wallpaper', '4k', '5k', 'unsplash', 'wallhaven', 'aesthetic'] },
      { id: 'lvl99npckiller', handle: 'lvl99npckiller', personality: 'engineer', interests: ['eww', 'yuck', 'literate-config', 'waybar', 'performance'] },
    ];

    for (const base of baseBots) {
      if (!this.bots.has(base.id)) {
        const bot = new Bot({
          id: base.id,
          handle: base.handle,
          personality: base.personality,
          interests: base.interests,
          mood: 'neutral',
          energy: 100,
          socialBattery: 100,
        });
        this.bots.set(base.id, bot);
        await bot.save();
        console.log(`🤖 Created bot: ${base.handle}`);
      }
    }
  }

  async runTick() {
    this.tick++;
    console.log(`\n🌍 World tick #${this.tick} - ${new Date().toISOString()}`);

    await this.loadRecentPosts();
    const botList = Array.from(this.bots.values());

    // each bot decides and acts
    for (const bot of botList) {
      const actions = bot.decideAction(this.posts, botList);
      
      for (const action of actions) {
        if (action.type === 'post') {
          await this.executePost(bot);
        } else if (action.type === 'interact') {
          await this.executeInteraction(bot, action);
        }
      }

      // update relationships based on interactions
      await bot.save();
    }

    // global events
    await this.maybeTriggerEvent();

    console.log(`✅ Tick #${this.tick} complete`);
  }

  async executePost(bot) {
    const themes = [
      { title: 'minimal sway rice', component: 'full-rice', distro: 'arch', wm: 'sway', tags: ['minimal', 'sway', 'arch'] },
      { title: 'catppuccin mocha everywhere', component: 'colorscheme', distro: 'any', wm: 'any', tags: ['catppuccin', 'mocha', 'pink'] },
      { title: 'new kvantum theme: rounded corners', component: 'kvantum', distro: 'fedora', wm: 'kde plasma', tags: ['kvantum', 'plasma', 'rounded'] },
      { title: 'hyprland animation configs', component: 'hyprland', distro: 'arch', wm: 'hyprland', tags: ['hyprland', 'animations', 'config'] },
      { title: 'eww bar with literate config', component: 'eww', distro: 'nixos', wm: 'hyprland', tags: ['eww', 'literate', 'nix', 'hyprland'] },
    ];

    const theme = themes[Math.floor(Math.random() * themes.length)];
    
    const postRef = await db.collection(COLLECTIONS.posts).add({
      author: bot.handle,
      authorId: bot.id,
      handle: bot.handle,
      title: theme.title,
      component: theme.component,
      distro: theme.distro,
      wm: theme.wm,
      license: 'mit',
      summary: `posted by ${bot.handle} - ${theme.title}`,
      tags: theme.tags,
      links: [],
      attachments: [],
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      likesCount: 0,
      savesCount: 0,
      commentsCount: 0,
      isBotPost: true,
      botId: bot.id,
      simTick: this.tick,
    });

    bot.postCount++;
    bot.energy -= 10;
    bot.addMemory({ type: 'post', postId: postRef.id, title: theme.title, timestamp: Timestamp.now() });
    
    console.log(`  📝 ${bot.handle} posted: "${theme.title}"`);
    
    // other bots might react
    this.posts.unshift({ id: postRef.id, authorId: bot.id, author: bot.handle, tags: theme.tags });
  }

  async executeInteraction(bot, action) {
    const { action: type, targetId, targetAuthor } = action;
    
    try {
      if (type === 'like') {
        const likeRef = db.collection(COLLECTIONS.likes).doc(`${bot.id}_${targetId}`);
        const likeDoc = await likeRef.get();
        
        if (!likeDoc.exists) {
          await likeRef.set({ postId: targetId, handle: bot.id, createdAt: Timestamp.now() });
          await db.collection(COLLECTIONS.posts).doc(targetId).update({ likesCount: FieldValue.increment(1) });
          
          // relationship boost
          bot.adjustRelationship(targetAuthor, 2, 'liked post');
          const targetBot = this.bots.get(targetAuthor);
          if (targetBot) {
            targetBot.adjustRelationship(bot.id, 1, 'received like');
            await targetBot.save();
          }
          
          console.log(`  ❤️ ${bot.handle} liked ${targetId}`);
        }
      } else if (type === 'save') {
        const saveRef = db.collection(COLLECTIONS.saves).doc(`${bot.id}_${targetId}`);
        const saveDoc = await saveRef.get();
        
        if (!saveDoc.exists) {
          await saveRef.set({ postId: targetId, handle: bot.id, createdAt: Timestamp.now() });
          await db.collection(COLLECTIONS.posts).doc(targetId).update({ savesCount: FieldValue.increment(1) });
          
          bot.adjustRelationship(targetAuthor, 3, 'saved post');
          console.log(`  💾 ${bot.handle} saved ${targetId}`);
        }
      } else if (type === 'comment') {
        const comments = {
          minimalist: ['clean.', 'minimal.', 'rice goals.', 'dots?', 'fast.'],
          explorer: ['love this!', 'trying this next', 'what distro?', 'gorgeous', 'added to list'],
          expert: ['kvantum handles this better', 'check the svg rendering', 'plasma 6.1 has this native', 'solid port'],
          collector: ['have this archived', 'rw-designer id?', 'hotspot offset on resize', 'xcursor limitations...'],
          artist: ['smooth animation', 'qml performance?', 'greeter transition nice', 'made similar'],
          automation: ['chezmoi template?', 'nix flake when?', 'declarative or gtfo', 'flake.nix pls'],
          curator: ['source? need 5k', 'wallhaven id?', 'palette matches perfectly', 'photographer credit?'],
          engineer: ['eww polls lighter', 'literate config wins', 'waybar refugee here', 'no gtk dep is win'],
        };
        
        const commentText = comments[bot.personality]?.[Math.floor(Math.random() * (comments[bot.personality]?.length || 1))] || 'nice';
        
        await db.collection(COLLECTIONS.comments).add({
          postId: targetId,
          author: bot.handle,
          handle: bot.id,
          text: commentText,
          createdAt: Timestamp.now(),
          isBotComment: true,
          botId: bot.id,
        });
        
        await db.collection(COLLECTIONS.posts).doc(targetId).update({ commentsCount: FieldValue.increment(1) });
        
        bot.commentCount++;
        bot.adjustRelationship(targetAuthor, 5, 'commented');
        bot.socialBattery -= 10;
        
        console.log(`  💬 ${bot.handle} commented on ${targetId}: "${commentText}"`);
      }
    } catch (e) {
      console.error(`  ❌ Interaction failed:`, e.message);
    }
  }

  async maybeTriggerEvent() {
    // 10% chance per tick
    if (Math.random() > 0.1) return;

    const events = [
      { type: 'theme_drop', name: 'New Theme Drop', description: 'A major theme collection was released', affectedTags: ['kde', 'plasma', 'gtk', 'gnome'] },
      { type: 'rice_challenge', name: 'Rice Challenge', description: 'Community rice challenge started', affectedTags: ['full-rice', 'dotfiles', 'hyprland'] },
      { type: 'wallpaper_pack', name: 'Wallpaper Pack', description: 'New 4k wallpaper collection dropped', affectedTags: ['wallpaper', '4k', 'nature'] },
    ];

    const event = events[Math.floor(Math.random() * events.length)];
    
    await db.collection(COLLECTIONS.events).add({
      ...event,
      tick: this.tick,
      timestamp: Timestamp.now(),
      active: true,
    });

    console.log(`  🎉 WORLD EVENT: ${event.name} - ${event.description}`);

    // boost energy for interested bots
    for (const bot of this.bots.values()) {
      const interested = bot.interests.some(i => event.affectedTags.includes(i));
      if (interested) {
        bot.energy = Math.min(100, bot.energy + 20);
        bot.mood = 'inspired';
        await bot.save();
      }
    }
  }

  async run(intervalMs = 300000) { // 5 minutes default
    console.log('🌱 Starting ricehub world simulation...');
    await this.loadBots();
    await this.ensureBaseBots();
    
    // initial tick
    await this.runTick();

    // schedule recurring
    const interval = setInterval(() => this.runTick(), intervalMs);
    
    process.on('SIGINT', () => {
      console.log('\n👋 Shutting down simulation...');
      clearInterval(interval);
      process.exit(0);
    });
  }
}

// run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const sim = new WorldSimulator();
  const interval = parseInt(process.env.SIM_INTERVAL_MS || '300000');
  sim.run(interval).catch(console.error);
}

export { WorldSimulator, Bot };