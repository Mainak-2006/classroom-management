export interface MessageResponse<T> {
  message: string;
  data: T;
}

export interface PaginatedResponse<T> {
  total: number;
  data: T[];
}
