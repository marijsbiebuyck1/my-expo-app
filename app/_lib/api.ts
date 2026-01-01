import * as SecureStore from "expo-secure-store";
import { getDeviceKey } from "./deviceKey";

// Public base for the main API and a separate admin base. Change these to your deployed URLs.
const BASE = "https://my-express-app-ne4l.onrender.com";
export const ADMIN_BASE = "https://my-express-app-ne4l.onrender.com"; // replace with your admin service URL when separate

async function buildHeaders(
  isAdmin = false,
  extra: Record<string, string> = {}
) {
  // Do not force a Content-Type here — some requests (FormData) must omit it
  const tokenKey = isAdmin ? "adminToken" : "userToken";
  const token = await SecureStore.getItemAsync(tokenKey);
  const headers: Record<string, string> = {
    ...extra,
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (isAdmin) {
    try {
      const rawAdmin = await SecureStore.getItemAsync("admin");
      let parsed: Record<string, any> | null = null;
      if (rawAdmin) {
        try {
          parsed = JSON.parse(rawAdmin);
        } catch {
          parsed = null;
        }
      }
      let adminId =
        parsed?.id ??
        parsed?._id ??
        parsed?.shelterId ??
        parsed?.adminId ??
        null;
      if (!adminId) {
        const storedId = await SecureStore.getItemAsync("adminId");
        if (storedId) adminId = storedId;
      }
      if (adminId) headers["X-Shelter-Id"] = String(adminId);

      const adminName =
        parsed?.name ||
        parsed?.contactPerson ||
        parsed?.shelterName ||
        parsed?.displayName;
      if (adminName) headers["X-Shelter-Name"] = String(adminName);
    } catch (err) {
      console.warn("Failed to attach admin headers", err);
    }
  }
  try {
    const deviceKey = await getDeviceKey();
    if (deviceKey) headers["X-Device-Key"] = deviceKey;
  } catch (err) {
    console.warn("Failed to attach device key header", err);
  }
  return headers;
}

export async function apiFetch(
  path: string,
  opts: RequestInit = {},
  isAdmin = false
) {
  const base = isAdmin ? ADMIN_BASE : BASE;
  const url = path.startsWith("http") ? path : base + path;
  const headers = await buildHeaders(
    isAdmin,
    (opts.headers as Record<string, string>) || {}
  );
  // Debug log request details in development to help trace missing-body issues
  try {
    // safe stringify of body when possible
    const bodyPreview = opts && (opts as any).body;
    if (typeof global !== "undefined" && (global as any).__DEV__) {
      console.debug("apiFetch ->", {
        method: opts.method || "GET",
        url,
        headers,
        bodyPreview,
      });
    }
  } catch {
    /* ignore logging errors */
  }
  const merged: RequestInit = { ...opts, headers };
  return fetch(url, merged);
}

export const api = {
  get: (path: string, isAdmin = false) =>
    apiFetch(path, { method: "GET" }, isAdmin),
  post: (path: string, body: any, isAdmin = false) => {
    // If body is FormData (multipart), don't set Content-Type so fetch can add the boundary.
    const isForm = typeof FormData !== "undefined" && body instanceof FormData;
    const payload = isForm
      ? body
      : typeof body === "string"
      ? body
      : JSON.stringify(body);
    const headers: Record<string, string> = isForm
      ? {}
      : { "Content-Type": "application/json" };
    return apiFetch(path, { method: "POST", body: payload, headers }, isAdmin);
  },
  patch: (path: string, body: any, isAdmin = false) => {
    const isForm = typeof FormData !== "undefined" && body instanceof FormData;
    const payload = isForm
      ? body
      : typeof body === "string"
      ? body
      : JSON.stringify(body);
    const headers: Record<string, string> = isForm
      ? {}
      : { "Content-Type": "application/json" };
    return apiFetch(path, { method: "PATCH", body: payload, headers }, isAdmin);
  },
  del: (path: string, isAdmin = false) =>
    apiFetch(path, { method: "DELETE" }, isAdmin),
};
