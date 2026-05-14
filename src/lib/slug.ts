import { customAlphabet } from "nanoid";

const alphabet = "0123456789abcdefghijklmnopqrstuvwxyz";

const nanoid = customAlphabet(alphabet, 10);

export function generateMatrixSlug(): string {
  return nanoid();
}

export function isValidMatrixSlug(slug: string): boolean {
  return /^[0-9a-z]{10}$/.test(slug);
}
