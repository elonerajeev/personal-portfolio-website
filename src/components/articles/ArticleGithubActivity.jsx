import "./ArticleGithubActivity.scss"
import React, {useEffect, useState} from 'react'
import Article from "/src/components/wrappers/Article.jsx"
import FaIcon from "/src/components/generic/FaIcon.jsx"
import {useParser} from "/src/helpers/parser.js"
import {useUtils} from "/src/helpers/utils.js"

const utils = useUtils()

const LANGUAGE_COLORS = {
    JavaScript: '#f1e05a', TypeScript: '#3178c6', Python: '#3572A5', HTML: '#e34c26', CSS: '#563d7c',
    Shell: '#89e051', Java: '#b07219', Go: '#00ADD8', HCL: '#844FBA', Dockerfile: '#384d54',
}

const KIND = {
    merged: {icon: 'fa-solid fa-code-merge', verb: 'Merged'},
    opened: {icon: 'fa-solid fa-code-pull-request', verb: 'Opened'},
    push: {icon: 'fa-solid fa-arrow-up-from-bracket', verb: 'Pushed to'},
    created: {icon: 'fa-solid fa-folder-plus', verb: 'Created'},
    release: {icon: 'fa-solid fa-tag', verb: 'Released'},
}

/** "3 hours ago", "2 days ago", "Sep 26" */
function timeAgo(iso) {
    const then = new Date(iso)
    const seconds = Math.max(0, (Date.now() - then) / 1000)
    const steps = [[60, 'second'], [60, 'minute'], [24, 'hour'], [7, 'day']]
    let value = seconds
    for (const [size, unit] of steps) {
        if (value < size) {
            const n = Math.floor(value)
            return unit === 'second' ? 'just now' : `${n} ${unit}${n === 1 ? '' : 's'} ago`
        }
        value /= size
    }
    return then.toLocaleDateString('en', {month: 'short', day: 'numeric', year: then.getFullYear() === new Date().getFullYear() ? undefined : 'numeric'})
}

function ArticleGithubActivity({data}) {
    const parser = useParser()
    const parsedData = parser.parseArticleData(data)
    const [feed, setFeed] = useState(null)

    useEffect(() => {
        let cancelled = false
        fetch(utils.resolvePath('/data/github.json'))
            .then((r) => (r.ok ? r.json() : null))
            .then((json) => { if (!cancelled) setFeed(json) })
            .catch(() => { if (!cancelled) setFeed(null) })
        return () => { cancelled = true }
    }, [])

    if (!feed || !feed.ok || (!feed.activity?.length && !feed.repos?.length)) return null

    return (
        <Article className={`article-github`} title={parsedData.title}>
            <div className={`gh-card`}>
                <div className={`gh-col`}>
                    <h3 className={`eq-h6 gh-col-title`}>Latest activity</h3>
                    <ul className={`gh-activity`}>
                        {feed.activity.map((a, i) => {
                            const kind = KIND[a.kind] || KIND.push
                            return (
                                <li key={i} className={`gh-event gh-event-${a.kind}`}>
                                    <span className={`gh-event-icon`}><FaIcon iconName={kind.icon}/></span>
                                    <div className={`gh-event-body`}>
                                        <div className={`gh-event-text`}>
                                            {kind.verb}{' '}
                                            {a.title
                                                ? <a href={a.url} target={`_blank`} rel={`noopener noreferrer`}>{a.title}</a>
                                                : <a href={a.repoUrl} target={`_blank`} rel={`noopener noreferrer`}>{a.repo}</a>}
                                        </div>
                                        <div className={`gh-event-meta`}>
                                            {a.title
                                                ? <a href={a.repoUrl} target={`_blank`} rel={`noopener noreferrer`}>{a.repo}</a>
                                                : <span className={`gh-branch`}>{a.branch || 'main'}</span>}
                                            <span> · {timeAgo(a.at)}</span>
                                        </div>
                                    </div>
                                </li>
                            )
                        })}
                    </ul>
                </div>

                {feed.repos?.length > 0 && (
                    <div className={`gh-col gh-col-repos`}>
                        <h3 className={`eq-h6 gh-col-title`}>Recently updated</h3>
                        <ul className={`gh-repos`}>
                            {feed.repos.map((r) => (
                                <li key={r.name}>
                                    <a className={`gh-repo-name`} href={r.url} target={`_blank`} rel={`noopener noreferrer`}>
                                        <FaIcon iconName={`fa-solid fa-book-bookmark`} className={`me-2`}/>{r.name}
                                    </a>
                                    <div className={`gh-repo-meta`}>
                                        {r.language && (
                                            <span><i className={`gh-lang-dot`} style={{backgroundColor: LANGUAGE_COLORS[r.language] || '#8b949e'}}/>{r.language}</span>
                                        )}
                                        <span><FaIcon iconName={`fa-regular fa-star`} className={`me-1`}/>{r.stars}</span>
                                        <span>updated {timeAgo(r.pushedAt)}</span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>

            <div className={`gh-foot`}>
                Pulled from GitHub {timeAgo(feed.generatedAt)} ·{' '}
                <a href={feed.profileUrl} target={`_blank`} rel={`noopener noreferrer`}>See everything on GitHub <FaIcon iconName={`fa-solid fa-arrow-right`} className={`ms-1`}/></a>
            </div>
        </Article>
    )
}

export default ArticleGithubActivity
