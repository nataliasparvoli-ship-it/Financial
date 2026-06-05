export default function ItauIcon({ size = 28, opacity = 1 }) {
  const c = `rgba(241,245,249,${opacity})`
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="10" cy="12" r="2.5" fill={c}/>
      <line x1="10" y1="17" x2="10" y2="30" stroke={c} strokeWidth="3" strokeLinecap="round"/>
      <path d="M16 17V25C16 28 18 30 21 30C24 30 26 28 26 25V17" stroke={c} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="14" y1="30" x2="28" y2="30" stroke={c} strokeWidth="3" strokeLinecap="round"/>
      <line x1="30" y1="17" x2="30" y2="30" stroke={c} strokeWidth="3" strokeLinecap="round"/>
      <circle cx="30" cy="12" r="2.5" fill={c}/>
    </svg>
  )
}
