export default function EnbdIcon({ size = 28, opacity = 1 }) {
  const c = `rgba(241,245,249,${opacity})`
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <text x="20" y="24" textAnchor="middle" fill={c} fontSize="10" fontWeight="700" fontFamily="'DM Mono', monospace" letterSpacing="1.5">ENBD</text>
    </svg>
  )
}
