import { pgTable, uuid } from "drizzle-orm/pg-core";


export const waitingUsers = pgTable("waiting_users", {
    id: uuid("id").primaryKey().defaultRandom(),
});