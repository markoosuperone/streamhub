export class CustomError extends Error {
  statusCode: number;
  headers: Record<string, string>;

  constructor(
    message: string,
    statusCode: number = 500,
    headers: Record<string, string> = {}
  ) {
    super(message);
    this.name = new.target.name;
    this.statusCode = statusCode;
    this.headers = headers;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
