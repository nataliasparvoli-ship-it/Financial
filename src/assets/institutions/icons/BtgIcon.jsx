export default function BtgIcon({ size = 28, opacity = 1 }) {
  const c = `rgba(241,245,249,${opacity})`
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="20" r="15" stroke={c} strokeWidth="2.5"/>
      <text x="20" y="25" textAnchor="middle" fill={c} fontSize="11" fontWeight="700" fontFamily="'DM Mono', monospace" letterSpacing="0.5">btg</text>
    </svg>
  )
}
