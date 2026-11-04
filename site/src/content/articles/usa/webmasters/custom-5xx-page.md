---
title: How do you show a custom page for 5xx errors?
description: A custom 5xx page has to be served by the layer in front of your app (the web server, CDN, or load balancer), because the app itself may be what's broken; self-managed Nginx and Apache and Cloudflare's paid plans can do this, while static hosts such as GitHub Pages, Netlify, and Cloudflare Pages only document custom 404 pages.
region: usa
topic: webmasters
common: custom-5xx-page
publishedAt: "2026-11-03"
checkedAt: "2026-11-04"
sources:
  - name: "RFC 9110 HTTP Semantics (15.6 Server Error 5xx)"
    url: https://www.rfc-editor.org/rfc/rfc9110
    checkedAt: "2026-11-03"
  - name: "Nginx documentation: error_page directive"
    url: https://nginx.org/en/docs/http/ngx_http_core_module.html#error_page
    checkedAt: "2026-11-03"
  - name: "Nginx documentation: proxy_intercept_errors directive"
    url: https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_intercept_errors
    checkedAt: "2026-11-03"
  - name: "Apache HTTP Server 2.4 documentation: ErrorDocument directive"
    url: https://httpd.apache.org/docs/2.4/mod/core.html#errordocument
    checkedAt: "2026-11-03"
  - name: "Apache HTTP Server 2.4 documentation: ProxyErrorOverride directive"
    url: https://httpd.apache.org/docs/2.4/mod/mod_proxy.html#proxyerroroverride
    checkedAt: "2026-11-03"
  - name: "Cloudflare Docs: Custom Errors (last updated Nov 3, 2026)"
    url: https://developers.cloudflare.com/rules/custom-errors/
    checkedAt: "2026-11-03"
  - name: "Cloudflare Docs: Serving Pages"
    url: https://developers.cloudflare.com/pages/configuration/serving-pages/
    checkedAt: "2026-11-03"
  - name: "GitHub Docs: Creating a custom 404 page for your GitHub Pages site"
    url: https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-custom-404-page-for-your-github-pages-site
    checkedAt: "2026-11-03"
  - name: "Netlify Docs: Redirect options (custom 404 page handling)"
    url: https://docs.netlify.com/manage/routing/redirects/redirect-options
    checkedAt: "2026-11-03"
  - name: "Google Search Central: Temporarily pause or disable a website"
    url: https://developers.google.com/search/docs/crawling-indexing/pause-online-business
    checkedAt: "2026-11-03"
---

A custom 5xx page has to be served by the layer in front of your app (the web server, CDN, or load balancer), because the app itself may be what's broken; self-managed Nginx and Apache and Cloudflare's paid plans can do this, while static hosts such as GitHub Pages, Netlify, and Cloudflare Pages only document custom 404 pages.

## Why your app can't handle it

Here is how RFC 9110 defines the common server errors:

- **500 Internal Server Error:** the server hit an unexpected condition and couldn't fulfill the request.
- **502 Bad Gateway:** a server acting as a gateway or proxy got an invalid response from the server behind it.
- **503 Service Unavailable:** the server can't handle the request right now because of temporary overload or scheduled maintenance.
- **504 Gateway Timeout:** a gateway or proxy didn't get a response in time from the server behind it.

A 502 or 504 means your application didn't answer properly. At that point, only the layer in front of it (Nginx, Apache, a CDN) can send a page.

RFC 9110 also says that, except for HEAD requests, a 5xx response SHOULD include an explanation of the error and whether it is temporary or permanent.

## Nginx

Use `error_page` with a local URI, for example:

```nginx
error_page 500 502 503 504 /50x.html;
```

Don't add `=200` or similar, which changes the status code.

If Nginx is a reverse proxy, errors returned by your backend are passed straight to the visitor by default. `proxy_intercept_errors` is `off` by default; turning it on makes Nginx intercept proxied responses with codes 300 and above and handle them with `error_page`:

```nginx
proxy_intercept_errors on;
```

## Apache

Use a local path:

```apache
ErrorDocument 503 /errors/503.html
```

A local path keeps the status code. If you point `ErrorDocument` at a remote URL, Apache sends a redirect and the visitor never gets the 5xx.

For a reverse proxy, turn on `ProxyErrorOverride` (off by default). Without it, Apache shows the proxied server's own error page. When on, it applies to responses from 400 up to 599.

`ErrorDocument` can also go in `.htaccess` (it needs `AllowOverride FileInfo`). On shared hosting, most hosts don't let you replace 5xx pages; if yours allows `.htaccess`, the `ErrorDocument` lines from doorbell.life's Apache example may work.

## Cloudflare

Cloudflare's Custom Errors can replace error responses (status codes 400 and above), whether they come from your origin server or from Cloudflare itself. According to Cloudflare's documentation (last updated November 3, 2026):

- Custom Errors are **not available on the Free plan**. Pro allows 25 rules, Business 50, Enterprise 300.
- You give Cloudflare the URL of an error page. Cloudflare fetches it, along with its images, CSS, and JavaScript, and stores it on its network. After that, the original URL doesn't need to stay online.
- A rule can optionally change the status code. Leave that option unset to keep the original code.

## Static hosts

GitHub Pages, Netlify, and Cloudflare Pages document how to add a `404.html`. None of their docs that we checked describe a way to customize 5xx pages, so doorbell.life treats these hosts as 404-only. Other platforms are listed under [supported hosting environments](/support/usa/).

## Keep the page simple

For 503 pages, Google recommends static HTML, as few off-page resources as possible, inline CSS, and base64-encoded images, plus clear guidance on what users can do next. The same idea applies to every 5xx: your site is already in trouble, so the error page shouldn't depend on it.

## doorbell.life's 5xx pages

doorbell.life provides offline error page templates for 500, 501, 502, and 504. They're fully static and need no JavaScript. They show help lines, awareness statistics, and cacheable adoptable-animal listings. Missing-person cases never appear on the offline pages.

- **Nginx and Apache:** the repo's configuration examples plus a download script save the templates as local files, for example:

  ```sh
  sh update-templates.sh /var/www/doorbell-life en usa
  ```

  Run it once a day with cron. If a download fails, the old file is kept. When your site breaks, the server answers with the local file and doesn't need to reach doorbell.life.
- **Cloudflare Free plan:** a Worker you deploy in front of your site replaces 500–504 responses for web page requests with the offline page, keeping the original status code (502 if your origin can't be reached at all). Set `REGION` to `"usa"` in the script. Every request passes through the Worker, so it counts against your own account's Workers free quota.
- **Install CLI:** when it detects Nginx or Apache, `npx doorbell-life install --lang en --region usa` downloads the templates and writes a daily cron entry and config snippets. Including the snippet in your site config and reloading the server is left to you.

Step-by-step instructions are on the [install page](/install/usa/). For hosts that can't customize 5xx pages, see [supported hosting environments](/support/usa/).
