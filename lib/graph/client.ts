// Memgraph connection for server code (the agent's graph tools). See docs/memgraph/README.md, Lesson 8.
import neo4j, { type Driver } from "neo4j-driver";

export class GraphUnavailableError extends Error {}

/** Local dev falls back to the Docker instance. In production the graph is off unless MEMGRAPH_URI is set. */
function graphUri() {
  return process.env.MEMGRAPH_URI || (process.env.NODE_ENV === "production" ? undefined : "bolt://localhost:7687");
}

let driver: Driver | undefined;

/** One driver per process. It holds a connection pool, so never create one per request. */
function graphDriver(): Driver {
  const uri = graphUri();
  if (!uri) throw new GraphUnavailableError("MEMGRAPH_URI is not set");
  driver ??= neo4j.driver(
    uri,
    neo4j.auth.basic(process.env.MEMGRAPH_USER ?? "", process.env.MEMGRAPH_PASSWORD ?? ""),
    {
      // Plain JS numbers instead of the driver's 64-bit Integer objects.
      disableLosslessIntegers: true,
      // Fail fast when Memgraph is down, so the agent can fall back to search_products.
      // executeRead otherwise retries a lost connection for 30 s before giving up.
      connectionTimeout: 3_000,
      connectionAcquisitionTimeout: 3_000,
      maxTransactionRetryTime: 2_000,
    },
  );
  return driver;
}

/** Run a read query and get one plain object per row. Connection failures become GraphUnavailableError. */
export async function runRead<T = Record<string, unknown>>(
  query: string,
  params: Record<string, unknown> = {},
): Promise<T[]> {
  const session = graphDriver().session({ defaultAccessMode: neo4j.session.READ });
  try {
    const res = await session.executeRead((tx) => tx.run(query, params), { timeout: 5_000 });
    return res.records.map((r) => r.toObject() as T);
  } catch (err) {
    if (err instanceof neo4j.Neo4jError && err.code === "ServiceUnavailable") {
      throw new GraphUnavailableError(err.message);
    }
    throw err;
  } finally {
    await session.close();
  }
}

/** Cypher LIMIT needs a real integer; JS numbers are sent as floats. */
export const int = (n: number) => neo4j.int(Math.trunc(n));
