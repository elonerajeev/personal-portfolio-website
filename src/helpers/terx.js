/**
 * TerX: a read-only, fake root shell that answers questions about the portfolio.
 *
 * Everything comes from the already-public JSON in public/data (via DataProvider),
 * so the terminal can never reveal more than the site itself. Nothing is executed:
 * input is matched against a fixed command table and output is plain data rendered
 * by React (no HTML injection).
 *
 * Output format: an array of lines; each line is an array of segments
 *   { text, tone?, href?, download? }   tone: 'accent' | 'muted' | 'ok' | 'warn' | 'err' | 'info' | 'bold'
 */

export const MAX_INPUT = 200

/* ---------- data helpers ---------- */

const plain = (s) => String(s ?? '')
    .replace(/<\/p>\s*<p>/g, ' ')
    .replace(/<br\s*\/?>/g, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/\*\*/g, '')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()

const en = (locales) => (locales && locales.en) || {}

const safeHref = (href) => {
    if (!href) return null
    if (/^(https:|mailto:)/.test(href)) return href
    if (/^\/?(documents|images)\//.test(href)) return '/' + href.replace(/^\/+/, '')
    return null
}

const MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 }

/** "May 2024" | "2024" | "05/01/2024" -> Date (or null) */
const parseDate = (s) => {
    if (!s || s === 'now') return s === 'now' ? new Date() : null
    let m = String(s).match(/^([A-Za-z]{3})[a-z]*\s+(\d{4})$/)
    if (m && MONTHS[m[1].toLowerCase()] !== undefined) return new Date(+m[2], MONTHS[m[1].toLowerCase()], 1)
    m = String(s).match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
    if (m) return new Date(+m[3], +m[1] - 1, +m[2])
    m = String(s).match(/^(\d{4})$/)
    if (m) return new Date(+m[1], 0, 1)
    return null
}

const fmtRange = (dates) => {
    if (!dates || !dates.start) return ''
    const end = dates.end === 'now' ? 'Present' : (dates.end || '')
    return end ? `${dates.start} → ${end}` : dates.start
}

/** Build a compact model of the portfolio from DataProvider data. */
export function buildModel(settings, sections) {
    const byId = Object.fromEntries((sections || []).map((s) => [s.id, s]))
    const items = (sectionId, articleId) => {
        const content = byId[sectionId]?.content
        if (!content) return null // not loaded yet
        const arts = content.articles || []
        const pick = articleId ? arts.filter((a) => a.id === articleId) : arts
        return pick.flatMap((a) => (a.items || []).map((i) => ({ ...i, _article: a.id })))
    }

    const profile = settings?.profile || {}
    const work = (items('experience') || []).map((i) => {
        const l = en(i.locales)
        const parts = plain(l.info).split('·').map((x) => x.trim())
        return {
            role: plain(l.title), company: parts[0] || '', type: parts[1] || '', mode: parts[parts.length - 1] || '',
            dates: i.dates, range: fmtRange(i.dates), text: plain(l.text), tags: l.tags || [],
            current: i.dates?.end === 'now', start: parseDate(i.dates?.start),
        }
    }).sort((a, b) => (b.start || 0) - (a.start || 0))

    // Time in Cloud/DevOps = months covered by Cloud/DevOps roles, counted inclusively like LinkedIn
    // (overlaps merged, gaps between jobs excluded).
    const monthIndex = (d) => d.getFullYear() * 12 + d.getMonth()
    const spans = work.filter((w) => /devops|cloud/i.test(w.role) && w.start)
        .map((w) => [monthIndex(w.start), monthIndex(parseDate(w.dates?.end) || new Date())])
        .sort((a, b) => a[0] - b[0])
    const merged = []
    for (const [a, b] of spans) {
        const last = merged[merged.length - 1]
        if (last && a <= last[1] + 1) last[1] = Math.max(last[1], b)
        else merged.push([a, b])
    }
    const months = spans.length ? merged.reduce((n, [a, b]) => n + (b - a + 1), 0) : null
    const since = spans.length ? new Date(Math.floor(spans[0][0] / 12), spans[0][0] % 12, 1) : null

    const categories = Object.fromEntries((byId.portfolio?.content?.articles || [])
        .flatMap((a) => a.categories || []).map((c) => [c.id, plain(en(c.locales).singular) || c.id]))
    const projects = (items('portfolio') || []).map((i) => {
        const l = en(i.locales)
        return {
            title: plain(l.title), text: plain(l.text), tags: l.tags || [], category: categories[i.categoryId] || i.categoryId || '',
            href: safeHref(i.links?.find((x) => x.href)?.href),
        }
    })

    const skillArticles = (byId.skills?.content?.articles || []).filter((a) => a.id !== 'capabilities')
    const skills = skillArticles.map((a) => ({
        group: plain(en(a.locales).title) || a.id,
        items: (a.items || []).map((i) => plain(en(i.locales).title)).filter(Boolean),
    }))

    const mapThread = (list) => (list || []).map((i) => {
        const l = en(i.locales)
        return { title: plain(l.title), info: plain(l.info), text: plain(l.text), date: i.dates?.start || '', href: safeHref(i.links?.find((x) => x.href)?.href) }
    })

    const education = (items('education') || []).map((i) => {
        const l = en(i.locales)
        return { title: plain(l.title), info: plain(l.info), range: fmtRange(i.dates), text: plain(l.text) }
    })

    const contacts = [...(items('contact') || []), ...(items('about', 'contact_list') || [])]
        .map((i) => ({ label: plain(en(i.locales).title) || '', value: plain(i.value), href: safeHref(i.links?.find((x) => x.href)?.href) }))
        .filter((c) => c.value && c.href)
    const seen = new Set()
    const key = (h) => h.replace(/^https:\/\/(www\.)?/, '').replace(/\/$/, '').toLowerCase()
    const contact = contacts.filter((c) => (seen.has(key(c.href)) ? false : seen.add(key(c.href))))

    const resumeHref = safeHref(items('about', 'resume')?.[0]?.links?.find((x) => x.href)?.href)

    const ventures = (items('ventures') || []).map((i) => {
        const l = en(i.locales)
        const text = plain(l.text)
        const stages = i.stages || []
        const active = stages.findIndex((st) => st.status === 'active')
        const done = stages.filter((st) => st.status === 'done').length
        return {
            title: plain(l.title),
            status: /coming soon/i.test(text) ? 'in progress' : 'live',
            text: text.replace(/^coming soon\s*·\s*/i, ''),
            domain: (l.tags || []).find((t) => /\.rajeev\.pro$/.test(t)) || '',
            href: safeHref(i.links?.find((x) => x.href)?.href),
            stages,
            current: active >= 0 ? stages[active].name : null,
            progress: stages.length ? Math.round(((done + (active >= 0 ? 0.5 : 0)) / stages.length) * 100) : null,
            info: i.info || {},
        }
    })
    const about = plain(en(items('about', 'short_description')?.[0]?.locales).text)

    return {
        name: profile.name || 'Rajeev Kumar',
        role: en(profile.locales).role || 'Cloud & DevOps Engineer',
        status: en(settings?.status?.locales).message || '',
        location: 'India',
        about, work, projects, skills, education, contact, resumeHref, ventures,
        certs: mapThread(items('achievements', 'certifications')),
        achievements: mapThread(items('achievements', 'achievements')),
        updates: mapThread(items('updates', 'updates')),
        since, months,
        loaded: !!(byId.experience?.content && byId.portfolio?.content && byId.skills?.content),
    }
}

/* ---------- output helpers ---------- */

const T = (text, tone, href, download) => ({ text: String(text), tone, href, download })
const line = (...segs) => segs.flat().filter(Boolean)
const blank = () => [T('')]
const heading = (text) => line(T(`# ${text}`, 'accent'))
const kv = (k, v, width = 12) => line(T(k.padEnd(width), 'info'), T(v))

const yearsText = (m) => {
    if (m === null || m === undefined) return 'n/a'
    const y = Math.floor(m / 12), mo = m % 12
    return `${y} year${y === 1 ? '' : 's'}${mo ? `, ${mo} month${mo === 1 ? '' : 's'}` : ''}`
}

const ASCII = [
    ' ____  _  __',
    '|  _ \\| |/ /',
    '| |_) | \' / ',
    '|  _ <| . \\ ',
    '|_| \\_\\_|\\_\\',
]

function osRelease(m) {
    return [
        ['NAME', 'RajeevOS'],
        ['VERSION', `${new Date().getFullYear()}.${String(new Date().getMonth() + 1).padStart(2, '0')} (Cloud & DevOps)`],
        ['ID', 'rajeevos'],
        ['ID_LIKE', 'kali debian'],
        ['PRETTY_NAME', `RajeevOS – ${m.role}`],
        ['HOME_URL', 'https://www.rajeev.pro'],
        ['SUPPORT_URL', 'https://github.com/elonerajeev'],
        ['LOCATION', m.location],
    ].map(([k, v]) => line(T(`${k}=`, 'info'), T(`"${v}"`, /_URL$/.test(k) ? 'accent' : undefined, /_URL$/.test(k) ? v : undefined)))
}

/* ---------- filesystem view ---------- */

export const DIRS = ['about', 'experience', 'projects', 'skills', 'education', 'certifications', 'achievements', 'ventures', 'resume', 'updates', 'contact']
const FILES = ['README.md']

/* ---------- commands ---------- */

const COMMANDS = {
    // explore
    help: { group: 'explore', desc: 'this list' },
    whoami: { group: 'explore', desc: 'who is behind this terminal' },
    neofetch: { group: 'explore', desc: 'one-screen summary' },
    about: { group: 'explore', desc: 'short profile' },
    experience: { group: 'explore', desc: 'jobs and years of experience' },
    projects: { group: 'explore', desc: 'projects with links' },
    skills: { group: 'explore', desc: 'tools and tech stack' },
    education: { group: 'explore', desc: 'degree and school' },
    certifications: { group: 'explore', desc: 'certificates' },
    achievements: { group: 'explore', desc: 'achievements' },
    ventures: { group: 'explore', desc: 'what I am building next' },
    updates: { group: 'explore', desc: 'latest news' },
    contact: { group: 'explore', desc: 'how to reach me' },
    resume: { group: 'explore', desc: 'view or download my resume' },
    // shell
    ls: { group: 'shell', desc: 'list folders  (ls projects, ls -l)', man: ['ls', 'ls -l', 'ls projects'] },
    cd: { group: 'shell', desc: 'enter a folder  (cd resume, cd ..)', man: ['cd projects', 'cd resume', 'cd ..'] },
    cat: { group: 'shell', desc: 'print a folder or file  (cat README.md)', man: ['cat README.md', 'cat skills', 'cat /etc/os-release'] },
    tree: { group: 'shell', desc: 'everything as a file tree' },
    grep: { group: 'shell', desc: 'search everything  (grep kubernetes)', man: ['grep kubernetes', 'grep terraform', 'grep aws'] },
    open: { group: 'shell', desc: 'open a link  (open github)', man: ['open github', 'open linkedin', 'open resume', 'open email'] },
    man: { group: 'shell', desc: 'how a command works  (man grep)' },
    pwd: { group: 'shell', desc: 'current folder' },
    history: { group: 'shell', desc: 'commands you ran' },
    clear: { group: 'shell', desc: 'clear the screen (Ctrl+L)' },
    fullscreen: { group: 'shell', desc: 'toggle fullscreen (Esc exits)' },
    // devops
    uptime: { group: 'devops', desc: 'time spent in Cloud & DevOps' },
    'git log': { group: 'devops', desc: 'career timeline as commits' },
    'kubectl get pods': { group: 'devops', desc: 'projects as running pods' },
    'docker ps': { group: 'devops', desc: 'tool stack as containers' },
    'helm list': { group: 'devops', desc: 'skills as Helm releases' },
    'terraform plan': { group: 'devops', desc: 'what hiring me provisions' },
    'systemctl status career': { group: 'devops', desc: 'career as a service' },
    'aws sts get-caller-identity': { group: 'devops', desc: 'identity card' },
    'cat /etc/os-release': { group: 'devops', desc: 'the OS behind TerX' },
}

export const COMPLETIONS = [...new Set([...Object.keys(COMMANDS), ...DIRS.flatMap((d) => [`ls ${d}`, `cd ${d}`, `cat ${d}`]), ...FILES.map((f) => `cat ${f}`), 'cat resume/resume.pdf', 'ls -l', 'open github', 'open linkedin', 'open x', 'open email', 'open resume', 'open site', ...Object.keys(COMMANDS).map((c) => `man ${c}`), 'kubectl get skills', 'terraform apply', 'exit fullscreen', 'sudo', 'exit'])]

function sectionOutput(name, m) {
    switch (name) {
    case 'about':
    case 'README.md':
        return [heading(`${m.name} – ${m.role}`), line(T(m.about)), blank(), kv('location', m.location), kv('status', m.status), blank(),
            line(T("type 'help' to explore, or 'neofetch' for the summary", 'muted'))]
    case 'experience': {
        const out = [heading('experience'), kv('total', `${yearsText(m.months)} in Cloud & DevOps${m.since ? ` (since ${m.since.toLocaleString('en', { month: 'short', year: 'numeric' })})` : ''}`), blank()]
        for (const w of m.work) {
            out.push(line(T(w.current ? '● ' : '○ ', w.current ? 'ok' : 'muted'), T(w.role, 'bold'), T(` @ ${w.company}`, 'accent')))
            out.push(line(T(`  ${w.range}${w.type ? ` · ${w.type}` : ''}${w.mode ? ` · ${w.mode}` : ''}`, 'muted')))
            if (w.text) out.push(line(T(`  ${w.text}`)))
            if (w.tags.length) out.push(line(T(`  [${w.tags.join('] [')}]`, 'info')))
            out.push(blank())
        }
        return out
    }
    case 'projects': {
        const out = [heading(`projects (${m.projects.length})`), blank()]
        for (const p of m.projects) {
            out.push(line(T('▸ ', 'accent'), T(p.title, 'bold'), p.category ? T(`  (${p.category})`, 'muted') : null))
            if (p.text) out.push(line(T(`  ${p.text}`)))
            if (p.tags.length) out.push(line(T(`  [${p.tags.join('] [')}]`, 'info')))
            if (p.href) out.push(line(T('  → ', 'muted'), T(p.href.replace(/^https:\/\//, ''), 'accent', p.href)))
            out.push(blank())
        }
        return out
    }
    case 'skills': {
        const out = [heading('skills')]
        for (const g of m.skills) out.push(line(T(`${g.group}:`.padEnd(22), 'info'), T(g.items.join(', '))))
        return out
    }
    case 'education': {
        const out = [heading('education')]
        for (const e of m.education) {
            out.push(line(T('▸ ', 'accent'), T(e.title, 'bold'), T(`  ${e.range}`, 'muted')))
            out.push(line(T(`  ${e.info}`, 'muted')))
            if (e.text) out.push(line(T(`  ${e.text}`)))
        }
        return out
    }
    case 'certifications':
    case 'achievements':
    case 'updates': {
        const list = name === 'certifications' ? m.certs : name === 'achievements' ? m.achievements : m.updates
        const out = [heading(name)]
        for (const c of list) {
            out.push(line(T('▸ ', 'accent'), T(c.title, 'bold'), c.date ? T(`  ${c.date}`, 'muted') : null))
            if (c.info) out.push(line(T(`  ${c.info}`, 'muted')))
            if (c.href) out.push(line(T('  → ', 'muted'), T('open', 'accent', c.href)))
        }
        return out
    }
    case 'contact':
        return [heading('contact'), ...m.contact.map((c) => line(T((c.label || 'link').padEnd(10), 'info'), T(c.value, 'accent', c.href))),
            line(T('location'.padEnd(10), 'info'), T(m.location))]
    case 'ventures': {
        const out = [heading('ventures')]
        for (const v of m.ventures) {
            out.push(blank(), line(T(v.status === 'live' ? '● ' : '◐ ', v.status === 'live' ? 'ok' : 'warn'), T(v.title, 'bold'), T(`  [${v.status}]`, v.status === 'live' ? 'ok' : 'warn')))
            if (v.text) out.push(line(T(`  ${v.text}`)))
            if (v.stages.length) {
                out.push(blank())
                v.stages.forEach((st) => out.push(line(
                    T(st.status === 'done' ? '  ✔ ' : st.status === 'active' ? '  ▶ ' : '  · ', st.status === 'done' ? 'ok' : st.status === 'active' ? 'warn' : 'muted'),
                    T(st.name, st.status === 'active' ? 'bold' : st.status === 'done' ? undefined : 'muted'),
                    st.status === 'active' ? T('  ← now', 'warn') : null)))
                if (v.progress !== null) {
                    const filled = Math.round(v.progress / 5)
                    out.push(blank(), line(T('  progress  ', 'info'), T('█'.repeat(filled), 'ok'), T('░'.repeat(20 - filled), 'muted'), T(` ${v.progress}%`)))
                }
            }
            const facts = [['owner', v.info.owner], ['team', v.info.contributors !== undefined ? `${v.info.contributors} contributor${v.info.contributors === 1 ? '' : 's'}` : null], ['pricing', v.info.pricing], ['launch', v.info.launch]].filter(([, x]) => x)
            if (facts.length) out.push(blank(), ...facts.map(([k, x]) => line(T(`  ${k}`.padEnd(12), 'info'), T(x))))
            if (v.href) out.push(line(T('  → ', 'muted'), T(v.domain || v.href, 'accent', v.href)))
            else if (v.domain) {
                const mail = m.contact.find((c) => /^mailto:/.test(c.href))
                const notify = mail && `${mail.href}?subject=${encodeURIComponent(`Notify me: ${v.title}`)}`
                out.push(line(T('  → ', 'muted'), T(v.domain, 'info', notify || undefined), T('  (not live yet · click to get notified)', 'muted')))
            }
        }
        return out
    }
    case 'resume.pdf':
    case 'resume': {
        if (!m.resumeHref) return [line(T('resume not available', 'warn'))]
        const file = m.resumeHref.split('/').pop()
        return [
            heading('resume'),
            line(T(`${m.name} – ${m.role}`, 'bold'), T(` · ${yearsText(m.months)} in Cloud & DevOps`, 'muted')),
            blank(),
            line(T('  ⬇ ', 'ok'), T('Download PDF', 'accent', m.resumeHref, file), T('    ', undefined), T('👁 ', 'info'), T('Open in browser', 'accent', m.resumeHref)),
            blank(),
            line(T("tip: 'aws sts get-caller-identity' prints my identity card", 'muted')),
        ]
    }
    default:
        return null
    }
}

/** One-line summary printed when entering a folder. */
function dirSummary(name, m) {
    const count = {
        experience: m.work.length, projects: m.projects.length, skills: m.skills.reduce((n, g) => n + g.items.length, 0),
        education: m.education.length, certifications: m.certs.length, achievements: m.achievements.length,
        ventures: m.ventures.length, updates: m.updates.length, contact: m.contact.length,
    }[name]
    return line(T(`📂 ${name}/`, 'info'), count !== undefined ? T(`  ${count} entr${count === 1 ? 'y' : 'ies'}`, 'muted') : null,
        T("  · 'ls' to list, 'cd ..' to go back", 'muted'))
}

/** Searchable index of everything public. */
function searchIndex(m) {
    return [
        ...m.work.map((w) => ({ where: 'experience', title: `${w.role} @ ${w.company}`, text: [w.text, w.tags.join(' ')].join(' ') })),
        ...m.projects.map((p) => ({ where: 'projects', title: p.title, text: [p.text, p.tags.join(' ')].join(' '), href: p.href })),
        ...m.skills.flatMap((g) => g.items.map((it) => ({ where: 'skills', title: it, text: g.group }))),
        ...m.certs.map((c) => ({ where: 'certifications', title: c.title, text: [c.info, c.text].join(' '), href: c.href })),
        ...m.achievements.map((c) => ({ where: 'achievements', title: c.title, text: [c.info, c.text].join(' ') })),
        ...m.education.map((e) => ({ where: 'education', title: e.title, text: [e.info, e.text].join(' ') })),
        ...m.ventures.map((v) => ({ where: 'ventures', title: v.title, text: v.text })),
        ...m.updates.map((u) => ({ where: 'updates', title: u.title, text: [u.info, u.text].join(' '), href: u.href })),
    ]
}

/** Split text into segments with every case-insensitive match of `term` highlighted. */
function highlight(text, term, baseTone) {
    const out = []
    const lower = text.toLowerCase(), t = term.toLowerCase()
    let i = 0
    for (let at = lower.indexOf(t); at !== -1; at = lower.indexOf(t, i)) {
        if (at > i) out.push(T(text.slice(i, at), baseTone))
        out.push(T(text.slice(at, at + t.length), 'warn'))
        i = at + t.length
    }
    if (i < text.length) out.push(T(text.slice(i), baseTone))
    return out
}

/** Context snippet around the first match. */
function snippet(text, term, width = 70) {
    const at = text.toLowerCase().indexOf(term.toLowerCase())
    if (at < 0) return ''
    let start = Math.max(0, at - Math.floor(width / 2))
    let end = Math.min(text.length, start + width)
    // snap to word boundaries so snippets don't start or end mid-word
    if (start > 0) { const sp = text.indexOf(' ', start); if (sp !== -1 && sp < at) start = sp + 1 }
    if (end < text.length) { const sp = text.lastIndexOf(' ', end); if (sp > at) end = sp }
    return (start > 0 ? '…' : '') + text.slice(start, end).trim() + (end < text.length ? '…' : '')
}

function treeOutput(m) {
    const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const children = {
        experience: m.work.map((w) => `${slug(w.role)}@${slug(w.company)}`),
        projects: m.projects.map((p) => slug(p.title)),
        skills: m.skills.map((g) => `${slug(g.group)}/ (${g.items.length})`),
        certifications: m.certs.map((c) => slug(c.title)),
        ventures: m.ventures.map((v) => slug(v.title)),
        resume: ['resume.pdf'],
        contact: m.contact.map((c) => (c.label || 'link').toLowerCase()),
    }
    const out = [line(T('/root', 'info'))]
    const entries = [...DIRS, ...FILES]
    entries.forEach((d, i) => {
        const last = i === entries.length - 1
        const isDir = DIRS.includes(d)
        out.push(line(T(last ? '└── ' : '├── ', 'muted'), T(isDir ? `${d}/` : d, isDir ? 'info' : undefined)))
        const kids = children[d] || []
        kids.forEach((k, j) => out.push(line(T(`${last ? '    ' : '│   '}${j === kids.length - 1 ? '└── ' : '├── '}`, 'muted'), T(k))))
    })
    out.push(blank(), line(T(`${DIRS.length} directories, ${FILES.length + 1} files`, 'muted')))
    return out
}

/**
 * Run one command line. Returns { output, cwd, clear?, navigate? }.
 * `state` = { cwd, history, model }
 */
export function runCommand(raw, state) {
    const input = String(raw || '').slice(0, MAX_INPUT).trim()
    const { model: m } = state
    let cwd = state.cwd
    if (!input) return { output: [], cwd }

    const [cmd0, ...args] = input.split(/\s+/)
    const cmd = cmd0.toLowerCase()
    const arg = (args[0] || '').replace(/\/$/, '').toLowerCase()
    const full = input.toLowerCase().replace(/\s+/g, ' ')

    if (!m.loaded && !['help', 'clear', 'date', 'echo', 'pwd', 'history', 'whoami'].includes(cmd)) {
        return { output: [line(T('still loading portfolio data… try again in a second', 'warn'))], cwd }
    }

    const target = (a) => (a === '' || a === '~' || a === '/' || a === '..') ? null : a

    switch (true) {
    case cmd === 'help': {
        const out = [line(T('TerX', 'accent'), T(" · explore my profile from a shell. 'man <command>' explains any command.", 'muted'))]
        for (const [group, title] of [['explore', 'EXPLORE'], ['shell', 'SHELL'], ['devops', 'DEVOPS VIEWS']]) {
            out.push(blank(), line(T(title, 'info')))
            for (const [k, v] of Object.entries(COMMANDS).filter(([, c]) => c.group === group)) out.push(line(T(`  ${k}`.padEnd(30), 'ok'), T(v.desc, 'muted')))
        }
        out.push(blank(), line(T('keys: ', 'info'), T('Tab autocomplete · ↑/↓ history · Ctrl+L clear · Esc exit fullscreen', 'muted')))
        return { output: out, cwd }
    }
    case cmd === 'clear':
        return { output: [], cwd, clear: true }
    case cmd === 'whoami':
        return { output: [line(T('root', 'err'), T(' (but really: ', 'muted'), T(m.name, 'bold'), T(`, ${m.role})`, 'muted'))], cwd }
    case cmd === 'pwd':
        return { output: [line(T(cwd ? `/root/${cwd}` : '/root'))], cwd }
    case cmd === 'date':
        return { output: [line(T(new Date().toString()))], cwd }
    case cmd === 'echo':
        return { output: [line(T(input.slice(4).trim()))], cwd }
    case cmd === 'history':
        return { output: state.history.map((h, i) => line(T(String(i + 1).padStart(4), 'muted'), T(`  ${h}`))), cwd }
    case cmd === 'uptime':
        return { output: [line(T(`up ${yearsText(m.months)}`, 'ok'), T(` in Cloud & DevOps · ${m.work.length} roles · ${m.projects.length} projects · load average: shipping, automating, monitoring`, 'muted'))], cwd }
    case cmd === 'neofetch': {
        const facts = [
            [T('root', 'err'), T('@', 'muted'), T('rajeev', 'accent')],
            [T('-------------', 'muted')],
            [T('Name: ', 'info'), T(m.name)],
            [T('Role: ', 'info'), T(m.role)],
            [T('Current: ', 'info'), T(m.work.find((w) => w.current) ? `${m.work.find((w) => w.current).role} @ ${m.work.find((w) => w.current).company}` : '—')],
            [T('Uptime: ', 'info'), T(`${yearsText(m.months)} in Cloud/DevOps`)],
            [T('Cloud: ', 'info'), T((m.skills.find((g) => /cloud/i.test(g.group))?.items || []).join(', '))],
            [T('Stack: ', 'info'), T((m.skills.find((g) => /devops/i.test(g.group))?.items || []).slice(0, 6).join(', '))],
            [T('Projects: ', 'info'), T(String(m.projects.length))],
            [T('Location: ', 'info'), T(m.location)],
            [T('Status: ', 'info'), T(m.status, 'ok')],
        ]
        const rows = Math.max(ASCII.length, facts.length)
        const out = []
        for (let i = 0; i < rows; i++) out.push(line(T((ASCII[i] || '').padEnd(24), 'accent'), ...(facts[i] || [])))
        return { output: out, cwd }
    }
    case cmd === 'ls' && /^-[la]+$/.test(arg) && !args[1]: {
        const out = [line(T(`total ${DIRS.length + FILES.length}`, 'muted'))]
        for (const d of DIRS) out.push(line(T('drwxr-xr-x  root root  ', 'muted'), T(`${d}/`, 'info')))
        for (const f of FILES) out.push(line(T('-rw-r--r--  root root  ', 'muted'), T(f)))
        return { output: out, cwd }
    }
    case cmd === 'ls': {
        const t = target(arg.replace(/^-[la]+\s*/, '')) || cwd
        if (t === 'resume') return { output: [line(T('resume.pdf', 'accent')), blank(), ...sectionOutput('resume', m)], cwd }
        if (!t) return { output: [line(...DIRS.map((d) => T(`${d}/  `, 'info')), ...FILES.map((f) => T(`${f}  `)))], cwd }
        const out = sectionOutput(t, m)
        return out ? { output: out, cwd } : { output: [line(T(`ls: cannot access '${args[0]}': No such file or directory`, 'err'))], cwd }
    }
    case cmd === 'cd': {
        const t = target(arg)
        if (!t) return { output: [], cwd: null }
        if (DIRS.includes(t)) return { output: t === 'resume' ? sectionOutput('resume', m) : [dirSummary(t, m)], cwd: t }
        return { output: [line(T(`cd: ${args[0]}: No such file or directory`, 'err'))], cwd }
    }
    case cmd === 'cat' && arg === '/etc/os-release':
        return { output: osRelease(m), cwd }
    case cmd === 'cat': {
        const t = target(arg) || cwd
        const name = t && t.replace(/^resume\//, '')
        const out = name && sectionOutput(name.replace(/\.(txt|md)$/, '') === 'readme' ? 'README.md' : name, m)
        return out ? { output: out, cwd } : { output: [line(T(`cat: ${args[0] || ''}: No such file or directory`, 'err'))], cwd }
    }
    case ['about', 'experience', 'projects', 'skills', 'education', 'certifications', 'certs', 'achievements', 'ventures', 'updates', 'contact', 'resume'].includes(cmd):
        return { output: sectionOutput(cmd === 'certs' ? 'certifications' : cmd, m), cwd }
    case full === 'git log' || full.startsWith('git log'): {
        const events = [
            ...m.work.map((w) => ({ d: w.start, msg: `${w.current ? 'feat' : 'chore'}: ${w.role} @ ${w.company}`, who: w.company })),
            ...m.updates.filter((u) => !m.work.some((w) => w.company && u.title.includes(w.company.replace('™', ''))))
                .map((u) => ({ d: parseDate(u.date), msg: `docs: ${u.title}`, who: u.info })),
        ].filter((e) => e.d).sort((a, b) => b.d - a.d)
        const out = []
        events.forEach((e, i) => {
            const hash = (Math.abs([...e.msg].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7)) >>> 0).toString(16).padStart(7, '0').slice(0, 7)
            out.push(line(T(`commit ${hash}`, 'warn'), i === 0 ? T(' (HEAD -> main)', 'ok') : null))
            out.push(line(T(`Date:   ${e.d.toLocaleString('en', { month: 'short', year: 'numeric' })}`, 'muted')))
            out.push(line(T(`    ${e.msg}`)))
            out.push(blank())
        })
        return { output: out, cwd }
    }
    case full === 'kubectl get pods' || full === 'kubectl get projects': {
        const out = [line(T('NAME'.padEnd(46), 'bold'), T('READY   STATUS    RESTARTS   AGE', 'bold'))]
        m.projects.forEach((p, i) => {
            const name = p.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)
            const pod = `${name}-${(i + 7).toString(36)}x${(i * 3 + 5).toString(36)}`
            out.push(line(T(pod, p.href ? 'accent' : undefined, p.href), T(''.padEnd(46 - pod.length)), T('1/1     '), T('Running', 'ok'), T('   0          ∞')))
        })
        return { output: out, cwd }
    }
    case full === 'kubectl get skills' || full === 'docker ps': {
        const out = [line(T('CONTAINER ID   IMAGE'.padEnd(40), 'bold'), T('STATUS       NAMES', 'bold'))]
        let n = 0
        for (const g of m.skills.filter((x) => !/language/i.test(x.group))) {
            for (const s of g.items) {
                const id = ((n++ * 2654435761) >>> 0).toString(16).padStart(8, '0').slice(0, 12)
                const image = s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
                out.push(line(T(`${id.padEnd(15)}${(image + ':latest').padEnd(25)}`), T('Up         ', 'ok'), T(g.group.toLowerCase().replace(/\s+/g, '-'), 'muted')))
            }
        }
        return { output: out, cwd }
    }
    case full === 'terraform plan' || full === 'terraform apply': {
        const cur = m.work.find((w) => w.current)
        const out = [line(T('Terraform will perform the following actions:', 'bold')), blank(),
            line(T('  # engineer.rajeev', 'muted'), T(' will be created', 'muted')),
            line(T('  + resource "engineer" "rajeev" {', 'ok')),
            line(T(`      + role         = "${m.role}"`, 'ok')),
            line(T(`      + experience   = "${yearsText(m.months)}"`, 'ok')),
            cur ? line(T(`      + current      = "${cur.role} @ ${cur.company}"`, 'ok')) : null,
            line(T(`      + location     = "${m.location}"`, 'ok')),
            line(T(`      + skills       = [${m.skills.flatMap((g) => /language/i.test(g.group) ? [] : g.items).slice(0, 8).map((s) => `"${s}"`).join(', ')}, ...]`, 'ok')),
            line(T('    }', 'ok')), blank(),
            line(T('Plan: ', 'bold'), T('1 to add, 0 to change, 0 to destroy.', 'ok')),
            full.endsWith('apply')
                ? line(T('Apply → ', 'muted'), T("run 'contact' to start the conversation", 'accent'))
                : line(T("Next: run 'terraform apply' or 'contact'", 'muted'))].filter(Boolean)
        return { output: out, cwd }
    }
    case full === 'systemctl status career' || full === 'systemctl status career.service': {
        const cur = m.work.find((w) => w.current)
        const since = m.since ? m.since.toLocaleString('en', { month: 'short', year: 'numeric' }) : 'n/a'
        const journal = m.work.slice(0, 4).map((w) => line(
            T(`${(w.start ? w.start.toLocaleString('en', { month: 'short', year: 'numeric' }) : '').padEnd(10)} rajeev career[1]: `, 'muted'),
            T(`${w.current ? 'Started' : 'Completed'} ${w.role} @ ${w.company}`)))
        return { output: [
            line(T('● ', 'ok'), T('career.service', 'bold'), T(` – ${m.name}, ${m.role}`)),
            line(T('     Loaded: ', 'info'), T('loaded (/etc/systemd/system/career.service; '), T('enabled', 'ok'), T('; preset: enabled)')),
            line(T('     Active: ', 'info'), T('active (running)', 'ok'), T(` since ${since}; ${yearsText(m.months)} in Cloud & DevOps`)),
            line(T('   Main PID: ', 'info'), T(cur ? `${cur.role} @ ${cur.company}` : m.role)),
            line(T('      Tasks: ', 'info'), T(`${m.projects.length} projects, ${m.skills.flatMap((g) => /language/i.test(g.group) ? [] : g.items).length} tools`)),
            line(T('     Status: ', 'info'), T(m.status, 'ok')),
            blank(),
            ...journal,
        ], cwd }
    }
    case full === 'helm list' || full === 'helm ls' || full === 'helm list -a': {
        const out = [line(T('NAME'.padEnd(30) + 'NAMESPACE'.padEnd(22) + 'REVISION  STATUS     CHART', 'bold'))]
        for (const g of m.skills.filter((x) => !/language/i.test(x.group))) {
            const ns = g.group.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
            g.items.forEach((s, i) => {
                const name = s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 28)
                out.push(line(T(name.padEnd(30)), T(ns.slice(0, 20).padEnd(22), 'muted'), T(String(i + 1).padEnd(10)), T('deployed'.padEnd(11), 'ok'), T(`${name}-${Math.max(1, Math.floor((m.months || 12) / 12))}.0.0`, 'info')))
            })
        }
        return { output: out, cwd }
    }
    case full === 'aws sts get-caller-identity': {
        const cur = m.work.find((w) => w.current)
        const gh = m.contact.find((c) => /github/i.test(c.href))
        const li = m.contact.find((c) => /linkedin/i.test(c.href))
        const mail = m.contact.find((c) => /^mailto:/.test(c.href))
        const fields = [
            ['UserId', 'AIDARAJEEVKUMAR'],
            ['Account', 'rajeev-pro'],
            ['Arn', `arn:aws:iam::rajeev-pro:user/${m.role.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`],
            ['Name', m.name],
            ['Role', cur ? `${cur.role} @ ${cur.company}` : m.role],
            ['Experience', yearsText(m.months)],
            ['Location', m.location],
            mail && ['Email', mail.value, mail.href],
            gh && ['GitHub', gh.href, gh.href],
            li && ['LinkedIn', li.href, li.href],
        ].filter(Boolean)
        return { output: [
            line(T('{')),
            ...fields.map(([k, v, href], i) => line(T(`    "${k}": `, 'info'), T(`"${v}"`, href ? 'accent' : 'ok', href), T(i < fields.length - 1 ? ',' : ''))),
            line(T('}')),
        ], cwd }
    }
    case cmd === 'tree':
        return { output: treeOutput(m), cwd }
    case cmd === 'grep': {
        const term = input.slice(4).trim().replace(/^["']|["']$/g, '').replace(/^-i\s+/, '')
        if (!term) return { output: [line(T("usage: grep <word>   e.g. grep kubernetes", 'warn'))], cwd }
        if (term.length < 2) return { output: [line(T('grep: use at least 2 characters', 'warn'))], cwd }
        const hits = searchIndex(m).filter((e) => `${e.title} ${e.text}`.toLowerCase().includes(term.toLowerCase()))
        if (!hits.length) return { output: [line(T(`no matches for "${term}"`, 'muted'))], cwd }
        const out = [line(T(`${hits.length} match${hits.length === 1 ? '' : 'es'} for "${term}"`, 'muted')), blank()]
        for (const h of hits.slice(0, 40)) {
            out.push(line(T(`${h.where}/`.padEnd(16), 'info'), ...highlight(h.title, term, 'bold')))
            const snip = snippet(h.text, term)
            if (snip && !h.title.toLowerCase().includes(term.toLowerCase())) out.push(line(T(''.padEnd(16)), ...highlight(snip, term, 'muted')))
        }
        if (hits.length > 40) out.push(line(T(`… ${hits.length - 40} more`, 'muted')))
        return { output: out, cwd }
    }
    case cmd === 'open': {
        const what = arg.replace(/^@/, '')
        const find = (re) => m.contact.find((c) => re.test(c.href))
        const target = {
            github: find(/github\.com/), linkedin: find(/linkedin\.com/), x: find(/x\.com|twitter\.com/), twitter: find(/x\.com|twitter\.com/),
            email: find(/^mailto:/), mail: find(/^mailto:/),
            resume: m.resumeHref ? { href: m.resumeHref, value: 'resume.pdf' } : null,
            site: { href: 'https://www.rajeev.pro', value: 'www.rajeev.pro' },
        }[what]
        if (!what) return { output: [line(T('usage: open github | linkedin | x | email | resume | site', 'warn'))], cwd }
        if (!target) return { output: [line(T(`open: unknown target '${args[0]}'`, 'err'), T("  · try 'open github'", 'muted'))], cwd }
        return { output: [line(T('opening ', 'muted'), T(target.value, 'accent', target.href), T(' …', 'muted'))], cwd, openUrl: target.href }
    }
    case cmd === 'man': {
        const name = input.slice(3).trim().toLowerCase()
        const entry = COMMANDS[name]
        if (!name) return { output: [line(T('usage: man <command>   e.g. man grep', 'warn'))], cwd }
        if (!entry) return { output: [line(T(`No manual entry for ${name}`, 'err'))], cwd }
        return { output: [
            line(T(name.toUpperCase(), 'bold'), T('                TerX manual', 'muted')), blank(),
            line(T('NAME', 'info')), line(T(`    ${name} - ${entry.desc}`)), blank(),
            line(T('EXAMPLES', 'info')), ...(entry.man || [name]).map((e) => line(T(`    $ ${e}`, 'ok'))),
        ], cwd }
    }
    case cmd === 'fullscreen' || full === 'exit fullscreen':
        return { output: [], cwd, fullscreen: full === 'exit fullscreen' ? false : 'toggle' }
    case cmd === 'sudo':
        return { output: [line(T('you are already root. With great power comes great responsibility.', 'warn'))], cwd }
    case cmd === 'exit' || cmd === 'logout':
        return { output: [line(T('logout', 'muted'))], cwd, navigate: 'about' }
    case ['rm', 'mkfs', 'dd', 'shutdown', 'reboot', 'kill', 'chmod', 'chown'].includes(cmd):
        return { output: [line(T(`${cmd}: operation not permitted (read-only filesystem, nice try 😉)`, 'err'))], cwd }
    default:
        return { output: [line(T(`${cmd0}: command not found`, 'err'), T("  · try 'help'", 'muted'))], cwd }
    }
}

/** Tab completion: returns the completed input, or a list of candidates. */
export function complete(input) {
    const v = input.toLowerCase()
    if (!v) return { candidates: [] }
    const hits = COMPLETIONS.filter((c) => c.startsWith(v))
    if (hits.length === 1) return { value: hits[0] + ' ' }
    if (hits.length > 1) {
        let prefix = hits[0]
        for (const h of hits) while (!h.startsWith(prefix)) prefix = prefix.slice(0, -1)
        return { value: prefix.length > v.length ? prefix : null, candidates: hits.slice(0, 20) }
    }
    return { candidates: [] }
}
