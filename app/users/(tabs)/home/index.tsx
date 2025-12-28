import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MatchCard from "../../../../components/match-card";
import { ThemedText } from "../../../../components/themed-text";
import SwipeDeck from "../../../../components/ui/swipe-deck";
import { api } from "../../../_lib/api";

type SwipeDeckItem = {
  title?: string;
  name?: string;
  gender?: string;
  age?: string;
  breed?: string;
  description?: string;
  tags?: string[];
  secondaryTitle?: string;
  secondaryTags?: string[];
  imageUri?: string;
  id?: string | number;
};

export default function HomeScreen() {
  const [items, setItems] = useState<SwipeDeckItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadAnimals() {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get("/animals");
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(text || `Status ${res.status}`);
        }
        const payload = await res.json().catch(() => []);
        if (!active) return;
        const mapped = Array.isArray(payload)
          ? (payload
              .map((animal) => mapAnimalToCard(animal))
              .filter(Boolean) as SwipeDeckItem[])
          : [];
        setItems(mapped);
      } catch (err: any) {
        console.error("fetch animals failed", err);
        if (active) {
          setError(
            err?.message ||
              "Kon de dieren niet ophalen. Probeer het later opnieuw."
          );
          setItems([]);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadAnimals();
    return () => {
      active = false;
    };
  }, []);

  const hasCards = items.length > 0;
  const [matchItem, setMatchItem] = useState<SwipeDeckItem | null>(null);
  const router = useRouter();

  const AUTO_MESSAGE = "Hoi! We hebben een match — ik stuur je een berichtje. 🐾";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFCF5" }}>
     
      <View style={styles.container}>
        {loading ? (
          <View style={styles.stateWrap}>
            <ActivityIndicator />
            <ThemedText style={styles.stateText}>Dieren laden…</ThemedText>
          </View>
        ) : hasCards ? (
          <>
            <SwipeDeck
              items={items}
              onLike={async (raw) => {
                const item = raw as SwipeDeckItem;
                // Try to fetch the latest animal profile by id so the MatchCard
                // always shows the profile photo from the authoritative animal resource.
                try {
                  if (item?.id) {
                    const res = await api.get(`/animals/${item.id}`);
                    if (res.ok) {
                      const data = await res.json().catch(() => null);
                      const photo = data?.photo || item.imageUri;
                      setMatchItem({ ...(item as SwipeDeckItem), imageUri: photo });
                      return;
                    }
                  }
                } catch (e) {
                  // ignore — fallback below
                  console.warn("Failed to fetch animal for match card", e);
                }

                // fallback: use the mapped imageUri
                setMatchItem(item);
                // NOTE: you can also trigger backend conversation creation here
              }}
            />
            <MatchCard
              visible={!!matchItem}
              imageUri={matchItem?.imageUri}
              onClose={() => setMatchItem(null)}
              onOpenChat={async () => {
                // close the modal
                const id = matchItem?.id;
                setMatchItem(null);
                if (!id) {
                  // just navigate to home if no id
                  return;
                }

                // optimistically navigate to the chat screen
                try {
                  await api.post("/messages", { to: String(id), text: AUTO_MESSAGE });
                } catch (e) {
                  console.warn("failed to send auto-message", e);
                }

                router.push({ pathname: "/users/[profileId]", params: { profileId: String(id) } } as any);
              }}
            />
          </>
        ) : (
          <View style={styles.stateWrap}>
            <ThemedText style={styles.stateTitle}>
              {error ? "Oeps" : "Geen dieren gevonden"}
            </ThemedText>
            <ThemedText style={styles.stateText}>
              {error ||
                "Er zijn nog geen profielen beschikbaar. Kom later opnieuw terug."}
            </ThemedText>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

function mapAnimalToCard(animal: any): SwipeDeckItem | null {
  if (!animal) return null;

  const name = animal.name || "Naamloos dier";
  const imageUri = typeof animal.photo === "string" ? animal.photo : null;
  const attributes = animal.attributes || {};

  const gender = formatGender(attributes.sex || animal.gender, animal.species);
  const age = formatAge(animal.birthdate);
  const breed = attributes.breed || animal.breed || null;
  const description = extractDescription(animal, attributes);

  const { petTags, whoTags } = buildTags(animal, attributes);

  return {
    title: attributes.species || animal.species || undefined,
    name,
    gender,
    age,
    breed,
    description,
    tags: petTags,
    secondaryTitle: whoTags.length ? "Wie zoek ik?" : undefined,
    secondaryTags: whoTags.length ? whoTags : undefined,
    imageUri: imageUri || undefined,
  };
}

function extractDescription(animal: any, attributes: any): string {
  const candidates = [animal?.description, animal?.story, attributes?.notes];
  for (const value of candidates) {
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed.length) return trimmed;
    }
  }
  return "";
}

function formatAge(birthdate?: string | number | Date | null) {
  if (!birthdate) return "";
  const date = new Date(birthdate);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  if (diffMs <= 0) return "<1 maand";
  const years = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365));
  if (years > 0) return years === 1 ? "1 jaar" : `${years} jaar`;
  const months = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30)));
  return months === 1 ? "1 maand" : `${months} maanden`;
}

function formatGender(raw?: string | null, species?: string | null) {
  if (!raw) return "";
  const value = String(raw).toLowerCase();
  const isCat =
    (species || "").toLowerCase().includes("cat") ||
    (species || "").toLowerCase().includes("kat");

  if (value.includes("kater")) return "Kater";
  if (value.includes("katt")) return "Kattin";
  if (value.includes("reu")) return "Reu";
  if (value.includes("teef")) return "Teefje";
  if (value.includes("male") || value === "m") {
    return isCat ? "Kater" : "Reu";
  }
  if (value.includes("female") || value === "f") {
    return isCat ? "Kattin" : "Teefje";
  }
  if (value.includes("vrouw")) return "Vrouwtje";
  if (value.includes("man")) return "Mannetje";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function buildTags(animal: any, attributes: any) {
  const petTags: string[] = [];
  const whoTags: string[] = [];

  const pushArray = (input: any, target: string[]) => {
    if (!input) return;
    if (Array.isArray(input)) {
      input.forEach((item) => {
        if (item === null || item === undefined) return;
        target.push(String(item));
      });
      return;
    }
    if (typeof input === "string") {
      target.push(input);
    }
  };

  pushArray(attributes?.traits, petTags);
  pushArray(attributes?.characteristics, petTags);
  pushArray(animal?.properties, petTags);

  pushArray(attributes?.whoProperties, whoTags);
  pushArray(animal?.whoProperties, whoTags);
  splitNotes(attributes?.notes).forEach((entry) => whoTags.push(entry));

  return {
    petTags: decoratePetTags(dedupe(petTags)),
    whoTags: decorateWhoTags(dedupe(whoTags)),
  };
}

function splitNotes(notes?: any): string[] {
  if (!notes) return [];
  const values = Array.isArray(notes) ? notes : String(notes).split(/[\n;,]+/);
  return values.map((value) => value.trim()).filter(Boolean);
}

function dedupe(list: string[]): string[] {
  const seen = new Set<string>();
  return list
    .filter((value) => {
      const key = value.trim();
      if (!key) return false;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((value) => value.trim());
}

const PET_TAG_EMOJIS: Record<string, string> = {
  zindelijk: "🧻 Zindelijk",
  "kent basiscommando's": "📣 Kent basiscommando's",
  gecastreerd: "✂️ Gecastreerd",
  "kan in de auto": "🚗 Kan in de auto",
  "kan alleen zijn": "🏠 Kan alleen zijn",
  "ervaring vereist": "🎓 Ervaring vereist",
  "andere...": "✨ Andere...",
  binnenkat: "🏠 Binnenkat",
  buitenkat: "🌳 Buitenkat",
  speels: "🎾 Speels",
  knuffelkont: "💞 Knuffelkont",
  "tof met kinderen": "👶 Toff met kinderen",
  avontuurlijk: "🧗 Avontuurlijk",
};

const WHO_TAG_EMOJIS: Record<string, string> = {
  telewerk: "💻 Telewerk",
  "vaak reizen": "✈️ Vaak reizen",
  "9-to-5": "🕘 9-to-5",
  "nog op school": "📚 Nog op school",
  "op pensioen": "🧓 Op pensioen",
  wandelen: "🚶 Wandelen",
  "op vakantie gaan": "🏖️ Op vakantie gaan",
  "series kijken": "📺 Series kijken",
  "iets gaan drinken": "🍹 Iets gaan drinken",
  sporten: "💪 Sporten",
  gezin: "👨‍👩‍👧 Gezin",
  alleen: "🧍 Alleen",
  "met roomies": "🏘️ Met roomies",
  "met partner": "💕 Met partner",
};

function decoratePetTags(values: string[]) {
  return values.map((value) => withEmoji(value, PET_TAG_EMOJIS));
}

function decorateWhoTags(values: string[]) {
  return values.map((value) => withEmoji(value, WHO_TAG_EMOJIS));
}

function withEmoji(value: string, map: Record<string, string>) {
  const key = value.trim().toLowerCase();
  return map[key] || value;
}

export const options = {
  title: "Home",
  tabBarLabel: "Home",
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  msgCard: {
    width: "92%",
    backgroundColor: "#ffffff",
    padding: 12,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  msgSender: {
    fontWeight: "700",
    marginBottom: 4,
  },
  msgText: {
    fontSize: 15,
    marginBottom: 6,
  },
  msgMeta: {
    fontSize: 12,
    color: "#666",
  },
  stateWrap: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  stateTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 6,
    textAlign: "center",
  },
  stateText: {
    color: "#555",
    textAlign: "center",
  },
});
