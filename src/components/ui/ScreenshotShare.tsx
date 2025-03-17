import { useEffect, useRef, useState } from 'react'

import html2canvas from 'html2canvas'
import Konva from 'konva'
import { Copy, Download, Loader2, X } from 'lucide-react'

interface ScreenshotShareProps {
  isOpen: boolean
  onClose: () => void
  modelName: string
  prompt: string
  modelViewerRef: React.RefObject<HTMLDivElement>
  alertMessage?: string
}

const ScreenshotShare = ({
  isOpen,
  onClose,
  modelName,
  prompt,
  modelViewerRef,
  alertMessage,
}: ScreenshotShareProps) => {
  const [screenshot, setScreenshot] = useState<string | null>(null)
  const [isCapturing, setIsCapturing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const screenshotRef = useRef<HTMLDivElement>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Check if we're in fullscreen mode
  useEffect(() => {
    const checkFullscreen = () => {
      const isInFullscreen = !!document.fullscreenElement
      setIsFullscreen(isInFullscreen)

      // If we're in fullscreen and the modal is open, we need to make sure the modal appears
      // above the fullscreen element by exiting fullscreen first
      if (isInFullscreen && isOpen) {
        // Exit fullscreen to show the modal properly
        document.exitFullscreen().catch((err) => {
          console.error('Error exiting fullscreen:', err)
        })
      }
    }

    // Initial check
    checkFullscreen()

    // Add listener for fullscreen changes
    document.addEventListener('fullscreenchange', checkFullscreen)

    return () => {
      document.removeEventListener('fullscreenchange', checkFullscreen)
    }
  }, [isOpen])

  const captureScreenshot = async () => {
    if (!modelViewerRef.current) return
    setIsCapturing(true)
    setError(null)

    try {
      const wasInFullscreen = !!document.fullscreenElement
      let targetElement: HTMLElement = modelViewerRef.current

      if (wasInFullscreen) {
        targetElement = document.fullscreenElement as HTMLElement
      }

      // Find all UI elements and temporarily hide them
      const uiElements = targetElement.querySelectorAll(
        '.ui-overlay, button, .absolute'
      )
      uiElements.forEach((el) => {
        if (el instanceof HTMLElement) {
          el.style.visibility = 'hidden'
        }
      })

      // Create a container for Konva
      const watermarkContainer = document.createElement('div')
      watermarkContainer.style.position = 'absolute'
      watermarkContainer.style.top = '0'
      watermarkContainer.style.left = '0'
      watermarkContainer.style.width = '100%'
      watermarkContainer.style.height = '100%'
      watermarkContainer.style.pointerEvents = 'none'
      targetElement.appendChild(watermarkContainer)

      // Create Konva stage for watermarks
      const watermarkStage = new Konva.Stage({
        container: watermarkContainer,
        width: targetElement.offsetWidth,
        height: targetElement.offsetHeight,
      })

      const layer = new Konva.Layer()

      // Truncate prompt if too long
      const maxPromptLength = 250
      const truncatedPrompt =
        prompt.length > maxPromptLength
          ? prompt.substring(0, maxPromptLength) + '...'
          : prompt

      // Left watermark (prompt and model)
      const promptText = new Konva.Text({
        x: 8,
        y: targetElement.offsetHeight - 40,
        text: truncatedPrompt,
        fontSize: 10,
        fontFamily: 'sans-serif',
        fill: 'rgba(255, 255, 255, 0.8)',
        shadowColor: 'black',
        shadowBlur: 2,
        shadowOffset: { x: 1, y: 1 },
        shadowOpacity: 0.5,
        width: 200,
        lineHeight: 1.2,
      })

      // Adjust prompt y-position based on its height
      const promptHeight = promptText.height()
      promptText.y(targetElement.offsetHeight - (promptHeight + 25)) // 25px buffer from model text

      const modelText = new Konva.Text({
        x: 8,
        y: targetElement.offsetHeight - 20,
        text: modelName,
        fontSize: 11,
        fontFamily: 'sans-serif',
        fill: 'rgba(255, 255, 255, 0.8)',
        shadowColor: 'black',
        shadowBlur: 2,
        shadowOffset: { x: 1, y: 1 },
        shadowOpacity: 0.5,
      })

      // Right watermark (website)
      const websiteText = new Konva.Text({
        x: targetElement.offsetWidth - 70,
        y: targetElement.offsetHeight - 20,
        text: 'mcbench.ai',
        fontSize: 12,
        fontFamily: 'sans-serif',
        fill: 'rgba(255, 255, 255, 0.8)',
        shadowColor: 'black',
        shadowBlur: 2,
        shadowOffset: { x: 1, y: 1 },
        shadowOpacity: 0.5,
      })

      // Add alert message if provided (e.g. for EXPERIMENTAL samples)
      if (alertMessage) {
        // Create a simple horizontal banner in the top right
        const bannerWidth = 140 // Wider banner
        const bannerHeight = 36 // Taller banner

        // Create background
        const alertBackground = new Konva.Rect({
          x: targetElement.offsetWidth - bannerWidth - 10, // 10px from right edge
          y: 10, // 10px from top
          width: bannerWidth,
          height: bannerHeight,
          fill: 'rgba(220, 38, 38, 0.9)', // Red background
          cornerRadius: 5,
          shadowColor: 'black',
          shadowBlur: 4,
          shadowOffset: { x: 1, y: 1 },
          shadowOpacity: 0.3,
        })

        // Create text
        const alertText = new Konva.Text({
          x:
            targetElement.offsetWidth -
            bannerWidth -
            10 +
            (bannerWidth - alertMessage.length * 9) / 2 -
            5, // Centered, moved left by 5px
          y: 10 + (bannerHeight - 18) / 2 + 2, // Vertically centered, moved down by 2px
          text: alertMessage,
          fontSize: 16, // Slightly larger font
          fontFamily: 'sans-serif',
          fontStyle: 'bold',
          fill: 'white',
        })

        layer.add(alertBackground)
        layer.add(alertText)
      }

      layer.add(promptText)
      layer.add(modelText)
      layer.add(websiteText)
      watermarkStage.add(layer)

      // Wait a frame to ensure UI is hidden and watermark is rendered
      await new Promise(requestAnimationFrame)

      const canvasOptions = {
        useCORS: true,
        backgroundColor: null,
        scale: 2, // Higher quality
        ignoreElements: (element: Element) => {
          return (
            element.classList.contains('ui-overlay') ||
            element.tagName.toLowerCase() === 'button' ||
            (element.classList.contains('absolute') &&
              !element.textContent?.includes('mcbench.ai'))
          )
        },
      }

      // Capture the screenshot
      const canvas = await html2canvas(targetElement, canvasOptions)

      // Clean up: Remove Konva stage and restore UI elements
      watermarkStage.destroy()
      targetElement.removeChild(watermarkContainer)
      uiElements.forEach((el) => {
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
  }, [isOpen, isFullscreen])

  const handleDownload = () => {
    if (!screenshot) return

    const timestamp = new Date()
      .toISOString()
      .replace('T', '-')
      .replace(/:/g, '-')
      .slice(0, -5) // Format: YYYY-MM-DD-HH-mm
    const sanitizedModelName = modelName
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
    const filename = `${sanitizedModelName}-${timestamp}.png`

    const link = document.createElement('a')
    link.href = screenshot
    link.download = filename
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

  // Handle modal placement based on fullscreen state
  const modalContainerClass = isFullscreen
    ? 'fixed inset-0 z-[9999] flex items-center justify-center' // Higher z-index to appear over fullscreen element
    : 'fixed inset-0 z-50 flex items-center justify-center'

  const backdropClass = isFullscreen
    ? 'fixed inset-0 bg-black/50' // Simpler backdrop for fullscreen
    : 'fixed inset-0 backdrop-blur-sm bg-black/30 bg-opacity-75'

  const modalClass = isFullscreen
    ? 'bg-white dark:bg-gray-800 p-6 rounded-lg z-[10000] max-w-2xl w-full mx-4 shadow-xl border border-gray-200 dark:border-gray-700' // Higher z-index
    : 'bg-white dark:bg-gray-800 p-6 rounded-lg z-10 max-w-2xl w-full mx-4 shadow-xl border border-gray-200 dark:border-gray-700'

  return (
    <div className={modalContainerClass}>
      <div className={backdropClass} onClick={onClose}></div>

      <div className={modalClass}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold dark:text-white">
            Share Screenshot
          </h3>
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
                className="w-full border border-gray-200 dark:border-gray-700"
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
