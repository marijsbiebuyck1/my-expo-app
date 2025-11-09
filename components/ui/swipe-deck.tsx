import React, { useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import SwipeCard, { SwipeCardProps } from "./swipe-cards";

const SCREEN_WIDTH = Dimensions.get("window").width;
const SWIPE_THRESHOLD = 120;
const SWIPE_OUT_DURATION = 250;

type Item = Omit<SwipeCardProps, "imageSource"> & { imageSource?: any };

export default function SwipeDeck({ items }: { items: Item[] }) {
  const [cards, setCards] = useState(items);

  const position = useRef(new Animated.ValueXY()).current;

  const panResponder = useRef(
    PanResponder.create({
      // Only become responder for horizontal gestures. This lets inner
      // vertical ScrollViews (like the tags area in SwipeCard) receive
      // vertical touch events and scroll normally.
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gesture) => {
        const { dx, dy } = gesture;
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);
        // require some horizontal movement and more horizontal than vertical
        return absDx > 8 && absDx > absDy;
      },
      onPanResponderMove: (_, gesture) => {
        position.setValue({ x: gesture.dx, y: gesture.dy });
      },
      onPanResponderRelease: (_, gesture) => {
        if (Math.abs(gesture.dx) > SWIPE_THRESHOLD) {
          const direction = gesture.dx > 0 ? 1 : -1;
          forceSwipe(direction);
        } else {
          resetPosition();
        }
      },
      onPanResponderTerminationRequest: () => true,
    })
  ).current;

  function forceSwipe(direction: number) {
    Animated.timing(position, {
      toValue: { x: direction * SCREEN_WIDTH * 1.5, y: -100 },
      duration: SWIPE_OUT_DURATION,
      useNativeDriver: true,
    }).start(() => onSwipeComplete(direction));
  }

  function onSwipeComplete(direction: number) {
    const remaining = cards.slice(1);
    setCards(remaining);
    position.setValue({ x: 0, y: 0 });
  }

  function resetPosition() {
    Animated.spring(position, {
      toValue: { x: 0, y: 0 },
      friction: 6,
      useNativeDriver: true,
    }).start();
  }

  function renderCards() {
    if (!cards.length) {
      return (
        <View style={styles.noMoreWrap}>
          <Text style={styles.noMoreText}>No more cards</Text>
        </View>
      );
    }

    return cards
      .map((item, index) => {
        if (index === 0) {
          const rotate = position.x.interpolate({
            inputRange: [-SCREEN_WIDTH * 1.5, 0, SCREEN_WIDTH * 1.5],
            outputRange: ["-20deg", "0deg", "20deg"],
            extrapolate: "clamp",
          });

          const animatedStyle = {
            transform: [
              { translateX: position.x },
              { translateY: position.y },
              { rotate },
            ],
          } as any;

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
            <Animated.View
              key={`card-${index}-${item.name}`}
              style={[styles.animatedCard, animatedStyle]}
              {...panResponder.panHandlers}
            >
              <Animated.View
                style={[styles.statusWrap, { opacity: heartOpacity }]}
              >
                <Text style={[styles.statusHeart]}>💚</Text>
              </Animated.View>
              <Animated.View
                style={[styles.statusWrapLeft, { opacity: nopeOpacity }]}
              >
                <Text style={[styles.statusNope]}>❌</Text>
              </Animated.View>
              <SwipeCard
                {...(item as SwipeCardProps)}
                imageSource={item.imageSource}
              />
            </Animated.View>
          );
        }

        // stacked cards
        const scale = 1 - index * 0.04;
        const translateY = -30 * index;
        const opacity = Math.max(0, (10 - index) / 10);

        return (
          <Animated.View
            key={`card-${index}-${item.name}`}
            style={[
              styles.underCard,
              { transform: [{ scale }, { translateY }], opacity },
            ]}
          >
            <SwipeCard
              {...(item as SwipeCardProps)}
              imageSource={item.imageSource}
            />
          </Animated.View>
        );
      })
      .reverse();
  }

  function onPressNope() {
    forceSwipe(-1);
  }
  function onPressLove() {
    forceSwipe(1);
  }

  return (
    <View style={styles.container} pointerEvents="box-none">
      <View style={styles.cardsContainer}>{renderCards()}</View>

      <View style={styles.buttonsRow} pointerEvents="box-none">
        <TouchableOpacity
          style={[styles.button, styles.nopeButton]}
          onPress={onPressNope}
          accessibilityLabel="Nope"
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={[styles.buttonIcon, styles.nopeIcon]}>✖️</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.loveButton]}
          onPress={onPressLove}
          accessibilityLabel="Like"
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={[styles.buttonIcon, styles.loveIcon]}>❤</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: "100%", alignItems: "center", paddingBottom: 40 },
  cardsContainer: {
    // keep the cards container a bit smaller so the action buttons remain visible on most phones
    height: 520,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  animatedCard: {
    position: "absolute",
    width: 355,
    maxHeight: 693,
  },
  underCard: {
    position: "absolute",
    width: 355,
    maxHeight: 693,
  },
  statusWrap: {
    position: "absolute",
    top: "45%",
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
  buttonsRow: { flexDirection: "row", marginTop: 12, zIndex: 20 },
  button: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 12,
    elevation: 3,
  },
  buttonText: { fontSize: 28 },
  // button variants
  nopeButton: { backgroundColor: "#FFFFFF" },
  loveButton: { backgroundColor: "#FFFFFF" },
  buttonIcon: { fontSize: 28 },
  loveIcon: { color: "#FDA0E9" },
  nopeIcon: { color: "#CDD6DD" },
  noMoreWrap: { height: 300, alignItems: "center", justifyContent: "center" },
  noMoreText: { fontSize: 18, color: "#666" },
});
