import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Keyboard,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { SvgXml } from "react-native-svg";
import CameraCapture from "../../../../components/camera-capture";
import BgCard from "../../../../components/ui/bg-card";
// ...existing code...
import LogoHeader from "../../../../components/logo-header";
import { ThemedText } from "../../../../components/themed-text";
import { api } from "../../../_lib/api";

type Post = {
  _id?: string;
  caption?: string;
  image?: string;
  author?:
    | string
    | {
        _id?: string;
        id?: string;
        name?: string;
        fullName?: string;
        avatar?: string;
        profileImage?: string;
      };
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
  const [cameraVisible, setCameraVisible] = useState(false);
  // router was previously used for redirect-on-401; we no longer auto-redirect.
  // Keep the hook available if other flows need navigation in future.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const router = useRouter();

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
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
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
      // open the in-app camera modal which uses Camera.takePictureAsync
      setCameraVisible(true);
    } catch (err) {
      console.warn("Camera error", err);
    }
  }

  async function submitPost() {
    setPosting(true);
    try {
      const token = await SecureStore.getItemAsync("userToken");
      if (!token) {
        Alert.alert("Not logged in", "You must be logged in to upload a post.");
        setPosting(false);
        return;
      }

      const payloadImage = await ensureBase64Image();
      if (!payloadImage) {
        Alert.alert(
          "Foto nodig",
          "Selecteer of neem een foto zodat we deze kunnen opslaan."
        );
        setPosting(false);
        return;
      }

      const res = await fetch(API, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          image: payloadImage,
          caption: caption || "",
        }),
      });

      if (!res.ok) {
        if (res.status === 401) {
          Alert.alert(
            "Sessie verlopen",
            "Je sessie lijkt verlopen. Wil je opnieuw proberen of later?",
            [
              { text: "Probeer opnieuw", onPress: () => submitPost() },
              { text: "Annuleer", style: "cancel" },
            ]
          );
          setPosting(false);
          return;
        }
        const text = await res.text().catch(() => "");
        throw new Error(text || "Upload failed");
      }

      setModalVisible(false);
      setImage(null);
      setCaption("");
      setImagePreview(null);
      fetchPosts();
    } catch (err) {
      console.warn("Post upload failed", err);
      Alert.alert("Upload failed", String(err));
    } finally {
      setPosting(false);
    }
  }

  async function ensureBase64Image() {
    if (imagePreview) return imagePreview;
    if (!image) return null;
    try {
      const { manipulateImage } = await import("../../../lib/imageHelpers");
      const processed = await manipulateImage(image, true);
      if (processed.uploadUri) setImage(processed.uploadUri);
      if (processed.previewBase64) {
        setImagePreview(processed.previewBase64);
        return processed.previewBase64;
      }
    } catch (error) {
      console.warn("Failed to convert image to base64", error);
    }
    return null;
  }

  async function fetchPosts() {
    setLoading(true);
    try {
      const res = await fetch(API);
      const data = await res.json();
      // resolve author ids into user objects for display
      const resolved = await resolveAuthors(data);
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
                ...u,
                id: u.id || u._id || p.author,
                profileImage: u.profileImage || null,
              },
            };
        }
        if (typeof p.author === "object" && p.author) {
          const authorObj = p.author as Record<string, any>;
          return {
            ...p,
            author: {
              ...authorObj,
              profileImage: authorObj.profileImage ?? authorObj.avatar ?? null,
            },
          };
        }
        return p;
      })
    );
    return work;
  }

  function renderPost({ item }: { item: Post }) {
    const authorObj =
      typeof item.author === "object" && item.author
        ? (item.author as Record<string, any>)
        : undefined;
    const authorId =
      authorObj?.id ||
      authorObj?._id ||
      (typeof item.author === "string" ? item.author : undefined);
    const cached = authorId ? userCacheRef.current[String(authorId)] : null;

    const authorName =
      authorObj?.name ||
      authorObj?.fullName ||
      cached?.name ||
      cached?.fullName ||
      (typeof item.author === "string" ? item.author : "");

    const avatarUri =
      authorObj?.profileImage ||
      authorObj?.avatar ||
      cached?.profileImage ||
      cached?.avatar;

    const postImageUri =
      typeof item.image === "string" && item.image.length > 0
        ? item.image
        : null;
    const displayImageUri = (() => {
      if (!postImageUri) return null;
      if (postImageUri.startsWith("data:") || postImageUri.startsWith("http")) {
        return postImageUri;
      }
      if (postImageUri.startsWith("/")) {
        return `${API_BASE}${postImageUri}`;
      }
      return null;
    })();

    const likesCount =
      (item as any).likesCount ?? (item as any).likeCount ?? (item as any).likes ?? 0;
    const likedByMe = Boolean((item as any).liked || (item as any).likedByMe);

    return (
      <View style={styles.postCard}>
        <View style={styles.postHeader}>
          {avatarUri ? (
            <Image
              source={{ uri: avatarUri }}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                overflow: "hidden",
                marginRight: 12,
              }}
            />
          ) : null}
          <ThemedText style={[styles.author, { fontWeight: "800" }]}>
            {authorName}
          </ThemedText>
        </View>

        {displayImageUri ? (
          <Image source={{ uri: displayImageUri }} style={styles.postImage} />
        ) : null}

        {item.caption ? (
          <ThemedText style={{ marginTop: 8 }}>{item.caption}</ThemedText>
        ) : null}

        <View style={styles.postActionsRow}>
          <TouchableOpacity
            style={styles.likeButton}
            onPress={async () => {
              try {
                // optimistic update
                setPosts((prev) =>
                  prev.map((p) => {
                    if (p._id !== item._id) return p;
                    const prevCount =
                      (p as any).likesCount ?? (p as any).likeCount ?? (p as any).likes ?? 0;
                    const currentlyLiked = Boolean((p as any).liked || (p as any).likedByMe);
                    return {
                      ...p,
                      liked: !currentlyLiked,
                      likesCount: currentlyLiked ? Math.max(0, prevCount - 1) : prevCount + 1,
                    } as Post;
                  })
                );

                const resp = await api.post(
                  `/posts/${encodeURIComponent(String(item._id))}/like`,
                  {},
                  false
                );
                if (!resp.ok) {
                  // rollback on failure
                  setPosts((prev) =>
                    prev.map((p) => {
                      if (p._id !== item._id) return p;
                      // revert liked flag
                      return {
                        ...p,
                        liked: (item as any).liked || (item as any).likedByMe || false,
                        likesCount: (item as any).likesCount ?? (item as any).likeCount ?? (item as any).likes ?? 0,
                      } as Post;
                    })
                  );
                } else {
                  // if server returns updated post, use it
                  const json = await resp.json().catch(() => null);
                  if (json && typeof json === "object") {
                    setPosts((prev) => prev.map((p) => (p._id === item._id ? { ...(p as any), ...(json as any) } : p)));
                  }
                }
              } catch (err) {
                console.warn("Like action failed", err);
                // rollback
                setPosts((prev) =>
                  prev.map((p) => {
                    if (p._id !== item._id) return p;
                    return {
                      ...p,
                      liked: (item as any).liked || (item as any).likedByMe || false,
                      likesCount: (item as any).likesCount ?? (item as any).likeCount ?? (item as any).likes ?? 0,
                    } as Post;
                  })
                );
              }
            }}
          >
            <Ionicons
              name={likedByMe ? "heart" : "heart-outline"}
              size={20}
              color={likedByMe ? "#FDA0E9" : "#666"}
            />
          </TouchableOpacity>

          <ThemedText style={styles.likesCountText}>{String(likesCount ?? 0)}</ThemedText>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <LogoHeader />
      <View style={styles.container}>
        <View style={styles.cardShell}>
          <BgCard
            style={styles.bgCard}
            contentStyle={styles.cardContent}
            scrollEnabled={false}
          >
            <View style={styles.headerRow}>
              <ThemedText type="title" style={styles.pageTitle}>
                Happy tails Feed
              </ThemedText>

              <TouchableOpacity
                style={styles.addButton}
                onPress={() => setModalVisible(true)}
                accessibilityRole="button"
                accessibilityLabel="Nieuw dier toevoegen"
                accessibilityHint="Open het uploadscherm"
                hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
              >
                <ThemedText style={styles.addButtonIcon}>+</ThemedText>
              </TouchableOpacity>
            </View>

            <View style={styles.listWrapper}>
              {loading ? (
                <ActivityIndicator style={styles.loadingIndicator} />
              ) : (
                <FlatList
                  data={posts}
                  keyExtractor={(p, idx) => p._id ?? `post-${idx}`}
                  renderItem={renderPost}
                  contentContainerStyle={styles.feedListContent}
                  style={styles.feedList}
                  showsVerticalScrollIndicator={false}
                />
              )}
            </View>
          </BgCard>
        </View>
      </View>

      <Modal
        visible={modalVisible}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <SafeAreaView style={styles.modalContainer}>
            <ThemedText type="title">
              Plaats een foto met jouw nieuwste huisgenoot
            </ThemedText>

            <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
              {image ? (
                <Image
                  source={{ uri: imagePreview ? imagePreview : image }}
                  style={styles.pickedImage}
                />
              ) : (
                <SvgXml xml={CAMERA_SVG} width={48} height={48} />
              )}
            </TouchableOpacity>

            <View style={{ flexDirection: "row", gap: 8 }}>
              <TouchableOpacity style={styles.smallButton} onPress={pickImage}>
                <ThemedText>Kies foto</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity style={styles.smallButton} onPress={takePhoto}>
                <ThemedText>Camera</ThemedText>
              </TouchableOpacity>
            </View>
            <Text style={styles.sectionLabel}>Schrijf een leuk tekstje</Text>
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
        </TouchableWithoutFeedback>
      </Modal>

      <CameraCapture
        visible={cameraVisible}
        onClose={() => setCameraVisible(false)}
        onCapture={(res) => {
          if (!res) return;
          if (res.uploadUri) setImage(res.uploadUri);
          if (res.previewBase64) setImagePreview(res.previewBase64);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#FFFCF5",
  },
  container: {
    flex: 1,
    padding: 20,
    alignItems: "center",
  },
  cardShell: {
    flex: 1,
    width: "100%",
    maxWidth: 360,
    alignSelf: "center",
  },
  bgCard: {
    width: "100%",
    height: "92%",
  },
  cardContent: {
    flex: 1,
    width: "100%",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
    marginBottom: 26,
    paddingHorizontal: 5,
  },
  pageTitle: {
    flex: 1,
    marginRight: 12,
    marginBottom: 0,
    textAlign: "left",
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderColor: "#eee",
    borderWidth: 1,
    backgroundColor: "#FFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,

    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  addButtonIcon: {
    color: "#AEBA40",
    fontWeight: "800",
    fontSize: 24,
    marginTop: -2,
  },
  listWrapper: {
    flex: 1,
    minHeight: 0,
    width: "100%",
  },
  loadingIndicator: {
    marginTop: 12,
  },
  feedList: {
    flex: 1,
    width: "100%",
  },
  feedListContent: {
    paddingBottom: 16,
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
  author: {
    fontWeight: "700",
  },
  postImage: {
    width: "100%",
    height: 220,
    borderRadius: 8,
    marginTop: 8,
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
    backgroundColor: "#EFF1D9",
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
    fontFamily: "Montserrat_400Regular",
  },
  shareButton: {
    backgroundColor: "#037D4E",
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
  sectionLabel: {
    fontSize: 16,
    marginTop: 30,
    marginBottom: 8,
    color: "#333",
    fontFamily: "Montserrat_700Bold",
    alignSelf: "flex-start",
  },
  postActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  likeButton: {
    padding: 6,
    borderRadius: 8,
  },
  likesCountText: {
    marginLeft: 8,
    color: "#666",
    fontSize: 14,
  },
});

export const options = {
  title: "Feed",
  tabBarLabel: "Feed",
};
