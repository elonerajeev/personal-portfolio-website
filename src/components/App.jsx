import "/src/styles/app.scss"
import React, {lazy, Suspense} from 'react'
import {useData} from "/src/providers/DataProvider.jsx"
import Portfolio from "/src/components/Portfolio.jsx"
import {AnimatedCursor} from "/src/components/feedbacks/AnimatedCursor"
import ActivitySpinner from "/src/components/feedbacks/ActivitySpinner.jsx"
import Notifications from "/src/components/feedbacks/Notifications.jsx"
import {useFeedbacks} from "/src/providers/FeedbacksProvider.jsx"

const Resume = lazy(() => import("/src/components/Resume.jsx"))
const YoutubeModal = lazy(() => import("/src/components/modals/YoutubeModal.jsx"))
const GalleryModal = lazy(() => import("/src/components/modals/GalleryModal.jsx"))
const ConfirmationWindow = lazy(() => import("/src/components/modals/ConfirmationWindow.jsx"))

function App() {
    const {getSectionLoadingProgress, areAllSectionsLoaded} = useData()
    const loadingProgress = getSectionLoadingProgress()

    return (
        <div className={`app-wrapper`}>
            <AppFeedbacks/>
            <Portfolio/>
            <Suspense fallback={null}>
                <Resume/>
            </Suspense>

            {!areAllSectionsLoaded() && loadingProgress.total > 0 && (
                <BackgroundLoadingIndicator loaded={loadingProgress.loaded}
                                            total={loadingProgress.total}/>
            )}
        </div>
    )
}

function AppFeedbacks() {
    const {
        listSpinnerActivities,
        isAnimatedCursorEnabled,
        isAnimatedCursorActive,
        isModalOpen,
        displayingNotification,
        killNotification,
        displayingYoutubeVideo,
        hideYoutubeVideo,
        displayingGallery,
        hideGallery,
        pendingConfirmation,
        hideConfirmationDialog
    } = useFeedbacks()

    const spinnerActivities = listSpinnerActivities()
    const animatedCursorEnabled = isAnimatedCursorEnabled()
    const animatedCursorActive = isAnimatedCursorActive()
    const modalOpen = isModalOpen()

    return (
        <>
            {spinnerActivities && (
                <ActivitySpinner activities={spinnerActivities}/>
            )}

            {animatedCursorEnabled && (
                <AnimatedCursor enabled={animatedCursorEnabled}
                                active={animatedCursorActive}
                                modalOpen={modalOpen}/>
            )}

            {displayingNotification && (
                <Notifications displayingNotification={displayingNotification}
                               killNotification={killNotification}/>
            )}

            <Suspense fallback={null}>
                {displayingYoutubeVideo && (
                    <YoutubeModal displayingYoutubeVideo={displayingYoutubeVideo}
                                  hideYoutubeVideo={hideYoutubeVideo}/>
                )}

                {displayingGallery && (
                    <GalleryModal displayingGallery={displayingGallery}
                                  hideGallery={hideGallery}/>
                )}

                {pendingConfirmation && (
                    <ConfirmationWindow pendingConfirmation={pendingConfirmation}
                                        hideConfirmationDialog={hideConfirmationDialog}/>
                )}
            </Suspense>
        </>
    )
}

function BackgroundLoadingIndicator({loaded, total}) {
    return (
        <div style={{
            position: 'fixed',
            right: '10px',
            bottom: '70px',
            zIndex: 500,
            padding: '6px 10px',
            borderRadius: '999px',
            fontSize: '12px',
            fontWeight: 700,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            color: 'var(--theme-highlight)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            backdropFilter: 'blur(4px)'
        }}>
            Loading sections {loaded}/{total}
        </div>
    )
}

export default App
