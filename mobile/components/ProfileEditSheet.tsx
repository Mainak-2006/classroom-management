import type { PropsWithChildren } from "react";
import { useEffect, useRef, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  runOnJS,
  useAnimatedKeyboard,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { colors } from "../constants/theme";

const SPRING = { damping: 18, stiffness: 240, mass: 0.9 };

interface ProfileEditSheetProps {
  visible: boolean;
  onClose: () => void;
}

export default function ProfileEditSheet({
  visible,
  onClose,
  children,
}: PropsWithChildren<ProfileEditSheetProps>) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const keyboard = useAnimatedKeyboard();
  const [shown, setShown] = useState(visible);
  const translateY = useSharedValue(height);
  const backdropOpacity = useSharedValue(0);
  const prevVisible = useRef(!visible);

  useEffect(() => {
    if (visible && !prevVisible.current) {
      setShown(true);
      translateY.value = withSpring(0, SPRING);
      backdropOpacity.value = withTiming(1, { duration: 200 });
    } else if (!visible && shown) {
      translateY.value = withTiming(height, { duration: 280 }, (finished) => {
        if (finished) runOnJS(setShown)(false);
      });
      backdropOpacity.value = withTiming(0, { duration: 200 });
    }
    prevVisible.current = visible;
  }, [visible, shown, height]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    maxHeight: Math.min(height * 0.88, height - keyboard.height.value),
    transform: [{ translateY: translateY.value - keyboard.height.value }],
  }));

  return (
    <Modal
      visible={shown}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}>
          <Pressable
            style={styles.backdropPressable}
            onPress={onClose}
            accessibilityLabel="Close edit form"
          />
        </Animated.View>
        <Animated.View style={[styles.sheet, sheetStyle]}>
          <View className="items-center pb-1 pt-3">
            <View className="h-1.5 w-10 rounded-full bg-slate-300" />
          </View>
          <ScrollView
            bounces={false}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingTop: 8,
              paddingBottom: insets.bottom + 16,
            }}
          >
            {children}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    backgroundColor: "rgba(15, 23, 42, 0.45)",
  },
  backdropPressable: {
    flex: 1,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    flexShrink: 1,
    maxHeight: "88%",
    overflow: "hidden",
  },
});
