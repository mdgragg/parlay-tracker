type CacheEntry<T> = {
  data: T;
  timestamp: number;
};

const CACHE: Record<string, CacheEntry<any>> = {};
const ONGOING: Record<string, Promise<any> | undefined> = {};
const DEFAULT_TTL = 1000 * 60 * 5; // 5 minutes

export async function fetchWithCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = DEFAULT_TTL
): Promise<T> {
  const cached = CACHE[key];

  if (cached && Date.now() - cached.timestamp < ttl) {
    console.log(`Cache hit for ${key}`);
    return cached.data;
  }

  if (ONGOING[key]) {
    console.log(`Awaiting ongoing fetch for ${key}`);
    return ONGOING[key];
  }

  console.log(`Cache miss for ${key}, fetching...`);
  const promise = fetcher()
    .then((data) => {
      CACHE[key] = { data, timestamp: Date.now() };
      delete ONGOING[key];
      return data;
    })
    .catch((err) => {
      delete ONGOING[key];
      throw err;
    });

  ONGOING[key] = promise;

  // If stale exists, return stale immediately, refresh in background
  if (cached) {
    promise.catch(console.error); // background refresh
    return cached.data;
  }

  return promise;
}
