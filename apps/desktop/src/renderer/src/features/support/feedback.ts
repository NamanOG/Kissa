/**
 * "Request a feature" and "Report a bug": Kissa's GitHub issue forms (.github/ISSUE_TEMPLATE).
 * A bug report arrives with the app version, the build (Microsoft Store or GitHub) and the
 * Windows version filled in, through GitHub's issue-form query parameters (one per field id).
 * Nothing else about the PC or what was playing is sent.
 */
export const ISSUES_URL = 'https://github.com/NamanOG/Kissa/issues/new'

export interface BugContext {
  version?: string
  store?: boolean
  windows?: string
}

const clean = (v: string | undefined, max: number): string => (v ?? '').replace(/[\r\n]+/g, ' ').trim().slice(0, max)

export function featureRequestUrl(): string {
  return `${ISSUES_URL}?template=feature_request.yml`
}

export function bugReportUrl(ctx: BugContext): string {
  const params = new URLSearchParams({ template: 'bug_report.yml' })
  const version = clean(ctx.version, 32)
  const windows = clean(ctx.windows, 80)
  if (version) params.set('version', version)
  if (ctx.store !== undefined) params.set('build', ctx.store ? 'Microsoft Store' : 'GitHub download')
  if (windows) params.set('windows', windows)
  return `${ISSUES_URL}?${params.toString()}`
}

function open(url: string): void {
  if (window.electron?.openExternal) {
    // A failed open (no browser handler) falls back to the plain new-issue page.
    void window.electron.openExternal(url).catch(() => window.electron?.openExternal?.(ISSUES_URL))
  } else {
    window.open(url, '_blank', 'noopener,noreferrer')
  }
}

export function openFeatureRequest(): void {
  open(featureRequestUrl())
}

/** Gathers the version, build and Windows version, then opens the bug form. */
export async function openBugReport(): Promise<void> {
  const e = window.electron
  const [version, status, info] = await Promise.all([
    e?.getAppVersion?.().catch(() => '') ?? '',
    e?.getUpdateStatus?.().catch(() => null) ?? null,
    e?.getSystemInfo?.().catch(() => null) ?? null
  ])
  const windows = info ? `${info.windows}${info.arch ? `, ${info.arch}` : ''}` : undefined
  open(bugReportUrl({ version: version || undefined, store: status ? Boolean(status.isStoreManaged) : undefined, windows }))
}
