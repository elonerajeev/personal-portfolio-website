<div align="center">

# Rajeev Kumar · Portfolio

**Cloud & DevOps Engineer** · [www.rajeev.pro](https://www.rajeev.pro)

[![Website](https://img.shields.io/badge/Website-rajeev.pro-00C896?style=for-the-badge&logo=googlechrome&logoColor=white)](https://www.rajeev.pro)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-heyrajeev1-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/heyrajeev1/)
[![Email](https://img.shields.io/badge/Email-elonerajeev%40gmail.com-EA4335?style=for-the-badge&logo=gmail&logoColor=white)](mailto:elonerajeev@gmail.com)

[![CD](https://img.shields.io/github/actions/workflow/status/elonerajeev/rajeev.pro/cd.yml?branch=main&label=deploy&style=flat-square&logo=netlify&logoColor=white)](https://github.com/elonerajeev/rajeev.pro/actions/workflows/cd.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)

</div>

My personal portfolio: experience, projects, skills and certifications as a Cloud & DevOps Engineer with 2+ years on AWS, Azure, Kubernetes and Terraform.

## Highlights

- **TerX terminal**: explore the profile from a Linux-style shell (`neofetch`, `kubectl get pods`, `git log`, `terraform plan`, `helm list`, …)
- **Search- and AI-ready**: content rendered into the HTML at build time, Person schema, `llms.txt`, sitemap
- **Content as data**: every section is a JSON file in `public/data/`, so updates need no code changes
- **Fast and accessible**: Lighthouse accessibility 100, minimal layout shift, dark and light themes

## Stack

[![Stack](https://skillicons.dev/icons?i=react,vite,bootstrap,sass,netlify,githubactions)](https://skillicons.dev)

React 18 · Vite 6 · Bootstrap 5 · SCSS · Netlify · GitHub Actions

## Quick start

```sh
git clone https://github.com/elonerajeev/rajeev.pro.git && cd rajeev.pro
npm install
npm run dev     # http://localhost:5173
npm test        # production build + verification
```

Requires Node.js 20+.

## CI/CD

- **CI** runs on every pull request: install → `npm audit` → build → verify.
- **CD** runs on `main` only: same checks, then deploy to Netlify and smoke-test the live site.
- `npm run verify` blocks a release if required SEO files are missing or any private data (phone number, non-public email) ends up in the build.

## License

[MIT](LICENSE) for the code. Personal content (text, photos, resume) © Rajeev Kumar.
