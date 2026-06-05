export default function BbIcon({ size = 28, opacity = 1 }) {
  const c = `rgba(241,245,249,${opacity})`
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polygon points="20,4 36,12 36,28 20,36 4,28 4,12" stroke={c} strokeWidth="2.5" fill="none" strokeLinejoin="round"/>
      <text x="20" y="26" textAnchor="middle" fill={c} fontSize="14" fontWeight="800" fontFamily="system-ui, sans-serif">BB</text>
    </svg>
  )
}
