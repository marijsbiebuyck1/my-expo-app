import { Slot, useRouter, useSegments } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
// LogoHeader is rendered per-page (same behavior as user side),
// so don't render it here to avoid duplication.
import { getAdminToken } from "../_lib/useAuth";

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
          // router.replace typing is narrow in this layout context; cast to any
          router.replace("/admin/login" as any);
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
      <View style={styles.root}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.content}>
        <Slot />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FBF4E2" },
  content: { flex: 1 },
});
