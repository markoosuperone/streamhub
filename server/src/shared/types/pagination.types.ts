import Type from "typebox";

export interface PaginationQueryDTO {
  limit: number;
  offset: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}
export const PaginationQueryString = Type.Object({
  limit: Type.Optional(
    Type.Integer({
      minimum: 1,
      maximum: 100,
    })
  ),
  offset: Type.Optional(
    Type.Integer({
      minimum: 0,
    })
  ),
});
