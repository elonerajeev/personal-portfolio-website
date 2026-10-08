import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import {DataProvider} from "/src/providers/DataProvider"
import {LanguageProvider} from "/src/providers/LanguageProvider"
import {ThemeProvider} from "/src/providers/ThemeProvider"
import {GlobalStateProvider} from "/src/providers/GlobalStateProvider"
import {FeedbacksProvider} from "/src/providers/FeedbacksProvider"
import {WindowProvider} from "/src/providers/WindowProvider"
import App from "/src/components/App.jsx"
import Preloader from "/src/components/Preloader.jsx"
import ErrorBoundary from "/src/components/ErrorBoundary.jsx"

const AppProviders = ({ children }) => (
    <ErrorBoundary>
        <DataProvider>
            <LanguageProvider>
                <FeedbacksProvider>
                    <WindowProvider>
                        <ThemeProvider>
                            <GlobalStateProvider>
                                {children}
                            </GlobalStateProvider>
                        </ThemeProvider>
                    </WindowProvider>
                </FeedbacksProvider>
            </LanguageProvider>
        </DataProvider>
    </ErrorBoundary>
)

// After a new deploy, an already-open tab can request code chunks that no longer exist.
// Reload once to pick up the new version instead of showing the error screen.
window.addEventListener('vite:preloadError', (event) => {
    const key = 'chunk-reload-at'
    let last = 0
    try { last = Number(sessionStorage.getItem(key)) || 0 } catch { /* storage unavailable */ }
    if (Date.now() - last < 10000)
        return // already reloaded just now; let the error boundary handle it
    event.preventDefault()
    try { sessionStorage.setItem(key, String(Date.now())) } catch { /* storage unavailable */ }
    window.location.reload()
})

let container = null

document.addEventListener('DOMContentLoaded', function(event) {
    if(container)
        return

    container = document.getElementById('root')
    createRoot(document.getElementById('root')).render(
        <StrictMode>
            <Preloader>
                <AppProviders>
                    <App/>
                </AppProviders>
            </Preloader>
        </StrictMode>
    )
})
