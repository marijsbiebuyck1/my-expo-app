import { Slot, useRouter, useSegments } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
  View,
} from "react-native";
import LogoHeader from "../../components/logo-header";
import { getAdminToken } from "../lib/useAuth";

export default function AdminLayout() {
  const router = useRouter();
  const segments = useSegments();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const token = await getAdminToken();
        // allow a small set of public admin routes (registration / login) without forcing login
        const publicRoutes = [
          "login",
          "register-owner",
          "register-interests",
          "register-pet",
          "register-home",
          "modal",
        ];
        const segs = (segments as any) || [];
        const onPublic = publicRoutes.some((p) => segs.includes(p));

        if (!token && !onPublic) {
          router.replace("/admin/login");
        }
      } finally {
        if (mounted) setChecking(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [router, segments]);

  if (checking) {
    return (
      <SafeAreaView style={styles.root}>
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <LogoHeader width={120} height={28} />
      </View>
      <View style={styles.content}>
        <Slot />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FFFDF8" },
  header: { height: 80, alignItems: "center", justifyContent: "center" },
  content: { flex: 1 },
});
