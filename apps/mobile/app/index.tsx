import { useCallback, useEffect, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
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
  const [pickPurpose, setPickPurpose] = useState<PickPurpose>(null);
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const sheetRef = useRef<BottomSheet>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Debounced search whenever the query inputs change (mirrors the web app).
  useEffect(() => {
    if (!poi && !bbox) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const params = poi
        ? { filters, center: { lat: poi.lat, lng: poi.lng, radiusM } }
        : { filters, bbox: bbox ?? undefined };
      const { listings: found } = await fetchListings(params);
      setListings(found);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [filters, poi, radiusM, bbox, refreshKey]);

  // Refetch when returning to the map (e.g. after adding/editing a listing).
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
    // poi pick
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

  const hasPoi = !!poi;

  return (
    <View style={styles.root}>
      <MapCanvas
        listings={listings}
        activeId={activeId}
        poi={poi}
        radiusM={radiusM}
        basemap={basemap}
        pickMode={pickPurpose !== null}
        onListingPress={openListing}
        onBBoxChange={setBBox}
        onMapPress={handleMapPress}
      />

      {/* Top controls */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <View style={styles.brandRow}>
          <Text style={styles.brand}>
            Karia <Text style={styles.brandSub}>· {t("tagline")}</Text>
          </Text>
          <LanguageSwitcher />
        </View>

        <PlaceSearch onSelect={handleSelectPlace} />

        <View style={styles.actionRow}>
          <Pressable
            onPress={() =>
              setPickPurpose((p) => (p === "poi" ? null : "poi"))
            }
            style={[
              styles.actionBtn,
              pickPurpose === "poi" && styles.actionBtnActive,
            ]}
          >
            <Text
              style={[
                styles.actionText,
                pickPurpose === "poi" && styles.actionTextActive,
              ]}
            >
              {pickPurpose === "poi" ? t("clicking_map") : t("point_on_map")}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setFiltersVisible(true)}
            style={styles.actionBtn}
          >
            <Text style={styles.actionText}>{t("filters")}</Text>
          </Pressable>

          {hasPoi && (
            <Pressable
              onPress={() => setPoi(null)}
              style={[styles.actionBtn, styles.clearBtn]}
            >
              <Text style={styles.clearText}>{t("clear")}</Text>
            </Pressable>
          )}
        </View>

        {/* Basemap chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.basemapScroll}
          contentContainerStyle={styles.basemapRow}
        >
          {BASEMAP_IDS.map((id) => {
            const active = basemap === id;
            return (
              <Pressable
                key={id}
                onPress={() => setBasemap(id)}
                style={[styles.basemapChip, active && styles.basemapChipActive]}
              >
                <Text
                  style={[
                    styles.basemapText,
                    active && styles.basemapTextActive,
                  ]}
                >
                  {t(`basemap_${id}`)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Pick-listing banner */}
      {pickPurpose === "listing" && (
        <View style={[styles.banner, { top: insets.top + 150 }]}>
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

      {/* Add listing FAB */}
      <Pressable
        style={[styles.fab, { bottom: 130 }]}
        onPress={startAddListing}
      >
        <Text style={styles.fabPlus}>＋</Text>
      </Pressable>

      {/* Account / listings quick links */}
      <View style={[styles.sideLinks, { bottom: 190 }]}>
        <Pressable
          style={styles.sideLink}
          onPress={() =>
            user ? router.push("/my-listings") : router.push("/auth")
          }
        >
          <Text style={styles.sideLinkText}>
            {user ? t("my_listings") : t("login")}
          </Text>
        </Pressable>
      </View>

      {/* Listings bottom sheet */}
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
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brand: { fontSize: 18, fontWeight: "800", color: colors.brand },
  brandSub: { fontSize: 11, fontWeight: "500", color: colors.slate400 },
  actionRow: { flexDirection: "row", gap: 8 },
  actionBtn: {
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: rad.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.white,
  },
  actionBtnActive: { backgroundColor: colors.blue, borderColor: colors.blue },
  actionText: { fontSize: 12, fontWeight: "600", color: colors.slate600 },
  actionTextActive: { color: colors.white },
  clearBtn: { borderColor: colors.slate200, backgroundColor: colors.slate100 },
  clearText: { fontSize: 12, fontWeight: "600", color: colors.slate500 },
  basemapScroll: { marginHorizontal: -4 },
  basemapRow: { gap: 6, paddingHorizontal: 4 },
  basemapChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: rad.full,
    backgroundColor: colors.slate100,
  },
  basemapChipActive: { backgroundColor: colors.brand },
  basemapText: { fontSize: 11, fontWeight: "600", color: colors.slate600 },
  basemapTextActive: { color: colors.white },
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
  },
  fabPlus: { color: colors.white, fontSize: 28, lineHeight: 30, fontWeight: "600" },
  sideLinks: { position: "absolute", left: 14 },
  sideLink: {
    backgroundColor: colors.slate800,
    borderRadius: rad.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sideLinkText: { color: colors.white, fontSize: 12, fontWeight: "600" },
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
