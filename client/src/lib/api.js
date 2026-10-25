const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export const apiRequest = async (endpoint, options = {}) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('spatial_token') : null;

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || data.errors?.[0]?.message || 'Request failed');
  }
  return data;
};

// Lightweight Markdown + Code Syntax Block Renderer for Posts & Answers (PS 06 Requirement)
export const renderMarkdownElements = (text = '') => {
  if (!text) return null;
  // Split by triple-backtick code blocks: ```lang ... ```
  const parts = text.split(/(```[\s\S]*?```)/g);

  return parts.map((part, index) => {
    if (part.startsWith('```') && part.endsWith('```')) {
      const lines = part.slice(3, -3).trim().split('\n');
      const firstLine = lines[0]?.trim() || '';
      const hasLang = /^[a-zA-Z0-9_-]+$/.test(firstLine);
      const lang = hasLang ? firstLine : 'code';
      const codeContent = hasLang ? lines.slice(1).join('\n') : lines.join('\n');

      return (
        <div
          key={index}
          className="my-2.5 rounded-xl overflow-hidden border border-white/15 bg-black/60 shadow-inner"
        >
          <div className="flex items-center justify-between px-3 py-1 bg-white/10 text-[11px] font-mono text-sky-300 uppercase tracking-wider">
            <span>{lang}</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                navigator.clipboard.writeText(codeContent);
              }}
              className="text-white/60 hover:text-white transition text-[10px]"
            >
              Copy
            </button>
          </div>
          <pre className="p-3 text-xs font-mono text-emerald-300 overflow-x-auto leading-relaxed">
            <code>{codeContent}</code>
          </pre>
        </div>
      );
    }

    return (
      <p key={index} className="whitespace-pre-wrap text-sm text-white/85 leading-relaxed">
        {part}
      </p>
    );
  });
};