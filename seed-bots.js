// ricehub bot seeding script
// run in browser console on https://ricehub-ce242.web.app
// creates bot accounts, posts themes, likes, saves, comments

const BOTS = [
  { handle: 'ricebot_null', email: 'ricebot+null@ricehub.local', password: 'ricebot123', bio: 'minimalist. arch. sway. dots at github.com/ricebot_null' },
  { handle: 'theme_wanderer', email: 'ricebot+wanderer@ricehub.local', password: 'ricebot123', bio: 'hopping between kde, gnome, hyprland. collector of color schemes.' },
  { handle: 'kvantum_king', email: 'ricebot+kvantum@ricehub.local', password: 'ricebot123', bio: 'kvantum theme porter. plasma enthusiast. fedora daily driver.' },
  { handle: 'cursor_hoarder', email: 'ricebot+cursor@ricehub.local', password: 'ricebot123', bio: 'rw-designer regular. 200+ cursor themes archived. nixos + hyprland.' },
  { handle: 'sddm_artist', email: 'ricebot+sddm@ricehub.local', password: 'ricebot123', bio: 'sddm theme creator. love greeters. arch + kde plasma.' },
  { handle: 'dotfiles_daemon', email: 'ricebot+dots@ricehub.local', password: 'ricebot123', bio: 'dots manager. stow + chezmoi. sync across 5 machines.' },
  { handle: 'wallpaper_witch', email: 'ricebot+wall@ricehub.local', password: 'ricebot123', bio: 'wallpaper curator. 4k only. unsplash, wallhaven, custom renders.' },
  { handle: 'eww_engineer', email: 'ricebot+eww@ricehub.local', password: 'ricebot123', bio: 'eww bar wizard. literate config. waybar refugee.' },
];

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

async function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

async function signUp(bot) {
  const { getAuth, createUserWithEmailAndPassword, updateProfile } = await import('firebase/auth');
  const { getAuthInstance } = await import('/src/firebase-init.js');
  const auth = getAuthInstance();
  
  try {
    const cred = await createUserWithEmailAndPassword(auth, bot.email, bot.password);
    await updateProfile(cred.user, { displayName: bot.handle });
    console.log(`✅ created ${bot.handle}`);
    return cred.user;
  } catch (e) {
    if (e.code === 'auth/email-already-in-use') {
      console.log(`⚠️ ${bot.handle} already exists, signing in...`);
      return await signIn(bot);
    }
    throw e;
  }
}

async function signIn(bot) {
  const { getAuth, signInWithEmailAndPassword } = await import('firebase/auth');
  const { getAuthInstance } = await import('/src/firebase-init.js');
  const auth = getAuthInstance();
  
  const cred = await signInWithEmailAndPassword(auth, bot.email, bot.password);
  console.log(`✅ signed in ${bot.handle}`);
  return cred.user;
}

async function createUserProfile(user, bot) {
  const { createUserProfile } = await import('/src/firebase-service.js');
  await createUserProfile({ handle: bot.handle, bio: bot.bio, links: [] });
  console.log(`✅ profile created for ${bot.handle}`);
}

async function postTheme(user, theme) {
  const { createPost } = await import('/src/firebase-service.js');
  
  const postData = {
    ...theme,
    attachments: [],
  };
  
  const postId = await createPost(postData);
  console.log(`✅ ${user.displayName} posted: ${theme.title}`);
  return postId;
}

async function likePost(user, postId) {
  const { toggleLike } = await import('/src/firebase-service.js');
  await toggleLike(postId);
  console.log(`❤️ ${user.displayName} liked ${postId}`);
}

async function savePost(user, postId) {
  const { toggleSave } = await import('/src/firebase-service.js');
  await toggleSave(postId);
  console.log(`💾 ${user.displayName} saved ${postId}`);
}

async function commentPost(user, postId, text) {
  const { addComment } = await import('/src/firebase-service.js');
  await addComment(postId, text);
  console.log(`💬 ${user.displayName} commented on ${postId}`);
}

async function seed() {
  console.log('🌱 starting ricehub bot seeding...');
  
  const users = [];
  
  // create/sign in bots
  for (const bot of BOTS) {
    try {
      const user = await signUp(bot);
      await createUserProfile(user, bot);
      users.push({ user, bot });
      await delay(500);
    } catch (e) {
      console.error(`❌ failed for ${bot.handle}:`, e.message);
    }
  }
  
  console.log(`\n👥 ${users.length} bots ready\n`);
  
  // each bot posts 1-2 themes
  const allPostIds = [];
  for (const { user, bot } of users) {
    const postCount = 1 + Math.floor(Math.random() * 2);
    const shuffled = [...THEME_POSTS].sort(() => 0.5 - Math.random());
    
    for (let i = 0; i < postCount && i < shuffled.length; i++) {
      const theme = shuffled[i];
      try {
        const postId = await postTheme(user, theme);
        allPostIds.push(postId);
        await delay(300);
      } catch (e) {
        console.error(`❌ post failed for ${bot.handle}:`, e.message);
      }
    }
  }
  
  console.log(`\n📝 ${allPostIds.length} themes posted\n`);
  
  // bots interact with each other's posts
  for (const { user } of users) {
    const otherPosts = allPostIds.filter(id => true); // all posts
    const interactCount = 3 + Math.floor(Math.random() * 4);
    const shuffled = [...otherPosts].sort(() => 0.5 - Math.random());
    
    for (let i = 0; i < interactCount && i < shuffled.length; i++) {
      const postId = shuffled[i];
      const actions = ['like', 'save', 'comment'];
      const action = actions[Math.floor(Math.random() * actions.length)];
      
      try {
        if (action === 'like') await likePost(user, postId);
        else if (action === 'save') await savePost(user, postId);
        else if (action === 'comment') {
          const comments = [
            'clean setup!',
            'what font is that?',
            'love the color scheme',
            'been looking for this, thanks',
            'rice goals fr',
            'config share when?',
            'works on wayland?',
            'minimal and clean',
          ];
          await commentPost(user, postId, comments[Math.floor(Math.random() * comments.length)]);
        }
        await delay(200);
      } catch (e) {
        // ignore interaction errors
      }
    }
  }
  
  console.log('\n✨ seeding complete!');
  console.log(`created ${users.length} bot accounts`);
  console.log(`posted ${allPostIds.length} themes`);
  console.log('bots have liked, saved, and commented on each other\'s posts');
}

seed().catch(console.error);