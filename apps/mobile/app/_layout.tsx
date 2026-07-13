import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Stack } from "expo-router";
import MapLibreGL from "@maplibre/maplibre-react-native";
import { AuthProvider } from "@/providers/AuthProvider";
import { LanguageProvider } from "@/providers/LanguageProvider";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { assertMobileEnv } from "@/lib/env";
import { colors } from "@/theme";

assertMobileEnv();

// MapLibre uses no access token (free raster tiles).
MapLibreGL.setAccessToken(null);

export default function RootLayout() {
  useEffect(() => {
    MapLibreGL.setAccessToken(null);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ErrorBoundary>
          <LanguageProvider>
            <AuthProvider>
              <BottomSheetModalProvider>
                <StatusBar style="dark" />
                <Stack
                  screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: colors.slate50 },
                  }}
                >
                  <Stack.Screen name="index" />
                  <Stack.Screen
                    name="auth"
                    options={{ presentation: "modal" }}
                  />
                  <Stack.Screen
                    name="listing/[id]"
                    options={{ presentation: "modal" }}
                  />
                  <Stack.Screen
                    name="add-listing"
                    options={{ presentation: "modal" }}
                  />
                  <Stack.Screen name="my-listings" />
                  <Stack.Screen name="admin" />
                </Stack>
              </BottomSheetModalProvider>
            </AuthProvider>
          </LanguageProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
