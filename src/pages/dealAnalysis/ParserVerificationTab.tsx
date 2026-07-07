import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import {
  FileText,
  Search,
  Copy,
  Check,
  Download,
  Info,
  Loader2,
  FileDown,
} from "lucide-react";
import { Button } from "@/components/mvp/primitives/button";

interface ParserVerificationTabProps {
  sessionId: string | null;
}

export function ParserVerificationTab({ sessionId }: ParserVerificationTabProps) {
  const [selectedPageIndex, setSelectedPageIndex] = useState(0);
  const [showWhitespace, setShowWhitespace] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [copyFeedback, setCopyFeedback] = useState(false);

  // Fetch all chunks for this session
  const { data: chunks = [], isLoading, isError } = trpc.deals.getRawChunks.useQuery(
    { sessionId: sessionId ?? "" },
    { enabled: !!sessionId, refetchOnWindowFocus: false }
  );

  const activeChunk = chunks[selectedPageIndex];

  // Helper to escape regex special characters
  const escapeRegExp = (text: string) => {
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  };

  // Safe search match counting
  const matchCount = useMemo(() => {
    if (!activeChunk?.text || !searchQuery.trim()) return 0;
    try {
      const regex = new RegExp(escapeRegExp(searchQuery), "gi");
      const matches = activeChunk.text.match(regex);
      return matches ? matches.length : 0;
    } catch {
      return 0;
    }
  }, [activeChunk?.text, searchQuery]);

  // Safe highlighting function
  const getHighlightedText = (text: string, highlight: string) => {
    // Format text first for whitespace visualization
    let formattedText = text;
    if (showWhitespace) {
      // Replace tabs with a arrow symbol followed by the tab char, and spaces with middle dots
      formattedText = formattedText.replace(/\t/g, "→\t").replace(/ /g, "·");
    }

    if (!highlight.trim()) {
      return formattedText;
    }

    try {
      const parts = formattedText.split(
        new RegExp(`(${escapeRegExp(highlight)})`, "gi")
      );
      return (
        <>
          {parts.map((part, i) =>
            part.toLowerCase() === highlight.toLowerCase() ? (
              <mark key={i} className="bg-amber-300 text-slate-950 font-semibold px-0.5 rounded shadow-sm">
                {part}
              </mark>
            ) : (
              part
            )
          )}
        </>
      );
    } catch {
      return formattedText;
    }
  };

  // Copy active page text to clipboard
  const handleCopy = () => {
    if (!activeChunk?.text) return;
    navigator.clipboard.writeText(activeChunk.text).then(() => {
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    });
  };

  // Download raw text of the current page
  const handleDownloadPage = () => {
    if (!activeChunk) return;
    const file = new Blob([activeChunk.text], { type: "text/plain;charset=utf-8" });
    const element = document.createElement("a");
    element.href = URL.createObjectURL(file);
    element.download = `page_${activeChunk.page}_raw_text.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // Download raw text of the entire document
  const handleDownloadFullDoc = () => {
    if (chunks.length === 0) return;
    const compiled = chunks
      .map((c) => `--- PAGE ${c.page} (${c.section}) ---\n${c.text}`)
      .join("\n\n");
    const file = new Blob([compiled], { type: "text/plain;charset=utf-8" });
    const element = document.createElement("a");
    element.href = URL.createObjectURL(file);
    element.download = `full_document_raw_text.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-500">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        <p className="text-sm font-medium">Fetching parsed page chunks...</p>
      </div>
    );
  }

  if (isError || chunks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center border border-dashed border-slate-200 rounded-lg p-6 bg-slate-50">
        <Info className="h-8 w-8 text-slate-400" />
        <p className="text-sm font-medium text-slate-600">No raw text found for this session</p>
        <p className="text-xs text-slate-400 max-w-sm">
          Parsed chunks are only persisted during Stage 1. Ensure you have run migration 014 to enable database persistence for parsed document units.
        </p>
      </div>
    );
  }

  return (
    <div className="border border-slate-200 rounded-lg bg-white overflow-hidden shadow-sm flex flex-col h-[700px]">
      
      {/* Header Bar */}
      <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-emerald-600" />
          <h3 className="text-sm font-bold text-slate-900">Parser Verification Output</h3>
          <span className="text-xs text-slate-400 font-medium">({chunks.length} pages parsed)</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownloadFullDoc}
          className="text-xs border-slate-200 hover:bg-slate-100 flex items-center gap-1.5"
        >
          <FileDown className="h-3.5 w-3.5" />
          Download Full Document (.txt)
        </Button>
      </div>

      {/* Main Workspace Split Pane */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        
        {/* Left Sidebar Page Selector */}
        <div className="w-64 border-r border-slate-200 overflow-y-auto flex flex-col bg-slate-50/50">
          <div className="p-3 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Page Index
          </div>
          <div className="flex-1 divide-y divide-slate-100">
            {chunks.map((c, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setSelectedPageIndex(idx);
                  setSearchQuery("");
                }}
                className={`w-full text-left px-4 py-3 flex flex-col gap-1 transition-all ${
                  selectedPageIndex === idx
                    ? "bg-emerald-50 border-l-4 border-l-emerald-600 text-emerald-900"
                    : "hover:bg-slate-100 text-slate-600"
                }`}
              >
                <div className="flex items-center justify-between text-xs font-bold">
                  <span>Page {c.page}</span>
                  <span className="text-[10px] font-medium text-slate-400">
                    {c.charCount ?? c.text.length} chars
                  </span>
                </div>
                <div className="text-[10px] font-medium text-slate-400 truncate max-w-[200px]">
                  {c.section || "Untitled Section"}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right Main Text Panel */}
        <div className="flex-1 flex flex-col min-w-0 bg-white">
          
          {/* Action Toolbar */}
          <div className="border-b border-slate-100 p-4 flex flex-wrap items-center justify-between gap-4">
            
            {/* Search Input */}
            <div className="flex items-center gap-2 relative max-w-xs w-full">
              <Search className="h-4 w-4 text-slate-400 absolute left-3" />
              <input
                type="text"
                placeholder="Search page text..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 placeholder:text-slate-400"
              />
              {searchQuery && (
                <span className="text-[10px] text-slate-500 font-semibold shrink-0">
                  {matchCount} match{matchCount !== 1 ? "es" : ""}
                </span>
              )}
            </div>

            {/* Verification Utility Action Buttons */}
            <div className="flex items-center gap-2">
              
              {/* Invisible Chars Toggle */}
              <button
                onClick={() => setShowWhitespace(!showWhitespace)}
                className={`text-xs font-semibold px-2.5 py-1.5 rounded-md border transition-all ${
                  showWhitespace
                    ? "bg-slate-900 border-slate-900 text-white shadow-sm"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                {showWhitespace ? "Hide Whitespace" : "Show Tabs/Spaces"}
              </button>

              {/* Copy Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="text-xs border-slate-200 hover:bg-slate-50 flex items-center gap-1.5"
              >
                {copyFeedback ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                    <span className="text-emerald-700 font-medium">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 text-slate-500" />
                    <span>Copy Text</span>
                  </>
                )}
              </Button>

              {/* Download Page Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadPage}
                className="text-xs border-slate-200 hover:bg-slate-50 flex items-center gap-1.5"
              >
                <Download className="h-3.5 w-3.5 text-slate-500" />
                Download Page
              </Button>
            </div>
          </div>

          {/* Code Viewer Viewport */}
          <div className="flex-1 p-6 overflow-auto bg-slate-950 shadow-inner flex flex-col justify-stretch">
            {activeChunk ? (
              <pre
                className="text-slate-100 font-mono text-sm leading-relaxed overflow-auto select-text select-all whitespace-pre-wrap text-left w-full h-full"
                style={{
                  tabSize: 8,
                  MozTabSize: 8,
                }}
              >
                {getHighlightedText(activeChunk.text, searchQuery)}
              </pre>
            ) : (
              <div className="text-slate-500 font-mono text-sm">Select a page to view parsed text.</div>
            )}
          </div>

          {/* Footer Metadata Strip */}
          {activeChunk && (
            <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex items-center justify-between text-xs text-slate-500 font-medium">
              <div className="flex items-center gap-4">
                <span>Page: <strong>{activeChunk.page}</strong> of <strong>{chunks.length}</strong></span>
                <span className="text-slate-300">|</span>
                <span>Section: <strong>{activeChunk.section || "Untitled"}</strong></span>
                <span className="text-slate-300">|</span>
                <span>Characters: <strong>{activeChunk.charCount ?? activeChunk.text.length}</strong></span>
              </div>
              <div className="flex items-center gap-4">
                <span>Chunk Index: <strong>{activeChunk.chunkIndex ?? selectedPageIndex}</strong></span>
                {activeChunk.createdAt && (
                  <>
                    <span className="text-slate-300">|</span>
                    <span>Parsed At: <strong>{new Date(activeChunk.createdAt).toLocaleTimeString()}</strong></span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
