# propertybuyernow.co.uk

A complete, self-contained website for **Property Buyer Now** — a UK "sell your
house fast for cash" service — plus an admin panel for managing leads.

Built as pure static HTML/CSS/JS with **zero dependencies and no build step**:
open `index.html` in a browser and everything works, including the offer form
and the admin panel.

## What's included

| Page | Purpose |
|---|---|
| `index.html` | Landing page: hero + postcode quick-start, USPs, 3-step process, instant offer calculator, comparison table (cash sale vs agent vs auction), situations we help with, testimonials, FAQ teaser |
| `get-offer.html` | 3-step cash-offer funnel (property → situation → contact) with validation, UK postcode check, indicative offer on submission and a reference number |
| `how-it-works.html` | Day-by-day timeline of the process |
| `about.html` | Company story, transparency on the business model, accreditation placeholders |
| `faq.html` | 12 FAQs with accordion UI + FAQPage structured data for Google |
| `guides.html` | SEO/trust content: spotting rogue quick-sale firms, cash buyer vs agent, probate sales, repossession |
| `contact.html` | Contact details + message form (stored as an "enquiry" lead) |
| `admin/index.html` | **Admin panel**: KPI dashboard, lead pipeline (New → Contacted → Offer made → Accepted → Completed), search/filter/sort, lead detail drawer with notes & activity log, CSV export, demo-data seeding |
| `privacy.html`, `terms.html`, `404.html` | Legal & error pages |
| `robots.txt`, `sitemap.xml`, `CNAME` | SEO + custom-domain plumbing |
| `_deploy/deploy-pages.yml` | GitHub Pages deployment workflow (move to `.github/workflows/` once the site has its own repo) |

## Try it locally

```bash
cd propertybuyernow
python3 -m http.server 8080
# → http://localhost:8080          (public site)
# → http://localhost:8080/admin/   (admin panel — demo login: admin / buyer2026)
```

Submit the offer form on the site, then open the admin panel: the lead appears
in the dashboard. Use **Seed demo data** in the panel to explore with sample
leads.

## How leads work (and how to go live)

`assets/js/leads.js` is a small data-access layer (`LeadStore`) used by both
the public forms and the admin panel. In this demo build it persists to
`localStorage`, which means **leads only exist in the browser that submitted
them** — perfect for demos, useless for production.

To go live, replace the method bodies in `leads.js` with `fetch()` calls to a
real backend. The methods are already `async`, so nothing else changes.
Easiest options, in order of effort:

1. **Form relay (quickest)** — post the form payload to Formspree / Basin /
   Netlify Forms and receive leads by email. No admin panel backend.
2. **Supabase or Firebase (recommended)** — a `leads` table plus their JS
   client gives you persistence, real authentication for the admin panel, and
   row-level security in an afternoon.
3. **Your own API** — Node/Express or serverless functions with a Postgres
   database, if you want full control.

## ⚠️ Going to production — must-dos

- **Admin authentication**: the panel's login is a client-side demo gate
  (credentials in `assets/js/admin.js`). Anyone can bypass it. Put the panel
  behind real server-side auth (Supabase Auth, Clerk, Auth0, or basic-auth at
  the hosting layer) before putting real lead data in it.
- **Legal review**: `privacy.html` and `terms.html` contain `[PLACEHOLDER]`
  markers — company number, registered office, ICO registration — and should
  be reviewed by a solicitor.
- **Real contact details**: the phone number `0800 000 0000` and email
  addresses are placeholders throughout.
- **Testimonials are illustrative placeholders** — replace them with genuine,
  verifiable reviews before launch (fake reviews breach UK consumer law).
- **Accreditations**: join the NAPB and The Property Ombudsman and replace the
  placeholder sections on `about.html` and the footer. These materially
  increase conversion in this industry.
- **Offer percentages**: the calculator assumes 80–85% of market value
  (`estimateOffer()` in `leads.js`). Tune to your actual buying model.

## Deploying to propertybuyernow.co.uk

1. Move this folder to its own repository (see below) and move
   `_deploy/deploy-pages.yml` to `.github/workflows/deploy-pages.yml`.
2. Repo **Settings → Pages** → Source: *GitHub Actions*. The included `CNAME`
   file handles the custom domain on GitHub's side.
3. At your DNS provider, point `propertybuyernow.co.uk` at GitHub Pages
   (four `A` records: 185.199.108.153 / .109. / .110. / .111., plus a
   `www` CNAME to `<username>.github.io`), then enable **Enforce HTTPS**.

Any static host (Netlify, Cloudflare Pages, Vercel) works equally well —
point it at this folder, no build command needed.

## Moving to its own repository

This site currently lives in a folder of a shared repo. Once you've created
an empty `propertybuyernow` repository on GitHub:

```bash
git clone --branch claude/property-buyer-now-site-gw5t6f https://github.com/summerzac/AB.git
cd AB/propertybuyernow
git init && git add -A && git commit -m "Initial site"
git branch -M main
git remote add origin https://github.com/<you>/propertybuyernow.git
git push -u origin main
```
