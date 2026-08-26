import { useCallback, useRef, useState } from "react";
import {
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@/theme";

interface Props {
  visible: boolean;
  images: string[];
  initialIndex?: number;
  onClose: () => void;
}

/** Full-screen, swipeable listing photo viewer. */
export default function ImageLightbox({
  visible,
  images,
  initialIndex = 0,
  onClose,
}: Props) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(initialIndex);
  const scrollRef = useRef<ScrollView>(null);

  const onShow = useCallback(() => {
    setIndex(initialIndex);
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ x: initialIndex * width, animated: false });
    });
  }, [initialIndex, width]);

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    setIndex(Math.max(0, Math.min(images.length - 1, i)));
  };

  if (!images.length) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onShow={onShow}
      onRequestClose={onClose}
    >
      <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <Pressable
          style={[styles.closeBtn, { top: insets.top + 8 }]}
          onPress={onClose}
          hitSlop={12}
        >
          <Text style={styles.closeText}>✕</Text>
        </Pressable>

        <Text style={[styles.counter, { top: insets.top + 14 }]}>
          {index + 1} / {images.length}
        </Text>

        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onScrollEnd}
          contentOffset={{ x: initialIndex * width, y: 0 }}
          style={styles.pager}
        >
          {images.map((uri, i) => (
            <View key={`${uri}-${i}`} style={{ width, height: height * 0.85, justifyContent: "center" }}>
              <Image
                source={{ uri }}
                style={{ width, height: height * 0.8 }}
                contentFit="contain"
              />
            </View>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.96)",
    justifyContent: "center",
  },
  pager: { flexGrow: 0 },
  closeBtn: {
    position: "absolute",
    right: 16,
    zIndex: 2,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: { color: colors.white, fontSize: 18, fontWeight: "600" },
  counter: {
    position: "absolute",
    alignSelf: "center",
    left: 0,
    right: 0,
    textAlign: "center",
    zIndex: 2,
    color: colors.white,
    fontSize: 14,
    fontWeight: "600",
  },
});
