import readline from "readline"
import { STORES } from "./src/vars";
import { bulkQueryCollections } from "./src/shopify/collection";

async function prompt(text: string): Promise<string> {
  return new Promise((res) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    })
    rl.question(text, (ans) => {
      res(ans.trim())
      rl.close();
    })
  });

}

async function promptForStore() {
  let i = -1;
  while (i < 0) {
    const itext = await prompt("Select store:\n" + STORES.stores.map((s, i) => ` ${i + 1}. ${s.name}\n`).join());
    const inum = Number.parseInt(itext);
    if (Number.isNaN(inum)) continue;
    if (inum < 1 || inum > STORES.stores.length) continue;
    i = inum - 1;
  }
  return STORES.stores[i];
}

async function main() {
  const store = await promptForStore();
}

main();
