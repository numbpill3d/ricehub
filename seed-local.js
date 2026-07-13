// ricehub localStorage seeding script
// run in browser console on http://127.0.0.1:5173

const BOTS = [
  { handle: 'ricebot_null', bio: 'minimalist. arch. sway. dots at github.com/ricebot_null' },
  { handle: 'theme_wanderer', bio: 'hopping between kde, gnome, hyprland. collector of color schemes.' },
  { handle: 'kvantum_king', bio: 'kvantum theme porter. plasma enthusiast. fedora daily driver.' },
  { handle: 'cursor_hoarder', bio: 'rw-designer regular. 200+ cursor themes archived. nixos + hyprland.' },
  { handle: 'sddm_artist', bio: 'sddm theme creator. love greeters. arch + kde plasma.' },
  { handle: 'dotfiles_daemon', bio: 'dots manager. stow + chezmoi. sync across 5 machines.' },
  { handle: 'wallpaper_witch', bio: 'wallpaper curator. 4k only. unsplash, wallhaven, custom renders.' },
  { handle: 'eww_engineer', bio: 'eww bar wizard. literate config. waybar refugee.' },
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

const SEED_USERS = [
  { handle: 'voidmaintainer', bio: 'building ricehub. arch | sway | terminal minimalist' },
  { handle: 'plasma_tinkerer', bio: 'kde plasma enthusiast. kvantum theme porter. fedora user.' },
  { handle: 'cursor_hoarder', bio: 'collecting cursors since 2003. rw-designer regular. nixos + hyprland.' },
];

function uuid() {
  return crypto.randomUUID();
}

function timeAgo(days) {
  return Date.now() - days * 86400000;
}

async function seed() {
  console.log('🌱 starting ricehub localStorage seeding...');
  
  // Load existing DB
  const DB_KEY = 'ricehub.db.v1';
  const USER_KEY = 'ricehub.handle.v1';
  
  let db = { posts: [], users: [] };
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) db = JSON.parse(raw);
  } catch (e) {
    console.warn('could not parse existing db, starting fresh');
  }
  
  // Create bot users
  const botUsers = BOTS.map(bot => ({
    id: uuid(),
    handle: bot.handle,
    bio: bot.bio,
    avatarUrl: '',
    links: [],
    createdAt: timeAgo(Math.floor(Math.random() * 3650) + 100)
  }));
  
  // Add seed users
  const seedUsers = SEED_USERS.map(u => ({
    id: uuid(),
    handle: u.handle,
    bio: u.bio,
    avatarUrl: '',
    links: [],
    createdAt: timeAgo(Math.floor(Math.random() * 3650) + 100)
  }));
  
  // Combine all users
  const allUsers = [...botUsers, ...seedUsers];
  
  // Generate posts
  const allPosts = [];
  const allPostIds = [];
  
  // Each bot posts 1-2 themes
  for (const user of botUsers) {
    const postCount = 1 + Math.floor(Math.random() * 2);
    const shuffled = [...THEME_POSTS].sort(() => 0.5 - Math.random());
    
    for (let i = 0; i < postCount && i < shuffled.length; i++) {
      const theme = shuffled[i];
      const postId = uuid();
      allPostIds.push(postId);
      
      const post = {
        id: postId,
        author: user.handle,
        handle: user.handle,
        title: theme.title,
        component: theme.component,
        distro: theme.distro,
        wm: theme.wm,
        license: theme.license,
        summary: theme.summary,
        tags: theme.tags,
        links: theme.links,
        attachments: [],
        createdAt: timeAgo(Math.floor(Math.random() * 30) + 1),
        updatedAt: timeAgo(Math.floor(Math.random() * 30) + 1),
        likesCount: 0,
        savesCount: 0,
        commentsCount: 0,
        likes: [],
        saves: [],
        comments: []
      };
      
      allPosts.push(post);
    }
  }
  
  // Add the existing seed posts from main.js
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
      likesCount: 3,
      savesCount: 1,
      commentsCount: 2,
      comments: [
        { id: uuid(), author: 'indexbot', text: 'seed post. local-only. delete when real submissions exist.', createdAt: Date.now() - 86000000 },
        { id: uuid(), author: 'ricer42', text: 'clean setup. what font is that?', createdAt: Date.now() - 82000000 }
      ],
      likes: ['plasma_tinkerer', 'cursor_hoarder'],
      saves: ['kvantum_king']
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
      attachments: [],
      createdAt: Date.now() - 172800000,
      updatedAt: Date.now() - 172800000,
      likesCount: 12,
      savesCount: 5,
      commentsCount: 3,
      comments: [],
      likes: ['voidmaintainer', 'cursor_hoarder', 'kvantum_king', 'sddm_artist', 'dotfiles_daemon', 'wallpaper_witch', 'eww_engineer', 'theme_wanderer', 'ricebot_null', 'ricebot_null', 'ricebot_null', 'ricebot_null'],
      saves: ['voidmaintainer', 'cursor_hoarder', 'kvantum_king', 'sddm_artist', 'dotfiles_daemon']
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
      attachments: [],
      createdAt: Date.now() - 259200000,
      updatedAt: Date.now() - 259200000,
      likesCount: 8,
      savesCount: 3,
      commentsCount: 1,
      comments: [],
      likes: ['voidmaintainer', 'plasma_tinkerer', 'kvantum_king', 'sddm_artist', 'dotfiles_daemon', 'wallpaper_witch', 'eww_engineer', 'theme_wanderer'],
      saves: ['voidmaintainer', 'plasma_tinkerer', 'kvantum_king']
    }
  ];
  
  // Combine all posts
  const finalPosts = [...allPosts, ...seedPosts];
  
  // Bots interact with each other's posts
  const allHandles = allUsers.map(u => u.handle);
  
  for (const post of finalPosts) {
    // Add random likes
    const likers = allHandles.filter(h => h !== post.handle && Math.random() < 0.3);
    post.likes = [...new Set([...(post.likes || []), ...likers])];
    post.likesCount = post.likes.length;
    
    // Add random saves
    const savers = allHandles.filter(h => h !== post.handle && Math.random() < 0.15);
    post.saves = [...new Set([...(post.saves || []), ...savers])];
    post.savesCount = post.saves.length;
    
    // Add random comments
    const commenters = allHandles.filter(h => h !== post.handle && Math.random() < 0.2);
    const commentTemplates = [
      'clean setup!',
      'what font is that?',
      'love the color scheme',
      'been looking for this, thanks',
      'rice goals fr',
      'config share when?',
      'works on wayland?',
      'minimal and clean',
      'nice dots',
      'what bar is that?',
      'sddm theme is clean',
      'wallpaper link?',
      'kvantum theme looks great',
      'colors are perfect'
    ];
    
    for (const commenter of commenters) {
      if (!post.comments) post.comments = [];
      post.comments.push({
        id: uuid(),
        author: commenter,
        text: commentTemplates[Math.floor(Math.random() * commentTemplates.length)],
        createdAt: post.createdAt + Math.floor(Math.random() * 86400000)
      });
    }
    post.commentsCount = post.comments.length;
  }
  
  // Save to localStorage
  localStorage.setItem(DB_KEY, JSON.stringify({ posts: finalPosts, users: allUsers, createdAt: Date.now() }));
  
  // Set a random handle for the current session
  const handles = allHandles;
  localStorage.setItem(USER_KEY, handles[Math.floor(Math.random() * handles.length)]);
  
  console.log(`✅ seeded ${allUsers.length} users`);
  console.log(`✅ seeded ${finalPosts.length} posts`);
  console.log(`✅ added likes, saves, and comments`);
  console.log('🔄 reload the page to see changes');
  
  // Show stats
  console.log('\n📊 stats:');
  console.log(`   users: ${allUsers.length}`);
  console.log(`   posts: ${finalPosts.length}`);
  console.log(`   total likes: ${finalPosts.reduce((a, p) => a + p.likesCount, 0)}`);
  console.log(`   total saves: ${finalPosts.reduce((a, p) => a + p.savesCount, 0)}`);
  console.log(`   total comments: ${finalPosts.reduce((a, p) => a + p.commentsCount, 0)}`);
  console.log(`   components: ${[...new Set(finalPosts.map(p => p.component))].join(', ')}`);
}

seed().catch(console.error);