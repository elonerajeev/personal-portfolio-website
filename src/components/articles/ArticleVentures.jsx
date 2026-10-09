import "./ArticleVentures.scss"
import React from 'react'
import Article from "/src/components/wrappers/Article.jsx"
import FaIcon from "/src/components/generic/FaIcon.jsx"
import {useLanguage} from "/src/providers/LanguageProvider.jsx"
import {useUtils} from "/src/helpers/utils.js"

const utils = useUtils()

const STAGES = [
    {id: 'plan', label: 'Plan'},
    {id: 'build', label: 'Build'},
    {id: 'launch', label: 'Launch'},
]

const VARIANT_LABELS = {
    cards: 'Design A · Launch cards',
    roadmap: 'Design B · Roadmap',
    board: 'Design C · Deploy board',
}

/** Normalise one venture item from the JSON. */
function useVentures(data) {
    const {getTranslation} = useLanguage()
    return (data.items || []).map((item) => {
        const text = getTranslation(item.locales, 'text', true) || ''
        const tags = getTranslation(item.locales, 'tags', true) || []
        const href = (item.links || []).find((l) => l.href)?.href || null
        const live = !!href && !/coming soon/i.test(text)
        return {
            id: item.categoryId,
            title: getTranslation(item.locales, 'title', true) || '',
            text: text.replace(/^\*\*coming soon\*\*\s*·\s*/i, '').replace(/\s*Launching at \S+\.?$/i, ''),
            domain: tags.find((t) => /\.rajeev\.pro$/.test(t)) || '',
            href,
            live,
            img: item.icon?.img ? utils.resolvePath(item.icon.img) : null,
            accent: item.accent || 'var(--theme-highlight)',
            highlights: item.highlights || [],
            phase: item.phase || '',
            stage: item.stage || 'plan',
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
                    {variant === 'cards' && <VenturesCards ventures={ventures}/>}
                    {variant === 'roadmap' && <VenturesRoadmap ventures={ventures}/>}
                    {variant === 'board' && <VenturesBoard ventures={ventures}/>}
                </section>
            ))}
        </Article>
    )
}

/* ---------- shared bits ---------- */

function StatusPill({live}) {
    return (
        <span className={`v-status ${live ? 'v-status-live' : 'v-status-soon'}`}>
            <span className={`v-status-dot`}/>{live ? 'Live' : 'Coming soon'}
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

function DomainAction({venture}) {
    if (venture.live) {
        return (
            <a className={`v-cta`} href={venture.href} target={`_blank`} rel={`noopener noreferrer`}>
                Visit {venture.domain || 'site'} <FaIcon iconName={`fa-solid fa-arrow-up-right-from-square`} className={`ms-2`}/>
            </a>
        )
    }
    return (
        <span className={`v-domain`} title={`Launching soon`}>
            <FaIcon iconName={`fa-solid fa-globe`} className={`me-2`}/>{venture.domain}
        </span>
    )
}

/* ---------- Design A: launch cards ---------- */

function VenturesCards({ventures}) {
    return (
        <div className={`v-cards`}>
            {ventures.map((v) => (
                <article key={v.id} className={`v-card`} style={{'--v-accent': v.accent}}>
                    <div className={`v-card-head`}>
                        <LogoDisc src={v.img} title={v.title} size={`lg`}/>
                        <StatusPill live={v.live}/>
                    </div>
                    <h3 className={`eq-h5 fw-bold mt-3 mb-2`}>{v.title}</h3>
                    <p className={`text-3 v-muted mb-3`}>{v.text}</p>
                    {v.highlights.length > 0 && (
                        <ul className={`v-checks`}>
                            {v.highlights.map((h) => (
                                <li key={h}><FaIcon iconName={`fa-solid fa-check`} className={`me-2 v-accent`}/>{h}</li>
                            ))}
                        </ul>
                    )}
                    <div className={`v-card-foot`}><DomainAction venture={v}/></div>
                </article>
            ))}
        </div>
    )
}

/* ---------- Design B: roadmap ---------- */

function VenturesRoadmap({ventures}) {
    return (
        <ol className={`v-roadmap`}>
            {ventures.map((v) => (
                <li key={v.id} className={`v-roadmap-item`} style={{'--v-accent': v.accent}}>
                    <div className={`v-roadmap-marker`}><LogoDisc src={v.img} title={v.title} size={`sm`}/></div>
                    <div className={`v-roadmap-body`}>
                        <div className={`v-roadmap-top`}>
                            <span className={`v-phase`}>{v.phase}</span>
                            <StatusPill live={v.live}/>
                        </div>
                        <h3 className={`eq-h5 fw-bold mt-2 mb-1`}>{v.title}</h3>
                        <p className={`text-3 v-muted mb-2`}>{v.text}</p>
                        {v.highlights.length > 0 && (
                            <div className={`v-chips`}>
                                {v.highlights.map((h) => <span key={h} className={`v-chip`}>{h}</span>)}
                            </div>
                        )}
                        <div className={`mt-3`}><DomainAction venture={v}/></div>
                    </div>
                </li>
            ))}
        </ol>
    )
}

/* ---------- Design C: deploy board ---------- */

function VenturesBoard({ventures}) {
    return (
        <div className={`v-board`}>
            <div className={`v-board-bar`}>
                <span className={`v-board-dots`} aria-hidden={true}><i/><i/><i/></span>
                <span className={`v-board-title`}>ventures.rajeev.pro · deployments</span>
                <span className={`v-board-env`}>env: roadmap</span>
            </div>
            <div className={`v-board-head`} aria-hidden={true}>
                <span>Service</span><span>Pipeline</span><span>Status</span>
            </div>
            {ventures.map((v) => {
                const current = Math.max(0, STAGES.findIndex((s) => s.id === v.stage))
                return (
                    <div key={v.id} className={`v-board-row`} style={{'--v-accent': v.accent}}>
                        <div className={`v-board-service`}>
                            <LogoDisc src={v.img} title={v.title} size={`sm`}/>
                            <div>
                                <div className={`fw-bold`}>{v.title}</div>
                                <div className={`v-mono v-muted`}>{v.domain}</div>
                            </div>
                        </div>
                        <ol className={`v-pipeline`} aria-label={`${v.title} pipeline`}>
                            {STAGES.map((s, i) => {
                                const state = v.live || i < current ? 'done' : i === current ? 'active' : 'todo'
                                return (
                                    <li key={s.id} className={`v-stage v-stage-${state}`}>
                                        <span className={`v-stage-dot`}>
                                            {state === 'done' && <FaIcon iconName={`fa-solid fa-check`}/>}
                                        </span>
                                        <span className={`v-stage-label`}>{s.label}</span>
                                    </li>
                                )
                            })}
                        </ol>
                        <div className={`v-board-status`}>
                            {v.live ? <DomainAction venture={v}/> : <StatusPill live={false}/>}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}

export default ArticleVentures
