import type { Nullable } from '@/types'
import { EntityNotFoundException } from '@/exceptions'

export function entityOrError<T>(
  entity: Nullable<T> | T[],
  errorMessage: string
): T {
  if (Array.isArray(entity)) {
    const first = entity[0]
    if (!first) {
      throw new EntityNotFoundException(errorMessage)
    }
    return first
  }

  if (!entity) {
    throw new EntityNotFoundException(errorMessage)
  }

  return entity
}

export function entityOrNull<T>(
  entity: Nullable<T> | T[]
): T | null {
  if (Array.isArray(entity)) {
    return entity[0] ?? null
  }

  return entity ?? null
}
