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

export default function seoPlugin() {
    let root = process.cwd()
    return {
        name: 'portfolio-seo',
        configResolved(config) {
            root = config.root
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
        },
    }
}
