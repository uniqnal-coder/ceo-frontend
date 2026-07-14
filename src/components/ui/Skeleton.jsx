export default function Skeleton({ className = '' }) {
  return <span className={`skeleton block ${className}`} aria-hidden="true" />
}
