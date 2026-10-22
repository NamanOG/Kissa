import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { CRATE_RADIUS, RecordCrate, crateKeyTarget, crateWindow } from '../RecordCrate'
import type { RecordEntry } from '@renderer/stores/shelfStore'

const record = (i: number, extra: Partial<RecordEntry> = {}): RecordEntry => ({
  albumKey: `album-${i}`,
  album: `Album ${i}`,
  artist: `Artist ${i}`,
  artworkUrl: `https://example.test/${i}.jpg`,
  firstListened: i,
  lastListened: i,
  playCount: i + 1,
  tracksEncountered: [],
  ...extra
})

function Harness({ records, onOpen }: { records: RecordEntry[]; onOpen: (key: string) => void }) {
  const [key, setKey] = useState<string | null>(null)
  return <RecordCrate records={records} currentKey={key} onCurrentChange={setKey} onOpen={onOpen} />
}

describe('crate helpers', () => {
  it('mounts only the sleeves near the current record', () => {
    expect(crateWindow(500, 250)).toEqual([250 - CRATE_RADIUS, 250 + CRATE_RADIUS + 1])
    expect(crateWindow(500, 0)).toEqual([0, CRATE_RADIUS + 1])
    expect(crateWindow(3, 2)).toEqual([0, 3])
    expect(crateWindow(0, 0)).toEqual([0, 0])
  })

  it('maps keys to positions and stays inside the collection', () => {
    expect(crateKeyTarget('ArrowRight', 0, 5)).toBe(1)
    expect(crateKeyTarget('ArrowLeft', 0, 5)).toBe(0)
    expect(crateKeyTarget('End', 0, 5)).toBe(4)
    expect(crateKeyTarget('Home', 4, 5)).toBe(0)
    expect(crateKeyTarget('PageDown', 2, 5)).toBe(4)
    expect(crateKeyTarget('PageUp', 30, 50)).toBe(20)
    expect(crateKeyTarget('a', 0, 5)).toBeNull()
  })
})

describe('RecordCrate', () => {
  it('names the current record in full and moves with the keyboard', () => {
    const onOpen = vi.fn()
    render(<Harness records={[record(0), record(1), record(2)]} onOpen={onOpen} />)
    const crate = screen.getByRole('listbox')
    expect(screen.getByRole('heading', { name: 'Album 0' })).toBeTruthy()
    expect(screen.getByText('1 of 3')).toBeTruthy()

    fireEvent.keyDown(crate, { key: 'ArrowRight' })
    expect(screen.getByRole('heading', { name: 'Album 1' })).toBeTruthy()
    expect(screen.getByRole('option', { name: 'Album 1 by Artist 1' }).getAttribute('aria-selected')).toBe('true')
    expect(crate.getAttribute('aria-activedescendant')).toBe('crate-1')

    fireEvent.keyDown(crate, { key: 'Enter' })
    expect(onOpen).toHaveBeenCalledWith('album-1')
  })

  it('brings a sleeve forward on the first click and opens it on the second', () => {
    const onOpen = vi.fn()
    render(<Harness records={[record(0), record(1)]} onOpen={onOpen} />)
    const sleeve = screen.getByRole('option', { name: 'Album 1 by Artist 1' })
    fireEvent.click(sleeve)
    expect(onOpen).not.toHaveBeenCalled()
    expect(screen.getByRole('heading', { name: 'Album 1' })).toBeTruthy()
    fireEvent.click(sleeve)
    expect(onOpen).toHaveBeenCalledWith('album-1')
  })

  it('opens details from a visible button, not only by keyboard or click', () => {
    const onOpen = vi.fn()
    render(<Harness records={[record(0)]} onOpen={onOpen} />)
    fireEvent.click(screen.getByRole('button', { name: 'Album details' }))
    expect(onOpen).toHaveBeenCalledWith('album-0')
  })

  it('keeps large collections cheap and lets the scrubber jump', () => {
    const records = Array.from({ length: 400 }, (_, i) => record(i))
    render(<Harness records={records} onOpen={() => {}} />)
    expect(screen.getAllByRole('option').length).toBeLessThanOrEqual(CRATE_RADIUS * 2 + 1)
    fireEvent.change(screen.getByRole('slider', { name: 'Move through the crate' }), { target: { value: '250' } })
    expect(screen.getByRole('heading', { name: 'Album 250' })).toBeTruthy()
    expect(screen.getAllByRole('option').length).toBe(CRATE_RADIUS * 2 + 1)
  })

  it('shows a labelled placeholder when a record has no artwork', () => {
    render(<Harness records={[record(0, { artworkUrl: undefined, album: '坂本龍一 — 音楽図鑑' })]} onOpen={() => {}} />)
    expect(screen.getAllByText('坂本龍一 — 音楽図鑑').length).toBeGreaterThan(0)
  })
})
