import * as SecureStore from "expo-secure-store";

const STORAGE_KEY = "matchedAnimals:v1";
let cache: string[] | null = null;
const listeners: ((ids: string[]) => void)[] = [];

async function loadCache() {
  if (cache !== null) return cache;
  try {
    const raw = await SecureStore.getItemAsync(STORAGE_KEY);
    if (raw) {
      cache = JSON.parse(raw);
    } else {
      cache = [];
    }
  } catch {
    cache = [];
  }
  return cache;
}

export async function getMatchedIds(): Promise<string[]> {
  const c = await loadCache();
  return c || [];
}

async function persist() {
  try {
    await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(cache || []));
  } catch {
    // ignore
  }
}

export async function addMatched(id: string) {
  if (!id) return;
  const c = (await loadCache()) || [];
  const sid = String(id);
  if (c.includes(sid)) return;
  c.unshift(sid);
  cache = c;
  await persist();
  listeners.forEach((l) => l(c.slice()));
}

export function subscribeMatched(cb: (ids: string[]) => void) {
  listeners.push(cb);
  // deliver current
  (async () => cb(await getMatchedIds()))();
  return () => {
    const idx = listeners.indexOf(cb);
    if (idx !== -1) listeners.splice(idx, 1);
  };
}

export async function clearMatched() {
  cache = [];
  await persist();
  listeners.forEach((l) => l([]));
}
