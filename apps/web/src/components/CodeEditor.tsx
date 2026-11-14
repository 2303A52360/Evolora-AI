"use client";

import { useRef, useCallback } from "react";
import Editor, { type OnMount, type OnChange } from "@monaco-editor/react";

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  height?: string;
  readOnly?: boolean;
  starterCode?: string;
}

export default function CodeEditor({
  value,
  onChange,
  language = "python",
  height = "400px",
  readOnly = false,
}: CodeEditorProps) {
  const editorRef = useRef<any>(null);

  const handleMount: OnMount = useCallback((editor) => {
    editorRef.current = editor;
    editor.focus();
  }, []);

  const handleChange: OnChange = useCallback(
    (val) => {
      onChange(val || "");
    },
    [onChange]
  );

  return (
    <div
      className="rounded-[var(--radius-lg)] overflow-hidden border border-[var(--color-border-default)]"
      style={{ height }}
    >
      <Editor
        height="100%"
        language={language}
        value={value}
        onChange={handleChange}
        onMount={handleMount}
        theme="vs-dark"
        options={{
          fontSize: 14,
          fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', monospace",
          lineNumbers: "on",
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 4,
          insertSpaces: true,
          wordWrap: "on",
          bracketPairColorization: { enabled: true },
          padding: { top: 16, bottom: 16 },
          suggestOnTriggerCharacters: true,
          quickSuggestions: true,
          readOnly,
          renderLineHighlight: "gutter",
          cursorBlinking: "smooth",
          cursorSmoothCaretAnimation: "on",
          smoothScrolling: true,
          folding: true,
          showFoldingControls: "always",
          contextmenu: true,
          formatOnPaste: true,
          formatOnType: true,
        }}
      />
    </div>
  );
}
