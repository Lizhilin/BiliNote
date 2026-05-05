// components/LazyImage.tsx
import { useInView } from 'react-intersection-observer'
import { FC, useState } from 'react'
import clsx from 'clsx'

interface LazyImageProps {
    src: string
    alt?: string
    className?: string
    placeholder?: string
    fallbackSrc?: string
}

const LazyImage: FC<LazyImageProps> = ({ src, alt, className, placeholder = '.src/assets/placeholder.png', fallbackSrc }) => {
    const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 })
    const [loaded, setLoaded] = useState(false)
    const [currentSrc, setCurrentSrc] = useState(src)

    const handleError = () => {
        if (fallbackSrc && currentSrc !== fallbackSrc) {
            setCurrentSrc(fallbackSrc)
        }
    }

    return (
        <div ref={ref} className={clsx('overflow-hidden', className)}>
            {inView ? (
                <img
                    src={currentSrc}
                    alt={alt}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    onLoad={() => setLoaded(true)}
                    onError={handleError}
                    className={clsx('transition-opacity duration-300', loaded ? 'opacity-100' : 'opacity-0') +  ' h-10 w-14  rounded-md object-cover'}
                />
            ) : (
                <img src={placeholder} alt="loading" className="opacity-30" />
            )}
        </div>
    )
}

export default LazyImage
