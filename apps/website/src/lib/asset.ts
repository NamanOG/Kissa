/**
 * Resolve a file in /public against the site's base path, so the same build
 * works at a domain root and under a sub-path.
 */
export function asset(path: string): string {
  return import.meta.env.BASE_URL + path.replace(/^\//, '')
}
