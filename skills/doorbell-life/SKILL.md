---
name: doorbell-life
description: Install doorbell.life on a website so its 4xx and 5xx error pages show public-interest information (missing persons alerts, blood donation, adoptable animals). Use when the user asks to install doorbell.life, add doorbell.life to error pages, or make their 404/500 pages show charity or public-interest content.
---

# Install doorbell.life

doorbell.life turns a site's HTML error pages into public-interest notices. It must never change the error status code, never redirect, and never replace JSON API error responses.

## Steps

1. Run detection first; do not write anything yet:

   ```sh
   npx doorbell-life detect
   ```

2. If detection finds a supported setup (static site, Nginx, Apache), show the user the planned changes and let them confirm:

   ```sh
   npx doorbell-life install --lang zh-TW --region taiwan
   ```

   Use `--lang en` for English interface text. The only region available today is `taiwan`.

3. If detection says it cannot tell, or the site uses a custom framework (Express, Django, Rails, Laravel, Go, Next.js app router, etc.), install by hand:
   - Find where the app renders its HTML error pages.
   - Before `</body>` of each HTML error page, add the line from `npx doorbell-life snippet <status>`, with `data-status` set to that page's status code.
   - For 429 and 503 pages, also add `data-retry="<seconds>"` when the app knows the Retry-After value.
   - Do not touch JSON or other non-HTML error responses.
   - Keep the original status code. Check that the error handler still sets it after your change.

4. For 5xx pages served by a reverse proxy or CDN, point the user to `configs/README.md` in https://github.com/doorbell-life/doorbell-life. Tell the user plainly when their host cannot customize 5xx pages (GitHub Pages, Netlify, Vercel, Cloudflare Pages, most shared hosting).

## Verify

- Request a missing page and confirm the response status is still 404, not 200 or 302.
- If you changed server config, run the server's config test (`nginx -t`, `apachectl configtest`) before reloading, and leave the reload to the user unless they asked you to do it.

## Rules

- Show the list of changes and get confirmation before writing files, except when the user passed or asked for `--yes`.
- Never edit server blocks, virtual hosts or reload services without explicit permission.
- Never add tracking, cookies or analytics. The widget does not need them.
