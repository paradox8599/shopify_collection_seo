import { shopifyAPI, type Store } from "../vars";

type GraphqlResponse<T> = {
  data: { errors: unknown } & T;
  errors: string;
  extensions: {
    cost: {
      requestedQueryCost: number;
      actualQueryCost: number;
      throttleStatus: {
        maximumavailable: number;
        currentlyAvailable: number;
        restoreRate: number;
      };
    };
  };
};

type Throttle = { lastRequest: Date; availability: number };
const initThrottle = { lastRequest: new Date(), availability: 2000 };
const allThrottles: { [key: string]: Throttle } = {};

async function throttle(name: string) {
  const throttle = allThrottles[name] ?? initThrottle;
  // wait until availability is above 1000
  if (throttle.availability < 500) {
    console.log("Throttling...");
    await new Promise((resolve) => setTimeout(resolve, 10 * 1000));
  }
  // calculate restored cost
  const diff = new Date().getTime() - throttle.lastRequest.getTime();
  const restored = (diff / 1000) * 100;
  throttle.availability += restored;
}

function setThrottle(name: string, value: number) {
  allThrottles[name] = { lastRequest: new Date(), availability: value };
}

export async function graphql<T>({
  store,
  query,
  variables,
}: {
  store: Store;
  query: string;
  variables?: unknown;
}) {
  await throttle(store.name);
  const r = await fetch(shopifyAPI(store.name), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": store.token,
    },
    body: JSON.stringify({
      query: query
        .replace(/(\r\n|\n|\r|\t)/gm, " ")
        .replace(/ {2,}/g, " ")
        .trim(),
      variables,
    }),
  });
  const data = (await r.json()) as GraphqlResponse<T>;
  if (data.errors) {
    throw new Error(JSON.stringify({ error: data, query, variables }, null, 2));
  }

  setThrottle(
    store.name,
    data.extensions.cost.throttleStatus.currentlyAvailable ?? 0,
  );
  return data.data as T;
}
