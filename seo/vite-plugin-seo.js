/**
 * Build-time SEO for the JSON-driven portfolio.
 *
 * The app renders its content in the browser from public/data/*.json, so crawlers that
 * don't run JavaScript (AI assistants, link previews) used to see an empty page. This
 * plugin reads the same JSON and:
 *   - injects a semantic, static HTML copy of every section into index.html (#seo-content),
 *     shown only when JavaScript is unavailable; the live app is unchanged,
 *   - injects JSON-LD structured data (Person, WebSite, ProfilePage),
 *   - emits llms.txt / llms-full.txt and a sitemap.xml with the build date.
 *
 * No runtime cost and no new dependencies: everything happens at build time.
 */
import fs from 'node:fs'
import path from 'node:path'

const SITE = 'https://www.rajeev.pro'

const readJson = (root, rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf-8'))

const escapeHtml = (s) => String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** JSON text may contain trusted inline HTML (<p>, <b>) and **markdown bold**. */
const richText = (s) => String(s ?? '').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')

/** Plain text for llms.txt and structured data. */
const plainText = (s) => String(s ?? '')
    .replace(/<\/p>\s*<p>/g, ' ').replace(/<[^>]+>/g, '').replace(/\*\*/g, '').replace(/\s+/g, ' ').trim()

const absUrl = (href) => {
    if (!href) return null
    if (/^(https?:|mailto:)/.test(href)) return href
    return SITE + '/' + href.replace(/^\/+/, '')
}

const en = (locales) => (locales && locales.en) || {}

function dateRange(dates) {
    if (!dates || !dates.start) return ''
    const end = dates.end ? (dates.end === 'now' ? 'Present' : dates.end) : ''
    return end ? `${dates.start} – ${end}` : `${dates.start}`
}

function loadContent(root) {
    const settings = readJson(root, 'public/data/settings.json')
    const structure = readJson(root, 'public/data/structure.json')
    const sections = structure.sections.map((s) => ({
        id: s.id,
        data: readJson(root, path.join('public', s.jsonPath)),
    }))
    return { settings, sections }
}

/* ---------- static HTML ---------- */

function renderItem(item) {
    const l = en(item.locales)
    const href = absUrl((item.links || []).find((x) => x.href)?.href)

    // Value-only entries (contact details): a single line, linked when there's a link.
    if (!l.title && item.value) {
        const label = escapeHtml(item.value)
        return `<li>${href ? `<a href="${escapeHtml(href)}">${label}</a>` : label}</li>`
    }

    const parts = []
    if (l.title) parts.push(`<h4>${richText(l.title)}</h4>`)
    const meta = [l.info, dateRange(item.dates)].filter(Boolean).map((m) => richText(m)).join(' · ')
    if (meta) parts.push(`<p class="seo-meta">${meta}</p>`)
    if (item.value && l.title) parts.push(`<p>${escapeHtml(item.value)}</p>`)
    if (l.text) parts.push(/<p>/.test(l.text) ? richText(l.text) : `<p>${richText(l.text)}</p>`)
    if (l.tags && l.tags.length) parts.push(`<p class="seo-tags">${l.tags.map(escapeHtml).join(', ')}</p>`)
    if (href) parts.push(`<p><a href="${escapeHtml(href)}">${escapeHtml(l.title ? plainText(l.title) : href)}</a></p>`)
    return `<li>${parts.join('')}</li>`
}

function renderStaticHtml({ settings, sections }) {
    const name = settings.profile.name
    const role = en(settings.profile.locales).role
    const nav = sections.filter((s) => (s.data.articles || []).some((a) => (a.items || []).length)).map((s) => {
        const l = en(s.data.locales)
        return `<li><a href="#${s.id}">${escapeHtml(l.title_menu || l.title || s.id)}</a></li>`
    }).join('')

    const body = sections.map((s) => {
        const l = en(s.data.locales)
        const heading = plainText(l.title_long || l.title || s.id)
        const articles = (s.data.articles || []).map((a) => {
            const at = en(a.locales).title
            const items = (a.items || []).map(renderItem).join('')
            if (!items) return ''
            return `${at ? `<h3>${richText(at)}</h3>` : ''}<ul>${items}</ul>`
        }).join('')
        if (!articles) return '' // interactive-only sections (e.g. the TerX terminal) have nothing to index
        return `<section id="${s.id}" aria-label="${escapeHtml(heading)}"><h2>${escapeHtml(heading)}</h2>${articles}</section>`
    }).join('\n')

    return `<div id="seo-content">
<header><h1>${escapeHtml(name)} – ${escapeHtml(role)}</h1>
<p>${escapeHtml(en(settings.status?.locales).message || '')}</p>
<nav aria-label="Sections"><ul>${nav}</ul></nav></header>
<main id="main-content">
${body}
</main>
<footer><p>© ${new Date().getFullYear()} ${escapeHtml(name)} · <a href="${SITE}/">${SITE.replace('https://', '')}</a></p></footer>
</div>`
}

/* ---------- structured data ---------- */

function collectItems(sections, sectionId, articleId) {
    const s = sections.find((x) => x.id === sectionId)
    const a = s && s.data.articles.find((x) => !articleId || x.id === articleId)
    return (a && a.items) || []
}

function buildJsonLd({ settings, sections }) {
    const name = settings.profile.name
    const role = en(settings.profile.locales).role
    const email = settings.emailjs?.toEmail
    const cover = sections.find((s) => s.id === 'about')
    const contact = sections.find((s) => s.id === 'contact')
    // Profile links, normalised so linkedin.com/in/x and www.linkedin.com/in/x/ count once.
    const normalise = (h) => h.replace(/^https:\/\/(www\.)?/, 'https://www.').replace(/^https:\/\/www\.(github|x)\.com/, 'https://$1.com').replace(/\/$/, '')
    const sameAs = [...new Set([...(cover?.data.articles || []), ...(contact?.data.articles || [])]
        .flatMap((a) => (a.items || []).flatMap((i) => (i.links || []).map((l) => l.href)))
        .filter((h) => /^https:\/\//.test(h || ''))
        .map(normalise))]

    const work = collectItems(sections, 'experience', 'work')
    const current = work.find((w) => w.dates?.end === 'now')
    const currentOrg = current ? plainText(en(current.locales).info).split('·')[0].trim() : null

    const education = collectItems(sections, 'education', 'academic')
    const alumniOf = education.map((e) => plainText(en(e.locales).info).replace(/,\s*India$/, ''))
        .filter(Boolean).map((n) => ({ '@type': 'EducationalOrganization', name: n }))

    const skills = sections.find((s) => s.id === 'skills')
    const knowsAbout = [...new Set((skills?.data.articles || [])
        .filter((a) => a.id !== 'languages')
        .flatMap((a) => (a.items || []).map((i) => plainText(en(i.locales).title))))].filter(Boolean)

    const certs = collectItems(sections, 'achievements', 'certifications').map((c) => {
        const l = en(c.locales)
        return {
            '@type': 'EducationalOccupationalCredential',
            name: plainText(l.title),
            credentialCategory: 'certificate',
            recognizedBy: { '@type': 'Organization', name: plainText(l.info) },
            ...(c.links?.[0]?.href ? { url: absUrl(c.links[0].href) } : {}),
        }
    })

    const person = {
        '@type': 'Person',
        '@id': `${SITE}/#person`,
        name,
        url: `${SITE}/`,
        image: `${SITE}/${settings.profile.profilePictureUrl}`,
        jobTitle: role,
        description: plainText(en(collectItems(sections, 'about', 'short_description')[0]?.locales).text),
        ...(email ? { email: `mailto:${email}` } : {}),
        address: { '@type': 'PostalAddress', addressCountry: 'IN' },
        nationality: { '@type': 'Country', name: 'India' },
        ...(currentOrg ? { worksFor: { '@type': 'Organization', name: currentOrg } } : {}),
        alumniOf,
        knowsAbout,
        knowsLanguage: ['English', 'Hindi'],
        hasCredential: certs,
        sameAs,
    }

    return {
        '@context': 'https://schema.org',
        '@graph': [
            person,
            {
                '@type': 'WebSite',
                '@id': `${SITE}/#website`,
                url: `${SITE}/`,
                name: `${name} – ${role}`,
                inLanguage: 'en-IN',
                publisher: { '@id': `${SITE}/#person` },
            },
            {
                '@type': 'ProfilePage',
                '@id': `${SITE}/#profilepage`,
                url: `${SITE}/`,
                name: `${name} – ${role} Portfolio`,
                isPartOf: { '@id': `${SITE}/#website` },
                mainEntity: { '@id': `${SITE}/#person` },
                dateModified: new Date().toISOString().slice(0, 10),
                inLanguage: 'en-IN',
            },
        ],
    }
}

/* ---------- llms.txt ---------- */

function buildLlms({ settings, sections }, full) {
    const name = settings.profile.name
    const role = en(settings.profile.locales).role
    const about = plainText(en(collectItems(sections, 'about', 'short_description')[0]?.locales).text)
    const lines = [`# ${name} – ${role}`, '', `> ${about}`, '',
        `Website: ${SITE}/`, `Location: India`,
        settings.emailjs?.toEmail ? `Email: ${settings.emailjs.toEmail}` : null,
        `Resume (PDF): ${SITE}/documents/Rajeev_Kumar_DevOps_Cloud_Resume.pdf`, ''].filter((x) => x !== null)

    for (const s of sections) {
        const l = en(s.data.locales)
        const heading = plainText(l.title_menu || l.title || s.id)
        const items = (s.data.articles || []).flatMap((a) => (a.items || []).map((i) => ({ a, i })))
        if (!items.length) continue
        lines.push(`## ${heading}`, '')
        for (const { i } of items) {
            const il = en(i.locales)
            const title = plainText(il.title || i.value)
            if (!title) {
                if (full && il.text) lines.push(plainText(il.text))
                continue
            }
            const meta = [plainText(il.info), dateRange(i.dates)].filter(Boolean).join(' · ')
            const link = i.links?.find((x) => x.href)?.href
            let line = `- ${title}${meta ? ` (${meta})` : ''}`
            if (link) line += `: ${absUrl(link)}`
            if (full && il.text) line += `\n  ${plainText(il.text)}`
            if (full && il.tags?.length) line += `\n  Skills: ${il.tags.join(', ')}`
            lines.push(line)
        }
        lines.push('')
    }
    if (!full) lines.push(`Full version: ${SITE}/llms-full.txt`, '')
    return lines.join('\n')
}

function buildSitemap() {
    const today = new Date().toISOString().slice(0, 10)
    const urls = [
        { loc: `${SITE}/`, priority: '1.0', changefreq: 'weekly' },
        { loc: `${SITE}/documents/Rajeev_Kumar_DevOps_Cloud_Resume.pdf`, priority: '0.6', changefreq: 'monthly' },
    ]
    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>
`
}

/* ---------- GitHub activity (fetched at build time, no client-side API calls) ---------- */

const GITHUB_USER = 'elonerajeev'

// Drop anything that looks like personal data before it reaches the site.
const looksPrivate = (s) => /[\w.+-]+@[\w-]+\.[\w.]+/.test(s) || /\b[6-9]\d{9}\b/.test(s)
const cleanText = (s, max = 90) => {
    const first = String(s || '').split('\n')[0].trim()
    if (!first || looksPrivate(first)) return null
    return first.length > max ? first.slice(0, max - 1) + '…' : first
}

async function getJson(url, token) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 10000)
    try {
        const res = await fetch(url, {
            signal: controller.signal,
            headers: {
                Accept: 'application/vnd.github+json',
                'User-Agent': 'rajeev.pro-build',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
        })
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
        return await res.json()
    } finally {
        clearTimeout(timer)
    }
}

async function fetchGithubActivity() {
    const token = process.env.GITHUB_TOKEN
    const base = `https://api.github.com/users/${GITHUB_USER}`
    try {
        const [events, repos] = await Promise.all([
            getJson(`${base}/events/public?per_page=100`, token),
            getJson(`${base}/repos?sort=pushed&per_page=20&type=owner`, token),
        ])

        const activity = []
        const pushSeen = new Set()
        for (const e of events) {
            const repo = e.repo?.name?.replace(`${GITHUB_USER}/`, '')
            const repoUrl = `https://github.com/${e.repo?.name}`
            const day = (e.created_at || '').slice(0, 10)
            if (!repo || repo === GITHUB_USER) continue // skip the profile README repo

            if (e.type === 'PullRequestEvent') {
                // Newer event payloads say action 'merged' and omit the title; older ones say 'closed' + merged.
                const pr = e.payload?.pull_request || {}
                const action = e.payload?.action
                const merged = action === 'merged' || (action === 'closed' && pr.merged)
                if (!merged && action !== 'opened') continue
                activity.push({ kind: merged ? 'merged' : 'opened', repo, repoUrl, number: e.payload?.number ?? pr.number, apiUrl: pr.url, title: cleanText(pr.title), url: pr.html_url || `${repoUrl}/pull/${e.payload?.number ?? pr.number}`, at: e.created_at })
            } else if (e.type === 'PushEvent') {
                const key = `${repo}:${day}`
                if (pushSeen.has(key)) continue
                pushSeen.add(key)
                const branch = String(e.payload?.ref || '').replace('refs/heads/', '')
                activity.push({ kind: 'push', repo, repoUrl, branch: cleanText(branch, 40), url: repoUrl, at: e.created_at })
            } else if (e.type === 'CreateEvent' && e.payload?.ref_type === 'repository') {
                activity.push({ kind: 'created', repo, repoUrl, url: repoUrl, at: e.created_at })
            } else if (e.type === 'ReleaseEvent') {
                const name = cleanText(e.payload?.release?.name || e.payload?.release?.tag_name, 60)
                if (name) activity.push({ kind: 'release', repo, repoUrl, title: name, url: e.payload?.release?.html_url || repoUrl, at: e.created_at })
            }
        }

        // Fill in missing PR titles (a few extra calls, build time only). Drop PRs we can't title safely.
        let lookups = 0
        for (const a of activity) {
            if ((a.kind === 'merged' || a.kind === 'opened') && !a.title && a.apiUrl && lookups < 6) {
                lookups++
                try {
                    const pr = await getJson(a.apiUrl, token)
                    a.title = cleanText(pr.title)
                    a.url = pr.html_url || a.url
                } catch { /* keep without title */ }
            }
            delete a.apiUrl
        }
        // One merged/opened entry per PR number, newest first; drop untitled PRs.
        const seenPr = new Set()
        const finalActivity = activity.filter((a) => {
            if (a.kind !== 'merged' && a.kind !== 'opened') return true
            if (!a.title) return false
            const key = `${a.repo}#${a.number}`
            if (seenPr.has(key)) return false
            seenPr.add(key)
            return true
        })

        const topRepos = repos
            .filter((r) => !r.fork && !r.private && r.name !== GITHUB_USER)
            .slice(0, 5)
            .map((r) => ({
                name: r.name,
                url: r.html_url,
                description: cleanText(r.description, 110),
                language: r.language || null,
                stars: r.stargazers_count || 0,
                pushedAt: r.pushed_at,
            }))

        return { ok: true, user: GITHUB_USER, profileUrl: `https://github.com/${GITHUB_USER}`, generatedAt: new Date().toISOString(), activity: finalActivity.slice(0, 8), repos: topRepos }
    } catch (err) {
        console.warn(`[portfolio-seo] GitHub activity unavailable: ${err.message}`)
        return { ok: false, user: GITHUB_USER, profileUrl: `https://github.com/${GITHUB_USER}`, generatedAt: new Date().toISOString(), activity: [], repos: [] }
    }
}

export default function seoPlugin() {
    let root = process.cwd()
    let github = null
    let githubFetchedAt = 0
    return {
        name: 'portfolio-seo',
        configResolved(config) {
            root = config.root
        },
        async buildStart() {
            github = await fetchGithubActivity()
        },
        // Dev server: serve the same data, cached for 10 minutes to stay within GitHub's rate limit.
        configureServer(server) {
            server.middlewares.use('/data/github.json', async (req, res) => {
                if (!github || Date.now() - githubFetchedAt > 10 * 60 * 1000) {
                    github = await fetchGithubActivity()
                    githubFetchedAt = Date.now()
                }
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify(github))
            })
        },
        transformIndexHtml(html) {
            const content = loadContent(root)
            const jsonLd = JSON.stringify(buildJsonLd(content)).replace(/</g, '\\u003c')
            return html
                .replace('<!-- seo:jsonld -->', `<script type="application/ld+json">${jsonLd}</script>`)
                .replace('<!-- seo:content -->', renderStaticHtml(content))
        },
        generateBundle() {
            const content = loadContent(root)
            this.emitFile({ type: 'asset', fileName: 'llms.txt', source: buildLlms(content, false) })
            this.emitFile({ type: 'asset', fileName: 'llms-full.txt', source: buildLlms(content, true) })
            this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: buildSitemap() })
            this.emitFile({ type: 'asset', fileName: 'data/github.json', source: JSON.stringify(github || { ok: false, activity: [], repos: [] }) })
        },
    }
}
