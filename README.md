# Purr & Pour

A coffee-date invitation with a private reply inbox. The pages use HTML, CSS, and plain JavaScript. A small JavaScript Worker saves replies to Cloudflare D1 and protects the inbox with a server-side key.

## Run it on your computer

Use Node.js 24 with npm. Extract the ZIP, open a terminal in the folder with `package.json`, and run:

```sh
npm ci
npm run db:init
npm start -- --var INBOX_KEY:local-test-only
```

Run `db:init` once for a fresh local database. Open [the invitation](http://127.0.0.1:5191/) and [the local inbox](http://127.0.0.1:5191/inbox#local-test-only). The example key is for testing on your own computer. Local tests write to a local database.

## Edit the invitation

- `web/index.html` contains the invitation layout, coffee question, and celebration window.
- `web/invite.js` contains the date question, four card movements, two-click warning, and reply handling.
- `web/style.css` controls the colors and responsive layout.
- `web/cafe-cat.svg` contains the cat illustration.
- `web/inbox.html` and `web/inbox.js` display replies.
- `worker/index.js` serves these files and handles the existing `/api/reply` and `/api/inbox` routes.

After editing, stop the server with Ctrl+C and repeat the start command. For a different test response, open the invitation in a fresh tab. Reloading the same tab preserves its progress.

## Hosting

The Sites deployment uses the existing `DB` binding, the migration in `drizzle/`, and the server-side `INBOX_KEY` secret. The production key and replies stay on the server. `npm run build` bundles the HTML, CSS, JavaScript, and SVGs into a Worker for deployment.
