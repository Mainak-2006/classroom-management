export interface PaginationQuery {
  page?: number;
  limit?: number;
  skip?: number;
  take?: number;
}

export interface PaginationResult {
  page: number;
  limit: number;
  totalPages: number;
}

export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

export function parsePagination(query: PaginationQuery = {}): {
  skip: number;
  take: number;
} {
  const limit = Math.min(
    Math.max(Number(query.limit) || Number(query.take) || DEFAULT_LIMIT, 1),
    MAX_LIMIT,
  );
  const page = Math.max(Number(query.page) || 1, 1);
  const skip =
    query.skip !== undefined ? Number(query.skip) : (page - 1) * limit;
  return { skip, take: limit };
}

export function buildPagination(
  total: number,
  query: PaginationQuery = {},
): PaginationResult {
  const limit = Math.min(
    Math.max(Number(query.limit) || Number(query.take) || DEFAULT_LIMIT, 1),
    MAX_LIMIT,
  );
  const page = Math.max(Number(query.page) || 1, 1);
  return {
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}
