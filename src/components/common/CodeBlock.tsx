import { memo, useMemo, useState } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Copy, ChevronDown, ChevronRight } from 'lucide-react'

interface CodeBlockProps {
  code: string
  language: string
  showLineNumbers?: boolean
  wrapLines?: boolean
}

export const CodeBlock = memo(({
  code,
  language,
  showLineNumbers = true,
  wrapLines = true
}: CodeBlockProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isCopied, setIsCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
  }

  const highlightedCode = useMemo(() => (
    <SyntaxHighlighter
      language={language}
      style={oneLight}
      customStyle={{
        margin: 0,
        borderRadius: 0,
        fontSize: '0.875rem',
        lineHeight: '1.5',
      }}
      showLineNumbers={showLineNumbers}
      wrapLines={wrapLines}
    >
      {code}
    </SyntaxHighlighter>
  ), [code, language, showLineNumbers, wrapLines])

  return (
    <div className="relative border border-gray-200 rounded-md overflow-hidden">
      <div className="flex items-center gap-2 p-2 bg-gray-100">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 hover:bg-gray-200 rounded"
          aria-label={isCollapsed ? "Expand code" : "Collapse code"}
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
        </button>
        <span className="text-sm text-gray-600">{language}</span>
        <button
          onClick={handleCopy}
          className="ml-auto p-1 hover:bg-gray-200 rounded"
          title={isCopied ? "Copied!" : "Copy code"}
        >
          <Copy size={16} className={isCopied ? "text-green-600" : "text-gray-600"} />
        </button>
      </div>
      <div className={isCollapsed ? 'hidden' : ''}>
        {highlightedCode}
      </div>
    </div>
  )
})

CodeBlock.displayName = 'CodeBlock'
