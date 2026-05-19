declare module 'bcrypt-pbkdf' {
  export function pbkdf(
    pass: Uint8Array,
    passLen: number,
    salt: Uint8Array,
    saltLen: number,
    key: Uint8Array,
    keyLen: number,
    rounds: number,
  ): void;
}
