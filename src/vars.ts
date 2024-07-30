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

export const OPENAI = {
  endpoint:
    (process.env.OPENAI_ENDPOINT ?? "").trim().length > 0
      ? new URL(process.env.OPENAI_ENDPOINT!)
      : undefined,
  apiKey: process.env.OPENAI_API_KEY!,
  model: process.env.OPENAI_MODEL || "gpt-3.5-turbo",
};

export const INSTRUCTION = process.env.INST!;
