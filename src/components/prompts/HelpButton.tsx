import { useState } from 'react'

import { HelpCircle } from 'lucide-react'

import { HelpButtonProps } from '../../types/ui'
import Modal from '../ui/Modal'
import PromptsHelp from './PromptsHelp'

const HelpButton = ({ section = 'list' }: HelpButtonProps) => {
  const [isHelpOpen, setIsHelpOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setIsHelpOpen(true)}
        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
        aria-label="Help"
        title="Help"
      >
        <HelpCircle size={20} />
      </button>

      <Modal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        maxWidth="lg"
      >
        <div className="px-1 py-2">
          <PromptsHelp section={section} />
        </div>
      </Modal>
    </>
  )
}

export default HelpButton
