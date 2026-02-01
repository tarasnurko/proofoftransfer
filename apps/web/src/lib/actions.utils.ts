type DateFields = {
  created_at?: Date | string
  [key: string]: any
}

export function serializeDates<T extends DateFields>(data: T): T & { created_at: string } {
  return {
    ...data,
    created_at: data.created_at instanceof Date ? data.created_at.toISOString() : (data.created_at as string),
  }
}

type ActionResult<T> = {
  success: boolean
  data?: T
  error?: string
}

export function mapActionResult<T extends DateFields, R = T>(
  result: ActionResult<T>,
  mapper?: (data: T) => R
): ActionResult<R> {
  if (!result.success || !result.data) {
    return { success: false, error: result.error }
  }

  const serialized = serializeDates(result.data) as unknown as R
  const mapped = mapper ? mapper(serialized as unknown as T) : serialized

  return { success: true, data: mapped }
}
