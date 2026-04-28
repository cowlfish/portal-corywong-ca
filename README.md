# portal.corywong.ca — Client Portal Placeholder

Static placeholder landing page for Cory Wong's client portal at Trustwell Realty Inc., Brokerage.

## Site Structure

```
portal-site/
├── index.html          # Coming-soon landing page
├── privacy.html        # Privacy policy (PIPEDA-compliant)
├── terms.html          # Terms of use
├── accessibility.html  # Accessibility statement (WCAG 2.0 AA / AODA)
├── robots.txt          # Search engine directives
├── sitemap.xml         # XML sitemap
├── assets/
│   ├── trustwell-logo.png
│   └── cory-headshot.jpg
└── README.md
```

## Compliance

- **RECO**: Brokerage name ("Trustwell Realty Inc., Brokerage") is at least as prominent as the agent name ("Cory Wong, Real Estate Broker") in both header and footer.
- **PIPEDA**: Privacy policy discloses Google Analytics (GA4) cookie usage, data processing by Google, and user rights under PIPEDA.
- **WCAG 2.0 Level AA / AODA**: Semantic HTML, skip-to-content link, keyboard navigation, color contrast ratios, alt text on images, focus indicators, responsive layout.
- **Cookie consent**: Banner requires explicit opt-in before loading GA4 cookies. Users can accept or decline.

## Updating Content

### Replace placeholder values

1. **Google Analytics Measurement ID**: In `index.html`, find `G-XXXXXXXXXX` (appears twice in the `<script>` block near line 239/244) and replace with your real GA4 Measurement ID (e.g., `G-ABC123XYZ`).

2. **Contact info** (when ready): Add phone/email to the footer in `index.html` and the contact sections in `privacy.html`, `terms.html`, and `accessibility.html`.

3. **Brokerage address**: Currently set to `3640 Victoria Park Ave., Suite 300, Toronto, ON M2H 3B2`. Update in all four HTML files if it changes.

### Editing pages

All pages are plain HTML/CSS with no build step. Edit the `.html` files directly — changes deploy on the next push to the `main` branch.

## Deploying to Cloudflare Pages

### Initial setup (one-time)

1. Log into the Cloudflare dashboard at [dash.cloudflare.com](https://dash.cloudflare.com).
2. Go to **Workers & Pages** > **Create** > **Pages** > **Connect to Git**.
3. Select the GitHub/GitLab repository containing this code.
4. Configure build settings:
   - **Production branch**: `main`
   - **Build command**: _(leave empty — no build step)_
   - **Build output directory**: `.` (root of this repo)
5. Click **Save and Deploy**.

### Subsequent deploys

Push to the `main` branch. Cloudflare Pages auto-deploys on every push.

```bash
git add -A
git commit -m "Update content"
git push origin main
```

### CLI deploy (alternative)

If you prefer to deploy without Git integration:

```bash
npx wrangler pages deploy . --project-name portal-corywong
```

You will need to authenticate via `npx wrangler login` first.

## DNS Setup (DreamHost)

Point `portal.corywong.ca` to Cloudflare Pages:

| Type  | Name                | Target                        | TTL |
|-------|---------------------|-------------------------------|-----|
| CNAME | portal.corywong.ca  | portal-corywong.pages.dev.    | 300 |

> Include the trailing dot on the target if DreamHost requires it.

After adding the CNAME record:

1. In Cloudflare Pages dashboard, go to **Custom domains** and add `portal.corywong.ca`.
2. Cloudflare will automatically provision an SSL certificate.
3. DNS propagation typically takes 5-30 minutes.

## Development

No build tools required. Open `index.html` directly in a browser to preview:

```bash
# Python
python3 -m http.server 8000

# Node
npx serve .
```

Then visit `http://localhost:8000`.
