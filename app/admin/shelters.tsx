import { Link } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, View } from "react-native";
import LogoHeader from "../../components/logo-header";
import { ThemedText } from "../../components/themed-text";
import { ThemedView } from "../../components/themed-view";
import { api } from "../lib/api";

export default function AdminShelters() {
  const [shelters, setShelters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchShelters();
  }, []);

  async function fetchShelters() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/asielen");
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data = await res.json();
      setShelters(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err?.message || "Fout bij ophalen van asielen");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <LogoHeader style={styles.logo} width={140} height={36} />
      <ThemedText type="title">Asielen</ThemedText>

      {loading && <ActivityIndicator style={{ marginTop: 20 }} />}

      {error && <ThemedText style={styles.error}>{error}</ThemedText>}

      {!loading && !error && (
        <FlatList
          data={shelters}
          keyExtractor={(item) => item._id || item.id || item.email}
          renderItem={({ item }) => (
            <View style={styles.item}>
              <ThemedText type="subtitle">{item.name}</ThemedText>
              <ThemedText>{item.email}</ThemedText>
              <Link
                href={`/admin/shelters/${item._id}` as any}
                style={styles.link}
              >
                Open
              </Link>
            </View>
          )}
          contentContainerStyle={{ paddingBottom: 40 }}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 40, alignItems: "center" },
  logo: { marginBottom: 8 },
  item: {
    width: "92%",
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    backgroundColor: "rgba(0,0,0,0.03)",
  },
  link: { marginTop: 8, color: "#000000" },
  error: { marginTop: 16, color: "#cc0000" },
});
