export default function XpIcon({ size = 28, opacity = 1 }) {
  const c = `rgba(241,245,249,${opacity})`
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 10L20 25M32 10L20 25L16 30" stroke={c} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M24 10C24 10 32 10 32 18C32 26 24 26 24 26H22" stroke={c} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}
