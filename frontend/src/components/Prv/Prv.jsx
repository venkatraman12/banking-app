import { useSecurity } from '../../context/SecurityContext'

/**
 * Wraps sensitive values — shows *** when privacy mode is on.
 * Usage: <Prv>$1,234.56</Prv>
 */
export default function Prv({ children }) {
  const { privacyMode } = useSecurity()
  return privacyMode ? '•••' : children
}
