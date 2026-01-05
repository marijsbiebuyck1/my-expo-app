import * as SecureStore from "expo-secure-store";

export type LocalConversation = {
  id: string;
  name: string;
  lastMessage?: string;
  avatar?: string | null;
  conversationId?: string | null;
};

const STORAGE_KEY = "local-conversations-v1";
let items: LocalConversation[] = [];
const listeners: ((items: LocalConversation[]) => void)[] = [];
let rehydrated = false;
let secureStoreAvailable = true;

type WebStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

const webStorage: WebStorage | null =
  typeof globalThis !== "undefined" && (globalThis as any)?.localStorage
    ? ((globalThis as any).localStorage as WebStorage)
    : null;

function notify() {
  const snapshot = items.slice();
  listeners.forEach((l) => {
    try {
      l(snapshot);
    } catch (err) {
      console.warn("localConversations listener failed", err);
    }
  });
}

async function persist() {
  const payload = JSON.stringify(items);
  if (secureStoreAvailable) {
    try {
      await SecureStore.setItemAsync(STORAGE_KEY, payload);
    } catch (err) {
      secureStoreAvailable = false;
      console.warn("Persist local conversations (secure) failed", err);
    }
  }
  if (webStorage) {
    try {
      webStorage.setItem(STORAGE_KEY, payload);
    } catch (err) {
      console.warn("Persist local conversations (web) failed", err);
    }
  }
}

async function rehydrateIfNeeded() {
  if (rehydrated) return;
  rehydrated = true;
  try {
    let raw: string | null = null;
    if (secureStoreAvailable) {
      raw = await SecureStore.getItemAsync(STORAGE_KEY);
    }
    if (!raw && webStorage) {
      raw = webStorage.getItem(STORAGE_KEY);
    }
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        items = parsed.filter((entry) => entry && entry.id);
      }
    }
  } catch (err) {
    console.warn("Rehydrate local conversations failed", err);
  } finally {
    notify();
  }
}

rehydrateIfNeeded();

export function getLocalConversations() {
  return items.slice();
}

export function addLocalConversation(conv: LocalConversation) {
  items = [conv, ...items.filter((c) => c.id !== conv.id)];
  notify();
  persist();
}

export function clearLocalConversations() {
  items = [];
  notify();
  persist();
}

export function removeLocalConversation(id: string) {
  items = items.filter((c) => c.id !== id);
  notify();
  persist();
}

export function subscribeLocalConversations(
  cb: (items: LocalConversation[]) => void
) {
  listeners.push(cb);
  cb(items.slice());
  return () => {
    const idx = listeners.indexOf(cb);
    if (idx !== -1) listeners.splice(idx, 1);
  };
}
