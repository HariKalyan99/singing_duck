import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { ConvexHttpClient } from "convex/browser";

// Fix __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root (server folder)
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

let convex;

export function getConvex() {
  if (!convex) {
    console.log("Loaded CONVEX_URL:", process.env.CONVEX_URL); // debug

    if (!process.env.CONVEX_URL) {
      throw new Error("CONVEX_URL missing");
    }

    convex = new ConvexHttpClient(process.env.CONVEX_URL);
  }
  return convex;
}
