import { useEffect, useState } from 'react'

import { Check, Copy } from 'lucide-react'

import Modal from './Modal'

interface ShareComparisonModalProps {
  isOpen: boolean
  onClose: () => void
  sampleAId: string
  sampleBId: string
  prompt: string
  modelA: string
  modelB: string
  winningModel?: string
  losingModel?: string
  winningSampleId?: string
  losingSampleId?: string
}

const victoryVerbs = [
  'dominated',
  'beat',
  'defeated',
  'outclassed',
  'outperformed',
  'crushed',
  'outshined',
  'triumphed over',
  'bested',
  'overcame',
  'surpassed',
  'outmaneuvered',
  'vanquished',
  'conquered',
  'prevailed against',
  'demolished',
]

const ShareComparisonModal = ({
  isOpen,
  onClose,
  sampleAId,
  sampleBId,
  prompt,
  modelA,
  modelB,
  winningModel,
  losingModel,
  winningSampleId,
  losingSampleId,
}: ShareComparisonModalProps) => {
  const [copiedItem, setCopiedItem] = useState<
    'winning' | 'losing' | 'narrative' | null
  >(null)
  const [victoryVerb, setVictoryVerb] = useState('')

  useEffect(() => {
    // Select a random victory verb when the component mounts or modal opens
    const randomIndex = Math.floor(Math.random() * victoryVerbs.length)
    setVictoryVerb(victoryVerbs[randomIndex])
  }, [isOpen])

  const baseUrl = window.location.origin

  const handleCopy = async (
    text: string,
    type: 'winning' | 'losing' | 'narrative'
  ) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedItem(type)

      // Reset copied state after 2 seconds
      setTimeout(() => {
        setCopiedItem(null)
      }, 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Share Results"
      maxWidth="md"
    >
      <div className="space-y-4">
        {winningSampleId && winningModel && (
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Share winner - {winningModel}:
            </p>
            <div className="flex items-center">
              <input
                type="text"
                readOnly
                value={`${baseUrl}/share/samples/${winningSampleId}`}
                className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded-l-md bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-sm"
              />
              <button
                onClick={() =>
                  handleCopy(
                    `${baseUrl}/share/samples/${winningSampleId}`,
                    'winning'
                  )
                }
                className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-r-md flex items-center transition-colors"
              >
                {copiedItem === 'winning' ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <Copy className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
        )}

        {losingSampleId && losingModel && (
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Share loser - {losingModel}:
            </p>
            <div className="flex items-center">
              <input
                type="text"
                readOnly
                value={`${baseUrl}/share/samples/${losingSampleId}`}
                className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded-l-md bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-sm"
              />
              <button
                onClick={() =>
                  handleCopy(
                    `${baseUrl}/share/samples/${losingSampleId}`,
                    'losing'
                  )
                }
                className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-r-md flex items-center transition-colors"
              >
                {copiedItem === 'losing' ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <Copy className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
        )}

        {/* Always show both models if no vote */}
        {!winningSampleId && (
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Share {modelA}:
            </p>
            <div className="flex items-center">
              <input
                type="text"
                readOnly
                value={`${baseUrl}/share/samples/${sampleAId}`}
                className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded-l-md bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-sm"
              />
              <button
                onClick={() =>
                  handleCopy(`${baseUrl}/share/samples/${sampleAId}`, 'winning')
                }
                className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-r-md flex items-center transition-colors"
              >
                {copiedItem === 'winning' ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <Copy className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
        )}

        {!losingSampleId && !winningSampleId && (
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Share {modelB}:
            </p>
            <div className="flex items-center">
              <input
                type="text"
                readOnly
                value={`${baseUrl}/share/samples/${sampleBId}`}
                className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded-l-md bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-sm"
              />
              <button
                onClick={() =>
                  handleCopy(`${baseUrl}/share/samples/${sampleBId}`, 'losing')
                }
                className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-r-md flex items-center transition-colors"
              >
                {copiedItem === 'losing' ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <Copy className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
        )}

        {/* Competitive narrative (when there's a winner and loser) */}
        {winningModel && losingModel && winningSampleId && (
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Share your vote:
            </p>
            <div className="flex items-center">
              <textarea
                readOnly
                className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded-l-md bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-sm h-20 resize-none"
              >{`${winningModel} ${victoryVerb} ${losingModel} building '${prompt}' in Minecraft. Vote yourself at mcbench dot ai!`}</textarea>
              <button
                onClick={() =>
                  handleCopy(
                    `${winningModel} ${victoryVerb} ${losingModel} building '${prompt}' in Minecraft. Vote yourself at mcbench dot ai!`,
                    'narrative'
                  )
                }
                className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-r-md h-20 flex items-center transition-colors"
              >
                {copiedItem === 'narrative' ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <Copy className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
        )}

        {/* Tie narrative */}
        {modelA &&
          modelB &&
          !winningModel &&
          !losingModel &&
          sampleAId &&
          sampleBId && (
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Share your vote:
              </p>
              <div className="flex items-center">
                <textarea
                  readOnly
                  className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded-l-md bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-sm h-20 resize-none"
                >{`${modelA} and ${modelB} tied building '${prompt}' in Minecraft. Vote yourself at mcbench dot ai!`}</textarea>
                <button
                  onClick={() =>
                    handleCopy(
                      `${modelA} and ${modelB} tied building '${prompt}' in Minecraft. Vote yourself at mcbench dot ai!`,
                      'narrative'
                    )
                  }
                  className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-r-md h-20 flex items-center transition-colors"
                >
                  {copiedItem === 'narrative' ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <Copy className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
          )}

        <div className="flex justify-end mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default ShareComparisonModal
