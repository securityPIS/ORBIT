import { useRef, useState } from 'react'
import { UploadCloud, Info, Loader2 } from 'lucide-react'
import { useStore } from '../store/useStore'

export default function UploadPanel({ compact = false, embedded = false }) {
  const ingestFiles = useStore((s) => s.ingestFiles)
  const ingesting = useStore((s) => s.ingesting)
  const inputRef = useRef(null)
  const [drag, setDrag] = useState(false)

  const onDrop = (e) => {
    e.preventDefault()
    setDrag(false)
    if (e.dataTransfer?.files?.length) ingestFiles(e.dataTransfer.files)
  }

  const body = (
    <div className={embedded ? 'px-4 pb-3' : 'flex-1 px-4 pb-4'}>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setDrag(true)
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
        className={`group flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 text-center transition-all ${
          embedded ? 'min-h-[112px]' : 'h-full min-h-[130px]'
        } ${drag ? 'border-brand bg-brand/10' : 'border-hair-2/70 bg-panel-2/20 hover:border-brand/50 hover:bg-brand/[0.04]'}`}
      >
        <div className={`grid h-12 w-12 place-items-center rounded-full bg-brand/10 text-brand transition-transform ${drag ? 'scale-110' : 'group-hover:scale-105'}`}>
          {ingesting ? <Loader2 className="h-6 w-6 animate-spin" /> : <UploadCloud className="h-6 w-6" />}
        </div>
        <p className="mt-2.5 text-[13px] font-semibold text-ink">
          {ingesting ? 'Analyzing documents…' : 'Drag & drop files here'}
        </p>
        <p className="text-[11.5px] text-ink-mute">{ingesting ? 'AI is extracting risk locations' : 'or click to browse'}</p>
        <p className="mt-2 text-[10px] text-ink-mute">PDF, DOCX, TXT, CSV, JSON, PNG · Max 50MB</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".pdf,.docx,.doc,.txt,.md,.csv,.json,.png,.jpg,.jpeg,.pptx"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) ingestFiles(e.target.files)
          e.target.value = ''
        }}
      />
    </div>
  )

  if (embedded) return body

  return (
    <section className="panel flex flex-col p-0">
      <div className="panel-head">
        <div className="flex items-center gap-1.5">
          <span className="panel-title">Upload Intelligence Briefs</span>
          <Info className="h-3.5 w-3.5 text-ink-mute" />
        </div>
      </div>
      {body}
    </section>
  )
}
