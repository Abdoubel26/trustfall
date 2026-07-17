import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";


const globalForDb = globalThis as unknown as { pool: Pool | undefined }

const pool = globalForDb.pool ?? new Pool({ connectionString: process.env.DATABASE_URL})

if(process.env.NODE_ENV !== "production"){
    globalForDb.pool = pool; 
}

export const db = drizzle({client: pool});