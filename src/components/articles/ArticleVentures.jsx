import "./ArticleVentures.scss"
import React, {useState} from 'react'
import {useEmails} from "/src/helpers/emails.js"
import Article from "/src/components/wrappers/Article.jsx"
import FaIcon from "/src/components/generic/FaIcon.jsx"
import {useLanguage} from "/src/providers/LanguageProvider.jsx"
import {useUtils} from "/src/helpers/utils.js"

const utils = useUtils()

const VARIANT_LABELS = {
    cards: 'Design A · Overview card',
    roadmap: 'Design B · Roadmap',
    board: 'Design C · Project board',
}

/** Normalise venture items from the JSON. */
function useVentures(data) {
    const {getTranslation} = useLanguage()
    return (data.items || []).map((item) => {
        const text = getTranslation(item.locales, 'text', true) || ''
        const tags = getTranslation(item.locales, 'tags', true) || []
        const href = (item.links || []).find((l) => l.href)?.href || null
        const stages = item.stages || []
        const activeIndex = stages.findIndex((s) => s.status === 'active')
        const doneCount = stages.filter((s) => s.status === 'done').length
        return {
            id: item.categoryId,
            title: getTranslation(item.locales, 'title', true) || '',
            text: text.replace(/^\*\*coming soon\*\*\s*·\s*/i, ''),
            domain: tags.find((t) => /\.rajeev\.pro$/.test(t)) || '',
            href,
            live: !!href && !/coming soon/i.test(text),
            img: item.icon?.img ? utils.resolvePath(item.icon.img) : null,
            accent: item.accent || 'var(--theme-highlight)',
            highlights: item.highlights || [],
            stages,
            current: activeIndex >= 0 ? stages[activeIndex] : null,
            step: activeIndex >= 0 ? activeIndex + 1 : doneCount,
            progress: stages.length ? Math.round(((doneCount + (activeIndex >= 0 ? 0.5 : 0)) / stages.length) * 100) : 0,
            info: item.info || {},
        }
    })
}

function ArticleVentures({data}) {
    const ventures = useVentures(data)
    const variants = data.config?.variants || ['cards']
    const showLabels = variants.length > 1

    return (
        <Article className={`article-ventures`} title={null}>
            {variants.map((variant) => (
                <section key={variant} className={`ventures-variant`}>
                    {showLabels && <div className={`ventures-variant-label`}>{VARIANT_LABELS[variant] || variant}</div>}
                    {variant === 'cards' && ventures.map((v) => <OverviewCard key={v.id} v={v}/>)}
                    {variant === 'roadmap' && ventures.map((v) => <Roadmap key={v.id} v={v}/>)}
                    {variant === 'board' && ventures.map((v) => <ProjectBoard key={v.id} v={v}/>)}
                </section>
            ))}
        </Article>
    )
}

/* ---------- shared bits ---------- */

function StatusPill({live}) {
    return (
        <span className={`v-status ${live ? 'v-status-live' : 'v-status-soon'}`}>
            <span className={`v-status-dot`}/>{live ? 'Live' : 'In progress'}
        </span>
    )
}

function LogoDisc({src, title, size = 'md'}) {
    return (
        <span className={`v-logo v-logo-${size}`}>
            {src && <img src={src} alt={`${title} logo`} loading={`lazy`}/>}
        </span>
    )
}

/** The venture's domain as a blue link: the site when live, otherwise it takes you to the notify form. */
function VentureLink({v, className = ''}) {
    if (!v.domain) return null
    if (v.live) {
        return <a className={`v-link ${className}`} href={v.href} target={`_blank`} rel={`noopener noreferrer`}>{v.domain}</a>
    }
    const focusForm = (e) => {
        e.preventDefault()
        const root = e.currentTarget.closest('.ventures-variant') || document
        const input = root.querySelector('.v-notify-input')
        input?.focus()
    }
    return (
        <a className={`v-link ${className}`} href={`#notify-${v.id}`} onClick={focusForm}
           title={`Not live yet: get notified when ${v.domain} launches`}>
            {v.domain}
        </a>
    )
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/** "Notify me" sign-up: sends the visitor's email to me through EmailJS (same as the contact form). */
function NotifyForm({v}) {
    const emails = useEmails()
    const storageKey = `notify:${v.id}`
    const [email, setEmail] = useState('')
    const [trap, setTrap] = useState('')
    const [state, setState] = useState(() => {
        try { return localStorage.getItem(storageKey) ? 'done' : 'idle' } catch { return 'idle' }
    })
    const [error, setError] = useState('')

    if (v.live) return null

    const submit = async (e) => {
        e.preventDefault()
        if (trap) { setState('done'); return } // bots fill hidden fields
        const value = email.trim()
        if (!EMAIL_RE.test(value) || value.length > 200) { setError('Please enter a valid email.'); return }
        setError('')
        setState('sending')
        const ok = emails.isInitialized() && await emails.sendContactEmail(
            'Waitlist', value, `Notify me: ${v.title}`,
            `Please let me know when ${v.domain || v.title} launches.`)
        if (ok) {
            try { localStorage.setItem(storageKey, '1') } catch { /* storage unavailable */ }
            setState('done')
        } else {
            setState('idle')
            setError("Couldn't send that right now. Please try again in a minute.")
        }
    }

    if (state === 'done') {
        return (
            <p className={`v-notify-done`} role={`status`}>
                <FaIcon iconName={`fa-solid fa-circle-check`} className={`me-2`}/>
                You're on the list. I'll email you when it launches.
            </p>
        )
    }

    return (
        <form className={`v-notify`} onSubmit={submit} noValidate>
            <label className={`visually-hidden`} htmlFor={`notify-${v.id}`}>Email for launch updates</label>
            <input id={`notify-${v.id}`}
                   className={`v-notify-input`}
                   type={`email`}
                   inputMode={`email`}
                   autoComplete={`email`}
                   placeholder={`you@example.com`}
                   maxLength={200}
                   value={email}
                   onChange={(e) => { setEmail(e.target.value); setError('') }}
                   aria-invalid={!!error}
                   aria-describedby={error ? `notify-${v.id}-error` : undefined}
                   disabled={state === 'sending'}/>
            {/* honeypot: hidden from people, tempting for bots */}
            <input className={`v-notify-trap`} tabIndex={-1} autoComplete={`off`} aria-hidden={true}
                   value={trap} onChange={(e) => setTrap(e.target.value)}/>
            <button className={`v-notify-btn`} type={`submit`} disabled={state === 'sending'}>
                {state === 'sending' ? 'Sending…' : 'Notify me'}
            </button>
            {error && <p id={`notify-${v.id}-error`} className={`v-notify-error`} role={`alert`}>{error}</p>}
            <p className={`v-notify-note`}>One email when it launches. No spam.</p>
        </form>
    )
}

function DomainAction({v}) {
    if (v.live) {
        return (
            <a className={`v-cta`} href={v.href} target={`_blank`} rel={`noopener noreferrer`}>
                Visit {v.domain || 'site'} <FaIcon iconName={`fa-solid fa-arrow-up-right-from-square`} className={`ms-2`}/>
            </a>
        )
    }
    return (
        <span className={`v-domain`}>
            <FaIcon iconName={`fa-solid fa-globe`} className={`me-2`}/><VentureLink v={v}/><span className={`v-domain-soon`}>soon</span>
        </span>
    )
}

function ProgressBar({v}) {
    return (
        <div className={`v-progress`} role={`progressbar`} aria-valuenow={v.progress} aria-valuemin={0} aria-valuemax={100}
             aria-label={`${v.title} progress`}>
            <span style={{width: `${v.progress}%`}}/>
        </div>
    )
}

/* ---------- Design A: horizontal overview card ---------- */

function OverviewCard({v}) {
    return (
        <article className={`v-wide`} style={{'--v-accent': v.accent}}>
            <div className={`v-wide-media`}>
                <LogoDisc src={v.img} title={v.title} size={`xl`}/>
                <StatusPill live={v.live}/>
            </div>

            <div className={`v-wide-main`}>
                <h3 className={`eq-h4 fw-bold mb-2`}>{v.title}</h3>
                <p className={`text-4 v-muted mb-3`}>{v.text}</p>
                {v.current && (
                    <div className={`v-now`}>
                        <span className={`v-now-label`}>Now</span> {v.current.name}
                        <span className={`v-muted`}> · step {v.step} of {v.stages.length}</span>
                    </div>
                )}
                <ProgressBar v={v}/>
                <div className={`mt-3`}><DomainAction v={v}/></div>
                <NotifyForm v={v}/>
            </div>

            {v.highlights.length > 0 && (
                <ul className={`v-wide-points`}>
                    {v.highlights.map((h) => (
                        <li key={h}><FaIcon iconName={`fa-solid fa-check`} className={`me-2 v-accent`}/>{h}</li>
                    ))}
                </ul>
            )}
        </article>
    )
}

/* ---------- Design B: delivery roadmap (stages) ---------- */

function Roadmap({v}) {
    return (
        <div className={`v-road`} style={{'--v-accent': v.accent}}>
            <div className={`v-road-head`}>
                <LogoDisc src={v.img} title={v.title} size={`sm`}/>
                <div>
                    <div className={`fw-bold`}>{v.title}</div>
                    <div className={`v-muted text-2`}>Step {v.step} of {v.stages.length} · {v.progress}% done</div>
                </div>
            </div>
            <ProgressBar v={v}/>

            <ol className={`v-steps`}>
                {v.stages.map((s, i) => (
                    <li key={s.name} className={`v-step v-step-${s.status}`}>
                        <span className={`v-step-dot`} aria-hidden={true}>
                            {s.status === 'done' ? <FaIcon iconName={`fa-solid fa-check`}/> : i + 1}
                        </span>
                        <div className={`v-step-body`}>
                            <div className={`v-step-title`}>
                                {s.name}
                                {s.status === 'active' && <span className={`v-step-tag`}>current</span>}
                                {s.status === 'done' && <span className={`v-step-tag v-step-tag-done`}>done</span>}
                            </div>
                            {s.note && <div className={`v-muted text-2`}>{s.note}</div>}
                        </div>
                    </li>
                ))}
            </ol>
            <div className={`v-road-foot`}>
                <DomainAction v={v}/>
                <NotifyForm v={v}/>
            </div>
        </div>
    )
}

/* ---------- Design C: project board ---------- */

function ProjectBoard({v}) {
    const info = v.info
    const facts = [
        ['Owner', info.owner],
        ['Contributors', info.contributors !== undefined ? String(info.contributors) : null],
        ['Current stage', v.current ? v.current.name : null],
        ['Progress', `${v.progress}%`],
        ['Pricing', info.pricing],
        ['Launch', info.launch],
    ].filter(([, value]) => value)

    return (
        <div className={`v-board`} style={{'--v-accent': v.accent}}>
            <div className={`v-board-bar`}>
                <span className={`v-board-dots`} aria-hidden={true}><i/><i/><i/></span>
                <span className={`v-board-title`}>{v.domain || v.title} · project status</span>
                <StatusPill live={v.live}/>
            </div>

            <div className={`v-board-top`}>
                <LogoDisc src={v.img} title={v.title} size={`md`}/>
                <div>
                    <div className={`fw-bold`}>{v.title}</div>
                    <div className={`v-mono`}><VentureLink v={v}/></div>
                </div>
            </div>

            <ol className={`v-pipeline`} aria-label={`${v.title} stages`}>
                {v.stages.map((s) => (
                    <li key={s.name} className={`v-stage v-stage-${s.status}`} title={s.note}>
                        <span className={`v-stage-dot`}>{s.status === 'done' && <FaIcon iconName={`fa-solid fa-check`}/>}</span>
                        <span className={`v-stage-label`}>{s.name}</span>
                    </li>
                ))}
            </ol>

            <dl className={`v-facts`}>
                {facts.map(([k, val]) => (
                    <div key={k} className={`v-fact`}>
                        <dt>{k}</dt>
                        <dd>{val}</dd>
                    </div>
                ))}
                {info.stack?.length > 0 && (
                    <div className={`v-fact v-fact-wide`}>
                        <dt>Stack</dt>
                        <dd className={`v-stack`}>{info.stack.map((t) => <span key={t}>{t}</span>)}</dd>
                    </div>
                )}
            </dl>
            <div className={`v-board-foot`}><NotifyForm v={v}/></div>
        </div>
    )
}

export default ArticleVentures
