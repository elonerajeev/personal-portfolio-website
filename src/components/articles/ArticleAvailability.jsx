import "./ArticleAvailability.scss"
import React, {useEffect, useState} from 'react'
import FaIcon from "/src/components/generic/FaIcon.jsx"
import {useData} from "/src/providers/DataProvider.jsx"
import {useLanguage} from "/src/providers/LanguageProvider.jsx"

const TIME_ZONE = 'Asia/Kolkata'

const timeIn = (date) => new Intl.DateTimeFormat('en-US', {timeZone: TIME_ZONE, hour: 'numeric', minute: '2-digit', hour12: true}).format(date)
const hourIn = (date) => Number(new Intl.DateTimeFormat('en-GB', {timeZone: TIME_ZONE, hour: '2-digit', hour12: false}).format(date))

/** Availability, my local time (live) and how fast I usually reply. */
function ArticleAvailability({data}) {
    const {getSettings} = useData()
    const {getTranslation} = useLanguage()
    const [now, setNow] = useState(() => new Date())

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 30 * 1000)
        return () => clearInterval(timer)
    }, [])

    const status = getSettings()?.status
    const open = status?.available
    const statusText = getTranslation(status?.locales, 'message', true)
    const replyNote = getTranslation(data.locales, 'reply_note', true)
    const hour = hourIn(now)
    const awake = hour >= 9 && hour < 23

    return (
        <article className={`article-availability w-100`}>
            <div className={`availability-strip`}>
                {statusText && (
                    <div className={`availability-item`}>
                        <span className={`live-dot ${open ? '' : 'availability-dot-off'}`} aria-hidden={true}/>
                        <span>{statusText}</span>
                    </div>
                )}
                <div className={`availability-item`}>
                    <FaIcon iconName={awake ? 'fa-solid fa-sun' : 'fa-solid fa-moon'} className={`availability-icon`}/>
                    <span>
                        It's <strong><time dateTime={now.toISOString()}>{timeIn(now)}</time></strong> in India
                        <span className={`availability-muted`}> (IST)</span>
                    </span>
                </div>
                {replyNote && (
                    <div className={`availability-item`}>
                        <FaIcon iconName={`fa-solid fa-reply`} className={`availability-icon`}/>
                        <span>{replyNote}</span>
                    </div>
                )}
            </div>
        </article>
    )
}

export default ArticleAvailability
