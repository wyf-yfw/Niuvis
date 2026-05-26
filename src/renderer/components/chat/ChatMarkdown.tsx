import type { Components } from 'react-markdown'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const baseComponents: Components = {
  h1: ({ children }) => (
    <h1 className="mb-3 mt-4 text-lg font-semibold first:mt-0">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="mb-2 mt-4 text-base font-semibold first:mt-0">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="mb-2 mt-3 text-sm font-semibold first:mt-0">{children}</h3>
  ),
  p: ({ children }) => <p className="mb-3 leading-6 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="mb-3 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>,
  ol: ({ children }) => <ol className="mb-3 list-decimal space-y-1 pl-5 last:mb-0">{children}</ol>,
  li: ({ children }) => <li className="leading-6">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="mb-3 border-l-2 border-white/20 pl-3 text-white/75 last:mb-0">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-4 border-white/10" />,
  a: ({ href, children }) => (
    <a
      className="text-sky-300 underline decoration-sky-300/50 hover:text-sky-200"
      href={href}
      rel="noreferrer"
      target="_blank"
    >
      {children}
    </a>
  ),
  table: ({ children }) => (
    <div className="mb-3 overflow-x-auto last:mb-0">
      <table className="w-full border-collapse text-left text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="border-b border-white/15">{children}</thead>,
  th: ({ children }) => (
    <th className="px-2 py-1.5 font-medium text-white/90">{children}</th>
  ),
  td: ({ children }) => <td className="border-t border-white/10 px-2 py-1.5">{children}</td>,
  tr: ({ children }) => <tr className="align-top">{children}</tr>,
  strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
  em: ({ children }) => <em className="italic text-white/90">{children}</em>,
  code: ({ className, children }) => {
    const isBlock = Boolean(className?.includes('language-'))

    if (isBlock) {
      return (
        <code className={`block font-mono text-xs leading-5 text-white/90 ${className ?? ''}`}>
          {children}
        </code>
      )
    }

    return (
      <code className="rounded bg-black/35 px-1.5 py-0.5 font-mono text-[0.85em] text-sky-100">
        {children}
      </code>
    )
  },
  pre: ({ children }) => (
    <pre className="mb-3 overflow-x-auto rounded-lg border border-white/10 bg-black/40 p-3 last:mb-0">
      {children}
    </pre>
  ),
}

interface ChatMarkdownProps {
  content: string
  className?: string
}

export default function ChatMarkdown({ content, className = '' }: ChatMarkdownProps) {
  if (!content.trim()) {
    return null
  }

  return (
    <div className={`chat-markdown text-sm text-inherit ${className}`.trim()}>
      <ReactMarkdown components={baseComponents} remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
    </div>
  )
}
