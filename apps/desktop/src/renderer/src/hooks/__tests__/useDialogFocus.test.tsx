import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render } from '@testing-library/react'
import { useRef, useState } from 'react'
import { useDialogFocus } from '../useDialogFocus'

// jsdom has no layout; treat every element as rendered so the focusable filter keeps them.
vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([{}] as unknown as DOMRectList)

function Harness({ autofocus = false }: { autofocus?: boolean }): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useDialogFocus(ref, open)
  return (
    <div>
      <button onClick={() => setOpen(true)}>Open</button>
      <button>Behind</button>
      {open && (
        <div ref={ref} role="dialog">
          <button>First</button>
          <button data-autofocus={autofocus ? '' : undefined}>Middle</button>
          <button onClick={() => setOpen(false)}>Close</button>
        </div>
      )}
    </div>
  )
}

const flushFrame = async (): Promise<void> => {
  await act(async () => {
    await new Promise((r) => requestAnimationFrame(() => r(null)))
  })
}
const tab = (shift = false): void => {
  fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Tab', shiftKey: shift })
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('dialog keyboard focus', () => {
  it('moves focus into the dialog when it opens', async () => {
    const { getByText } = render(<Harness />)
    getByText('Open').focus()
    fireEvent.click(getByText('Open'))
    await flushFrame()
    expect(document.activeElement).toBe(getByText('First'))
  })

  it('prefers an element marked data-autofocus', async () => {
    const { getByText } = render(<Harness autofocus />)
    fireEvent.click(getByText('Open'))
    await flushFrame()
    expect(document.activeElement).toBe(getByText('Middle'))
  })

  it('Tab and Shift+Tab stay inside the dialog instead of reaching controls behind it', async () => {
    const { getByText } = render(<Harness />)
    fireEvent.click(getByText('Open'))
    await flushFrame()
    getByText('Close').focus()
    tab()
    expect(document.activeElement).toBe(getByText('First'))
    tab(true)
    expect(document.activeElement).toBe(getByText('Close'))
    // Focus somehow behind the dialog (e.g. a click on the backdrop): Tab brings it back in.
    getByText('Behind').focus()
    tab()
    expect(document.activeElement).toBe(getByText('First'))
  })

  it('returns focus to the control that opened it', async () => {
    const { getByText } = render(<Harness />)
    getByText('Open').focus()
    fireEvent.click(getByText('Open'))
    await flushFrame()
    fireEvent.click(getByText('Close'))
    expect(document.activeElement).toBe(getByText('Open'))
  })
})
