import Editor from '@monaco-editor/react'

interface CodeEditorProps {
  value: string
  onChange: (value: string) => void
  language: string
  height?: string
  readOnly?: boolean
  /** Skip the bordered/rounded wrapper — use when already nested in a styled container. */
  bare?: boolean
}

export function CodeEditor({ value, onChange, language, height = '320px', readOnly = false, bare = false }: CodeEditorProps) {
  const editor = (
    <Editor
      height={height}
      language={language}
      value={value}
      onChange={(next) => onChange(next ?? '')}
      theme="vs-dark"
      options={{
        readOnly,
        minimap: { enabled: false },
        fontSize: 13,
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 2,
        autoIndent: 'full',
        formatOnType: true,
      }}
    />
  )
  if (bare) return editor
  return (
    <div className="rounded-xl overflow-hidden border border-gray-200">
      {editor}
    </div>
  )
}
