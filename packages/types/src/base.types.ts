export type NonEmptyArray<T> = [T, ...T[]]

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  totalCount: number;
}
