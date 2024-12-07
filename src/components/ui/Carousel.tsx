import { useState, useCallback, useEffect } from 'react'
import { ImageArtifact } from '../../types/runs'

const Carousel = ({ images }: { images: ImageArtifact[] }) => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)

  const goToNext = useCallback(() => {
    if (!isAnimating) {
      setIsAnimating(true)
      setCurrentIndex((prevIndex) =>
        prevIndex === images.length - 1 ? 0 : prevIndex + 1
      )
    }
  }, [images.length, isAnimating])

  const goToPrevious = useCallback(() => {
    if (!isAnimating) {
      setIsAnimating(true)
      setCurrentIndex((prevIndex) =>
        prevIndex === 0 ? images.length - 1 : prevIndex - 1
      )
    }
  }, [images.length, isAnimating])

  useEffect(() => {
    // Reset animation flag after transition
    const timer = setTimeout(() => setIsAnimating(false), 300)
    return () => clearTimeout(timer)
  }, [currentIndex])

  return (
    <div className="relative w-full max-w-3xl mx-auto">
      <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
        {images.map((image, index) => (
          <div
            key={image.url}
            className={`absolute w-full h-full transition-transform duration-300 ease-in-out ${
              index === currentIndex
                ? 'translate-x-0'
                : index < currentIndex
                  ? '-translate-x-full'
                  : 'translate-x-full'
            }`}
          >
            <img
              src={image.url}
              alt={image.caption}
              className="w-full h-full object-contain"
            />
            <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white p-2 text-sm">
              {image.caption}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={goToPrevious}
        className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-2 rounded-full transition-colors"
        aria-label="Previous image"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
      </button>

      <button
        onClick={goToNext}
        className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-2 rounded-full transition-colors"
        aria-label="Next image"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </button>

      <div className="absolute bottom-12 left-0 right-0 flex justify-center gap-2">
        {images.map((_, index) => (
          <button
            key={index}
            onClick={() => !isAnimating && setCurrentIndex(index)}
            className={`w-2 h-2 rounded-full transition-colors ${
              index === currentIndex ? 'bg-white' : 'bg-white/50'
            }`}
            aria-label={`Go to image ${index + 1}`}
          />
        ))}
      </div>
    </div>
  )
}

export default Carousel
