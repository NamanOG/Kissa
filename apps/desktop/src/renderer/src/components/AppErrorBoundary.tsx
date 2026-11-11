import React from 'react'
import { tl } from '@renderer/i18n'

interface State {
  failed: boolean
}

/**
 * The last line of defence for the window: if a view throws while drawing, Kissa shows a quiet
 * note with a way back instead of an empty window. The music in the other player is not
 * affected; reloading only redraws Kissa.
 */
export class AppErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo): void {
    console.error('[Kissa] A view failed to draw:', error, info.componentStack)
  }

  render(): React.ReactNode {
    if (!this.state.failed) return this.props.children
    return (
      <div
        role="alert"
        className="flex h-full w-full flex-col items-center justify-center gap-4 bg-[#0b0a09] px-6 text-center text-[#f3ebe1]"
      >
        <p className="font-kissa-editorial text-[26px] leading-tight">{tl('crash.title')}</p>
        <p className="max-w-[380px] text-[13px] leading-relaxed text-[#b9a48e]">{tl('crash.body')}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="h-9 cursor-pointer rounded-full bg-[#e0a868] px-5 text-[13px] font-semibold text-[#170f09] outline-none focus-visible:ring-2 focus-visible:ring-[#e0a868]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0a09]"
        >
          {tl('crash.reload')}
        </button>
      </div>
    )
  }
}
