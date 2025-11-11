import { Link } from "expo-router";
import React from "react";
import { StyleSheet, View } from "react-native";
import LogoHeader from "../../components/logo-header";
import { ThemedText } from "../../components/themed-text";
import { ThemedView } from "../../components/themed-view";

export default function AdminIndex() {
  return (
    <ThemedView style={styles.container}>
      <LogoHeader style={styles.logo} width={140} height={36} />
      <View style={styles.inner}>
        <ThemedText type="title">Admin dashboard</ThemedText>
        <Link href={"/admin/shelters" as any} style={styles.link}>
          Manage shelters
        </Link>
        <Link href={"/admin/users" as any} style={styles.link}>
          Manage users
        </Link>
        <Link href={"/admin/reports" as any} style={styles.link}>
          Reports & stats
        </Link>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 40, alignItems: "center" },
  logo: { marginBottom: 8 },
  inner: { marginTop: 20, width: "90%" },
  link: { marginTop: 12, color: "#1a73e8", fontSize: 16 },
});
