---
title: Do custom error pages affect SEO?
description: No, as long as the error page keeps the right status code (404, 410, or 5xx), its content doesn't change how Google treats the URL; the SEO problems come from "not found" pages served with 200 (soft 404s) and from error pages that turn into redirects.
region: usa
topic: webmasters
common: custom-error-page-seo
publishedAt: "2026-11-03"
checkedAt: "2026-11-04"
sources:
  - name: "Google Search Central: How HTTP status codes, and network and DNS errors affect Google Search"
    url: https://developers.google.com/search/docs/crawling-indexing/http-network-errors
    checkedAt: "2026-11-03"
  - name: "Google Search Central: Troubleshoot Google Search crawling errors"
    url: https://developers.google.com/search/docs/crawling-indexing/troubleshoot-crawling-errors
    checkedAt: "2026-11-03"
  - name: "Google Search Central: Understand JavaScript SEO Basics"
    url: https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics
    checkedAt: "2026-11-03"
  - name: "Cloudflare Docs: Serving Pages (Not Found behavior, SPA rendering)"
    url: https://developers.cloudflare.com/pages/configuration/serving-pages/
    checkedAt: "2026-11-03"
  - name: "Nginx documentation: error_page directive"
    url: https://nginx.org/en/docs/http/ngx_http_core_module.html#error_page
    checkedAt: "2026-11-03"
  - name: "Apache HTTP Server 2.4 documentation: ErrorDocument directive"
    url: https://httpd.apache.org/docs/2.4/mod/core.html#errordocument
    checkedAt: "2026-11-03"
  - name: "RFC 9110 HTTP Semantics (15.5.5 404, 15.5.11 410)"
    url: https://www.rfc-editor.org/rfc/rfc9110
    checkedAt: "2026-11-03"
---

No, as long as the error page keeps the right status code (404, 410, or 5xx), its content doesn't change how Google treats the URL; the SEO problems come from "not found" pages served with 200 (soft 404s) and from error pages that turn into redirects.

## Google goes by the status code, not the page content

Google's documentation on HTTP status codes is direct about this:

- Google doesn't index URLs that return a 4xx status code, and already-indexed URLs that start returning 4xx are removed from the index.
- **Any content Google receives from a URL that returns 4xx is ignored.** The same is true for 5xx.
- All 4xx errors except 429 are treated the same way. Newly encountered 404 URLs aren't processed at all.
- 5xx errors and 429 make Google's crawlers temporarily slow down. Already-indexed URLs are kept for a while, but URLs that keep returning server errors are eventually dropped.

So adding navigation, a search box, popular links, or other helpful content to your 404 page won't get the URL indexed. Google says custom 404 pages exist "solely for users"; just make sure the server returns 404.

## Problem 1: soft 404s

A soft 404 is a page that tells the user the page doesn't exist but returns **200 (success)**. Google covers soft 404s in its guide to crawling errors and says these pages can come from things like a missing server-side include, a broken database connection, an empty internal search results page, or a JavaScript file that didn't load.

Common ways sites end up with soft 404s:

- **The app sends every unknown URL to a "not found" page with 200.** Google's fix: return a 404 code when a page no longer exists.
- **Single-page apps.** With client-side routing, returning a meaningful status code can be impractical. Google's JavaScript SEO guide gives two options: use JavaScript to redirect to a URL where the server does return 404 (such as `/not-found`), or add `<meta name="robots" content="noindex">` to the error view.
- **Hosting defaults.** Cloudflare Pages, for example, documents that if your project has no top-level `404.html`, it assumes you're deploying a single-page app and serves the root page for any path that doesn't match a file. Adding a `404.html` changes that.

## Problem 2: error pages that become redirects

It's easy to lose the status code while configuring an error page:

- **Nginx:** `error_page 404 =200 /404.html;` changes the status to 200. `error_page 404 http://example.com/notfound.html;` (a full URL) sends a 302 redirect by default.
- **Apache:** if `ErrorDocument` points to a remote URL (starting with `http`), Apache sends a redirect and the client never gets the original error code. Apache's own documentation warns this "can confuse web robots" that use status codes to decide whether a URL is valid. A local path starting with `/` keeps the status code.

## Deleting pages: 404 or 410?

RFC 9110 says 404 doesn't indicate whether the absence is temporary or permanent, and 410 Gone is preferred when the server knows the removal is likely permanent. For Google Search, all 4xx codes except 429 are handled the same way: indexed URLs are removed.

## How to check

```sh
curl -I https://example.com/this-page-does-not-exist
```

The first line should be `404` (or `410`), not `200`, `301`, or `302`.

## How doorbell.life handles this

The doorbell.life widget only adds a card (or a one-line notice on 401 and 403 pages) to your existing error page. It doesn't change the status code and doesn't redirect. Its server configuration examples keep the original status too: Nginx `error_page` lines don't use `=code`, and Apache `ErrorDocument` lines use local paths only. See the [install page](/install/usa/) for setup, and [supported hosting environments](/support/usa/) for which hosts let you customize which error pages.
