import { Slot } from "expo-router";
import React from "react";
import { SafeAreaView, StyleSheet, View } from "react-native";
import LogoHeader from "../../components/logo-header";

export default function AdminLayout() {
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
