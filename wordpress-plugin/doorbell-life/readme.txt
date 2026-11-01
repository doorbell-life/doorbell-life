=== doorbell.life ===
Contributors: doorbelllife
Tags: 404, error page, maintenance, charity, missing persons
Requires at least: 6.3
Tested up to: 6.8
Requires PHP: 7.4
Stable tag: 0.1.0
License: GPL-2.0-or-later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Show missing persons alerts, blood donation and adoptable animals on your 404 and maintenance pages.

== Description ==

doorbell.life turns your 404 page and WordPress maintenance page into a small public-interest notice: missing persons alerts, blood donation calls, adoptable and lost animals.

* The status code stays the same. No redirects.
* No cookies, no browser storage, no visitor tracking.
* If the service cannot load, your original error page is shown unchanged.

== External services ==

This plugin loads a script from doorbell.life's CDN (https://cdn.doorbell.life/widget.js) on 404 pages and on the maintenance page. The script downloads the day's public-interest data from the same CDN.

* Data sent: the visitor's browser requests the script and data files, which reveals the visitor's IP address and user agent to the CDN as with any web request. One in ten displays sends the site's hostname and the topic shown, for aggregate counts. No cookies are set and no IP addresses are stored.
* Terms of use and privacy policy: https://doorbell.life/legal/

== Changelog ==

= 0.1.0 =
* First release: 404 card, maintenance page carousel, settings page.
