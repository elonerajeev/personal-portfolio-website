/**
 * TerX: a read-only, fake root shell that answers questions about the portfolio.
 *
 * Everything comes from the already-public JSON in public/data (via DataProvider),
 * so the terminal can never reveal more than the site itself. Nothing is executed:
 * input is matched against a fixed command table and output is plain data rendered
 * by React (no HTML injection).
 *
 * Output format: an array of lines; each line is an array of segments
 *   { text, tone?, href? }   tone: 'accent' | 'muted' | 'ok' | 'warn' | 'err' | 'info' | 'bold'
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

    const resumeHref = safeHref(items('resume')?.[0]?.links?.find((x) => x.href)?.href)
    const about = plain(en(items('about', 'short_description')?.[0]?.locales).text)

    return {
        name: profile.name || 'Rajeev Kumar',
        role: en(profile.locales).role || 'Cloud & DevOps Engineer',
        status: en(settings?.status?.locales).message || '',
        location: 'India',
        about, work, projects, skills, education, contact, resumeHref,
        certs: mapThread(items('achievements', 'certifications')),
        achievements: mapThread(items('achievements', 'achievements')),
        updates: mapThread(items('updates', 'updates')),
        since, months,
        loaded: !!(byId.experience?.content && byId.portfolio?.content && byId.skills?.content),
    }
}

/* ---------- output helpers ---------- */

const T = (text, tone, href) => ({ text: String(text), tone, href })
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

export const DIRS = ['about', 'experience', 'projects', 'skills', 'education', 'certifications', 'achievements', 'updates', 'contact']
const FILES = ['resume.pdf', 'README.md']

/* ---------- commands ---------- */

const COMMANDS = {
    help: { desc: 'list available commands' },
    whoami: { desc: 'who is behind this terminal' },
    neofetch: { desc: 'system summary, DevOps style' },
    ls: { desc: 'list sections  (ls <section>)' },
    cd: { desc: 'change directory  (cd projects)' },
    cat: { desc: 'print a section or file  (cat README.md)' },
    pwd: { desc: 'print working directory' },
    about: { desc: 'short profile' },
    experience: { desc: 'work history & years of experience' },
    projects: { desc: 'projects with links' },
    skills: { desc: 'tools & tech stack' },
    education: { desc: 'academic background' },
    certifications: { desc: 'certifications' },
    achievements: { desc: 'achievements' },
    updates: { desc: 'latest news' },
    contact: { desc: 'how to reach me' },
    resume: { desc: 'download the resume (PDF)' },
    uptime: { desc: 'time spent in Cloud/DevOps' },
    'git log': { desc: 'career timeline as commits' },
    'kubectl get pods': { desc: 'projects as running pods' },
    'docker ps': { desc: 'tool stack as containers' },
    'terraform plan': { desc: 'what hiring me would provision' },
    'systemctl status career': { desc: 'career as a running service' },
    'helm list': { desc: 'skills as deployed Helm releases' },
    'aws sts get-caller-identity': { desc: 'my identity card' },
    'cat /etc/os-release': { desc: 'the OS this terminal runs on' },
    history: { desc: 'commands you ran' },
    date: { desc: 'current date' },
    echo: { desc: 'print text' },
    clear: { desc: 'clear the screen (Ctrl+L)' },
}

export const COMPLETIONS = [...new Set([...Object.keys(COMMANDS), ...DIRS.flatMap((d) => [`ls ${d}`, `cd ${d}`, `cat ${d}`]), ...FILES.map((f) => `cat ${f}`), 'kubectl get skills', 'terraform apply', 'sudo', 'exit'])]

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
    case 'resume.pdf':
    case 'resume':
        return m.resumeHref ? [line(T('resume.pdf  ', 'info'), T('download / open', 'accent', m.resumeHref))] : [line(T('resume not available', 'warn'))]
    default:
        return null
    }
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
        const out = [line(T('TerX', 'accent'), T(' – explore my profile like a server. Available commands:', 'muted')), blank()]
        for (const [k, v] of Object.entries(COMMANDS)) out.push(line(T(`  ${k}`.padEnd(22), 'ok'), T(v.desc, 'muted')))
        out.push(blank(), line(T('tips: ', 'info'), T('Tab = autocomplete · ↑/↓ = history · Ctrl+L = clear · links are clickable', 'muted')))
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
    case cmd === 'ls': {
        const t = target(arg) || cwd
        if (!t) return { output: [line(...DIRS.map((d) => T(`${d}/  `, 'info')), ...FILES.map((f) => T(`${f}  `)))], cwd }
        const out = sectionOutput(t, m)
        return out ? { output: out, cwd } : { output: [line(T(`ls: cannot access '${args[0]}': No such file or directory`, 'err'))], cwd }
    }
    case cmd === 'cd': {
        const t = target(arg)
        if (!t) return { output: [], cwd: null }
        if (DIRS.includes(t)) return { output: [], cwd: t }
        return { output: [line(T(`cd: ${args[0]}: No such file or directory`, 'err'))], cwd }
    }
    case cmd === 'cat' && arg === '/etc/os-release':
        return { output: osRelease(m), cwd }
    case cmd === 'cat': {
        const t = target(arg) || cwd
        const out = t && sectionOutput(t.replace(/\.(txt|md)$/, '') === 'readme' ? 'README.md' : t, m)
        return out ? { output: out, cwd } : { output: [line(T(`cat: ${args[0] || ''}: No such file or directory`, 'err'))], cwd }
    }
    case ['about', 'experience', 'projects', 'skills', 'education', 'certifications', 'certs', 'achievements', 'updates', 'contact', 'resume'].includes(cmd):
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
