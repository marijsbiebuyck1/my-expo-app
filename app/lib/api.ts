import * as SecureStore from "expo-secure-store";

const BASE = "https://my-express-app-ne4l.onrender.com";

async function buildHeaders(
  isAdmin = false,
  extra: Record<string, string> = {}
) {
  const tokenKey = isAdmin ? "adminToken" : "userToken";
  const token = await SecureStore.getItemAsync(tokenKey);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...extra,
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export async function apiFetch(
  path: string,
  opts: RequestInit = {},
  isAdmin = false
) {
  const url = path.startsWith("http") ? path : BASE + path;
  const headers = await buildHeaders(
    isAdmin,
    (opts.headers as Record<string, string>) || {}
  );
  const merged: RequestInit = { ...opts, headers };
  return fetch(url, merged);
}

export const api = {
  get: (path: string, isAdmin = false) =>
    apiFetch(path, { method: "GET" }, isAdmin),
  post: (path: string, body: any, isAdmin = false) =>
    apiFetch(
      path,
      {
        method: "POST",
        body: typeof body === "string" ? body : JSON.stringify(body),
      },
      isAdmin
    ),
  patch: (path: string, body: any, isAdmin = false) =>
    apiFetch(
      path,
      {
        method: "PATCH",
        body: typeof body === "string" ? body : JSON.stringify(body),
      },
      isAdmin
    ),
  del: (path: string, isAdmin = false) =>
    apiFetch(path, { method: "DELETE" }, isAdmin),
};
