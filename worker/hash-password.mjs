import { webcrypto, randomBytes } from "node:crypto";

const password = process.argv[2];
const salt = process.argv[3] || randomBytes(16).toString("hex");
const iterations = Number(process.argv[4] || 210000);

if (!password) {
  console.error("Usage: node worker/hash-password.mjs <password> [salt] [iterations]");
  process.exit(1);
}

const key = await webcrypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, [
  "deriveBits",
]);
const bits = await webcrypto.subtle.deriveBits(
  {
    name: "PBKDF2",
    hash: "SHA-256",
    salt: new TextEncoder().encode(salt),
    iterations,
  },
  key,
  256,
);

const hash = [...new Uint8Array(bits)].map((byte) => byte.toString(16).padStart(2, "0")).join("");

console.log(`ADMIN_PASSWORD_SALT=${salt}`);
console.log(`PBKDF2_ITERATIONS=${iterations}`);
console.log(`ADMIN_PASSWORD_HASH=${hash}`);
