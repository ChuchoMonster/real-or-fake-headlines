// Minimal in-memory stand-in for the Supabase query builder. Every chained
// call is recorded, and awaiting the query asks the test's resolver for the
// result, so tests can both control what the "database" returns and assert
// on exactly which filters a route applied.

export type QueryCall = [method: string, args: unknown[]];

export type QueryResult = {
  data?: unknown;
  error?: { message: string; code?: string } | null;
  count?: number | null;
};

export type Resolver = (table: string, calls: QueryCall[]) => QueryResult;

const CHAIN_METHODS = [
  "select",
  "insert",
  "upsert",
  "delete",
  "eq",
  "gt",
  "gte",
  "lt",
  "in",
  "order",
  "limit",
  "maybeSingle",
] as const;

export class FakeQuery implements PromiseLike<QueryResult> {
  readonly calls: QueryCall[] = [];

  constructor(
    readonly table: string,
    private readonly resolver: Resolver,
  ) {
    for (const method of CHAIN_METHODS) {
      (this as unknown as Record<string, (...args: unknown[]) => FakeQuery>)[method] = (
        ...args: unknown[]
      ) => {
        this.calls.push([method, args]);
        return this;
      };
    }
  }

  /** First argument of the first call to `method`, e.g. the rows passed to insert(). */
  arg(method: string, index = 0): unknown {
    return this.calls.find(([m]) => m === method)?.[1][index];
  }

  has(method: string, ...args: unknown[]): boolean {
    return this.calls.some(
      ([m, a]) => m === method && args.every((v, i) => Object.is(a[i], v)),
    );
  }

  then<T1 = QueryResult, T2 = never>(
    onFulfilled?: ((value: QueryResult) => T1 | PromiseLike<T1>) | null,
    onRejected?: ((reason: unknown) => T2 | PromiseLike<T2>) | null,
  ): PromiseLike<T1 | T2> {
    const result = { data: null, error: null, ...this.resolver(this.table, this.calls) };
    return Promise.resolve(result).then(onFulfilled, onRejected);
  }
}

export type FakeUser = { id: string; email?: string } | null;

export function fakeSupabase(opts: { user?: FakeUser; resolve?: Resolver } = {}) {
  const queries: FakeQuery[] = [];
  const resolve: Resolver = opts.resolve ?? (() => ({ data: [], error: null }));
  const client = {
    queries,
    auth: {
      getUser: async () => ({ data: { user: opts.user ?? null } }),
      signInWithPassword: async () => ({ error: null }),
      signOut: async () => ({ error: null }),
    },
    from(table: string) {
      const q = new FakeQuery(table, resolve);
      queries.push(q);
      return q;
    },
  };
  return client;
}

/** Value of the first eq(column, value) filter on a query, if any. */
export function eqValue(calls: QueryCall[], column: string): unknown {
  return calls.find(([m, a]) => m === "eq" && a[0] === column)?.[1][1];
}
