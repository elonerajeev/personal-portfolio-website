<div align="center">

```
~/portfolio $ open https://www.rajeev.pro
```

# Rajeev Kumar · Portfolio

### ☁️ Cloud & DevOps Engineer · Zynsera Technologies · India

[![Website](https://img.shields.io/badge/Website-rajeev.pro-00C896?style=for-the-badge&logo=googlechrome&logoColor=white)](https://www.rajeev.pro)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-heyrajeev1-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/heyrajeev1/)
[![GitHub](https://img.shields.io/badge/GitHub-elonerajeev-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/elonerajeev)
[![Email](https://img.shields.io/badge/Email-elonerajeev%40gmail.com-EA4335?style=for-the-badge&logo=gmail&logoColor=white)](mailto:elonerajeev@gmail.com)

[![Deploy](https://img.shields.io/github/actions/workflow/status/elonerajeev/personal-portfolio-website/ci-cd.yml?branch=main&label=deploy&style=flat-square&logo=netlify&logoColor=white)](https://github.com/elonerajeev/personal-portfolio-website/actions)
![Last commit](https://img.shields.io/github/last-commit/elonerajeev/personal-portfolio-website?style=flat-square)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)

</div>

---

## 👋 About me

Cloud & DevOps Engineer with **2+ years** of hands-on experience building and running cloud infrastructure, CI/CD pipelines and container platforms on **AWS** and **Azure**. I care about faster, safer releases, higher uptime and infrastructure that scales with the business. Outside the cloud, I follow **finance & markets** closely.

## 💼 Experience

| Role | Company | Period |
|---|---|---|
| **DevOps Engineer** | Zynsera Technologies · India · On-site | Sep 2026 → Present |
| **Cloud DevOps Engineer** | Zintellix™ · India · Hybrid | Oct 2025 → Jun 2026 |
| **DevOps Engineer** (Apprenticeship) | L&T EduTech · India · On-site | May 2024 → May 2025 |

**Highlights:** CI/CD for 10+ developers (−50% deployment time) · −30% cloud spend · Terraform IaC + Docker/Kubernetes provisioning · Jenkins & GitHub Actions pipelines (−60% deployment time).

## 🛠 Skills & tools

**Cloud & Infrastructure**

[![Skills](https://skillicons.dev/icons?i=aws,azure,gcp,terraform,ansible)](https://skillicons.dev)

**Containers & CI/CD**

[![Skills](https://skillicons.dev/icons?i=docker,kubernetes,jenkins,githubactions,git,github,gitlab)](https://skillicons.dev)

**Monitoring, OS & Scripting**

[![Skills](https://skillicons.dev/icons?i=prometheus,grafana,linux,bash,python)](https://skillicons.dev)

**Automation & AI**

![n8n](https://img.shields.io/badge/n8n-AI_Workflow_Automation-EA4B71?style=flat-square&logo=n8n&logoColor=white)

---

## 🌐 About this website

**Live:** **[www.rajeev.pro](https://www.rajeev.pro)**

A single-page portfolio with sections for About, Education, Skills, Resume, Experience, Projects, Achievements, Updates and Contact.

- 🌗 Dark and light themes
- 📱 Responsive layout, with a sidebar on desktop and tab navigation on mobile
- 🧩 All content lives in JSON files, so updating the site means editing data, not components
- 🏷️ Official tool and company logos throughout
- ✉️ Working contact form (EmailJS)
- 📄 Resume viewer and download
- 📈 Google Analytics, plus SEO tags (canonical URL, Open Graph, sitemap, robots.txt)
- 🤖 Search- and AI-friendly: a build step (`seo/vite-plugin-seo.js`) writes all content into the HTML, adds Person/WebSite schema, and generates `llms.txt`, `llms-full.txt` and `sitemap.xml`

### Built with

[![Tech](https://skillicons.dev/icons?i=react,vite,bootstrap,sass,js,html,css,netlify)](https://skillicons.dev)

| Layer | Tech |
|---|---|
| UI | React 18, React Bootstrap, Bootstrap 5, SCSS |
| Build | Vite 5 |
| Extras | Swiper (carousels), Chart.js, Font Awesome, EmailJS |
| Hosting | Netlify, deployed by GitHub Actions on every push to `main` |
| Domain | `rajeev.pro` (redirects to `www.rajeev.pro`) |

---

## 🚀 Run it locally

Requires Node.js 18+.

```sh
git clone https://github.com/elonerajeev/personal-portfolio-website.git
cd personal-portfolio-website
npm install
npm run dev        # http://localhost:5173
```

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server with hot reload |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the production build locally |

## ✏️ Editing content

Everything shown on the site comes from `public/data/`:

| What | File |
|---|---|
| Name, role, theme, contact-form keys | `public/data/settings.json` |
| Section order and navigation | `public/data/structure.json` |
| About me | `public/data/sections/cover.json` |
| Education | `public/data/sections/education.json` |
| Skills | `public/data/sections/skills.json` |
| Resume | `public/data/sections/resume.json`, plus the PDF in `public/documents/` |
| Experience | `public/data/sections/experience.json` |
| Projects | `public/data/sections/portfolio.json` |
| Achievements & certifications | `public/data/sections/achievements.json` |
| Updates | `public/data/sections/updates.json` |
| Contact | `public/data/sections/contact.json` |

Logos live in `public/images/tech/` (tools) and `public/images/pictures/` (companies and photos).

The SEO copy, structured data, `llms.txt` and sitemap are rebuilt from these files on every `npm run build`, so you never need to edit them by hand.

## 📦 Deployment

`.github/workflows/ci-cd.yml` installs, builds and deploys `dist/` to Netlify on every push to `main`. It needs the repository secrets `NETLIFY_AUTH_TOKEN` and `NETLIFY_SITE_ID`.

## 📜 License

[MIT](LICENSE). Feel free to learn from the code. The personal content (text, photos, resume) belongs to Rajeev Kumar.

<div align="center">

**Open to Cloud & DevOps opportunities** · [Let's connect](https://www.linkedin.com/in/heyrajeev1/)

*"Automate everything. Break nothing in prod."*

</div>
