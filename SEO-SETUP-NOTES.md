# PixelSqueeze SEO setup

Added:
- Production title and meta description
- robots.txt
- sitemap.xml
- canonical URL
- Open Graph metadata
- Twitter/X metadata
- WebApplication JSON-LD

Important:
- The site is currently a single-page app, so the sitemap intentionally contains only `/`.
- Add new URLs to the sitemap only after real pages/routes exist.
- Verify `https://newshort.online/robots.txt` and `https://newshort.online/sitemap.xml` after deployment.
- Then add `newshort.online` as a Domain property in Google Search Console and submit `sitemap.xml`.

Production cleanup:
- Removed Design Arena recording/page-view scripts from the exported `index.html`. Those scripts were not needed for the public production site and could conflict with the site's privacy messaging.
