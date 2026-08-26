import { useCallback, useEffect, useRef, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import BottomSheet, { BottomSheetFlatList } from "@gorhom/bottom-sheet";
import { router, useFocusEffect } from "expo-router";
import {
  BBox,
  BASEMAP_IDS,
  BasemapId,
  DEFAULT_RADIUS_M,
  Filters,
  GeoPlace,
  Listing,
} from "@karia/shared";
import { useAuth } from "@/providers/AuthProvider";
import { useI18n } from "@/providers/LanguageProvider";
import { fetchListings } from "@/lib/api";
import MapCanvas from "@/components/MapCanvas";
import PlaceSearch from "@/components/PlaceSearch";
import FiltersSheet from "@/components/FiltersSheet";
import ListingCard from "@/components/ListingCard";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { colors, radius as rad } from "@/theme";

type PickPurpose = "poi" | "listing" | null;

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const { user, configured } = useAuth();
  const { t } = useI18n();

  const [listings, setListings] = useState<Listing[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({});
  const [poi, setPoi] = useState<GeoPlace | null>(null);
  const [radiusM, setRadiusM] = useState(DEFAULT_RADIUS_M);
  const [bbox, setBBox] = useState<BBox | null>(null);
  const [basemap, setBasemap] = useState<BasemapId>("voyager");
  const [layersOpen, setLayersOpen] = useState(false);
  const [pickPurpose, setPickPurpose] = useState<PickPurpose>(null);
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const sheetRef = useRef<BottomSheet>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!poi && !bbox) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const params = poi
          ? { filters, center: { lat: poi.lat, lng: poi.lng, radiusM } }
          : { filters, bbox: bbox ?? undefined };
        const { listings: found } = await fetchListings(params);
        setFetchError(null);
        setListings(found);
      } catch {
        setFetchError(t("backend_unavailable"));
        setListings([]);
      }
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [filters, poi, radiusM, bbox, refreshKey, t]);

  useFocusEffect(
    useCallback(() => {
      setRefreshKey((k) => k + 1);
    }, [])
  );

  const handleSelectPlace = (place: GeoPlace) => {
    setPoi(place);
    setActiveId(null);
    setPickPurpose(null);
  };

  const handleMapPress = (lng: number, lat: number) => {
    if (pickPurpose === "listing") {
      setPickPurpose(null);
      router.push({
        pathname: "/add-listing",
        params: { lat: String(lat), lng: String(lng) },
      });
      return;
    }
    setPoi({
      name: t("selected_point", { lat: lat.toFixed(4), lng: lng.toFixed(4) }),
      lat,
      lng,
      fit: false,
    });
    setActiveId(null);
    setPickPurpose(null);
  };

  const startAddListing = () => {
    if (!configured) return;
    if (!user) {
      router.push("/auth");
      return;
    }
    setPickPurpose("listing");
  };

  const openListing = (id: string) => {
    setActiveId(id);
    router.push(`/listing/${id}`);
  };

  const onAccountPress = () => {
    if (!user) {
      router.push("/auth");
      return;
    }
    router.push("/my-listings");
  };

  const hasPoi = !!poi;
  const sheetPeek = 120;
  const controlBottom = sheetPeek + 16;

  return (
    <View style={styles.root}>
      <MapCanvas
        listings={listings}
        activeId={activeId}
        poi={poi}
        radiusM={radiusM}
        basemap={basemap}
        pickMode={pickPurpose !== null}
        bottomInset={controlBottom + 64}
        onListingPress={openListing}
        onBBoxChange={setBBox}
        onMapPress={handleMapPress}
      />

      {/* Compact floating header — search + icon tools only */}
      <View
        style={[styles.topBar, { paddingTop: insets.top + 6 }]}
        pointerEvents="box-none"
      >
        <View style={styles.searchCard}>
          <View style={styles.searchRow}>
            <Text style={styles.brandInline}>K</Text>
            <View style={styles.searchFlex}>
              <PlaceSearch onSelect={handleSelectPlace} />
            </View>
            <LanguageSwitcher compact />
          </View>

          <View style={styles.toolRow}>
            <Pressable
              onPress={() =>
                setPickPurpose((p) => (p === "poi" ? null : "poi"))
              }
              style={[
                styles.toolBtn,
                pickPurpose === "poi" && styles.toolBtnActive,
              ]}
            >
              <Text
                style={[
                  styles.toolText,
                  pickPurpose === "poi" && styles.toolTextActive,
                ]}
                numberOfLines={1}
              >
                {pickPurpose === "poi" ? t("clicking_map") : t("point_on_map")}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setFiltersVisible(true)}
              style={styles.toolBtn}
            >
              <Text style={styles.toolText}>{t("filters")}</Text>
            </Pressable>

            <Pressable
              onPress={() => setLayersOpen((o) => !o)}
              style={[styles.toolBtn, layersOpen && styles.toolBtnActive]}
            >
              <Text
                style={[styles.toolText, layersOpen && styles.toolTextActive]}
              >
                {t(`basemap_${basemap}`)}
              </Text>
            </Pressable>

            {hasPoi ? (
              <Pressable
                onPress={() => setPoi(null)}
                style={[styles.toolBtn, styles.clearBtn]}
              >
                <Text style={styles.clearText}>{t("clear")}</Text>
              </Pressable>
            ) : null}

            <Pressable onPress={onAccountPress} style={styles.accountBtn}>
              <Text style={styles.accountBtnText} numberOfLines={1}>
                {user ? t("my_listings") : t("login")}
              </Text>
            </Pressable>
          </View>
        </View>

        {layersOpen ? (
          <View style={styles.layersMenu}>
            {BASEMAP_IDS.map((id) => {
              const active = basemap === id;
              return (
                <Pressable
                  key={id}
                  onPress={() => {
                    setBasemap(id);
                    setLayersOpen(false);
                  }}
                  style={[styles.layerChip, active && styles.layerChipActive]}
                >
                  <Text
                    style={[
                      styles.layerText,
                      active && styles.layerTextActive,
                    ]}
                  >
                    {t(`basemap_${id}`)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {fetchError ? (
          <Pressable
            onPress={() => setRefreshKey((k) => k + 1)}
            style={styles.errorBanner}
          >
            <Text style={styles.errorText}>{fetchError}</Text>
            <Text style={styles.errorRetry}>{t("retry")}</Text>
          </Pressable>
        ) : null}
      </View>

      {pickPurpose === "listing" && (
        <View style={[styles.banner, { top: insets.top + 108 }]}>
          <Text style={styles.bannerText} numberOfLines={1}>
            {t("listing_banner")}
          </Text>
          <Pressable
            onPress={() => setPickPurpose(null)}
            style={styles.bannerCancel}
          >
            <Text style={styles.bannerCancelText}>{t("cancel")}</Text>
          </Pressable>
        </View>
      )}

      {/* Single primary action: add listing (prompts sign-in if needed) */}
      <Pressable
        style={[styles.fab, { bottom: controlBottom }]}
        onPress={startAddListing}
        accessibilityLabel={t("add_listing")}
      >
        <Text style={styles.fabPlus}>＋</Text>
      </Pressable>

      <BottomSheet
        ref={sheetRef}
        index={0}
        snapPoints={[120, "55%", "92%"]}
        backgroundStyle={styles.sheetBg}
        handleIndicatorStyle={styles.sheetHandle}
      >
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>
            {t("results_found", { count: listings.length })}
          </Text>
          {poi ? (
            <Text style={styles.sheetSub} numberOfLines={1}>
              {t("radius_of", { km: radiusM / 1000 })}{" "}
              {poi.name.split(",")[0]}
            </Text>
          ) : (
            <Text style={styles.sheetSubMuted}>{t("in_visible_area")}</Text>
          )}
        </View>
        <BottomSheetFlatList
          data={listings}
          keyExtractor={(l) => l.id}
          renderItem={({ item }) => (
            <ListingCard
              listing={item}
              active={activeId === item.id}
              onPress={() => openListing(item.id)}
            />
          )}
          ListEmptyComponent={
            <Text style={styles.empty}>{t("none_here")}</Text>
          }
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        />
      </BottomSheet>

      <FiltersSheet
        visible={filtersVisible}
        onClose={() => setFiltersVisible(false)}
        filters={filters}
        onChange={setFilters}
        radiusM={radiusM}
        onRadiusChange={setRadiusM}
        poiActive={hasPoi}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.slate100 },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 10,
    gap: 6,
    zIndex: 10,
  },
  searchCard: {
    backgroundColor: "rgba(255,255,255,0.96)",
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingTop: 6,
    paddingBottom: 6,
    gap: 6,
    shadowColor: colors.black,
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  brandInline: {
    width: 26,
    height: 26,
    borderRadius: 8,
    overflow: "hidden",
    textAlign: "center",
    lineHeight: 26,
    fontSize: 15,
    fontWeight: "800",
    color: colors.white,
    backgroundColor: colors.brand,
  },
  searchFlex: { flex: 1, minWidth: 0 },
  toolRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
  },
  toolBtn: {
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: rad.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: colors.white,
  },
  toolBtnActive: { backgroundColor: colors.blue, borderColor: colors.blue },
  toolText: { fontSize: 11, fontWeight: "600", color: colors.slate600 },
  toolTextActive: { color: colors.white },
  clearBtn: { borderColor: colors.slate200, backgroundColor: colors.slate100 },
  clearText: { fontSize: 11, fontWeight: "600", color: colors.slate500 },
  accountBtn: {
    marginLeft: "auto",
    borderRadius: rad.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: colors.slate800,
  },
  accountBtnText: { fontSize: 11, fontWeight: "700", color: colors.white },
  layersMenu: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 8,
    elevation: 3,
  },
  layerChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: rad.full,
    backgroundColor: colors.slate100,
  },
  layerChipActive: { backgroundColor: colors.brand },
  layerText: { fontSize: 11, fontWeight: "600", color: colors.slate600 },
  layerTextActive: { color: colors.white },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: rad.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  errorText: { flex: 1, fontSize: 12, color: "#991b1b", fontWeight: "500" },
  errorRetry: { fontSize: 12, fontWeight: "700", color: "#b91c1c" },
  banner: {
    position: "absolute",
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.brand,
    borderRadius: rad.full,
    paddingHorizontal: 16,
    paddingVertical: 10,
    zIndex: 11,
  },
  bannerText: { flex: 1, color: colors.white, fontWeight: "600", fontSize: 13 },
  bannerCancel: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: rad.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  bannerCancelText: { color: colors.white, fontSize: 12 },
  fab: {
    position: "absolute",
    right: 14,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.black,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
    zIndex: 5,
  },
  fabPlus: {
    color: colors.white,
    fontSize: 28,
    lineHeight: 30,
    fontWeight: "600",
  },
  sheetBg: { backgroundColor: colors.white },
  sheetHandle: { backgroundColor: colors.slate300, width: 40 },
  sheetHeader: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.slate100,
  },
  sheetTitle: { fontSize: 15, fontWeight: "700", color: colors.slate800 },
  sheetSub: { fontSize: 12, color: colors.blue, marginTop: 2 },
  sheetSubMuted: { fontSize: 12, color: colors.slate400, marginTop: 2 },
  empty: {
    textAlign: "center",
    color: colors.slate400,
    fontSize: 14,
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
});
