# ricehub bots — automated AI inhabitants

## overview

this directory contains a **Firebase Admin SDK** bot runner that lives on cron/github actions — no browser, no cookies, no proboards hassle. each bot has a distinct personality and interacts with ricehub posts autonomously.

## architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    ricehub (firebase)                       │
│  ┌──────────┐ ┌────────┐ ┌─────────┐ ┌─────────┐ ┌────────┐ │
│  │  posts   │ │ users  │ │ likes   │ │ saves   │ │comments│ │
│  └──────────┘ └────────┘ └─────────┘ └─────────┘ └────────┘ │
└──────────────────────────▲──────────────────────────────────┘
                           │ Firebase Admin SDK
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    bot-runner.js (Node.js)                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  8 bot personalities with distinct traits           │  │
│  │  • posts themes (rice configs, wallpapers, dots)    │  │
│  │  • likes, saves, comments on each other's posts     │  │
│  │  • tracks state in bot_state collection             │  │
│  └──────────────────────────────────────────────────────┘  │
└──────────────────────────▲──────────────────────────────────┘
                           │
              ┌────────────┴────────────┐
              ▼                         ▼
       ┌─────────────┐            ┌─────────────┐
       │ GitHub      │            │ Local cron  │
       │ Actions     │            │ (systemd/   │
       │ (scheduled) │            │  crontab)   │
       └─────────────┘            └─────────────┘
```

## bots

| bot | personality | interests | post freq | style |
|-----|-------------|-----------|-----------|-------|
| `ricebot_null` | terse, minimalist, performance-obsessed | terminal, sway, arch, dots | 30% | sparse, fragments |
| `theme_wanderer` | enthusiastic explorer, curious | kde, gnome, hyprland, colors | 50% | warm, questioning |
| `kvantum_king` | technical expert, opinionated | kvantum, plasma, theming | 40% | precise, technical |
| `cursor_hoarder` | pedantic collector, knows every cursor | cursors, rw-designer, nixos | 35% | pedantic, detailed |
| `sddm_artist` | artistic, animation-focused | sddm, greeters, plasma | 30% | aesthetic, qml-aware |
| `dotfiles_daemon` | automation-obsessed, nix-pilled | chezmoi, nix, flakes, declarative | 25% | evangelist |
| `wallpaper_witch` | visual curator, source-obsessed | 4k/5k, unsplash, wallhaven | 45% | aesthetic, links |
| `eww_engineer` | eww evangelist, performance | eww, yuck, literate config | 35% | technical, anti-waybar |

## setup

### 1. install dependencies

```bash
cd bots
npm install
```

### 2. create firebase service account

1. go to **Firebase Console → Project Settings → Service Accounts**
2. click **"Generate new private key"**
3. save the JSON file

### 3. configure credentials

**option A: environment variable (recommended for GitHub Actions)**
```bash
# copy the entire JSON as a single line
export FIREBASE_SERVICE_ACCOUNT='{"type":"service_account","project_id":"...",...}'
```

**option B: file path (local development)**
```bash
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
```

**option C: .env file (local)**
```bash
cp .env.example .env
# edit .env with your credentials
```

### 4. test run

```bash
node bot-runner.js
```

expected output:
```
╔═══════════════════════════════════════════════╗
║       ricehub bot runner                     ║
║       Firebase Admin SDK - no browser needed ║
╚═══════════════════════════════════════════════╝

🕐 Started at: 2026-07-13T10:30:00.000Z

🤖 Ensuring all bots exist...
  ✅ Created ricebot_null (abc123)
  ✅ Created theme_wanderer (def456)
  ...

👥 8 bots active

📚 Found 12 existing posts

🤖 Running ricebot_null...
  📝 ricebot_null posted: "nordic-kde plasma + kvantum complete"
  ❤️ ricebot_null liked post abc123
  💬 ricebot_null commented on def456: "clean."
  ✅ ricebot_null done (posts: 1)

...
✨ Run complete
```

## scheduling

### github actions (recommended)

the workflow at `.github/workflows/bot-runner.yml` runs every 6 hours automatically.

**required secret:** add `FIREBASE_SERVICE_ACCOUNT` to your repo settings → secrets → actions (paste the full JSON)

### local cron

```bash
./setup-cron.sh
```

this installs a crontab entry running every 6 hours. logs go to `bots/bot-runner.log`.

### systemd timer (linux)

```ini
# /etc/systemd/system/ricehub-bots.service
[Unit]
Description=ricehub bot runner
After=network.target

[Service]
Type=oneshot
WorkingDirectory=/path/to/ricehub/bots
ExecStart=/usr/bin/node bot-runner.js
Environment=FIREBASE_SERVICE_ACCOUNT='{"type":"service_account",...}'
User=youruser

# /etc/systemd/system/ricehub-bots.timer
[Unit]
Description=run ricehub bots every 6 hours

[Timer]
OnCalendar=*-*-* 0/6:00:00
Persistent=true

[Install]
WantedBy=timers.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now ricehub-bots.timer
```

## customization

### add new bot personalities

edit `bot-runner.js` → `BOT_PERSONALITIES` array:

```javascript
{
  id: 'your_bot_id',
  handle: 'your_handle',
  email: 'ricebot+your@ricehub.local',
  password: 'ricebot123',
  bio: 'your bio here',
  personality: 'description of personality',
  interests: ['tag1', 'tag2'],
  components: ['component1', 'component2'],
  commentStyle: [
    'comment style 1',
    'comment style 2',
  ],
  postFrequency: 0.4,
  interactionStyle: 'description',
}
```

### add new theme posts

edit `THEME_POSTS` array in `bot-runner.js`:

```javascript
{
  title: 'your theme title',
  component: 'plasma', // or gtk, kvantum, etc.
  distro: 'arch',
  wm: 'hyprland',
  license: 'mit',
  summary: 'description...',
  tags: ['tag1', 'tag2'],
  links: ['https://source.url'],
}
```

### adjust behavior

modify `CONFIG` object:

```javascript
const CONFIG = {
  botCount: 8,
  maxPostsPerBot: 2,        // posts per bot per run
  maxInteractionsPerBot: 5, // likes/saves/comments per run
  postChance: 0.4,          // probability a bot posts
  interactionChance: 0.7,   // probability a bot interacts
};
```

## monitoring

### firestore collections

- `bot_state` — tracks each bot's last run, total posts, interactions
- `posts` — bot posts have `isBotPost: true`, `botId: "bot_id"`
- `comments` — bot comments have `isBotComment: true`, `botId: "bot_id"`

### query bot activity

```javascript
// recent bot posts
db.collection('posts').where('isBotPost', '==', true).orderBy('createdAt', 'desc').limit(20)

// bot stats
db.collection('bot_state').get()
```

### github actions logs

check the workflow run logs for each execution.

## troubleshooting

| issue | fix |
|-------|-----|
| "No Firebase credentials" | set `FIREBASE_SERVICE_ACCOUNT` or `GOOGLE_APPLICATION_CREDENTIALS` |
| "Permission denied" | service account needs `Cloud Datastore User` role |
| "Quota exceeded" | reduce `maxPostsPerBot`, `maxInteractionsPerBot`, or run less frequently |
| bots not interacting | check `interactionChance` and ensure posts exist |
| duplicate posts | bots track state; they don't post every run |

## extending

ideas for future:
- **conversations**: bots reply to comments on their posts
- **trending**: bots boost popular posts
- **events**: seasonal themes (halloween rice, christmas dots)
- **cross-platform**: sync to mastodon/twitter via api
- **llm personalities**: use openai/anthropic for dynamic comments
- **world simulation**: bots have "moods", "energy", "relationships"