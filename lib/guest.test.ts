import { describe, expect, it } from 'vitest'
import {
  GUEST_CLAIM_TTL_SECONDS,
  guestProjectPath,
  guestRunsUsed,
  isGuest,
  memberOnlyRedirect,
  signGuestClaim,
  verifyGuestClaim,
} from './guest'

const P = '11111111-2222-3333-4444-555555555555'
const G = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
const SECRET = 'test-secret'
const NOW = Date.UTC(2026, 10, 11, 12, 0, 0)

describe('who may use member-only pages', () => {
  it('sends nobody to sign-in, a guest to /guest, and lets members through', () => {
    expect(memberOnlyRedirect(null)).toBe('/login')
    expect(memberOnlyRedirect({ is_anonymous: true })).toBe('/guest')
    expect(memberOnlyRedirect({ is_anonymous: false })).toBeNull()
    expect(memberOnlyRedirect({} as { is_anonymous?: boolean })).toBeNull()
  })
  it('knows a guest', () => {
    expect(isGuest({ is_anonymous: true })).toBe(true)
    expect(isGuest({ is_anonymous: false })).toBe(false)
    expect(isGuest(null)).toBe(false)
  })
})

describe('guestProjectPath', () => {
  it('goes to the save screen after Gate 1, else to the brief', () => {
    expect(guestProjectPath(P, true)).toBe(`/project/${P}/refined?save=1`)
    expect(guestProjectPath(P, false)).toBe(`/project/${P}/brief`)
  })
})

describe('guestRunsUsed', () => {
  it('counts runs per step, treating junk as zero', () => {
    expect(guestRunsUsed(undefined, 'brief')).toBe(0)
    expect(guestRunsUsed({ brief: 2 }, 'brief')).toBe(2)
    expect(guestRunsUsed({ brief: 2 }, 'refined')).toBe(0)
    expect(guestRunsUsed({ refined: -1 }, 'refined')).toBe(0)
  })
})

describe('guest claim cookie', () => {
  it('round-trips', () => {
    const v = signGuestClaim(P, G, NOW, SECRET)
    expect(verifyGuestClaim(v, NOW + 1000, SECRET)).toEqual({ projectId: P, guestUserId: G })
  })
  it('expires', () => {
    const v = signGuestClaim(P, G, NOW, SECRET)
    expect(verifyGuestClaim(v, NOW + (GUEST_CLAIM_TTL_SECONDS + 5) * 1000, SECRET)).toBeNull()
  })
  it('rejects tampering, another secret and junk', () => {
    const v = signGuestClaim(P, G, NOW, SECRET)
    const other = '99999999-2222-3333-4444-555555555555'
    expect(verifyGuestClaim(v.replace(P, other), NOW, SECRET)).toBeNull()
    expect(verifyGuestClaim(v, NOW, 'other-secret')).toBeNull()
    expect(verifyGuestClaim('a.b.c.d', NOW, SECRET)).toBeNull()
    expect(verifyGuestClaim('', NOW, SECRET)).toBeNull()
    expect(verifyGuestClaim(undefined, NOW, SECRET)).toBeNull()
  })
})
