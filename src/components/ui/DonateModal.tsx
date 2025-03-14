import React from 'react'

import { Coffee } from 'lucide-react'

interface DonateModalProps {
  isOpen: boolean
  onClose: () => void
}

const DonateModal: React.FC<DonateModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 backdrop-blur-sm bg-black/30 bg-opacity-75"
        onClick={onClose}
      ></div>
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg z-10 max-w-md w-full mx-4 shadow-xl border border-gray-200 dark:border-gray-700">
        <h3 className="text-xl font-semibold mb-4 dark:text-white text-center">
          Consider a donation
        </h3>
        <div className="mb-6 space-y-3">
          <p className="text-gray-800 dark:text-gray-200 font-medium text-left italic">
            <span className="font-bold">10s of thousands</span> of Minecraft
            servers run
          </p>
          <p className="text-gray-800 dark:text-gray-200 font-medium text-right italic">
            <span className="font-bold">10s of thousands</span> of builds
            rendered
          </p>
          <p className="text-gray-800 dark:text-gray-200 font-medium text-center italic">
            your support for our{' '}
            <span className="font-bold">infrastructure</span> is appreciated
          </p>
        </div>
        <div className="flex justify-between items-center gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-100 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
          >
            Maybe Later
          </button>
          <a
            href="https://buymeacoffee.com/xlatentspace"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-md flex items-center gap-2 transition duration-150 ease-in-out"
          >
            <Coffee className="h-4 w-4" />
            <span>Buy Us a Coffee</span>
          </a>
        </div>
      </div>
    </div>
  )
}

export default DonateModal
