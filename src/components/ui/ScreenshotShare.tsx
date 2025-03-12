import { useEffect, useRef, useState } from 'react'
import { Copy, Download, Loader2, X } from 'lucide-react'
import html2canvas from 'html2canvas'

interface ScreenshotShareProps {
  isOpen: boolean
  onClose: () => void
  modelName: string
  prompt: string
  modelViewerRef: React.RefObject<HTMLDivElement>
  viewerLabel: 'A' | 'B'
  modelPath: string
}

const ScreenshotShare = ({
  isOpen,
  onClose,
  modelName,
  modelViewerRef,
}: ScreenshotShareProps) => {
  const [screenshot, setScreenshot] = useState<string | null>(null)
  const [isCapturing, setIsCapturing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const screenshotRef = useRef<HTMLDivElement>(null)

  const captureScreenshot = async () => {
    if (!modelViewerRef.current) return
    setIsCapturing(true)
    setError(null)

    try {
      // Find all UI elements and temporarily hide them
      const uiElements = modelViewerRef.current.querySelectorAll('.ui-overlay, button, .absolute')
      uiElements.forEach(el => {
        if (el instanceof HTMLElement) {
          el.style.visibility = 'hidden'
        }
      })

      // Wait a frame to ensure UI is hidden
      await new Promise(requestAnimationFrame)

      const canvas = await html2canvas(modelViewerRef.current, {
        useCORS: true,
        backgroundColor: null,
        scale: 2, // Higher quality
        ignoreElements: (element) => {
          // Ignore any remaining UI elements that might not have been hidden
          return element.classList.contains('ui-overlay') ||
            element.tagName.toLowerCase() === 'button' ||
            element.classList.contains('absolute')
        }
      })

      // Restore UI elements
      uiElements.forEach(el => {
        if (el instanceof HTMLElement) {
          el.style.visibility = ''
        }
      })

      const dataUrl = canvas.toDataURL('image/png')
      setScreenshot(dataUrl)
    } catch (err) {
      setError('Failed to capture screenshot')
      console.error('Screenshot error:', err)
    } finally {
      setIsCapturing(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      captureScreenshot()
    }
  }, [isOpen])

  const handleDownload = () => {
    if (!screenshot) return

    const link = document.createElement('a')
    link.href = screenshot
    link.download = `mcbench-${modelName.toLowerCase().replace(/\s+/g, '-')}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleCopyToClipboard = async () => {
    if (!screenshot) return

    try {
      const response = await fetch(screenshot)
      const blob = await response.blob()
      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob,
        }),
      ])
    } catch (err) {
      console.error('Failed to copy to clipboard:', err)
      setError('Failed to copy to clipboard')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 backdrop-blur-sm bg-black/30 bg-opacity-75" onClick={onClose}></div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg z-10 max-w-2xl w-full mx-4 shadow-xl border border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold dark:text-white">Share Screenshot</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          {isCapturing ? (
            <div className="flex items-center justify-center h-[400px]">
              <Loader2 className="h-8 w-8 animate-spin text-gray-600 dark:text-gray-300" />
            </div>
          ) : error ? (
            <div className="text-red-500 text-center p-4">{error}</div>
          ) : screenshot ? (
            <div ref={screenshotRef} className="space-y-4">
              <img
                src={screenshot}
                alt="Screenshot"
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700"
              />

              <div className="flex flex-wrap gap-2 justify-center">
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  <Download className="h-4 w-4" />
                  Download
                </button>

                <button
                  onClick={handleCopyToClipboard}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                >
                  <Copy className="h-4 w-4" />
                  Copy to Clipboard
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default ScreenshotShare
