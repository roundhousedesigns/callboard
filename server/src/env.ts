/**
 * Load .env from project root before any other modules (e.g. db.ts) run.
 * Must be imported first in index.ts.
 */
import path from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, "../../.env") });
