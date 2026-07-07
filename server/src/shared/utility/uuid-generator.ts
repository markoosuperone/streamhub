import { v7 as uuidv7 } from "uuid";

export interface IUuidGenerator {
  generate(): string;
}

export class UuidGenerator implements IUuidGenerator {
  generate(): string {
    return uuidv7();
  }
}
