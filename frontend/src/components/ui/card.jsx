import '../../styles/components.css'

export function Card({ children, onClick, className = '' }) {
  const clickable = Boolean(onClick)
  return (
    <div
      className={['card', clickable ? 'clickable' : '', className].filter(Boolean).join(' ')}
      onClick={onClick}
    >
      {children}
    </div>
  )
}
