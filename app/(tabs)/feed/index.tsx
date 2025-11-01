import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useState } from "react";
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
import { SvgXml } from 'react-native-svg';
import { DisplayImage } from "../../../components/display-image";
import LogoHeader from "../../../components/logo-header";
import { ThemedText } from "../../../components/themed-text";

type Post = {
  _id?: string;
  caption?: string;
  image?: string; // backend returns a relative path like /uploads/xxx
  author?: string | { name?: string; avatar?: string };
  authorImage?: string; // possible alternative field
  authorAvatar?: string;
};

const API = "https://my-express-app-ne4l.onrender.com/posts";
const API_BASE = "https://my-express-app-ne4l.onrender.com";

export default function FeedScreen() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<Record<string, any>>({});
  const [modalVisible, setModalVisible] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [posting, setPosting] = useState(false);
  // inline SVG content for the camera icon (avoids runtime file reads)
  const CAMERA_SVG = `
<svg width="35" height="30" viewBox="0 0 35 30" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M34.1667 7.47396V26.6927C34.1667 28.4611 32.7319 29.8958 30.9635 29.8958H3.20312C1.43473 29.8958 0 28.4611 0 26.6927V7.47396C0 5.70557 1.43473 4.27083 3.20312 4.27083H9.07552L9.89632 2.07536C10.3634 0.827474 11.5579 0 12.8926 0H21.2674C22.602 0 23.7965 0.827474 24.2637 2.07536L25.0911 4.27083H30.9635C32.7319 4.27083 34.1667 5.70557 34.1667 7.47396ZM25.0911 17.0833C25.0911 12.6657 21.501 9.07552 17.0833 9.07552C12.6657 9.07552 9.07552 12.6657 9.07552 17.0833C9.07552 21.501 12.6657 25.0911 17.0833 25.0911C21.501 25.0911 25.0911 21.501 25.0911 17.0833ZM22.9557 17.0833C22.9557 20.3198 20.3198 22.9557 17.0833 22.9557C13.8468 22.9557 11.2109 20.3198 11.2109 17.0833C11.2109 13.8468 13.8468 11.2109 17.0833 11.2109C20.3198 11.2109 22.9557 13.8468 22.9557 17.0833Z" fill="black"/>
</svg>
`;

  // fetch posts on mount
   
  const fetchPosts = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(API);
      const data = await res.json();
      const fetched = Array.isArray(data) ? data.reverse() : [];
      setPosts(fetched);

      // load authors for posts that reference author as an id
      const ids = new Set<string>();
      for (const p of fetched) {
        if (typeof p.author === "string") ids.add(p.author);
      }

      const toFetch: string[] = [];
      ids.forEach((id) => {
        if (!users[id]) toFetch.push(id);
      });

      if (toFetch.length > 0) {
        await Promise.all(
          toFetch.map(async (id) => {
            try {
              const r = await fetch(`${API_BASE}/users/${id}`);
              if (!r.ok) return;
              const u = await r.json();
              setUsers((prev) => ({ ...prev, [id]: u }));
            } catch (e) {
              console.warn("Failed to fetch user", id, e);
            }
          })
        );
      }
    } catch (err) {
      console.warn("Failed to fetch posts", err);
    } finally {
      setLoading(false);
    }
  }, [users]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // no runtime svg loading needed — CAMERA_SVG constant is used

  async function pickImage() {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission required", "We need access to your photos to upload a picture.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImage(result.assets[0].uri);
      }
    } catch (err) {
      console.warn("Image picker error", err);
    }
  }

  async function takePhoto() {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission required", "We need camera access to take a photo.");
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.7,
      });
  if (!result.canceled && result.assets && result.assets.length > 0) setImage(result.assets[0].uri);
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
        uri: Platform.OS === "ios" && image.startsWith("file://") ? image : image,
        name,
        type,
      });
      form.append("caption", caption || "");
      form.append("author", "Marijs");

      const res = await fetch(API, {
        method: "POST",
        body: form as any,
        headers: {
          Accept: "application/json",
          "Content-Type": "multipart/form-data",
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

  function renderPost({ item }: { item: Post }) {
    // resolve author name and possible avatar
    let authorName = "Anon";
    let avatarCandidate: string | undefined;

    if (typeof item.author === "string") {
      // author is an id -> try users cache
      const u = users[item.author];
      if (u) {
        authorName = u.name || u.username || item.author;
        avatarCandidate = u.avatar || u.image || u.photo;
      } else {
        authorName = item.author;
      }
    } else {
      authorName = item.author?.name || String(item.author) || "Anon";
      avatarCandidate = typeof item.author === 'object' ? (item.author.avatar || item.authorImage || item.authorAvatar) : undefined;
    }

    const avatarUri = avatarCandidate
      ? avatarCandidate.startsWith("http")
        ? avatarCandidate
        : `${API_BASE}${avatarCandidate}`
      : undefined;

    const initials = (authorName || "").split(" ").map(s => s[0]).slice(0,2).join("").toUpperCase();

    return (
      <View style={styles.postCard}>
        <View style={styles.postHeader}>
          {avatarUri ? (
            <DisplayImage source={{ uri: avatarUri }} width={40} height={40} style={{ borderRadius: 20, overflow: 'hidden' }} />
          ) : (
            <View style={styles.avatarFallback}>
              <ThemedText style={styles.avatarInitials}>{initials}</ThemedText>
            </View>
          )}
          <ThemedText style={styles.author}>{authorName}</ThemedText>
        </View>

        {item.image ? (
          <Image
            source={{ uri: item.image.startsWith("http") ? item.image : `${API_BASE}${item.image}` }}
            style={styles.postImage}
          />
        ) : null}
        {item.caption ? <ThemedText>{item.caption}</ThemedText> : null}
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFCF5" }}>
      <LogoHeader />

      <View style={styles.container}>
        <View style={styles.headerRow}>
          <ThemedText type="title">Happy tails Feed 🐶🐱</ThemedText>
          <TouchableOpacity style={styles.postButton} onPress={() => setModalVisible(true)}>
            <ThemedText style={styles.postButtonText}>+ Voeg foto toe</ThemedText>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 24 }} />
        ) : (
          <FlatList
            data={posts}
            keyExtractor={(i) => (i._id ? i._id : String(Math.random()))}
            renderItem={renderPost}
            contentContainerStyle={{ paddingBottom: 40 }}
          />
        )}
      </View>

      <Modal visible={modalVisible} animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <SafeAreaView style={styles.modalContainer}>
          <ThemedText type="title">Plaats een foto met jouw nieuwste huisgenoot</ThemedText>

          <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
            {image ? (
              <Image source={{ uri: image }} style={styles.pickedImage} />
            ) : (
              <SvgXml xml={CAMERA_SVG} width={48} height={48} />
            )}
          </TouchableOpacity>

          <View style={{ flexDirection: "row", gap: 8 }}>
            <TouchableOpacity style={styles.smallButton} onPress={pickImage}>
              <ThemedText>Kies uit gallerij</ThemedText>
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
            <TouchableOpacity style={styles.shareButton} onPress={submitPost} disabled={posting}>
              {posting ? <ActivityIndicator color="#fff" /> : <ThemedText style={{ color: "#fff" }}>Delen</ThemedText>}
            </TouchableOpacity>

            <TouchableOpacity style={[styles.shareButton, { backgroundColor: "#eee", marginTop: 8 }]} onPress={() => setModalVisible(false)}>
              <ThemedText>Annuleren</ThemedText>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  headerRow: {
    flexDirection: "column",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  postButton: {
    backgroundColor: "#FDA0E9",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 50,
    width: "100%",
    alignItems: "center",
    marginTop: 12,
  },
  postButtonText: {
    color: "#fff",
    fontFamily: 'Montserrat_600SemiBold',
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
  postImage: {
    width: "100%",
    height: 220,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 8,
  },
  author: {
    fontWeight: "700",
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#C4C4C4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  avatarInitials: {
    color: '#fff',
    fontWeight: '700',
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
    fontFamily: 'Montserrat_600SemiBold'
  },
  smallButton: {
    backgroundColor: "#fff",
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
    fontFamily: 'Montserrat_600SemiBold'
  },
});

export const options = {
  title: "Feed",
  tabBarLabel: "Feed",
};
