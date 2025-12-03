// backend/src/__tests__/auth.test.ts
// ⚠️ Tests générés avec l'aide d'une IA (ChatGPT) pour la démo vidéo.
// Tests unitaires basiques pour l'authentification

import bcrypt from "bcryptjs";

describe("Authentication", () => {
  it("should hash password correctly", () => {
    const password = "test123";
    const hash = bcrypt.hashSync(password, 10);
    expect(bcrypt.compareSync(password, hash)).toBe(true);
  });

  it("should reject incorrect password", () => {
    const password = "test123";
    const hash = bcrypt.hashSync(password, 10);
    expect(bcrypt.compareSync("wrongpassword", hash)).toBe(false);
  });

  it("should generate different hashes for same password", () => {
    const password = "test123";
    const hash1 = bcrypt.hashSync(password, 10);
    const hash2 = bcrypt.hashSync(password, 10);
    expect(hash1).not.toBe(hash2);
    // But both should verify
    expect(bcrypt.compareSync(password, hash1)).toBe(true);
    expect(bcrypt.compareSync(password, hash2)).toBe(true);
  });
});

