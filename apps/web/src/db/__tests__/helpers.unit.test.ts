import { describe, it, expect } from 'vitest'
import { entityOrError, entityOrNull } from '../helpers'
import { EntityNotFoundException } from '@/exceptions'

describe('entityOrError', () => {
  it('returns entity when non-null', () => {
    expect(entityOrError({ id: 1 }, 'not found')).toEqual({ id: 1 })
  })

  it('returns first element from array', () => {
    expect(entityOrError([{ id: 1 }, { id: 2 }], 'not found')).toEqual({ id: 1 })
  })

  it('throws EntityNotFoundException for null', () => {
    expect(() => entityOrError(null, 'not found')).toThrow(EntityNotFoundException)
  })

  it('throws EntityNotFoundException for undefined', () => {
    expect(() => entityOrError(undefined, 'not found')).toThrow(EntityNotFoundException)
  })

  it('throws EntityNotFoundException for empty array', () => {
    expect(() => entityOrError([], 'not found')).toThrow(EntityNotFoundException)
  })

  it('includes error message', () => {
    expect(() => entityOrError(null, 'Claim not found')).toThrow('Claim not found')
  })
})

describe('entityOrNull', () => {
  it('returns entity when non-null', () => {
    expect(entityOrNull({ id: 1 })).toEqual({ id: 1 })
  })

  it('returns first element from array', () => {
    expect(entityOrNull([{ id: 1 }])).toEqual({ id: 1 })
  })

  it('returns null for null input', () => {
    expect(entityOrNull(null)).toBeNull()
  })

  it('returns null for undefined input', () => {
    expect(entityOrNull(undefined)).toBeNull()
  })

  it('returns null for empty array', () => {
    expect(entityOrNull([])).toBeNull()
  })
})
