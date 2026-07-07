import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import "@testing-library/jest-dom/vitest";

const root = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(root, ".env"), quiet: true });
config({ path: path.join(root, ".env.local"), override: true, quiet: true });
