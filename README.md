# Rajeev Kumar — Portfolio

[![CI / Deploy](https://github.com/elonerajeev/personal-portfolio-website/actions/workflows/ci.yml/badge.svg)](https://github.com/elonerajeev/personal-portfolio-website/actions/workflows/ci.yml)
[![Netlify](https://img.shields.io/badge/live-rajeevxportfolio.netlify.app-34d399)](https://rajeevxportfolio.netlify.app)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Personal site of **Rajeev Kumar**, Cloud & DevOps Engineer. It's a fast, static, accessible
single page with experience, projects, skills, credentials and a contact form.

**Live:** https://rajeevxportfolio.netlify.app

## Stack

| Layer     | Choice                                                                  |
| --------- | ----------------------------------------------------------------------- |
| Framework | [Astro 7](https://astro.build) (static output, zero JS by default)      |
| Styling   | [Tailwind CSS 4](https://tailwindcss.com) with light/dark design tokens |
| Language  | TypeScript (strict)                                                     |
| Content   | Astro content collections (YAML + Zod schemas)                          |
| Icons     | `astro-icon` with Lucide + Simple Icons, inlined at build time          |
| Forms     | Netlify Forms (honeypot spam protection, no third-party keys)           |
| Hosting   | Netlify, deployed by GitHub Actions (PRs get preview URLs)              |
| Quality   | `astro check`, ESLint 10, Prettier, Dependabot                          |

## Getting started

Requires Node.js 22.12+ (see `.nvmrc`).

```sh
npm install
npm run dev        # http://localhost:4321
```

| Script             | What it does                                   |
| ------------------ | ---------------------------------------------- |
| `npm run dev`      | Start the dev server                           |
| `npm run build`    | Build the static site to `dist/`               |
| `npm run preview`  | Serve the production build locally             |
| `npm run check`    | Type-check `.astro` and `.ts` files            |
| `npm run lint`     | ESLint                                         |
| `npm run format`   | Format everything with Prettier                |
| `npm run validate` | Everything CI runs: check, lint, format, build |

## Editing content

All content is typed data. You never need to touch the components.

| What                        | File                                       |
| --------------------------- | ------------------------------------------ |
| Name, role, email, socials  | `src/data/site.ts`                         |
| Hero stats & core strengths | `src/data/site.ts`                         |
| Work experience             | `src/content/experience.yaml`              |
| Projects                    | `src/content/projects.yaml`                |
| Skills                      | `src/content/skills.yaml`                  |
| Certifications/achievements | `src/content/credentials.yaml`             |
| Education                   | `src/content/education.yaml`               |
| Resume PDF                  | `public/documents/rajeev-kumar-resume.pdf` |

Schemas live in `src/content.config.ts`, so a typo (a bad date, a missing field, a wrong
category) fails the build instead of shipping a broken page.

## Project structure

```
src/
├── assets/            # images optimised at build time (AVIF/WebP, responsive sizes)
├── components/
│   ├── sections/      # Hero, About, Experience, Projects, Skills, Credentials, Education, Contact
│   └── *.astro        # Header, Footer, Section, Tags, ThemeToggle
├── content/           # YAML content collections
├── data/site.ts       # site-wide profile data
├── icons/             # local SVG icons
├── layouts/           # BaseLayout: SEO, Open Graph, JSON-LD, theme
├── lib/               # small helpers
├── pages/             # index, thanks, 404, robots.txt
└── styles/global.css  # Tailwind + theme tokens
```

## Deployment

`.github/workflows/ci.yml` validates every push and PR, then deploys with the Netlify CLI:

- **`main`**: production deploy.
- **Pull requests**: preview deploy at `pr-<number>--<site>.netlify.app`, with the link posted on the PR.

Required repository secrets: `NETLIFY_AUTH_TOKEN`, `NETLIFY_SITE_ID`.
Security headers and legacy-URL redirects are in `netlify.toml`.

### Custom domain

When the custom domain goes live (e.g. `rajeev.pro`), add it in Netlify, then set it as a
repository variable:

```sh
gh variable set SITE_URL --body "https://rajeev.pro"
```

Canonical URLs, the sitemap, `robots.txt` and Open Graph tags all derive from it.

## License

[MIT](LICENSE). The code is free to reuse; the personal content (text, photo, resume) is not.
