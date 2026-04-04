import '../../styles/components.css'

export function Badge({ label, variant = 'default' }) {
  return <span className={`badge ${variant}`}>{label}</span>
}
