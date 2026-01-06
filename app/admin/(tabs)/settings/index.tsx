import { ThemedText } from "@/components/themed-text";
// image upload utilities removed (upload button removed from UI)
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import LogoHeader from "../../../../components/logo-header";
import { ADMIN_BASE, api } from "../../../_lib/api";
import { useAdminAuth } from "../../../_lib/useAuth";
// minimal settings page for admin (shelter): avatar, change button, name, delete account

export default function SettingsScreen() {
  const router = useRouter();
  const { admin, clear } = useAdminAuth();
  const [shelter, setShelter] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  // upload UI removed per request

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (admin && mounted) {
          setShelter(admin);
        } else {
          const raw = await SecureStore.getItemAsync("admin");
          if (!mounted) return;
          if (raw) {
            try {
              setShelter(JSON.parse(raw));
            } catch {
              setShelter(null);
            }
          } else setShelter(null);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [admin]);

  // upload helper removed; upload button is not part of this view anymore

  async function deleteAccount() {
    Alert.alert('Account verwijderen', 'Weet je zeker dat je dit asiel-account wilt verwijderen? Dit kan niet ongedaan gemaakt worden.', [
      { text: 'Annuleren', style: 'cancel' },
      { text: 'Verwijder', style: 'destructive', onPress: async () => {
        try {
          const id = admin?.id || admin?._id || shelter?.id || shelter?._id || (await SecureStore.getItemAsync('adminId'));
          if (!id) throw new Error('Asiel-id niet gevonden');
          const res = await api.del(`/asielen/${id}`, true);
          if (!res.ok) {
            const t = await res.text().catch(() => '');
            throw new Error(t || `Status ${res.status}`);
          }
          try { await clear(); } catch {}
          router.replace('/login');
        } catch (err: any) {
          console.warn('delete failed', err);
          Alert.alert('Verwijderen mislukt', String(err?.message || err));
        }
      } }
    ]);
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.screen}>
        <LogoHeader />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator />
        </View>
      </SafeAreaView>
    );
  }

  const displayName = shelter?.name || shelter?.displayName || '-';
  // consider several server-side fields (profileImage, photo, avatar, image)
  const photo = shelter && (shelter.profileImage || shelter.photo || shelter.photoUrl || shelter.avatar || shelter.image)
    ? String(shelter.profileImage || shelter.photo || shelter.photoUrl || shelter.avatar || shelter.image)
    : null;
  let displayPhotoUri: string | null = photo;
  if (displayPhotoUri && !displayPhotoUri.startsWith('http')) {
    if (displayPhotoUri.startsWith('/')) displayPhotoUri = ADMIN_BASE + displayPhotoUri;
    else displayPhotoUri = ADMIN_BASE + '/' + displayPhotoUri;
  }

  // no local preview / photo shown in this view per design change

  // derive contact fields defensively from possible backend keys
  const address =
    shelter?.address || shelter?.adres || shelter?.location?.address || shelter?.street || null;
  const email = shelter?.email || shelter?.contactEmail || shelter?.mail || null;
  const phone = shelter?.phone || shelter?.telefoon || shelter?.phoneNumber || shelter?.contactPhone || null;

  // Helpers to render contact values safely (strings, arrays or objects)
  const formatValue = (val: any) => {
    if (val == null) return '-';
    if (typeof val === 'string') return val;
    if (Array.isArray(val)) return val.filter(Boolean).join(', ');
    if (typeof val === 'object') {
      // common address shapes may have street/name/number/postcode/city
      const keys = ['street', 'straat', 'line1', 'address', 'streetName', 'name'];
      const parts: string[] = [];
      for (const k of keys) {
        if (val[k]) parts.push(String(val[k]));
      }
      // fallback: include any string values present on the object
      if (!parts.length) {
        for (const v of Object.values(val)) {
          if (typeof v === 'string' && v.trim()) parts.push(v.trim());
        }
      }
      return parts.length ? parts.join(', ') : JSON.stringify(val);
    }
    return String(val);
  };

  const addressText = formatValue(address);
  const emailText = formatValue(email);
  const phoneText = formatValue(phone);

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <LogoHeader />
      <View style={styles.container}>
        <View style={styles.card}>
          <ThemedText type="title" style={{ marginBottom: 12 }}>Asiel</ThemedText>
          <View style={styles.infoBlock}>
            <ThemedText type="subtitle" style={styles.nameText}>{displayName}</ThemedText>

            <View style={styles.infoRow}>
              <ThemedText style={styles.infoLabel}>Adres</ThemedText>
              <ThemedText>{addressText}</ThemedText>
            </View>

            <View style={styles.infoRow}>
              <ThemedText style={styles.infoLabel}>E-mail</ThemedText>
              <ThemedText>{emailText}</ThemedText>
            </View>

            <View style={styles.infoRow}>
              <ThemedText style={styles.infoLabel}>Telefoon</ThemedText>
              <ThemedText>{phoneText}</ThemedText>
            </View>
            <TouchableOpacity style={styles.logoutBtn}>
              <ThemedText style={{ color: '#fff' }}>Uitloggen</ThemedText>
            </TouchableOpacity>

            <TouchableOpacity style={styles.deleteBtn} onPress={deleteAccount}>
              <ThemedText style={{ color: '#037D4E' }}>Account verwijderen</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FBF4E2" },
  container: { padding: 20 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  nameText: {
    fontSize: 20,
    marginBottom: 40,
    textAlign: 'center',
  },

  logoutBtn: {
    backgroundColor: '#037D4E',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 40,
    marginTop: 12,
    alignSelf: 'stretch',
    alignItems: 'center',
    marginBottom: 12,
  },

  deleteBtn: {
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: '#037D4E',
    marginTop: 0,
    alignSelf: 'stretch',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  infoBlock: {
    width: '100%',
    alignItems: 'flex-start',
    paddingTop: 6,
  },
  infoRow: {
    width: '100%',
    marginBottom: 32,
  },
  infoLabel: {
    fontSize: 16,
    color: '#000',
    marginBottom: 4,
    fontFamily: 'Montserrat_600SemiBold',
  },
});

export const options = {
  title: "Profiel",
  tabBarLabel: "Profile",
};
