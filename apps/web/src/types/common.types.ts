export type Nullable<T> = T | null | undefined
export type SortOrder = 'asc' | 'desc'

export interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface PaginatedResult<T> {
  data: T[]
  pagination: Pagination
}

export interface PaginationParams {
  page?: number
  limit?: number
}
