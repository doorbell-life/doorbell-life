---
title: What should you show visitors on a 429 rate-limit page?
description: Tell visitors they've sent too many requests in a short time and how long to wait before trying again; send the wait time in a Retry-After header, repeat it on the page, and use the rest of the page to give them something useful while they wait.
region: usa
topic: webmasters
common: rate-limit-429-page
publishedAt: "2026-11-03"
checkedAt: "2026-11-03"
sources:
  - name: "RFC 6585 Additional HTTP Status Codes (4. 429 Too Many Requests)"
    url: https://www.rfc-editor.org/rfc/rfc6585
    checkedAt: "2026-11-03"
  - name: "RFC 9110 HTTP Semantics (10.2.3 Retry-After)"
    url: https://www.rfc-editor.org/rfc/rfc9110
    checkedAt: "2026-11-03"
  - name: "Nginx documentation: ngx_http_limit_req_module (limit_req_status)"
    url: https://nginx.org/en/docs/http/ngx_http_limit_req_module.html#limit_req_status
    checkedAt: "2026-11-03"
  - name: "Nginx documentation: error_page directive"
    url: https://nginx.org/en/docs/http/ngx_http_core_module.html#error_page
    checkedAt: "2026-11-03"
  - name: "Google Search Central: How HTTP status codes, and network and DNS errors affect Google Search"
    url: https://developers.google.com/search/docs/crawling-indexing/http-network-errors
    checkedAt: "2026-11-03"
  - name: "Google Search Central: Troubleshoot Google Search crawling errors"
    url: https://developers.google.com/search/docs/crawling-indexing/troubleshoot-crawling-errors
    checkedAt: "2026-11-03"
---

Tell visitors they've sent too many requests in a short time and how long to wait before trying again; send the wait time in a Retry-After header, repeat it on the page, and use the rest of the page to give them something useful while they wait.

## What 429 means

429 Too Many Requests is defined in RFC 6585: the user has sent too many requests in a given amount of time, which the RFC calls "rate limiting." The spec says:

- The response SHOULD include details explaining the condition.
- It MAY include a Retry-After header saying how long to wait before making a new request.
- Responses with 429 MUST NOT be stored by a cache.

RFC 6585's own example is short: an HTML page titled "Too Many Requests" that says the site only allows 50 requests per hour per logged-in user and to try again soon, sent with `Retry-After: 3600`.

The RFC doesn't say how to identify users or count requests. You can count per page, across a whole server, or across a group of servers, and identify users by login or by cookie. That's your call.

## How to write Retry-After

RFC 9110 defines Retry-After as either a number of seconds or an HTTP date:

```http
Retry-After: 120
Retry-After: Fri, 31 Dec 1999 23:59:59 GMT
```

The first example means 2 minutes. Make the page text match the header, for example "Please try again in 2 minutes."

## What the page should say

Following RFC 6585, the page should cover at least two things:

1. **What happened**, in plain language: "You've reloaded this page too many times in a short period."
2. **How long to wait**, matching Retry-After.

If your limits are public (for example, a number of requests per hour), state them so people know how to stay under them. If logged-in users or API keys get higher limits, say so and link to where people can sign in or get a key.

Keep the page light. A visitor who is being rate-limited shouldn't have to load a heavy page that triggers more requests.

## Nginx doesn't send 429 by default

Nginx's `limit_req` module rejects excess requests with **503** unless you change it; `limit_req_status` defaults to 503. To send 429:

```nginx
limit_req_status 429;
error_page 429 /429.html;
```

The `error_page` line serves your own page and keeps the 429 status, as long as you don't add `=code`.

## How search engines see 429

Google treats 429 as a signal that the server is overloaded and handles it as a server error: its crawlers temporarily slow down. Google also says that returning 503 or 429 for more than 2 days will cause it to drop those URLs from the index. So make sure your rate limits don't catch normal crawling, and don't return 429 for long periods.

## Make the wait useful

A rate-limited visitor can only wait. doorbell.life's 429 template first shows offline content built into the page, then loads a rotating widget that cycles through public-interest listings such as adoptable animals and missing-person notices. If the widget can't load, the offline content stays.

- **Your own 429 page:** add this before `</body>`:

  ```html
  <script src="https://cdn.doorbell.life/widget.js" async data-status="429" data-retry="120"></script>
  ```

  Set `data-retry` to the same number of seconds as Retry-After. The widget shows a countdown, then tells the visitor they can try again.
- **Nginx and Apache:** the configuration examples serve the local 429 template on 429 errors and keep the 429 status.

The widget never changes the status code and doesn't add a Retry-After header; your server has to send that. Setup steps are on the [install page](/install/usa/), and host-by-host limits are on [supported hosting environments](/support/usa/).
