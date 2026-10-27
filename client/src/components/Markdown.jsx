"use client";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import rehypeHighlight from "rehype-highlight";
import { Check, Copy } from "lucide-react";

function CodeBlock({ className = "", children }) {
  const [copied, setCopied] = useState(false);
  const language = /language-(\w+)/.exec(className)?.[1] || "code";
  const text = String(children).replace(/\n$/, "");

  const copy = async (e) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard can be blocked; nothing useful to do */
    }
  };

  return (
    <div className="my-2 overflow-hidden rounded-xl border border-white/10 bg-black/55">
      <div className="flex items-center justify-between border-b border-white/10 bg-white/5 px-3 py-1.5 font-mono text-xs text-white/60">
        <span>{language}</span>
        <button
          type="button"
          onClick={copy}
          className="flex items-center gap-1 rounded px-1.5 py-0.5 text-white/70 transition hover:bg-white/10 hover:text-white"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto p-3 font-mono text-[13px] leading-relaxed">
        <code className={className}>{children}</code>
      </pre>
    </div>
  );
}

const components = {
  // Fenced blocks arrive as <pre><code>. We draw our own frame, so pass the <pre> through.
  pre: ({ children }) => <>{children}</>,
  code: ({ className, children, ...props }) => {
    const isBlock = /language-/.test(className || "") || String(children).includes("\n");
    return isBlock ? (
      <CodeBlock className={className}>{children}</CodeBlock>
    ) : (
      <code {...props}>{children}</code>
    );
  },
  a: ({ children, ...props }) => (
    <a {...props} target="_blank" rel="noopener noreferrer nofollow" onClick={(e) => e.stopPropagation()}>
      {children}
    </a>
  ),
};

// User content is untrusted: sanitize first, then add syntax highlighting.
export default function Markdown({ children, className = "" }) {
  return (
    <div className={`md text-sm text-white/90 ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize, [rehypeHighlight, { detect: false, ignoreMissing: true }]]}
        components={components}
      >
        {children || ""}
      </ReactMarkdown>
    </div>
  );
}
