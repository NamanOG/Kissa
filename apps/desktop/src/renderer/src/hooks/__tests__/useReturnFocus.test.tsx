import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { useRef } from 'react'
import { useReturnFocus } from '../useReturnFocus'

function Popover({ open }: { open: boolean }): React.JSX.Element {
  const button = useRef<HTMLButtonElement>(null)
  useReturnFocus(open, button)
  return (
    <div>
      <button ref={button}>Sleep timer</button>
      {open && <button autoFocus>30 minutes</button>}
    </div>
  )
}

describe('popovers give focus back to their button', () => {
  it('when the panel closes with focus inside it', () => {
    const { rerender, getByText } = render(<Popover open />)
    getByText('30 minutes').focus()
    rerender(<Popover open={false} />)
    expect(document.activeElement).toBe(getByText('Sleep timer'))
  })

  it('but not when focus has moved somewhere else', () => {
    const { rerender, container } = render(
      <>
        <Popover open />
        <input aria-label="elsewhere" />
      </>
    )
    const input = container.querySelector('input')!
    input.focus()
    rerender(
      <>
        <Popover open={false} />
        <input aria-label="elsewhere" />
      </>
    )
    expect(document.activeElement).toBe(input)
  })
})
