import { useToastStore } from '../../stores/toast-store'
import '../../styles/glass.css'
import '../../styles/toasts.css'

const ICONS = { info: 'ℹ', success: '✓', warn: '⚠', error: '✕' }

export function Toasts() {
  const { toasts, dismiss } = useToastStore()
  if (toasts.length === 0) return null

  return (
    <div className="toast-stack">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`glass glass-toast glass-enter toast toast--${t.type}`}
          onClick={() => dismiss(t.id)}
        >
          <span className="toast-icon">{ICONS[t.type]}</span>
          <span className="toast-msg">{t.message}</span>
        </div>
      ))}
    </div>
  )
}
