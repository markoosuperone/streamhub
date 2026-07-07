import { IHasher } from "@/auth/contracts/services/hasher.interface.ts";
import { HashPasswordError } from "@/auth/error/errors.ts";
import crypto from "crypto";

export class Hasher implements IHasher {
  private readonly saltLength: number = 16;
  private readonly keyLength: number = 64;

  private scryptAsync(
    value: string,
    salt: string,
    keyLength: number
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      crypto.scrypt(value, salt, keyLength, (err, derivedKey) => {
        if (err) return reject(err);
        resolve(derivedKey);
      });
    });
  }

  async hash(value: string): Promise<string> {
    try {
      const salt = crypto.randomBytes(this.saltLength).toString("hex");

      const derivedKey = await this.scryptAsync(value, salt, this.keyLength);

      const hash = derivedKey.toString("hex");
      return `${salt}:${hash}`;
    } catch {
      throw new HashPasswordError();
    }
  }

  async verify(value: string, hash: string): Promise<boolean> {
    try {
      const [salt, storedHash] = hash.split(":");
      if (!salt || !storedHash) return false;
      const derivedKey = await this.scryptAsync(value, salt, this.keyLength);
      return derivedKey.toString("hex") === storedHash;
    } catch {
      throw new HashPasswordError();
    }
  }
}
