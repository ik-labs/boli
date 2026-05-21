import Dexie, { type EntityTable } from "dexie";
import type { User, UsualItem, Order, ConsentLog } from "@/types";

const db = new Dexie("BoliDB") as Dexie & {
  users: EntityTable<User, "id">;
  usualItems: EntityTable<UsualItem, "id">;
  orders: EntityTable<Order, "id">;
  consentLogs: EntityTable<ConsentLog, "id">;
};

db.version(1).stores({
  users: "id, email, tier",
  usualItems: "++id, userId, name",
  orders: "++id, userId, status, createdAt",
  consentLogs: "++id, userId, action, createdAt",
});

export { db };
