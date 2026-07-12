# ricehub

social index for linux ricing and theming.

this is now a real local-first web app prototype instead of a dead folder fragment. it lets people post rice/theming entries, attach screenshots or theme files, tag them by component, like/comment/save, search/filter, and export/import the local database as json.

## run

```bash
npm install
npm run dev
```

open the vite URL.

## build/check

```bash
npm run check
npm run build
```

## current implementation

- vanilla js + vite
- localStorage-backed database
- user identity stored locally as a handle
- client-side attachment handling
  - images get previews
  - text/small config files can be saved as data URLs
  - larger files keep metadata only
- social actions:
  - post
  - like/unlike
  - save/unsave
  - comment
  - filter/search
  - export/import

## next real backend step

firebase or supabase. minimum collections/tables:

- `profiles`
- `posts`
- `post_likes`
- `post_saves`
- `comments`
- `assets`
- `tags`

storage buckets:

- `screenshots/{uid}/{postId}/...`
- `theme-files/{uid}/{postId}/...`

security rules should enforce:

- users can create/edit/delete only their own posts/comments/assets
- likes/saves are keyed by `uid_postId` to prevent duplicate spam
- asset writes require matching post owner
- uploaded files need size/type limits
- aggregate counts should be derived server-side or transaction-maintained, not trusted from client payloads

## old contents

this directory still contains the previous `ricehub-qt/` fragment. it was left alone rather than deleted.
