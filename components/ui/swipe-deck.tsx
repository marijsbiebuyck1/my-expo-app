import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import HeartIcon from "../icons/HeartIcon";
import TimesIcon from "../icons/TimesIcon";
import SwipeCard, { SwipeCardProps } from "./swipe-cards";

const SCREEN_WIDTH = Dimensions.get("window").width;
const SCREEN_HEIGHT = Dimensions.get("window").height;
const CARD_STACK_HEIGHT = Math.min(SCREEN_HEIGHT * 0.78, 760);
const KEEP_DISTANCE = 80;
const KEEP_VELOCITY = 0.35;
const THROW_DISTANCE = SCREEN_WIDTH * 1.1;

type Item = Omit<SwipeCardProps, "imageSource"> & {
  id?: string | number;
  key?: string;
  imageSource?: any;
  imageUri?: string;
};

type Props = {
  items: Item[];
  onLike?: (item: Item) => void;
  onNope?: (item: Item) => void;
};

function getStableItemKey(item?: Item) {
  if (!item) return undefined;
  if (item.id !== undefined && item.id !== null) {
    return `id:${item.id}`;
  }
  if (item.key) {
    return `key:${item.key}`;
  }
  if (item.name) {
    return `name:${item.name.toLowerCase()}`;
  }
  if (item.imageUri) {
    return `uri:${item.imageUri}`;
  }
  return undefined;
}

function filterItemsWithDismissed(source: Item[], dismissed: Set<string>) {
  return source.filter((item) => {
    const key = getStableItemKey(item);
    if (!key) return true;
    return !dismissed.has(key);
  });
}

export default function SwipeDeck({ items, onLike, onNope }: Props) {
  const dismissedKeysRef = useRef<Set<string>>(new Set());
  const [cards, setCards] = useState<Item[]>(() =>
    filterItemsWithDismissed(items, dismissedKeysRef.current)
  );
  const cardsRef = useRef<Item[]>(cards);
  const isAnimatingRef = useRef(false);
  const position = useRef(new Animated.ValueXY()).current;

  useEffect(() => {
    const filtered = filterItemsWithDismissed(items, dismissedKeysRef.current);
    cardsRef.current = filtered;
    setCards(filtered);
  }, [items]);

  useEffect(() => {
    cardsRef.current = cards;
  }, [cards]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gesture) => {
        if (!cardsRef.current.length || isAnimatingRef.current) {
          return false;
        }
        const { dx, dy } = gesture;
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);
        return absDx > 6 && absDx > absDy;
      },
      onPanResponderMove: (_, gesture) => {
        if (!cardsRef.current.length || isAnimatingRef.current) {
          return;
        }
        position.setValue({ x: gesture.dx, y: 0 });
      },
      onPanResponderRelease: (_, gesture) => {
        if (!cardsRef.current.length || isAnimatingRef.current) {
          resetPosition();
          return;
        }

        const { dx, vx } = gesture;
        const absDx = Math.abs(dx);
        const absVx = Math.abs(vx);
        const keep = absDx < KEEP_DISTANCE && absVx < KEEP_VELOCITY;

        if (keep) {
          resetPosition();
          return;
        }

        const direction = dx > 0 ? 1 : -1;
        animateCardOff(direction, vx);
      },
      onPanResponderTerminationRequest: () => true,
    })
  ).current;

  function animateCardOff(direction: number, velocityX = 0) {
    if (!cardsRef.current.length) {
      return;
    }
    isAnimatingRef.current = true;

    const endX = Math.max(
      THROW_DISTANCE,
      THROW_DISTANCE * (1 + Math.min(Math.abs(velocityX) * 0.5, 1))
    );
    const toX = direction > 0 ? endX : -endX;

    Animated.timing(position, {
      toValue: { x: toX, y: 0 },
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => onSwipeComplete(direction));
  }

  function forceSwipe(direction: number) {
    if (!cardsRef.current.length || isAnimatingRef.current) {
      return;
    }
    animateCardOff(direction);
  }

  function onSwipeComplete(direction: number) {
    const currentCards = cardsRef.current;
    if (!currentCards.length) {
      resetPosition();
      isAnimatingRef.current = false;
      return;
    }

    const [swiped, ...rest] = currentCards;
    const key = getStableItemKey(swiped);
    if (key) {
      dismissedKeysRef.current.add(key);
    }

    try {
      if (direction > 0) {
        swiped && onLike?.(swiped);
      } else {
        swiped && onNope?.(swiped);
      }
    } catch (error) {
      console.warn("swipe callback error", error);
    }

    position.setValue({ x: 0, y: 0 });
    position.setOffset({ x: 0, y: 0 });

    requestAnimationFrame(() => {
      cardsRef.current = rest;
      setCards(rest);
      isAnimatingRef.current = false;
    });
  }

  function resetPosition() {
    Animated.spring(position, {
      toValue: { x: 0, y: 0 },
      friction: 6,
      tension: 80,
      useNativeDriver: true,
    }).start();
  }

  function renderCards() {
    if (!cards.length) {
      return (
        <View style={styles.noMoreWrap}>
          <Text style={styles.noMoreText}>
            Volledig uitgeswiped, morgen hebben we weer nieuwe diertjes in
          </Text>
          <View style={styles.noMoreTextLargeRow}>
            {(() => {
              const word = "Petto!";
              const colors = [
                "#037D4E",
                "#FDA0E9",
                "#FF8E28",
                "#AEBA40",
                "#D3D1F6",
                "#FF8E28",
              ];
              return word.split("").map((ch, i) => (
                <Text
                  key={i}
                  style={[
                    styles.noMoreTextLarge,
                    { color: colors[i % colors.length] },
                  ]}
                >
                  {ch}
                </Text>
              ));
            })()}
          </View>
          <Image
            source={require("../../assets/images/kat-uitgeswiped.png")}
            style={styles.noMoreImage}
            resizeMode="contain"
          />
        </View>
      );
    }

    const [currentCard, nextCard] = cards;
    if (!currentCard) {
      return null;
    }
    const rotate = position.x.interpolate({
      inputRange: [-SCREEN_WIDTH * 1.5, 0, SCREEN_WIDTH * 1.5],
      outputRange: ["-20deg", "0deg", "20deg"],
      extrapolate: "clamp",
    });

    const animatedStyle = {
      transform: [{ translateX: position.x }, { rotate }],
    } as const;

    const heartOpacity = position.x.interpolate({
      inputRange: [0, 80],
      outputRange: [0, 0.8],
      extrapolate: "clamp",
    });
    const nopeOpacity = position.x.interpolate({
      inputRange: [-80, 0],
      outputRange: [0.8, 0],
      extrapolate: "clamp",
    });

    return (
      <>
        {nextCard ? (
          <View
            key={getStableItemKey(nextCard) ?? "card-next"}
            style={styles.bufferCard}
            pointerEvents="none"
          >
            <View style={styles.bufferInner}>
              <SwipeCard
                {...(nextCard as SwipeCardProps)}
                imageSource={nextCard.imageSource}
                imageUri={nextCard.imageUri}
              />
            </View>
          </View>
        ) : null}
        <Animated.View
          key={getStableItemKey(currentCard) ?? "card-active"}
          style={[styles.animatedCard, animatedStyle]}
          {...panResponder.panHandlers}
        >
          <Animated.View style={[styles.statusWrap, { opacity: heartOpacity }]}>
            <Text style={[styles.statusHeart]}>💚</Text>
          </Animated.View>
          <Animated.View
            style={[styles.statusWrapLeft, { opacity: nopeOpacity }]}
          >
            <Text style={[styles.statusNope]}>❌</Text>
          </Animated.View>
          <SwipeCard
            {...(currentCard as SwipeCardProps)}
            imageSource={currentCard.imageSource}
            imageUri={currentCard.imageUri}
          />
        </Animated.View>
      </>
    );
  }

  return (
    <View style={styles.container} pointerEvents="box-none">
      <View style={styles.cardsContainer}>{renderCards()}</View>

      <View style={styles.buttonsRow} pointerEvents="box-none">
        <TouchableOpacity
          style={[styles.button, styles.nopeButton]}
          onPress={() => forceSwipe(-1)}
          disabled={!cards.length}
          accessibilityLabel="Nope"
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <TimesIcon size={35} color={styles.nopeIcon.color} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.loveButton]}
          onPress={() => forceSwipe(1)}
          disabled={!cards.length}
          accessibilityLabel="Like"
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <HeartIcon size={35} color={styles.loveIcon.color} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    alignItems: "center",
    paddingBottom: 0,
    minHeight: CARD_STACK_HEIGHT + 90,
    position: "relative",
  },
  cardsContainer: {
    height: CARD_STACK_HEIGHT,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 32,
  },
  animatedCard: {
    position: "absolute",
    width: 355,
    height: CARD_STACK_HEIGHT,
    maxHeight: CARD_STACK_HEIGHT,
  },
  bufferCard: {
    position: "absolute",
    width: 355,
    height: CARD_STACK_HEIGHT,
    maxHeight: CARD_STACK_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  bufferInner: {
    transform: [{ scale: 0.97 }],
    opacity: 0.75,
  },
  underCard: {
    position: "absolute",
    width: 355,
    height: CARD_STACK_HEIGHT,
    maxHeight: CARD_STACK_HEIGHT,
  },
  statusWrap: {
    position: "absolute",
    top: "35%",
    left: "50%",
    zIndex: 10,
    marginLeft: -50,
  },
  statusWrapLeft: {
    position: "absolute",
    top: "45%",
    left: "25%",
    zIndex: 10,
    marginLeft: -50,
  },
  statusHeart: { fontSize: 80, transform: [{ scale: 1 }] },
  statusNope: { fontSize: 80, transform: [{ scale: 1 }] },
  buttonsRow: {
    flexDirection: "row",
    position: "absolute",
    bottom: 90,
    left: 0,
    right: 0,
    justifyContent: "center",

  },
  button: {
    width: 68,
    height: 68,
    borderRadius: 32,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 12,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    overflow: "visible",
  },
  nopeButton: { backgroundColor: "#FFFFFF" },
  loveButton: { backgroundColor: "#FFFFFF" },
  loveIcon: { color: "#AEBA40" },
  nopeIcon: { color: "#FDA0E9" },
  noMoreWrap: { height: 300, alignItems: "center", justifyContent: "center" },
  noMoreText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    fontFamily: "montserrat",
  },
  noMoreTextLarge: { fontSize: 48, fontFamily: "barriecito", color: "#666" },
  noMoreTextLargeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  noMoreImage: {
    width: 220,
    height: 140,
    marginTop: 12,
    alignSelf: "center",
  },
});
