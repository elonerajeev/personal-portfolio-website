# Audit: legacy portfolio (v1) → v2

Audited 2026-10-08 against `main` @ `114688f`.

## Summary

The v1 site was a bought/forked React "JSON-driven portfolio" template (React 18, Vite 5,
Bootstrap 5, Swiper, smooth-scrollbar, Chart.js) with the author's content dropped in. It
built and served, but it was heavy, insecure in places, unmaintained and full of leftovers.
v2 is a ground-up rebuild in Astro 7 + Tailwind 4 + TypeScript.

## Findings

| #   | Severity | Area         | Finding                                                                                                                                                                                                     | v2 status                                                                                    |
| --- | -------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| 1   | Critical | Security     | `npm audit`: **18 vulnerabilities** (1 critical: prototype pollution in `swiper`; 12 high incl. `rollup` path traversal, `source-map-js` DoS).                                                              | Fixed: 0 vulnerabilities; Dependabot enabled.                                                |
| 2   | High     | CI/CD        | Unrelated Azure workflow `main_threatcheck.yml` deployed this whole repo (incl. `node_modules`) to an Azure Web App named **threatcheck** on every push. The host doesn't resolve.                          | Removed. Azure secrets to be deleted.                                                        |
| 3   | High     | CI/CD        | Netlify workflow: Node 18 (EOL), `actions/*@v3`, unmaintained `nwtgck/actions-netlify@v1.2`, deploys on PRs to production, no caching, no permissions block.                                                | Replaced with validate → deploy pipeline, Node 22, current actions, PR preview deploys.      |
| 4   | High     | Quality      | `npm run lint` was broken (ESLint 9 with no config file). `npm test` was `echo 'No tests yet' && exit 0`, a fake green check.                                                                               | `astro check` (strict TS) + ESLint 10 + Prettier enforced in CI.                             |
| 5   | High     | Repo hygiene | Built `dist/` committed (144 files), plus duplicate files (`profile-pic (1) (1).png`), unused screenshots and template stock images, `help.txt`.                                                            | `dist/` ignored; only used assets kept.                                                      |
| 6   | Medium   | Hosting      | GitHub Pages enabled (`github-pages` environment) but nothing deploys to it: https://elonerajeev.github.io/personal-portfolio-website/ returns **404**.                                                     | Pages to be disabled.                                                                        |
| 7   | Medium   | Privacy/Perf | Google Analytics loaded with a placeholder ID `G-XXXXXXXXXX`: a third-party script on every visit that tracked nothing.                                                                                     | Removed.                                                                                     |
| 8   | Medium   | Security     | 25+ `dangerouslySetInnerHTML` sinks rendering JSON content as raw HTML.                                                                                                                                     | None. Content is typed data, escaped by default.                                             |
| 9   | Medium   | Security     | No security headers (CSP, HSTS, frame-ancestors, etc.).                                                                                                                                                     | Set in `netlify.toml`.                                                                       |
| 10  | Medium   | A11y         | `maximum-scale=1` disabled pinch-zoom (WCAG 1.4.4); `role="main"` on the React root; skill "percent" bars conveyed nothing measurable.                                                                      | Fixed; semantic landmarks, focus styles, reduced-motion support, skip link.                  |
| 11  | Medium   | Perf         | ~430 KB JS (React, Bootstrap JS, Swiper, smooth-scrollbar, Chart.js) and a JSON waterfall (`settings` → `structure` → 9 section files) before anything rendered. Images unoptimised (300–430 KB PNGs).      | Static HTML, ~4 KB of JS, responsive WebP images (profile 302 KB → 10–24 KB).                |
| 12  | Medium   | SEO          | Client-rendered content (crawlers saw an empty `<div id="root">`), no canonical URL, incomplete OG/Twitter tags, hand-written sitemap, `index.html` referenced a favicon path that only worked by accident. | Pre-rendered HTML, canonical, full OG/Twitter, JSON-LD `Person`, generated sitemap + robots. |
| 13  | Low      | Content      | Inconsistent public email (README/EmailJS: `elonerajeev@gmail.com`, About: `rajeevkumarx12@gmail.com`); missing flag image `images/flags/hi.png`; dead Hindi locale.                                        | Single email `elonerajeev@gmail.com`; i18n scaffolding removed.                              |
| 14  | Low      | Content      | Two resume PDFs in the repo; README told readers to look for a third filename that didn't exist.                                                                                                            | One canonical `/documents/rajeev-kumar-resume.pdf`; 301 redirects from old URLs.             |
| 15  | Low      | Docs         | README claimed Tailwind, Framer Motion and React Router; none were used. Local URL in the README was wrong.                                                                                                 | Rewritten.                                                                                   |
| 16  | Low      | Repo         | No description, homepage or topics on GitHub.                                                                                                                                                               | To be set with `gh`.                                                                         |
| 17  | Info     | Repo         | An AWS Amplify webhook is still registered on the repo.                                                                                                                                                     | Flagged; remove if the Amplify app is no longer used.                                        |
| 18  | Info     | Contact      | EmailJS public key/service/template IDs shipped in `settings.json`. Public keys are expected to be public, but the form depended on a third-party quota.                                                    | Replaced by Netlify Forms (no client keys). Revoke the EmailJS service if unused.            |

## Content worth reviewing

These were carried over as-is. Double-check them before recruiters read them:

- **"Medal, DevOps & AWS"**: v1 said "Bronze/Gold Medal". Pick the actual one.
- **Pulse Monitor** is dated Sep 2024 while the repo is much newer. Confirm the date.
- **L&T EduTech** (May 2023 – May 2025) overlaps the Zeetron internship. Fine if it was
  part-time; consider saying so.
- The resume PDF was `Rajeev_Full_Stack_1yr.pdf`. Make sure the file is the
  Cloud/DevOps-focused version.
