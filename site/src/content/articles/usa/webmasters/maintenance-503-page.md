---
title: How do you build a 503 maintenance page?
description: During maintenance, return a 503 status code with a Retry-After header estimating when you'll be back, and serve a plain static HTML page that says when the site will return and where to get updates; Google recommends this kind of full shutdown only for a day or two.
region: usa
topic: webmasters
common: maintenance-503-page
publishedAt: "2026-11-03"
checkedAt: "2026-11-04"
sources:
  - name: "RFC 9110 HTTP Semantics (15.6.4 503 Service Unavailable, 10.2.3 Retry-After)"
    url: https://www.rfc-editor.org/rfc/rfc9110
    checkedAt: "2026-11-03"
  - name: "Google Search Central: Temporarily pause or disable a website"
    url: https://developers.google.com/search/docs/crawling-indexing/pause-online-business
    checkedAt: "2026-11-03"
  - name: "Google Search Central: Troubleshoot Google Search crawling errors"
    url: https://developers.google.com/search/docs/crawling-indexing/troubleshoot-crawling-errors
    checkedAt: "2026-11-03"
  - name: "Google Search Central: How HTTP status codes, and network and DNS errors affect Google Search"
    url: https://developers.google.com/search/docs/crawling-indexing/http-network-errors
    checkedAt: "2026-11-03"
---

During maintenance, return a 503 status code with a Retry-After header estimating when you'll be back, and serve a plain static HTML page that says when the site will return and where to get updates; Google recommends this kind of full shutdown only for a day or two.

## Why 503

RFC 9110 defines 503 Service Unavailable as the server being "currently unable to handle the request due to a temporary overload or scheduled maintenance, which will likely be alleviated after some delay." The key word is temporary. Google's documentation says that for 5xx errors, already-indexed URLs are kept in the index for a while, though they are eventually dropped.

Don't use a different code to take your site offline. Google warns that blocking a site with 403, 404, or 410, or with a `noindex` robots meta tag or `X-Robots-Tag` header, will remove its URLs from Google Search.

## Add Retry-After

RFC 9110 says that when Retry-After is sent with a 503, it tells the client how long the service is expected to be unavailable. The value can be:

- a number of seconds, such as `Retry-After: 120` (2 minutes), or
- an HTTP date, such as `Retry-After: Fri, 31 Dec 1999 23:59:59 GMT`.

Google's guide also recommends using the `retry-after` header with a best-effort date or duration on 503 pages.

## What to put on the page

Google suggests giving users clear next steps on the error page, such as:

1. links to more information;
2. the date you expect the site to be back, or when you'll post an update;
3. how to contact customer service.

For example: "We're doing scheduled maintenance. We expect to be back by 6:00 a.m. Eastern. Updates: status.example.com."

## How to build it

To keep the load low on both your server and the visitor's browser, Google recommends:

- static HTML;
- as few off-page resources as possible, with inline CSS and base64-encoded images.

Before you rely on it, confirm it actually returns 503. Google suggests checking with `curl` or a similar tool:

```sh
curl -I https://example.com/
```

The first line should read `HTTP/1.1 503 Service Unavailable` (or the HTTP/2 equivalent).

## Don't stay down too long

Google's guidance on pausing a site:

- If you urgently need to disable the site for **1–2 days**, return an informational 503 error page instead of all content.
- If you need to disable it longer, provide an indexable home page as a placeholder, with a **200** status code, instead of a 503.
- Disabling a whole site is an extreme measure that should last "a few days at most"; otherwise it will significantly affect the site in Search even if done correctly.

Google's crawling-errors guide adds that Googlebot retries URLs returning 503 or 429 for about 2 days, and that returning these codes for more than a few days will cause Google to permanently slow or stop crawling URLs on your site. Its status-code documentation says URLs that keep returning server errors are eventually dropped from the index.

## Don't block robots.txt

Google specifically says not to return 503 for your `robots.txt` file, because that blocks all crawling. Keep `robots.txt` responding normally during maintenance, and don't change it to disallow all crawling either. Google warns that a valid `robots.txt` that disallows everything may remove your site's content from Search.

## Make the wait useful

Visitors on a maintenance page can only wait. doorbell.life's 503 template first shows offline content built into the page, then loads a rotating widget that cycles through public-interest listings such as adoptable animals and missing-person notices. If the widget can't load, the offline content stays.

- **Your own maintenance page:** add this before `</body>`:

  ```html
  <script src="https://cdn.doorbell.life/widget.js" async data-status="503" data-retry="600"></script>
  ```

  Set `data-retry` to the same number of seconds as your Retry-After header. The widget shows a countdown and tells visitors when they can try again.
- **WordPress:** the doorbell.life plugin can generate `wp-content/maintenance.php` from its settings page. That file returns 503 with `Retry-After: 600` and loads the rotating widget. If a `maintenance.php` created by something else already exists, the plugin won't overwrite it, and it removes its own file when you deactivate the plugin.
- **Nginx and Apache:** the configuration examples serve the local 503 template on 503 errors and keep the 503 status.

The widget never changes the status code and doesn't add a Retry-After header for you; your server has to send that. Setup steps are on the [install page](/install/usa/).
