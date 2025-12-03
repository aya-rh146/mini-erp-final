// backend/src/__tests__/schema.test.ts
// ⚠️ Tests générés avec l'aide d'une IA (ChatGPT) pour la démo vidéo.
// Tests basiques pour vérifier la structure du schéma

import { users, leads, clients, products, claims } from "../../db/schema";

describe("Database Schema", () => {
  it("should have users table with correct fields", () => {
    expect(users).toBeDefined();
    expect(users.id).toBeDefined();
    expect(users.email).toBeDefined();
    expect(users.password).toBeDefined();
    expect(users.role).toBeDefined();
  });

  it("should have leads table", () => {
    expect(leads).toBeDefined();
    expect(leads.id).toBeDefined();
    expect(leads.name).toBeDefined();
  });

  it("should have clients table", () => {
    expect(clients).toBeDefined();
    expect(clients.id).toBeDefined();
    expect(clients.userId).toBeDefined();
  });

  it("should have products table", () => {
    expect(products).toBeDefined();
    expect(products.id).toBeDefined();
    expect(products.name).toBeDefined();
  });

  it("should have claims table", () => {
    expect(claims).toBeDefined();
    expect(claims.id).toBeDefined();
    expect(claims.title).toBeDefined();
    expect(claims.status).toBeDefined();
  });
});

