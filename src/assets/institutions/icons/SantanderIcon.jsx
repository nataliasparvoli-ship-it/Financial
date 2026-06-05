export default function SantanderIcon({ size = 28, opacity = 1 }) {
  const c = `rgba(241,245,249,${opacity})`
  const bg = "rgba(2,6,23,0.95)"
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 6C23 10 30 15 28 23C26 30 23 33 20 35C17 33 14 30 12 23C10 15 17 10 20 6Z" fill={c}/>
      <path d="M20 13C22 16 25 20 24 25C23 28 22 30 20 31C18 30 17 28 16 25C15 20 18 16 20 13Z" fill={bg}/>
    </svg>
  )
}
