import Type from "typebox";

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
