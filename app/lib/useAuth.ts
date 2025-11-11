import * as SecureStore from "expo-secure-store";
import { useEffect, useState } from "react";

type AdminData = { id?: string | number; _id?: string | number } & Record<
  string,
  any
>;

export function useAdminAuth() {
  const [token, setToken] = useState<string | null>(null);
  const [admin, setAdmin] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const t = await SecureStore.getItemAsync("adminToken");
        const raw = await SecureStore.getItemAsync("admin");
        if (!mounted) return;
        setToken(t);
        if (raw) {
          try {
            setAdmin(JSON.parse(raw));
          } catch {
            setAdmin(null);
          }
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  async function save(authToken: string | null, adminObj?: AdminData) {
    if (authToken) await SecureStore.setItemAsync("adminToken", authToken);
    else await SecureStore.deleteItemAsync("adminToken");
    if (adminObj)
      await SecureStore.setItemAsync("admin", JSON.stringify(adminObj));
    setToken(authToken);
    setAdmin(adminObj ?? null);
  }

  async function clear() {
    await SecureStore.deleteItemAsync("adminToken");
    await SecureStore.deleteItemAsync("admin");
    await SecureStore.deleteItemAsync("adminId");
    setToken(null);
    setAdmin(null);
  }

  return { token, admin, loading, save, clear } as const;
}

export async function getAdminToken(): Promise<string | null> {
  return SecureStore.getItemAsync("adminToken");
}
