import { scryptSync, timingSafeEqual } from "crypto";

/** scrypt hash of `clinicos@123` with salt `clinicos-platform-admin-v1` */
const PASSWORD_SALT = "clinicos-platform-admin-v1";
const PASSWORD_HASH_HEX = "05b93c8ca0d00bfb4ded9e62cc1a4b5ef29672a7f7f36edfaabedab1af24a2c3";

export function verifyPlatformAdminPassword(password: string): boolean {
  try {
    const hash = scryptSync(password, PASSWORD_SALT, 32);
    const expected = Buffer.from(PASSWORD_HASH_HEX, "hex");
    if (hash.length !== expected.length) return false;
    return timingSafeEqual(hash, expected);
  } catch {
    return false;
  }
}
