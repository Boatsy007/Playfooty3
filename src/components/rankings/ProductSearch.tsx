/**
 * Mounts the global search overlay (Cmd/Ctrl+K) on product pages, without adding
 * any nav chrome — the site menu stays the shared event-style Nav everywhere.
 */
import GlobalSearch, { useSearchController } from './GlobalSearch'

export default function ProductSearch() {
  const controller = useSearchController()
  return <GlobalSearch controller={controller} />
}
