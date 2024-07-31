import type { Store } from "../vars";
import { bulkQuery, createBulkImport, pollForBulkResult } from "./bulk";

export type Collection = {
  id: string;
  title: string;
  seo: {
    title: string;
    description: string;
  };
};

export async function bulkQueryCollections(store: Store) {
  await bulkQuery({
    store,
    query: /* GraphQL */ `
      query {
        collections {
          edges {
            node {
              id
              title
              seo {
                title
                description
              }
            }
          }
        }
      }
    `,
  });

  const collections = await pollForBulkResult<Collection>({ store });
  return collections;
}

export async function bulkUpdateCollections(
  store: Store,
  collections: Collection[],
) {
  await createBulkImport({
    store,
    mutation: /* GraphQL */ `
      mutation ($input: CollectionInput!) {
        collectionUpdate(input: $input) {
          collection {
            id
          }
        }
      }
    `,
    text: collections
      .map((c) => ({ input: { id: c.id, seo: c.seo } }))
      .map((p) => JSON.stringify(p))
      .join("\n"),
  });
  await pollForBulkResult({ store, mutation: true });
}
