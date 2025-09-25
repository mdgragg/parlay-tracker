type CacheEntry<T> = {
  data: T;
  timestamp: number;
};

const CACHE: Record<string, CacheEntry<any>> = {};
const TTL = 1000 * 60 * 5; // 5 minutes

export async function fetchWithCache<T>(
  key: string,
  fetcher: () => Promise<T>
): Promise<T> {
  const cached = CACHE[key];

  if (cached && Date.now() - cached.timestamp < TTL) {
    console.log(`Cache hit for ${key}`);
    return cached.data;
  }

  console.log(`Cache miss for ${key}, fetching...`);
  const data = await fetcher();
  CACHE[key] = { data, timestamp: Date.now() };
  return data;
}
