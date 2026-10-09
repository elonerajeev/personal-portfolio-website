import "./ArticleTerminal.scss"
import React, {useEffect, useRef, useState} from 'react'
import {createPortal} from 'react-dom'
import FaIcon from "/src/components/generic/FaIcon.jsx"
import {useData} from "/src/providers/DataProvider.jsx"
import {useGlobalState} from "/src/providers/GlobalStateProvider.jsx"
import {buildModel, runCommand, complete, MAX_INPUT} from "/src/helpers/terx.js"

const MAX_LINES = 400
const QUICK_COMMANDS = ['help', 'neofetch', 'experience', 'projects', 'ventures', 'resume', 'kubectl get pods', 'contact']

const BOOT = [
    [{text: '[  OK  ] ', tone: 'ok'}, {text: 'Mounted /root/portfolio (read-only)'}],
    [{text: '[  OK  ] ', tone: 'ok'}, {text: 'Started kubelet, docker and terraform services'}],
    [{text: '[  OK  ] ', tone: 'ok'}, {text: 'Reached target TerX shell'}],
    [{text: ''}],
    [{text: 'Welcome to ', tone: 'muted'}, {text: 'TerX', tone: 'accent'}, {text: ". Type 'help' to see what you can explore, or tap a command below.", tone: 'muted'}],
    [{text: ''}],
]

const prefersReducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

function ArticleTerminal() {
    const {getSettings, getSections} = useData()
    const {setActiveSection} = useGlobalState()

    const [lines, setLines] = useState([])
    const [input, setInput] = useState('')
    const [cwd, setCwd] = useState(null)
    const [history, setHistory] = useState([])
    const [historyIndex, setHistoryIndex] = useState(-1)
    const [booted, setBooted] = useState(false)
    const [fullscreen, setFullscreen] = useState(false)

    const outputRef = useRef(null)
    const inputRef = useRef(null)

    /* Boot sequence (instant when the user prefers reduced motion). */
    useEffect(() => {
        const resumeHref = buildModel(getSettings(), getSections()).resumeHref
        const boot = resumeHref ? [...BOOT.slice(0, -1), [
            {text: '📄 Resume: ', tone: 'info'},
            {text: 'download PDF', tone: 'accent', href: resumeHref, download: resumeHref.split('/').pop()},
            {text: "  · or type 'resume' · ⛶ fullscreen in the title bar", tone: 'muted'},
        ], [{text: ''}]] : BOOT

        if (prefersReducedMotion()) {
            setLines(boot)
            setBooted(true)
            return
        }
        const timers = boot.map((l, i) => setTimeout(() => {
            setLines((prev) => [...prev, l])
            if (i === boot.length - 1) setBooted(true)
        }, 120 * (i + 1)))
        return () => timers.forEach(clearTimeout)
    }, [])

    /* The page uses smooth-scrollbar, which captures wheel/touch on its container (outside React's
       root listener). Stop them natively here so the terminal scrolls on its own. */
    useEffect(() => {
        const el = outputRef.current
        if (!el) return
        const stop = (e) => e.stopPropagation()
        el.addEventListener('wheel', stop, {passive: true})
        el.addEventListener('touchmove', stop, {passive: true})
        return () => {
            el.removeEventListener('wheel', stop)
            el.removeEventListener('touchmove', stop)
        }
    }, [fullscreen])

    /* Fullscreen: Esc exits, page behind doesn't scroll, focus stays in the terminal. */
    useEffect(() => {
        if (!fullscreen) return
        const onKey = (e) => { if (e.key === 'Escape') setFullscreen(false) }
        const previousOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        window.addEventListener('keydown', onKey)
        return () => {
            document.body.style.overflow = previousOverflow
            window.removeEventListener('keydown', onKey)
        }
    }, [fullscreen])

    useEffect(() => {
        if (booted) inputRef.current?.focus({preventScroll: true})
        const el = outputRef.current
        if (el) el.scrollTop = el.scrollHeight
    }, [fullscreen])

    /* Keep the newest output in view. */
    useEffect(() => {
        const el = outputRef.current
        if (el) el.scrollTop = el.scrollHeight
    }, [lines])

    const promptPath = cwd ? `~/${cwd}` : '~'

    const execute = (raw) => {
        const command = String(raw).slice(0, MAX_INPUT)
        const echo = {prompt: true, path: promptPath, command}
        const nextHistory = command.trim() ? [...history, command.trim()].slice(-100) : history
        // Built per command (cheap) so it always reflects sections that finished loading in the background.
        const model = buildModel(getSettings(), getSections())
        const result = runCommand(command, {cwd, history: nextHistory, model})

        setHistory(nextHistory)
        setHistoryIndex(-1)
        setCwd(result.cwd)
        setInput('')

        if (result.clear) {
            setLines([])
        } else {
            setLines((prev) => [...prev, echo, ...result.output, [{text: ''}]].slice(-MAX_LINES))
        }

        if (result.fullscreen !== undefined) {
            setFullscreen((f) => result.fullscreen === 'toggle' ? !f : result.fullscreen)
        }

        if (result.navigate) {
            setFullscreen(false)
            setTimeout(() => setActiveSection(result.navigate), 400)
        }
    }

    const onKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            execute(input)
        }
        else if (e.key === 'Tab') {
            e.preventDefault()
            const res = complete(input)
            if (res.value) setInput(res.value)
            if (res.candidates?.length > 1) {
                setLines((prev) => [...prev, {prompt: true, path: promptPath, command: input},
                    [{text: res.candidates.join('   '), tone: 'info'}]].slice(-MAX_LINES))
            }
        }
        else if (e.key === 'ArrowUp') {
            e.preventDefault()
            if (!history.length) return
            const i = historyIndex < 0 ? history.length - 1 : Math.max(0, historyIndex - 1)
            setHistoryIndex(i)
            setInput(history[i])
        }
        else if (e.key === 'ArrowDown') {
            e.preventDefault()
            if (historyIndex < 0) return
            const i = historyIndex + 1
            if (i >= history.length) {
                setHistoryIndex(-1)
                setInput('')
            } else {
                setHistoryIndex(i)
                setInput(history[i])
            }
        }
        else if (e.ctrlKey && e.key.toLowerCase() === 'l') {
            e.preventDefault()
            setLines([])
        }
        else if (e.ctrlKey && e.key.toLowerCase() === 'c') {
            e.preventDefault()
            setLines((prev) => [...prev, {prompt: true, path: promptPath, command: input + '^C'}].slice(-MAX_LINES))
            setInput('')
        }
    }

    const focusInput = () => {
        // Don't steal focus when the visitor is selecting text to copy.
        if (window.getSelection?.().toString()) return
        inputRef.current?.focus({preventScroll: true})
    }

    const terminalWindow = (
            <div className={`terx-window ${fullscreen ? 'terx-window-fullscreen' : ''}`}
                 onClick={focusInput}
                 role={fullscreen ? 'dialog' : undefined}
                 aria-modal={fullscreen ? true : undefined}
                 aria-label={fullscreen ? 'TerX terminal (fullscreen)' : undefined}>
                <div className={`terx-titlebar`}>
                    <span className={`terx-dots`} aria-hidden={true}>
                        <span className={`terx-dot terx-dot-red`}/>
                        <span className={`terx-dot terx-dot-yellow`}/>
                        <span className={`terx-dot terx-dot-green`}/>
                    </span>
                    <span className={`terx-title`} aria-hidden={true}>root@rajeev: {promptPath}</span>
                    <button type={`button`}
                            className={`terx-fs-btn`}
                            onClick={(e) => { e.stopPropagation(); setFullscreen((f) => !f) }}
                            aria-label={fullscreen ? 'Exit fullscreen (Esc)' : 'Open terminal fullscreen'}
                            title={fullscreen ? 'Exit fullscreen (Esc)' : 'Fullscreen'}>
                        <FaIcon iconName={fullscreen ? 'fa-solid fa-compress' : 'fa-solid fa-expand'}/>
                    </button>
                </div>

                <div className={`terx-output`}
                     ref={outputRef}
                     role={`log`}
                     aria-live={`polite`}
                     aria-label={`Terminal output`}
                     tabIndex={0}>
                    {lines.map((l, i) => (
                        <TerminalLine key={i} line={l}/>
                    ))}

                    {booted && (
                        <div className={`terx-input-row`}>
                            <Prompt path={promptPath}/>
                            <div className={`terx-input-line`}>
                                <span className={`terx-frame`}>└─</span><span className={`terx-hash`}>#</span>
                                <input ref={inputRef}
                                       className={`terx-input`}
                                       value={input}
                                       maxLength={MAX_INPUT}
                                       onChange={(e) => setInput(e.target.value)}
                                       onKeyDown={onKeyDown}
                                       spellCheck={false}
                                       autoCapitalize={`off`}
                                       autoComplete={`off`}
                                       autoCorrect={`off`}
                                       aria-label={`Type a command, for example help`}
                                       placeholder={history.length ? '' : "type 'help' and press Enter"}/>
                            </div>
                        </div>
                    )}
                </div>
            </div>
    )

    return (
        <article className={`article-terminal w-100`}>
            {fullscreen
                ? createPortal(<div className={`article-terminal terx-fs-backdrop`}>{terminalWindow}</div>, document.body)
                : terminalWindow}

            <div className={`terx-quick`} role={`group`} aria-label={`Quick commands`}>
                {QUICK_COMMANDS.map((c) => (
                    <button key={c} type={`button`} className={`terx-chip`} onClick={() => execute(c)} disabled={!booted}>
                        {c}
                    </button>
                ))}
            </div>
        </article>
    )
}

function Prompt({path}) {
    return (
        <div className={`terx-prompt`}>
            <span className={`terx-frame`}>┌──(</span>
            <span className={`terx-user`}>root㉿rajeev</span>
            <span className={`terx-frame`}>)-[</span>
            <span className={`terx-path`}>{path}</span>
            <span className={`terx-frame`}>]</span>
        </div>
    )
}

function TerminalLine({line}) {
    if (line.prompt) {
        return (
            <div className={`terx-echo`}>
                <Prompt path={line.path}/>
                <div><span className={`terx-frame`}>└─</span><span className={`terx-hash`}>#</span> <span className={`terx-cmd`}>{line.command}</span></div>
            </div>
        )
    }

    return (
        <div className={`terx-line`}>
            {line.map((seg, i) => seg.href ? (
                <a key={i}
                   className={`terx-tone-${seg.tone || 'accent'} terx-link`}
                   href={seg.href}
                   download={seg.download || undefined}
                   target={seg.download || seg.href.startsWith('mailto:') ? undefined : '_blank'}
                   rel={`noopener noreferrer`}>{seg.text}</a>
            ) : (
                <span key={i} className={seg.tone ? `terx-tone-${seg.tone}` : undefined}>{seg.text}</span>
            ))}
            {line.length === 1 && line[0].text === '' && ' '}
        </div>
    )
}

export default ArticleTerminal
