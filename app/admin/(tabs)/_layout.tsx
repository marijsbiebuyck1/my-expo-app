import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Tabs } from "expo-router";
import React from "react";
import { Dimensions, StyleSheet, Text, View } from "react-native";
import { Path, Svg } from "react-native-svg";

export default function TabLayout() {
  const windowWidth = Dimensions.get("window").width;
  const tabCount = 3; // settings, animals, feed
  const tabWidth = Math.max(64, Math.floor((windowWidth - 48) / tabCount));
  const tabBarStyleDynamic = [
    styles.floatingTabBar,
    {
      left: 20,
      right: 20,
      bottom: 18,
    },
  ];

  return (
    <View style={styles.root}>
      {/* logo is rendered per-page via the LogoHeader component */}
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: "#AEBA40",
          tabBarInactiveTintColor: "#8e8e93",
          tabBarStyle: tabBarStyleDynamic,
          tabBarShowLabel: false,
          tabBarItemStyle: { paddingTop: 6 },
        }}
      >
        <Tabs.Screen
          name="settings/index"
          options={{
            title: "Profiel",
            tabBarLabel: "Profiel",
            tabBarIcon: ({ color, focused }) => (
              <View
                style={{
                  alignItems: "center",
                  justifyContent: "center",
                  width: tabWidth,
                }}
              >
                <View
                  style={[styles.tabIconWrap, focused && styles.tabIconActive]}
                >
                  <ProfileTabIcon color={color} />
                  <Text
                    numberOfLines={1}
                    style={{
                      fontSize: 11,
                      marginTop: 4,
                      color,
                      textAlign: "center",
                    }}
                  >
                    {"Profiel"}
                  </Text>
                </View>
              </View>
            ),
          }}
        />

        <Tabs.Screen
          name="animals/index"
          options={{
            title: "Animals",
            tabBarLabel: "Animals",
            tabBarIcon: ({ color, focused }) => (
              <View
                style={{
                  alignItems: "center",
                  justifyContent: "center",
                  width: tabWidth,
                }}
              >
                <View
                  style={[styles.tabIconWrap, focused && styles.tabIconActive]}
                >
                  <FontAwesome size={24} name="paw" color={color} />
                  <Text
                    numberOfLines={1}
                    style={{
                      fontSize: 11,
                      marginTop: 4,
                      color,
                      textAlign: "center",
                    }}
                  >
                    {"Animals"}
                  </Text>
                </View>
              </View>
            ),
          }}
        />

        <Tabs.Screen
          name="feed/index"
          options={{
            title: "Feed",
            tabBarLabel: "Feed",
            tabBarIcon: ({ color, focused }) => (
              <View
                style={{
                  alignItems: "center",
                  justifyContent: "center",
                  width: tabWidth,
                }}
              >
                <View
                  style={[styles.tabIconWrap, focused && styles.tabIconActive]}
                >
                  <FeedTabIcon color={color} />
                  <Text
                    numberOfLines={1}
                    style={{
                      fontSize: 11,
                      marginTop: 4,
                      color,
                      textAlign: "center",
                    }}
                  >
                    {"Feed"}
                  </Text>
                </View>
              </View>
            ),
          }}
        />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#FFFCF5",
  },

  logoWrap: {
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
    margin: 30,
  },
  logo: {
    width: 40,
    height: 14,
    resizeMode: "contain",
  },
  floatingTabBar: {
    position: "absolute",
    marginHorizontal: 8,
    alignSelf: "center",
    height: 72,
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 6,
    flexDirection: "row",
    justifyContent: "space-evenly",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 40,
  },
  tabIconWrap: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 100,
  },
  tabIconActive: {
    backgroundColor: "#f2f2f2",
    // make the active wrapper taller without moving the whole element
    paddingVertical: 12,
    paddingHorizontal: 10,
    minHeight: 60,
    borderRadius: 16,
  },
});

const ProfileTabIcon = ({ color }: { color: string }) => (
  <Svg width={26} height={26} viewBox="0 0 30 30" fill="none">
    <Path
      d="M7.3125 21.375C8.375 20.5625 9.5625 19.9219 10.875 19.4531C12.1875 18.9844 13.5625 18.75 15 18.75C16.4375 18.75 17.8125 18.9844 19.125 19.4531C20.4375 19.9219 21.625 20.5625 22.6875 21.375C23.4167 20.5208 23.9844 19.5521 24.3906 18.4688C24.7969 17.3854 25 16.2292 25 15C25 12.2292 24.026 9.86979 22.0781 7.92188C20.1302 5.97396 17.7708 5 15 5C12.2292 5 9.86979 5.97396 7.92188 7.92188C5.97396 9.86979 5 12.2292 5 15C5 16.2292 5.20312 17.3854 5.60937 18.4688C6.01562 19.5521 6.58333 20.5208 7.3125 21.375ZM15 16.25C13.7708 16.25 12.7344 15.8281 11.8906 14.9844C11.0469 14.1406 10.625 13.1042 10.625 11.875C10.625 10.6458 11.0469 9.60938 11.8906 8.76563C12.7344 7.92188 13.7708 7.5 15 7.5C16.2292 7.5 17.2656 7.92188 18.1094 8.76563C18.9531 9.60938 19.375 10.6458 19.375 11.875C19.375 13.1042 18.9531 14.1406 18.1094 14.9844C17.2656 15.8281 16.2292 16.25 15 16.25ZM15 27.5C13.2708 27.5 11.6458 27.1719 10.125 26.5156C8.60417 25.8594 7.28125 24.9688 6.15625 23.8438C5.03125 22.7188 4.14063 21.3958 3.48438 19.875C2.82812 18.3542 2.5 16.7292 2.5 15C2.5 13.2708 2.82812 11.6458 3.48438 10.125C4.14063 8.60417 5.03125 7.28125 6.15625 6.15625C7.28125 5.03125 8.60417 4.14063 10.125 3.48438C11.6458 2.82812 13.2708 2.5 15 2.5C16.7292 2.5 18.3542 2.82812 19.875 3.48438C21.3958 4.14063 22.7188 5.03125 23.8438 6.15625C24.9688 7.28125 25.8594 8.60417 26.5156 10.125C27.1719 11.6458 27.5 13.2708 27.5 15C27.5 16.7292 27.1719 18.3542 26.5156 19.875C25.8594 21.3958 24.9688 22.7188 23.8438 23.8438C22.7188 24.9688 21.3958 25.8594 19.875 26.5156C18.3542 27.1719 16.7292 27.5 15 27.5Z"
      fill={color}
    />
  </Svg>
);

const FeedTabIcon = ({ color }: { color: string }) => (
  <Svg width={26} height={26} viewBox="0 0 30 30" fill="none">
    <Path
      d="M15.4912 12.657L22.8125 15.2717V25.9382C22.8125 26.1454 22.7302 26.3441 22.5837 26.4907C22.4372 26.6372 22.2385 26.7195 22.0312 26.7195H18.9062C18.699 26.7195 18.5003 26.6372 18.3538 26.4907C18.2073 26.3441 18.125 26.1454 18.125 25.9382V20.4695H10.3125V25.9382C10.3125 26.1454 10.2302 26.3441 10.0837 26.4907C9.93716 26.6372 9.73845 26.7195 9.53125 26.7195H6.40625C6.19905 26.7195 6.00034 26.6372 5.85382 26.4907C5.70731 26.3441 5.625 26.1454 5.625 25.9382V15.4934C3.81055 14.8464 2.5 13.1287 2.5 11.0945C2.5 10.6801 2.66462 10.2826 2.95765 9.98962C3.25067 9.69659 3.6481 9.53197 4.0625 9.53197C4.4769 9.53197 4.87433 9.69659 5.16735 9.98962C5.46038 10.2826 5.625 10.6801 5.625 11.0945C5.62577 11.5086 5.79064 11.9056 6.0835 12.1985C6.37636 12.4913 6.77334 12.6562 7.1875 12.657H15.4912ZM27.5 7.18822V8.75072C27.5 9.57953 27.1708 10.3744 26.5847 10.9604C25.9987 11.5465 25.2038 11.8757 24.375 11.8757H22.8125V13.613L16.5625 11.3811V4.06322C16.5625 3.36742 17.4033 3.01879 17.896 3.51098L19.228 4.84447H21.8467C22.3794 4.84447 23.0063 5.23119 23.2441 5.70824L23.5938 6.40697H26.7188C26.926 6.40697 27.1247 6.48928 27.2712 6.6358C27.4177 6.78231 27.5 6.98102 27.5 7.18822ZM22.0312 7.18822C22.0312 7.03371 21.9854 6.88266 21.8996 6.75418C21.8137 6.62571 21.6917 6.52557 21.549 6.46644C21.4062 6.40731 21.2491 6.39184 21.0976 6.42199C20.946 6.45213 20.8068 6.52654 20.6976 6.6358C20.5883 6.74506 20.5139 6.88426 20.4838 7.03581C20.4536 7.18736 20.4691 7.34444 20.5282 7.4872C20.5874 7.62995 20.6875 7.75197 20.816 7.83781C20.9444 7.92365 21.0955 7.96947 21.25 7.96947C21.4572 7.96947 21.6559 7.88716 21.8024 7.74065C21.9489 7.59414 22.0312 7.39542 22.0312 7.18822Z"
      fill={color}
    />
  </Svg>
);
