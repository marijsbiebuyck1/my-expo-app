import * as ImagePicker from "expo-image-picker";
import * as SecureStore from "expo-secure-store";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SvgXml } from "react-native-svg";
// ...existing code...
import LogoHeader from "../../../../components/logo-header";
import { ThemedText } from "../../../../components/themed-text";
import { api } from "../../../_lib/api";
import { getCachedImageUri } from "../../../lib/imageCache";

type Post = {
  _id?: string;
  caption?: string;
  image?: string;
  author?: string | { name?: string; avatar?: string };
};

const API = "https://my-express-app-ne4l.onrender.com/posts";
const API_BASE = "https://my-express-app-ne4l.onrender.com";

export default function FeedScreen() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [posting, setPosting] = useState(false);

  const CAMERA_SVG = `
  <svg width="35" height="30" viewBox="0 0 35 30" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M34.1667 7.47396V26.6927C34.1667 28.4611 32.7319 29.8958 30.9635 29.8958H3.20312C1.43473 29.8958 0 28.4611 0 26.6927V7.47396C0 5.70557 1.43473 4.27083 3.20312 4.27083H9.07552L9.89632 2.07536C10.3634 0.827474 11.5579 0 12.8926 0H21.2674C22.602 0 23.7965 0.827474 24.2637 2.07536L25.0911 4.27083H30.9635C32.7319 4.27083 34.1667 5.70557 34.1667 7.47396ZM25.0911 17.0833C25.0911 12.6657 21.501 9.07552 17.0833 9.07552C12.6657 9.07552 9.07552 12.6657 9.07552 17.0833C9.07552 21.501 12.6657 25.0911 17.0833 25.0911C21.501 25.0911 25.0911 21.501 25.0911 17.0833ZM22.9557 17.0833C22.9557 20.3198 20.3198 22.9557 17.0833 22.9557C13.8468 22.9557 11.2109 20.3198 11.2109 17.0833C11.2109 13.8468 13.8468 11.2109 17.0833 11.2109C20.3198 11.2109 22.9557 13.8468 22.9557 17.0833Z" fill="#333"/>
  </svg>
  `;

  useEffect(() => {
    fetchPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function pickImage() {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Permission required",
          "We need access to your photos to upload a picture."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["Images"] as any,
        allowsEditing: true,
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        if (!uri) return;
        try {
          const { manipulateImage } = await import("../../../lib/imageHelpers");
          const processed = await manipulateImage(uri, true);
          if (processed.uploadUri) setImage(processed.uploadUri);
          if (processed.previewBase64) setImagePreview(processed.previewBase64);
          else setImagePreview(null);
        } catch (err) {
          console.warn("image manipulation failed, using original uri", err);
          setImage(uri);
          setImagePreview(null);
        }
      }
    } catch (err) {
      console.warn("Image picker error", err);
    }
  }

  async function takePhoto() {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Permission required",
          "We need camera access to take a photo."
        );
        return;
      }
      const { captureFromCameraOrPicker } = await import("../../../lib/imageHelpers");
      const res = await captureFromCameraOrPicker(undefined /* no cameraRef available here */);
      if (res && res.uploadUri) {
        setImage(res.uploadUri);
        setImagePreview(res.previewBase64);
      }
    } catch (err) {
      console.warn("Camera error", err);
    }
  }

  async function submitPost() {
    if (!image) {
      Alert.alert("Add an image", "Please add a photo before posting.");
      return;
    }

    setPosting(true);
    try {
      const uriParts = image.split("/");
      const name = uriParts[uriParts.length - 1];
      const match = name.match(/\.([0-9a-z]+)(?:\?|$)/i);
      const type = match ? `image/${match[1]}` : "image";

      const form = new FormData();
      // @ts-ignore - RN FormData expects a blob-like object
      form.append("image", {
        uri:
          Platform.OS === "ios" && image.startsWith("file://") ? image : image,
        name,
        type,
      });
      form.append("caption", caption || "");
      // attach currently logged-in user id as author (fallback to anonymous)
      try {
        const userId = await SecureStore.getItemAsync("userId");
        form.append("author", userId || "anon");
      } catch {
        form.append("author", "anon");
      }

      // require a logged in user (server expects Authorization header)
      const token = await SecureStore.getItemAsync("userToken");
      if (!token) {
        Alert.alert("Not logged in", "You must be logged in to upload a post.");
        setPosting(false);
        return;
      }

      const res = await fetch(API, {
        method: "POST",
        body: form as any,
        headers: {
          Accept: "application/json",
          // don't set Content-Type - let fetch add the multipart boundary
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Upload failed");
      }

      setModalVisible(false);
      setImage(null);
      setCaption("");
      fetchPosts();
    } catch (err) {
      console.warn("Post upload failed", err);
      Alert.alert("Upload failed", String(err));
    } finally {
      setPosting(false);
    }
  }

  async function fetchPosts() {
    setLoading(true);
    try {
      const res = await fetch(API);
      const data = await res.json();
      const postsArr = Array.isArray(data) ? data.reverse() : [];
      // resolve author ids into user objects for display
      const resolved = await resolveAuthors(postsArr);
      setPosts(resolved);
    } catch {
      console.warn("Failed to load posts");
    } finally {
      setLoading(false);
    }
  }

  // Persisted cache of fetched user objects so lookup survives renders
  const userCacheRef = useRef<Record<string, any>>({});
  const [me, setMe] = useState<any>(null);

  // load locally stored current user (if any) so we can resolve our own posts
  useEffect(() => {
    (async () => {
      try {
        const raw = await SecureStore.getItemAsync("user");
        if (raw) setMe(JSON.parse(raw));
      } catch {
        /* ignore */
      }
    })();
  }, []);

  async function fetchUserById(id: string) {
    if (!id) return null;
    // if this id matches the locally stored user, return it immediately
    if (me && (String(me.id) === String(id) || String(me._id) === String(id)))
      return me;
    if (userCacheRef.current[id]) return userCacheRef.current[id];
    try {
      const r = await api.get(`/users/${id}`);
      if (!r.ok) return null;
      const j = await r.json();
      const user = (Array.isArray(j) && j[0]) || j.data || j.user || j;
      userCacheRef.current[id] = user;
      return user;
    } catch {
      return null;
    }
  }

  async function resolveAuthors(postsList: Post[]) {
    const work = await Promise.all(
      postsList.map(async (p) => {
        if (!p) return p;
        if (typeof p.author === "string" && p.author) {
          const u = await fetchUserById(p.author);
          if (u)
            return {
              ...p,
              author: {
                name: u.name || u.fullName || u.email,
                avatar: u.photo || u.avatar || u.image,
              },
            };
        }
        return p;
      })
    );
    return work;
  }

  // Small helper component that resolves a remote uri to a local cached file:// uri
  function CachedImage({ uri, style }: { uri?: string; style?: any }) {
    const [local, setLocal] = useState<string | undefined>(uri);

    useEffect(() => {
      let mounted = true;
      // show the provided uri immediately (so the UI isn't blank)
      setLocal(uri);

      (async () => {
        try {
          if (!uri) return;
          const cached = await getCachedImageUri(uri);
          // if caching returned a different (local) uri, update
          if (mounted && cached && cached !== uri) setLocal(cached);
        } catch {
          /* ignore */
        }
      })();
      return () => {
        mounted = false;
      };
    }, [uri]);

    if (!uri) return null;
    return <Image source={{ uri: local }} style={style} />;
  }

  function renderPost({ item }: { item: Post }) {
    const authorName =
      typeof item.author === "object"
        ? item.author?.name || "Anon"
        : // if author is a string id, try cached lookup, otherwise show fallback
          (userCacheRef.current[String(item.author)]?.name as string) ||
          String(item.author) ||
          "Anon";
    const avatar =
      typeof item.author === "object" ? item.author?.avatar : undefined;
    const avatarUri = avatar
      ? avatar.startsWith("http")
        ? avatar
        : `${API_BASE}${avatar}`
      : undefined;

    console.log(
      "Rendering post by author:",
      authorName,
      "avatarUri:",
      avatarUri,
      "item:",
      item
    );
    return (
      <View style={styles.postCard}>
        <View style={styles.postHeader}>
          {avatarUri ? (
            <CachedImage
              uri={avatarUri}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                overflow: "hidden",
              }}
            />
          ) : (
            <View style={styles.avatarFallback}>
              <ThemedText style={styles.avatarInitials}>
                {authorName.slice(0, 2).toUpperCase()}
              </ThemedText>
            </View>
          )}
          <ThemedText style={styles.author}>{authorName}</ThemedText>
        </View>

        {item.image ? (
          <CachedImage
            uri={
              item.image.startsWith("http")
                ? item.image
                : `${API_BASE}${item.image}`
            }
            style={styles.postImage}
          />
        ) : null}

        {item.caption ? (
          <ThemedText style={{ marginTop: 8 }}>{item.caption}</ThemedText>
        ) : null}
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFCF5" }}>
      <LogoHeader />
      <View style={styles.container}>
        <ThemedText type="title">Happy tails Feed</ThemedText>

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setModalVisible(true)}
        >
          <View style={styles.addButtonInner}>
            <View style={styles.addIconCircle}>
              <ThemedText style={styles.addIcon}>+</ThemedText>
            </View>
            <ThemedText style={styles.addButtonText}>Dier toevoegen</ThemedText>
          </View>
        </TouchableOpacity>

        <Modal
          visible={modalVisible}
          animationType="slide"
          onRequestClose={() => setModalVisible(false)}
        >
          <SafeAreaView style={styles.modalContainer}>
            <ThemedText type="title">
              Plaats een foto met jouw nieuwste huisgenoot
            </ThemedText>

            <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
              {image ? (
                <Image source={{ uri: imagePreview ? imagePreview : image }} style={styles.pickedImage} />
              ) : (
                <SvgXml xml={CAMERA_SVG} width={48} height={48} />
              )}
            </TouchableOpacity>

            <View style={{ flexDirection: "row", gap: 8 }}>
              <TouchableOpacity style={styles.smallButton} onPress={pickImage}>
                <ThemedText>Choose</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity style={styles.smallButton} onPress={takePhoto}>
                <ThemedText>Camera</ThemedText>
              </TouchableOpacity>
            </View>

            <TextInput
              placeholder="Onderschrift toevoegen..."
              value={caption}
              onChangeText={setCaption}
              multiline
              style={styles.captionInput}
            />

            <View style={{ width: "100%" }}>
              <TouchableOpacity
                style={styles.shareButton}
                onPress={submitPost}
                disabled={posting}
              >
                {posting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <ThemedText style={{ color: "#fff" }}>Delen</ThemedText>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.shareButton,
                  { backgroundColor: "#eee", marginTop: 8 },
                ]}
                onPress={() => setModalVisible(false)}
              >
                <ThemedText>Annuleren</ThemedText>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </Modal>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 24 }} />
        ) : (
          <FlatList
            data={posts}
            keyExtractor={(p) => p._id ?? String(Math.random())}
            renderItem={renderPost}
            contentContainerStyle={{ paddingBottom: 40 }}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  addButton: {
    backgroundColor: "#FDA0E9",
    paddingVertical: 12,
    borderRadius: 24,
    alignItems: "center",
    marginVertical: 12,
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
  postCard: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  postHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#C4C4C4",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  avatarInitials: {
    color: "#fff",
    fontWeight: "700",
  },
  author: {
    fontWeight: "700",
  },
  postImage: {
    width: "100%",
    height: 220,
    borderRadius: 8,
    marginTop: 8,
  },
  addButtonInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  addIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  addIcon: {
    color: "#fff",
    fontWeight: "700",
  },
  modalContainer: {
    flex: 1,
    padding: 20,
    alignItems: "center",
    backgroundColor: "#FFFCF5",
  },
  imagePicker: {
    width: 140,
    height: 140,
    backgroundColor: "#E6F0F8",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    marginBottom: 12,
  },
  pickedImage: {
    width: 140,
    height: 140,
    borderRadius: 8,
  },
  captionInput: {
    width: "100%",
    minHeight: 80,
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#fff",
    marginTop: 12,
  },
  shareButton: {
    backgroundColor: "#FDA0E9",
    paddingVertical: 12,
    borderRadius: 24,
    alignItems: "center",
    marginTop: 16,
  },
  smallButton: {
    backgroundColor: "#fff",
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
  },
});

export const options = {
  title: "Feed",
  tabBarLabel: "Feed",
};
