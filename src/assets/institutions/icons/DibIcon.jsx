export default function DibIcon({ size = 28, opacity = 1 }) {
  const c = `rgba(241,245,249,${opacity})`
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 30V10H19C26 10 30 14 30 20C30 26 26 30 19 30H10Z" stroke={c} strokeWidth="2.5" fill="none" strokeLinejoin="round"/>
      <line x1="10" y1="20" x2="24" y2="20" stroke={c} strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  )
}
