#!/usr/bin/env node
/**
 * Post-build checks for dist/ (run in CI and locally with `npm run verify`).
 *
 *  1. Required files exist (SEO, AI and Netlify config files included).
 *  2. index.html carries the SEO essentials (canonical, JSON-LD, crawlable content).
 *  3. Privacy guard: no phone numbers or non-public email addresses in any text asset.
 *
 * Exits non-zero on the first category of failure so the pipeline stops before deploy.
 */
import fs from 'node:fs'
import path from 'node:path'

const DIST = path.resolve(process.argv[2] || 'dist')
const PUBLIC_EMAIL = 'elonerajeev@gmail.com'
const SITE = 'https://www.rajeev.pro'

const errors = []
const fail = (msg) => errors.push(msg)

// 1. Required files
const required = [
    'index.html', 'robots.txt', 'sitemap.xml', 'llms.txt', 'llms-full.txt',
    '_headers', '_redirects', 'favicon.ico', 'site.webmanifest',
    'images/og-image.png', 'data/settings.json', 'data/structure.json',
]
for (const f of required) {
    if (!fs.existsSync(path.join(DIST, f))) fail(`missing file: ${f}`)
}

// 2. SEO essentials in index.html
const indexPath = path.join(DIST, 'index.html')
if (fs.existsSync(indexPath)) {
    const html = fs.readFileSync(indexPath, 'utf-8')
    const checks = [
        [`<link rel="canonical" href="${SITE}/"`, 'canonical URL'],
        ['application/ld+json', 'JSON-LD structured data'],
        ['id="seo-content"', 'crawlable static content'],
        ['<h1>', 'h1 heading in static content'],
        ['og:image', 'Open Graph image'],
    ]
    for (const [needle, label] of checks) {
        if (!html.includes(needle)) fail(`index.html: ${label} not found`)
    }
    const words = html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length
    if (words < 500) fail(`index.html: only ${words} words of crawlable text (expected 500+)`)
}

// 3. Privacy guard over every text asset
const TEXT_EXT = new Set(['.html', '.js', '.css', '.json', '.txt', '.xml', '.md', '.webmanifest', ''])
const PHONE = /(?:\+91[\s-]?)?(?<![\d.])[6-9]\d{9}(?![\d.])/g
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g
const ALLOWED_EMAIL = (e) => e.toLowerCase() === PUBLIC_EMAIL || /@(example\.com|users\.noreply\.github\.com)$/i.test(e)

const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name)
    return d.isDirectory() ? walk(p) : [p]
})

if (fs.existsSync(DIST)) {
    for (const file of walk(DIST)) {
        if (!TEXT_EXT.has(path.extname(file))) continue
        const rel = path.relative(DIST, file)
        // Bundled vendor code contains unrelated numbers/emails (licences, regexes); only scan our content.
        if (/^assets\/.*-[A-Za-z0-9_-]{8}\.js$/.test(rel) && !/^assets\/(index|Article|parser)/.test(rel)) continue
        const text = fs.readFileSync(file, 'utf-8')
        for (const m of text.match(PHONE) || []) fail(`privacy: phone-like number "${m}" in ${rel}`)
        for (const m of text.match(EMAIL) || []) if (!ALLOWED_EMAIL(m)) fail(`privacy: non-public email "${m}" in ${rel}`)
    }
} else {
    fail(`dist directory not found: ${DIST}`)
}

if (errors.length) {
    console.error(`✖ verify-build: ${errors.length} problem(s)`)
    for (const e of errors) console.error(`  - ${e}`)
    process.exit(1)
}
console.log('✔ verify-build: required files present, SEO essentials found, no private data in dist/')
