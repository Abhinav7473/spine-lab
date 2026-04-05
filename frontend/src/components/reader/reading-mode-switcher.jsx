import '../../styles/reader.css'

export function ReadingModeSwitcher({ mode, onChange }) {
  return (
    <div className="reader-mode-tabs">
      <button
        className={`reader-mode-tab ${mode === 'skim' ? 'active' : ''}`}
        onClick={() => onChange('skim')}
      >
        Skim
      </button>
      <button
        className={`reader-mode-tab ${mode === 'full' ? 'active' : ''}`}
        onClick={() => onChange('full')}
      >
        Full paper
      </button>
    </div>
  )
}
