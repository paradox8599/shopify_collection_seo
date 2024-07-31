import fs from "fs";
import { stringify, parse } from "yaml";
import readline from "readline";
import { INSTRUCTION, STORES, type Store } from "./src/vars";
import {
  bulkQueryCollections,
  bulkUpdateCollections,
  type Collection,
} from "./src/shopify/collection";
import { askAll } from "./src/openai";

const DATA_FILE = "output_collections.yaml";

async function prompt(text: string): Promise<string> {
  return new Promise((res) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(text, (ans) => {
      res(ans.trim());
      rl.close();
    });
  });
}

async function promptForStore() {
  let i = -1;
  while (i < 0) {
    const itext = await prompt(
      "Select store:\n" +
        STORES.stores.map((s, i) => ` ${i + 1}. ${s.name}\n`).join(),
    );
    const inum = Number.parseInt(itext);
    if (Number.isNaN(inum)) continue;
    if (inum < 1 || inum > STORES.stores.length) continue;
    i = inum - 1;
  }
  return STORES.stores[i];
}

function yamlExists() {
  return fs.existsSync(DATA_FILE);
}

type YamlData = { store: Store; collections: Collection[] };

function fromYaml(): YamlData | undefined {
  if (yamlExists()) {
    const data = fs.readFileSync(DATA_FILE, "utf8");
    return parse(data);
  }
}

function toYaml(data: YamlData) {
  rmYaml();
  fs.writeFileSync(DATA_FILE, stringify(data));
}

function rmYaml() {
  if (yamlExists()) {
    fs.rmSync(DATA_FILE);
  }
}

async function generate() {
  const store = await promptForStore();
  let collections = await bulkQueryCollections(store);

  console.log(collections.map((c) => c.title).join("\n"));

  // generate seo title & desc
  const res = (
    await askAll({
      instructions: [INSTRUCTION],
      prompts: collections.map((c, i) => ({ title: c.title, id: i })),
    })
  ).flat() as {
    SEOTitle: string;
    SEODescription: string;
    id: number;
    title: string;
  }[];

  // validate & mapping
  if (res.length !== collections.length) {
    throw new Error("Collection data mismatch");
  }
  collections = collections.map((c, i) => {
    const r = res[i];
    return {
      ...c,
      seo: {
        title: r.SEOTitle,
        description: r.SEODescription,
      },
    };
  });

  toYaml({ store, collections });

  let opt = "";
  while (opt !== "1" && opt !== "2") {
    opt = await prompt(
      "1. Stop script and review generated output\n2. Continue upload?\n",
    );
    opt = opt.trim();
  }
  return opt;
}

async function collection_seo() {
  if (!yamlExists()) {
    const opt = await generate();
    if (opt === "1") return;
  } else {
    await prompt(`${DATA_FILE} found, start uploading? (Ctrl + C to stop)`);
  }
  const data = fromYaml();
  if (!data) {
    console.log(`No data found in ${DATA_FILE}`);
    return;
  }
  console.log(
    `[${data.store.name}] Updating ${data.collections.length} collections...`,
  );
  await bulkUpdateCollections(data.store, data.collections);
  rmYaml();
}

collection_seo();
