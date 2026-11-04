---
title: How do you design a 404 page that's actually useful?
description: A useful 404 page tells visitors plainly that the page isn't there, gives them a way to keep going on your site, and is served with a real 404 status code.
region: usa
topic: webmasters
common: useful-404-page
publishedAt: "2026-11-03"
checkedAt: "2026-11-04"
sources:
  - name: "RFC 9110 HTTP Semantics (15.5 Client Error 4xx, 15.5.5 404, 15.5.11 410)"
    url: https://www.rfc-editor.org/rfc/rfc9110
    checkedAt: "2026-11-03"
  - name: "Google Search Central: Troubleshoot Google Search crawling errors (soft 404s, custom 404 pages)"
    url: https://developers.google.com/search/docs/crawling-indexing/troubleshoot-crawling-errors
    checkedAt: "2026-11-03"
  - name: "Nginx documentation: error_page directive"
    url: https://nginx.org/en/docs/http/ngx_http_core_module.html#error_page
    checkedAt: "2026-11-03"
  - name: "Apache HTTP Server 2.4 documentation: ErrorDocument directive"
    url: https://httpd.apache.org/docs/2.4/mod/core.html#errordocument
    checkedAt: "2026-11-03"
  - name: "GitHub Docs: Creating a custom 404 page for your GitHub Pages site"
    url: https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-custom-404-page-for-your-github-pages-site
    checkedAt: "2026-11-03"
  - name: "Netlify Docs: Redirect options (custom 404 page handling)"
    url: https://docs.netlify.com/manage/routing/redirects/redirect-options
    checkedAt: "2026-11-03"
---

A useful 404 page tells visitors plainly that the page isn't there, gives them a way to keep going on your site, and is served with a real 404 status code.

## The HTTP spec expects an explanation

RFC 9110, the current HTTP specification, says that for 4xx errors the server SHOULD send a representation explaining the error and whether it is temporary or permanent (except for HEAD requests), and browsers SHOULD show it to the user.

## What Google recommends putting on it

Google Search Central's crawling-errors guide gives four suggestions for a custom 404 page:

1. **Say clearly that the page can't be found**, in friendly, inviting language.
2. **Keep the same look and feel as the rest of your site**, including navigation, so visitors know they're still in the right place.
3. **Add links** to your most popular articles or posts, and to your home page.
4. **Give visitors a way to report the broken link**, so you can fix it.

Google adds that a good custom 404 page helps people find the information they're looking for and encourages them to explore your site further.

## The status code must be 404

Google says custom 404 pages are made "solely for users," so make sure the server returns a 404 status code to keep the page out of the index. A "not found" page served with 200 OK is a **soft 404**, which Google flags in Search Console. See [Do custom error pages affect SEO?](/articles/usa/webmasters/custom-error-page-seo/).

If you know a page is gone for good, RFC 9110 says 410 Gone is preferred. If you don't know whether it's temporary or permanent, use 404.

## Common configuration mistakes

- **Nginx:** `error_page 404 /404.html;` serves your page and keeps the 404. Adding `=200` (as in `error_page 404 =200 /404.html;`) changes the status to 200. Pointing it at a full URL such as `http://example.com/notfound.html` makes Nginx send a redirect (302 by default) instead of the 404.
- **Apache:** `ErrorDocument 404 /errors/404.html` with a local path keeps the 404. If you point `ErrorDocument` at a remote URL (anything starting with `http`), Apache sends a redirect, so the client never receives the original status code. Apache's documentation warns that this can confuse web robots that check URLs by their status code.
- **Static hosts:** GitHub Pages uses a `404.html` (or `404.md`) file in your publishing source. Netlify automatically displays a `404.html` you add to your site for any path that doesn't resolve to a static file. See [supported hosting environments](/support/usa/) for other platforms.

After you deploy, check it:

```sh
curl -I https://example.com/this-page-does-not-exist
```

The first line should show `404`, not `200`, `301`, or `302`.

## Let your 404 page do one more thing

Visitors see your 404 page anyway. doorbell.life lets that moment help someone: its widget adds a small card to your existing error page showing public-interest listings, such as adoptable animals or missing-person notices, from the visitor's region.

- To install it, add one line before `</body>` on your error page:

  ```html
  <script src="https://cdn.doorbell.life/widget.js" async data-status="404"></script>
  ```

  Add `data-region="usa"` if you want to pin the region instead of letting the widget pick it from the browser's time zone.
- The widget loads asynchronously. It doesn't change the status code and doesn't redirect.
- All data is displayed as plain text. If the data can't be loaded, the widget shows nothing, and visitors see your normal 404 page.
- For static sites, the doorbell.life CLI (`npx doorbell-life install`) downloads a 404 template if you don't have a `404.html`; if you already have one, it only adds the script line before `</body>` and doesn't overwrite your page.

Step-by-step instructions are on the [install page](/install/usa/).
