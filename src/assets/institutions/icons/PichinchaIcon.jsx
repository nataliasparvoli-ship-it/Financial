export default function PichinchaIcon({ size = 28, opacity = 1 }) {
  const c = `rgba(241,245,249,${opacity})`
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <text x="20" y="27" textAnchor="middle" fill={c} fontSize="16" fontWeight="700" fontFamily="'DM Mono', monospace" letterSpacing="0.5">BP</text>
    </svg>
  )
}
