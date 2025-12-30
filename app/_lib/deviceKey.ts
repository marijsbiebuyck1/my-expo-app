import * as Application from "expo-application";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const STORE_KEY = "deviceKey";
let cachedKey: string | null = null;
let secureStoreAvailable = true;

const webStorage: any =
  typeof globalThis !== "undefined" && (globalThis as any)?.localStorage
    ? (globalThis as any).localStorage
    : null;

function hashString(input: string) {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return `hw-${Math.abs(hash)}`;
}

async function readSecureStore() {
  if (!secureStoreAvailable) return null;
  try {
    const value = await SecureStore.getItemAsync(STORE_KEY);
    return value || null;
  } catch (err) {
    secureStoreAvailable = false;
    console.warn("SecureStore unavailable for device key", err);
    return null;
  }
}

async function writeSecureStore(value: string) {
  if (!secureStoreAvailable) return;
  try {
    await SecureStore.setItemAsync(STORE_KEY, value);
  } catch (err) {
    secureStoreAvailable = false;
    console.warn("SecureStore persist failed for device key", err);
  }
}

async function readWebStorage() {
  if (!webStorage) return null;
  try {
    const value = webStorage.getItem(STORE_KEY);
    return value || null;
  } catch (err) {
    console.warn("Web storage read failed for device key", err);
    return null;
  }
}

async function writeWebStorage(value: string) {
  if (!webStorage) return;
  try {
    webStorage.setItem(STORE_KEY, value);
  } catch (err) {
    console.warn("Web storage persist failed for device key", err);
  }
}

async function deriveHardwareKey() {
  try {
    const androidId = (Application as any)?.androidId;
    if (Platform.OS === "android" && androidId) {
      return hashString(`android-${androidId}`);
    }
    if (Platform.OS === "ios") {
      const iosId = await Application.getIosIdForVendorAsync();
      if (iosId) return hashString(`ios-${iosId}`);
    }
    if (Platform.OS === "web" && typeof navigator !== "undefined") {
      const nav = navigator as Navigator;
      const raw = `${nav.userAgent || "ua"}|${nav.language || "lang"}|$${
        (nav as any).platform || "platform"
      }`;
      return hashString(`web-${raw}`);
    }
  } catch (err) {
    console.warn("Hardware-based device key derivation failed", err);
  }
  const fallback =
    Application.applicationId ||
    Application.applicationName ||
    (typeof navigator !== "undefined" ? navigator.userAgent : "anon");
  return hashString(`fallback-${fallback || "default"}`);
}

async function persistKey(value: string) {
  await Promise.allSettled([writeSecureStore(value), writeWebStorage(value)]);
}

export async function getDeviceKey() {
  if (cachedKey) return cachedKey;

  const fromSecureStore = await readSecureStore();
  if (fromSecureStore) {
    cachedKey = fromSecureStore;
    return fromSecureStore;
  }

  const fromWeb = await readWebStorage();
  if (fromWeb) {
    cachedKey = fromWeb;
    await persistKey(fromWeb);
    return fromWeb;
  }

  const derived = await deriveHardwareKey();
  cachedKey = derived;
  await persistKey(derived);
  return derived;
}
