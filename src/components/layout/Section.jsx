import "./Section.scss"
import React, {lazy, Suspense, useEffect, useState} from 'react'
import {useGlobalState} from "/src/providers/GlobalStateProvider.jsx"
import Box from "/src/components/wrappers/Box.jsx"
import BorderWrap from "/src/components/wrappers/BorderWrap.jsx"
import Scrollable from "/src/components/capabilities/Scrollable.jsx"
import {useLanguage} from "/src/providers/LanguageProvider.jsx"
import {useUtils} from "/src/helpers/utils.js"

import FullScreenToggleButton from "/src/components/widgets/FullScreenToggleButton"
import {useData} from "/src/providers/DataProvider.jsx"
import FaIcon from "/src/components/generic/FaIcon.jsx"
import {useWindow} from "/src/providers/WindowProvider.jsx"
import {useScheduler} from "/src/helpers/scheduler.js"
import {SkeletonText, SkeletonCard} from "/src/components/generic/Skeleton.jsx"
import {getSectionFallbackLabel} from "/src/helpers/sectionLabels.js"

const TransitionClasses = {
    HIDDEN: 'section-transition-hidden',
    HIDING: 'section-transition-hiding',
    SHOWING: 'section-transition-showing',
    SHOWN: 'section-transition-shown',
    FORCE_SHOW: 'section-transition-show-without-transition'
}

const ARTICLES = {
    ArticleCards: lazy(() => import("/src/components/articles/ArticleCards.jsx")),
    ArticleContactForm: lazy(() => import("/src/components/articles/ArticleContactForm.jsx")),
    ArticleGrid: lazy(() => import("/src/components/articles/ArticleGrid.jsx")),
    ArticleInfoBlock: lazy(() => import("/src/components/articles/ArticleInfoBlock.jsx")),
    ArticleList: lazy(() => import("/src/components/articles/ArticleList.jsx")),
    ArticlePortfolio: lazy(() => import("/src/components/articles/ArticlePortfolio.jsx")),
    ArticleResume: lazy(() => import("/src/components/articles/ArticleResume.jsx")),
    ArticleServices: lazy(() => import("/src/components/articles/ArticleServices.jsx")),
    ArticleTestimonials: lazy(() => import("/src/components/articles/ArticleTestimonials.jsx")),
    ArticleThread: lazy(() => import("/src/components/articles/ArticleThread.jsx")),
    ArticleTimeline: lazy(() => import("/src/components/articles/ArticleTimeline.jsx"))
}

const utils = useUtils()
const scheduler = useScheduler()

function Section({ section }) {
    const {getSettings} = useData()
    const {isSectionActive, didRenderFirstSection, setDidRenderFirstSection} = useGlobalState()
    const {isBreakpoint, isMobileLayout, focusMainView} = useWindow()
    const [transitionClass, setTransitionClass] = useState(TransitionClasses.HIDDEN)

    const settings = getSettings()
    const scrollableEnabled = !isMobileLayout() && !utils.isTouchDevice()
    const articles = section.content && section.content["articles"] ?
        section.content["articles"] :
        []

    useEffect(() => {
        const isActive = isSectionActive(section.id)
        if(isActive) {
            _showSection()
        }
        else {
            _hideSection()
        }
    }, [isSectionActive(section.id)])

    const _showSection = () => {
        if(transitionClass === TransitionClasses.SHOWN)
            return

        if(didRenderFirstSection) {
            setTransitionClass(TransitionClasses.SHOWING)
            scheduler.clearAllWithTag('section-' + section.id)
            _changeStateAfterTimeout(TransitionClasses.SHOWN, 30)
        }
        else {
            setDidRenderFirstSection(true)
            setTransitionClass(TransitionClasses.SHOWN)
        }
    }

    const _hideSection = () => {
        if(transitionClass === TransitionClasses.HIDDEN)
            return

        setTransitionClass(TransitionClasses.FORCE_SHOW)
        scheduler.clearAllWithTag('section-' + section.id)
        _changeStateAfterTimeout(TransitionClasses.HIDING, 30)
        _changeStateAfterTimeout(TransitionClasses.HIDDEN, 1000)
    }

    const _changeStateAfterTimeout = (state, timeInMilliseconds) => {
        scheduler.schedule(() => {
            setTransitionClass(state)
        }, timeInMilliseconds, 'section-' + section.id)
    }

    return (
        <>
            {transitionClass !== TransitionClasses.HIDDEN && (
                <Box className={`lead-section ${transitionClass}`} opaque={true} id={`lead-section-${section.id}`}>

                    <div className={`lead-section-content`}>
                        {settings['fullScreenButtonEnabled'] && !utils.isIOS() && !isMobileLayout() && !utils.isSafari() && (
                            <div className={`full-screen-toggle-wrapper ${isBreakpoint('lg') ? 'full-screen-toggle-wrapper-top-right' : 'full-screen-toggle-wrapper-top-left'}`}>
                                <FullScreenToggleButton enabled={true}
                                                        className={`fullscreen-toggle`}/>
                            </div>)
                        }

                        <Scrollable id={`scrollable-${section.id}`}
                                    scrollActive={transitionClass === TransitionClasses.SHOWN}
                                    scrollEnabled={transitionClass !== TransitionClasses.HIDDEN && scrollableEnabled}>
                            <BorderWrap>
                                <section className={`w-100`}>
                                    <SectionHeader section={section}/>
                                    <SectionContent section={section} articles={articles}/>
                                </section>
                            </BorderWrap>
                        </Scrollable>
                    </div>
                </Box>
            )}
        </>
    )
}

function SectionHeader({section}) {
    const {getTranslation} = useLanguage()
    const {isBreakpoint} = useWindow()
    const sectionLocales = section.content?.locales

    if(!sectionLocales) {
        return (
            <div className={`section-header w-100 px-0 px-md-3 text-center mt-1 mt-sm-2 mt-lg-4`}>
                <h3 className={`fw-bold ${isBreakpoint('lg') ? 'lead-4' : ''} mx-4 mb-0`}>
                    <span className={`text-highlight`}>{getSectionFallbackLabel(section.id)}</span>
                </h3>
            </div>
        )
    }

    let title = utils.parseJsonText(getTranslation(sectionLocales, "title_long"))
    let prefix = utils.parseJsonText(getTranslation(sectionLocales, "title_long_prefix", true))
    if(!isBreakpoint("lg")) {
        title = getTranslation(sectionLocales, "title")
        title = `<span class="text-highlight">${title}</span>`
        prefix = null
    }

    return (
        <div className={`section-header w-100 px-0 px-md-3 text-center ${prefix ? `mt-0` : `mt-1 mt-sm-2 mt-lg-4`}`}>
            {prefix && (
                <div className={`fw-bold text-muted lead-2 font-family-headings mb-2`}>
                    <FaIcon className={`me-2 opacity-50`} iconName={'fa-solid fa-cubes'}/>
                    <span dangerouslySetInnerHTML={{__html:prefix || ``}}/>
                </div>
            )}

            <h3 className={`fw-bold ${isBreakpoint('lg') ? 'lead-4' : ''} mx-4 mb-0`}
                dangerouslySetInnerHTML={{__html: title}}/>
        </div>
    )
}

function SectionContent({section, articles}) {
    const shouldAddSpacerAfterTitle = false
    const isPendingSectionContent = !section.content

    if(isPendingSectionContent) {
        return (
            <div className={`section-content ${shouldAddSpacerAfterTitle ? 'mt-md-5' : ''}`}>
                <SectionLoadingSkeleton/>
            </div>
        )
    }

    return (
        <div className={`section-content ${shouldAddSpacerAfterTitle ? 'mt-md-5' : ''}`}>
            {articles.map((article, key) => {
                const Component = ARTICLES[article.component]
                let mtClass = `mt-4 pt-1 pt-md-3`
                if(article.config?.ignorePaddingTop)
                    mtClass = `mt-4`

                return (
                    <div className={`article-wrapper ${mtClass}`} key={key}>
                        {Component && (
                            <Suspense fallback={<ArticleLoadingSkeleton/>}>
                                <Component data={article}/>
                            </Suspense>
                        )}

                        {!Component && (
                            <div className={`alert alert-danger text-3`}>
                                Component <strong>{article.component}</strong> not found! Make sure the component exists and is listed on the <i>ARTICLES</i> dictionary on <b>Section.jsx</b>.
                            </div>
                        )}
                    </div>
                )
            })}
        </div>
    )
}

function SectionLoadingSkeleton() {
    return (
        <div className={`mx-2 mx-md-3 mt-4`}>
            <SkeletonText lines={3}/>
            <div className={`mt-3`} style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '12px'
            }}>
                <SkeletonCard/>
                <SkeletonCard/>
            </div>
        </div>
    )
}

function ArticleLoadingSkeleton() {
    return (
        <div className={`mx-2 mx-md-3`}>
            <SkeletonText lines={2}/>
            <div className={`mt-2`}>
                <SkeletonCard/>
            </div>
        </div>
    )
}

export default Section
