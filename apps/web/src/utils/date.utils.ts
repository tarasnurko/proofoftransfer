import { MS_PER_SECOND, MS_PER_MINUTE } from '@/constants'

export const msToSeconds = (ms: number): number => {
  return Math.floor(ms / MS_PER_SECOND)
}

export const msToMinutes = (ms: number): number => {
  return Math.floor(ms / MS_PER_MINUTE)
}

export function dateToTimestamp(date?: Date): number {
  return date instanceof Date ? Math.floor(date.getTime() / MS_PER_SECOND) : 0
}
