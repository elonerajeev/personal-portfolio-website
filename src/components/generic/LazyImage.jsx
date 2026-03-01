import React, {useState, useEffect, useRef} from 'react'

function LazyImage({src, alt, className, style, onLoad}) {
    const [isLoaded, setIsLoaded] = useState(false)
    const [isInView, setIsInView] = useState(false)
    const imgRef = useRef(null)

    useEffect(() => {
        if(!imgRef.current) return

        const observer = new IntersectionObserver(
            ([entry]) => {
                if(entry.isIntersecting) {
                    setIsInView(true)
                    observer.disconnect()
                }
            },
            {rootMargin: '50px'}
        )

        observer.observe(imgRef.current)

        return () => observer.disconnect()
    }, [])

    const handleLoad = () => {
        setIsLoaded(true)
        onLoad?.()
    }

    return (
        <img
            ref={imgRef}
            src={isInView ? src : undefined}
            alt={alt}
            className={className}
            style={{
                ...style,
                opacity: isLoaded ? 1 : 0,
                transition: 'opacity 0.3s ease-in-out'
            }}
            onLoad={handleLoad}
            loading="lazy"
        />
    )
}

export default LazyImage
