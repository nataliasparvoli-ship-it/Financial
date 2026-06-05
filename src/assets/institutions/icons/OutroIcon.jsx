export default function OutroIcon({ size = 28, opacity = 1 }) {
  const c = `rgba(241,245,249,${opacity})`
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="20" r="2.5" fill={c}/>
      <circle cx="20" cy="20" r="2.5" fill={c}/>
      <circle cx="28" cy="20" r="2.5" fill={c}/>
    </svg>
  )
}
