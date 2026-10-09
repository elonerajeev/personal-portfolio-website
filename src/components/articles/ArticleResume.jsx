import "./ArticleResume.scss"
import React from "react"
import Article from "/src/components/wrappers/Article.jsx"
import FaIcon from "/src/components/generic/FaIcon.jsx"
import {useParser} from "/src/helpers/parser.js"

/** Compact resume card: View (opens the PDF) and Download. */
function ArticleResume({ data }) {
    const parser = useParser()
    const parsedData = parser.parseArticleData(data)
    const item = parser.parseArticleItems(parsedData.items)[0]
    const href = item?.firstLink?.href
    if (!href) return null

    const fileName = href.split('/').pop()

    return (
        <Article className={`article-resume`} title={parsedData.title}>
            <div className={`resume-card`}>
                <div className={`resume-card-icon`} aria-hidden={true}>
                    <FaIcon iconName={`fa-solid fa-file-pdf`}/>
                </div>

                <div className={`resume-card-body`}>
                    <h3 className={`eq-h6 fw-bold mb-1`}>{item.title}</h3>
                    {item.text && <p className={`text-3 text-muted mb-0`} dangerouslySetInnerHTML={{__html: item.text}}/>}
                </div>

                <div className={`resume-card-actions`}>
                    <a className={`btn btn-sm resume-btn resume-btn-outline`} href={href} target={`_blank`} rel={`noopener noreferrer`}>
                        <FaIcon iconName={`fa-solid fa-eye`} className={`me-2`}/>View
                    </a>
                    <a className={`btn btn-sm resume-btn resume-btn-primary`} href={href} download={fileName}>
                        <FaIcon iconName={`fa-solid fa-download`} className={`me-2`}/>Download
                    </a>
                </div>
            </div>
        </Article>
    )
}

export default ArticleResume
