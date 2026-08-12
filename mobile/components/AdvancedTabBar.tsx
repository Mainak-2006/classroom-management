import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import { Pressable, Text, View } from "react-native";
import type { LayoutChangeEvent } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import type { BottomTabBarProps } from "expo-router/js-tabs";

import { colors } from "../constants/theme";

const SPRING = { damping: 18, stiffness: 240, mass: 0.9 };
const ICON_SIZE = 22;

interface TabPosition {
  x: number;
  width: number;
}

interface TabButtonProps {
  label: string;
  focused: boolean;
  icon: (props: { focused: boolean; color: string; size: number }) => ReactNode;
  onPress: () => void;
  onLayout: (event: LayoutChangeEvent) => void;
}

function TabButton({ label, focused, icon, onPress, onLayout }: TabButtonProps) {
  const press = useSharedValue(1);
  const pop = useSharedValue(1);

  useEffect(() => {
    if (focused) {
      pop.value = withSequence(
        withTiming(1.15, { duration: 120 }),
        withSpring(1, SPRING),
      );
    }
  }, [focused, pop]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: press.value * pop.value }],
  }));

  const color = focused ? colors.primary : colors.textMuted;

  return (
    <Pressable
      onLayout={onLayout}
      onPress={onPress}
      onPressIn={() => {
        press.value = withSpring(0.85, SPRING);
      }}
      onPressOut={() => {
        press.value = withSpring(1, SPRING);
      }}
      className="flex-1 items-center justify-center py-1"
    >
      <Animated.View style={iconStyle}>
        {icon({ focused, color, size: ICON_SIZE })}
      </Animated.View>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        className="mt-0.5 text-[10px] font-semibold"
        style={{ color }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function FallbackIcon({
  focused,
  color,
  size,
}: {
  focused: boolean;
  color: string;
  size: number;
}) {
  return (
    <Ionicons
      name={focused ? "ellipse" : "ellipse-outline"}
      size={size}
      color={color}
    />
  );
}

export default function AdvancedTabBar({
  state,
  descriptors,
  navigation,
  insets,
}: BottomTabBarProps) {
  const positions = useRef<Record<string, TabPosition>>({});
  const indicatorX = useSharedValue(0);
  const indicatorWidth = useSharedValue(0);

  const focusedKey = state.routes[state.index]?.key;

  useEffect(() => {
    if (!focusedKey) return;
    const position = positions.current[focusedKey];
    if (!position) return;
    indicatorX.value = withSpring(position.x, SPRING);
    indicatorWidth.value = withSpring(position.width, SPRING);
  }, [focusedKey, indicatorX, indicatorWidth]);

  const indicatorStyle = useAnimatedStyle(() => ({
    width: indicatorWidth.value,
    transform: [{ translateX: indicatorX.value }],
  }));

  const handleLayout =
    (key: string, focused: boolean) => (event: LayoutChangeEvent) => {
      const { x, width } = event.nativeEvent.layout;
      positions.current[key] = { x, width };
      if (focused) {
        indicatorX.value = withSpring(x, SPRING);
        indicatorWidth.value = withSpring(width, SPRING);
      }
    };

  return (
    <View
      pointerEvents="box-none"
      className="absolute left-4 right-4"
      style={{ bottom: Math.max(insets.bottom, 12) + 10 }}
    >
      <View className="flex-row rounded-[32px] border border-slate-200 bg-white px-2 py-1.5 shadow-lg shadow-slate-900/10">
        <Animated.View
          pointerEvents="none"
          className="absolute bottom-1.5 top-1.5 rounded-[26px] border border-[#C9E4FB] bg-[#E6F2FE]"
          style={indicatorStyle}
        />
        {state.routes.map((route, index) => {
          const options = descriptors[route.key].options;
          const focused = state.index === index;
          const label = options.title ?? route.name;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          return (
            <TabButton
              key={route.key}
              label={label}
              focused={focused}
              icon={options.tabBarIcon ?? FallbackIcon}
              onPress={onPress}
              onLayout={handleLayout(route.key, focused)}
            />
          );
        })}
      </View>
    </View>
  );
}
