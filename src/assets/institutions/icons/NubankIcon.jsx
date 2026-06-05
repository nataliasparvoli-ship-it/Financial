export default function NubankIcon({ size = 28, opacity = 1 }) {
  const c = `rgba(241,245,249,${opacity})`
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 30V14C8 14 8 10 13 10C18 10 18 14 18 14V30" stroke={c} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M19 30V14C19 14 19 10 24 10C29 10 29 14 29 14V24C29 28 32 30 32 30" stroke={c} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}
