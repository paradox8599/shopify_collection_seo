import fs from "fs";
import { parse } from "yaml";

function parses(s: string | undefined) {
  return s?.startsWith('"') ? JSON.parse(s ?? "") : (s ?? "");
}

export const DEV = process.env.NODE_ENV === "development";

export type Store = { name: string; token: string };
type Stores = { stores: Store[]; version: string };
export const STORES: Stores = parse(fs.readFileSync("stores.yaml", "utf8"));

export function shopifyAPI(storeName: string) {
  return `https://${parses(storeName)}.myshopify.com/admin/api/${STORES.version}/graphql.json`;
}
