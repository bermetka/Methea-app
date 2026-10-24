import { describe, it, expect } from 'vitest'
import {
  isPaywallActive,
  isProjectPaid,
  isAccessExpired,
  accessUntil,
  hasFullAccess,
  countUnpaidProjects,
} from './entitlement'

const START = '2026-11-01T00:00:00+06:00'
const beforeStart = new Date('2026-10-31T17:59:59Z') // 23:59:59 +06
const atStart     = new Date('2026-10-31T18:00:00Z') // 00:00:00 +06
const afterStart  = new Date('2026-12-01T00:00:00Z')

describe('isPaywallActive', () => {
  it('is inactive before PAYWALL_START and active from it (timezone-aware)', () => {
    expect(isPaywallActive(beforeStart, START)).toBe(false)
    expect(isPaywallActive(atStart, START)).toBe(true)
    expect(isPaywallActive(afterStart, START)).toBe(true)
  })

  it('fails closed when PAYWALL_START is missing or invalid', () => {
    expect(isPaywallActive(beforeStart, undefined)).toBe(true)
    expect(isPaywallActive(beforeStart, 'not-a-date')).toBe(true)
  })
})

describe('isProjectPaid — 6-month access window', () => {
  const paid = { paid_at: '2026-11-10T12:00:00.000Z' }

  it('returns false when paid_at is null', () => {
    expect(isProjectPaid({ paid_at: null }, afterStart)).toBe(false)
  })

  it('returns false when paid_at is undefined (e.g. caller forgot to select the column)', () => {
    expect(isProjectPaid({ paid_at: undefined as unknown as string | null }, afterStart)).toBe(false)
  })

  it('is paid inside the window and not after it', () => {
    expect(isProjectPaid(paid, new Date('2026-11-10T12:00:00Z'))).toBe(true)
    expect(isProjectPaid(paid, new Date('2027-05-10T11:59:59Z'))).toBe(true)
    expect(isProjectPaid(paid, new Date('2027-05-10T12:00:00Z'))).toBe(false)
  })

  it('accessUntil is paid_at + 6 months, clamped at month end', () => {
    expect(accessUntil(paid)?.toISOString()).toBe('2027-05-10T12:00:00.000Z')
    expect(accessUntil({ paid_at: '2026-08-31T00:00:00.000Z' })?.toISOString()).toBe('2027-02-28T00:00:00.000Z')
    expect(accessUntil({ paid_at: null })).toBeNull()
  })

  it('isAccessExpired only for projects that were paid', () => {
    expect(isAccessExpired(paid, new Date('2027-06-01T00:00:00Z'))).toBe(true)
    expect(isAccessExpired(paid, new Date('2027-01-01T00:00:00Z'))).toBe(false)
    expect(isAccessExpired({ paid_at: null }, new Date('2027-06-01T00:00:00Z'))).toBe(false)
  })
})

describe('hasFullAccess', () => {
  it('every project has full access before PAYWALL_START', () => {
    process.env.PAYWALL_START = START
    expect(hasFullAccess({ paid_at: null }, { now: beforeStart })).toBe(true)
  })

  it('after PAYWALL_START only projects inside their paid window', () => {
    process.env.PAYWALL_START = START
    expect(hasFullAccess({ paid_at: null }, { now: afterStart })).toBe(false)
    expect(hasFullAccess({ paid_at: '2026-11-15T00:00:00Z' }, { now: afterStart })).toBe(true)
    expect(hasFullAccess({ paid_at: '2026-01-01T00:00:00Z' }, { now: afterStart })).toBe(false) // expired
  })
})

describe('hasFullAccess — unlimited (comp) owners', () => {
  it('unlimited owner has full access without paid_at, after the start date and past any window', () => {
    process.env.PAYWALL_START = START
    expect(hasFullAccess({ paid_at: null }, { unlimited: true, now: afterStart })).toBe(true)
    expect(hasFullAccess({ paid_at: '2026-01-01T00:00:00Z' }, { unlimited: true, now: afterStart })).toBe(true)
  })

  it('normal owners are unchanged', () => {
    process.env.PAYWALL_START = START
    expect(hasFullAccess({ paid_at: null }, { unlimited: false, now: afterStart })).toBe(false)
    expect(hasFullAccess({ paid_at: null }, { now: afterStart })).toBe(false)
  })
})

describe('countUnpaidProjects (free project cap)', () => {
  it('counts unpaid and expired projects, not paid ones; none before the start date', () => {
    process.env.PAYWALL_START = START
    const projects = [
      { paid_at: null },
      { paid_at: null },
      { paid_at: '2026-11-15T00:00:00Z' },  // paid, in window
      { paid_at: '2026-01-01T00:00:00Z' },  // expired → counts
    ]
    expect(countUnpaidProjects(projects, afterStart)).toBe(3)
    expect(countUnpaidProjects(projects, beforeStart)).toBe(0)
  })
})
