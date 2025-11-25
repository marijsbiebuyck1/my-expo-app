import * as FileSystem from "expo-file-system";
// use any to avoid type problems with different SDK typings
const CACHE_DIR = `${(FileSystem as any).cacheDirectory}images/`;

function safeFileName(uri: string) {
  // create a safe filename from the uri
  const hashed = encodeURIComponent(uri).replace(/[%/.]/g, "_");
  return hashed;
}

async function ensureCacheDir() {
  try {
    const info = await FileSystem.getInfoAsync(CACHE_DIR);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
    }
  } catch {
    // ignore
  }
}

export async function getCachedImageUri(uri: string): Promise<string> {
  if (!uri) return uri;
  // If it's already a local file or data uri, return as-is
  if (uri.startsWith("file://") || uri.startsWith("data:")) return uri;
  // Only handle http/https URIs
  if (!uri.startsWith("http")) return uri;

  await ensureCacheDir();

  const filename = safeFileName(uri);
  const path = `${CACHE_DIR}${filename}`;

  try {
    const info = await FileSystem.getInfoAsync(path);
    if (info.exists) {
      // On Android iOS this is a file:// path already
      return info.uri;
    }

    const tmp = await FileSystem.downloadAsync(uri, path);
    return tmp.uri;
  } catch {
    // If download fails, fall back to original remote uri
    return uri;
  }
}

export async function clearCachedImage(remoteUri: string) {
  try {
    if (!remoteUri || !remoteUri.startsWith("http")) return;
    const filename = safeFileName(remoteUri);
    const path = `${CACHE_DIR}${filename}`;
    const info = await FileSystem.getInfoAsync(path);
    if (info.exists) await FileSystem.deleteAsync(path, { idempotent: true });
  } catch {
    // ignore
  }
}

export async function clearAllImageCache() {
  try {
    const info = await FileSystem.getInfoAsync(CACHE_DIR);
    if (info.exists)
      await FileSystem.deleteAsync(CACHE_DIR, { idempotent: true });
  } catch {
    // ignore
  }
}

export default {
  getCachedImageUri,
  clearCachedImage,
  clearAllImageCache,
};
