import { useEffect, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import {
  formatSupabaseError,
  isMissingColumnError,
  Listing,
  listingImages,
  MAX_LISTING_IMAGES,
  PROPERTY_TYPES,
  PropertyType,
  propertyTypeKey,
} from "@karia/shared";
import { useAuth } from "@/providers/AuthProvider";
import { useI18n } from "@/providers/LanguageProvider";
import { getSupabase } from "@/lib/supabase";
import { getListingById, reverseLookup } from "@/lib/api";
import MiniMapPicker from "@/components/MiniMapPicker";
import Spinner from "@/components/Spinner";
import { colors, radius as rad, PLACEHOLDER_IMAGE } from "@/theme";

export default function AddListingScreen() {
  const params = useLocalSearchParams<{
    id?: string;
    lat?: string;
    lng?: string;
  }>();
  const { user } = useAuth();
  const { t, locale } = useI18n();

  const [existing, setExisting] = useState<Listing | null>(null);
  const [ready, setReady] = useState(!params.id);
  const isEdit = Boolean(params.id);

  const [loc, setLoc] = useState({
    lat: params.lat ? Number(params.lat) : 36.83,
    lng: params.lng ? Number(params.lng) : 10.18,
  });
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<PropertyType>("apartment");
  const [price, setPrice] = useState("");
  const [bedrooms, setBedrooms] = useState("1");
  const [bathrooms, setBathrooms] = useState("1");
  const [area, setArea] = useState("");
  const [governorate, setGovernorate] = useState("");
  const [delegation, setDelegation] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [urlInput, setUrlInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load the existing listing when editing.
  useEffect(() => {
    if (!params.id) return;
    (async () => {
      const l = await getListingById(params.id!);
      if (l) {
        setExisting(l);
        setLoc({ lat: l.lat, lng: l.lng });
        setTitle(l.title);
        setDescription(l.description ?? "");
        setType(l.type);
        setPrice(String(l.price));
        setBedrooms(String(l.bedrooms));
        setBathrooms(String(l.bathrooms));
        setArea(l.area_sqm ? String(l.area_sqm) : "");
        setGovernorate(l.governorate ?? "");
        setDelegation(l.delegation ?? "");
        setAddress(l.address ?? "");
        setPhone(l.phone ?? "");
        setImageUrls(listingImages(l));
      }
      setReady(true);
    })();
  }, [params.id]);

  // Auto-detect address from the point (skip first run when editing).
  const skipDetect = useRef(isEdit);
  useEffect(() => {
    if (!ready) return;
    if (skipDetect.current) {
      skipDetect.current = false;
      return;
    }
    let cancelled = false;
    setDetecting(true);
    reverseLookup(loc.lat, loc.lng, locale)
      .then((d) => {
        if (cancelled) return;
        if (d.governorate) setGovernorate(d.governorate);
        if (d.delegation) setDelegation(d.delegation);
        if (d.address) setAddress(d.address);
      })
      .finally(() => !cancelled && setDetecting(false));
    return () => {
      cancelled = true;
    };
  }, [loc.lat, loc.lng, locale, ready]);

  const pickImages = async () => {
    if (imageUrls.length >= MAX_LISTING_IMAGES) {
      setError(t("max_photos", { max: MAX_LISTING_IMAGES }));
      return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: MAX_LISTING_IMAGES - imageUrls.length,
      quality: 0.7,
    });
    if (result.canceled) return;
    const supabase = getSupabase();
    if (!supabase || !user) {
      setError(t("login_to_upload"));
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const added: string[] = [];
      for (const asset of result.assets) {
        if (imageUrls.length + added.length >= MAX_LISTING_IMAGES) break;
        const contentType = asset.mimeType ?? "image/jpeg";
        const ext = contentType.split("/")[1] || "jpg";
        const arraybuffer = await fetch(asset.uri).then((r) => r.arrayBuffer());
        const path = `${user.id}/${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("listing-images")
          .upload(path, arraybuffer, { contentType, upsert: false });
        if (upErr) throw upErr;
        const { data } = supabase.storage
          .from("listing-images")
          .getPublicUrl(path);
        added.push(data.publicUrl);
      }
      if (added.length) setImageUrls((prev) => [...prev, ...added]);
    } catch (err) {
      setError(formatSupabaseError(err) || t("upload_failed"));
    } finally {
      setUploading(false);
    }
  };

  const addUrl = () => {
    const url = urlInput.trim();
    if (!url) return;
    if (imageUrls.length >= MAX_LISTING_IMAGES) {
      setError(t("max_photos", { max: MAX_LISTING_IMAGES }));
      return;
    }
    setImageUrls((prev) => [...prev, url]);
    setUrlInput("");
    setError(null);
  };

  const removeImage = (i: number) =>
    setImageUrls((prev) => prev.filter((_, idx) => idx !== i));

  const submit = async () => {
    setError(null);
    const supabase = getSupabase();
    if (!supabase || !user) {
      setError(t("login_to_publish"));
      return;
    }
    if (!title.trim() || !price) {
      setError(t("required_error"));
      return;
    }
    setLoading(true);
    const base = {
      title: title.trim(),
      description: description.trim() || null,
      type,
      price: Number(price),
      bedrooms: Number(bedrooms),
      bathrooms: Number(bathrooms),
      area_sqm: area ? Number(area) : null,
      governorate: governorate.trim() || null,
      delegation: delegation.trim() || null,
      address: address.trim() || null,
      lat: loc.lat,
      lng: loc.lng,
    };
    const modern = { ...base, phone: phone.trim() || null, image_urls: imageUrls };
    const legacy = { ...base, image_url: imageUrls[0] ?? null };

    const persist = async (payload: Record<string, unknown>) => {
      if (isEdit && existing) {
        const { error } = await supabase
          .from("listings")
          .update(payload)
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("listings")
          .insert({ ...payload, owner_id: user.id, is_active: true });
        if (error) throw error;
      }
    };

    try {
      try {
        await persist(modern);
      } catch (err) {
        if (isMissingColumnError(formatSupabaseError(err))) {
          await persist(legacy);
        } else {
          throw err;
        }
      }
      router.back();
    } catch (err) {
      setError(formatSupabaseError(err) || t("save_failed"));
    } finally {
      setLoading(false);
    }
  };

  const remove = () => {
    if (!existing) return;
    Alert.alert(t("edit_title"), t("delete_confirm"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("delete"),
        style: "destructive",
        onPress: async () => {
          const supabase = getSupabase();
          if (!supabase) return;
          setDeleting(true);
          try {
            const { error } = await supabase
              .from("listings")
              .delete()
              .eq("id", existing.id);
            if (error) throw error;
            router.back();
          } catch (err) {
            setError(formatSupabaseError(err) || t("delete_failed"));
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  };

  if (!ready) return <Spinner style={styles.center} />;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerRow}>
          <Text style={styles.title}>
            {isEdit ? t("edit_title") : t("add_title")}
          </Text>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Text style={styles.close}>✕</Text>
          </Pressable>
        </View>

        <Text style={styles.locLine}>
          {t("location_label")} : {loc.lat.toFixed(5)}, {loc.lng.toFixed(5)}
          {detecting ? `  ·  ${t("detecting_address")}` : ""}
        </Text>

        <MiniMapPicker
          lat={loc.lat}
          lng={loc.lng}
          onChange={(lng, lat) => setLoc({ lat, lng })}
        />
        <Text style={styles.hint}>{t("minimap_hint")}</Text>

        <Label text={t("field_title")} />
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder={t("title_ph")}
          placeholderTextColor={colors.slate400}
          style={styles.input}
        />

        <Label text={t("field_description")} />
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder={t("desc_ph")}
          placeholderTextColor={colors.slate400}
          multiline
          style={[styles.input, styles.textarea]}
        />

        <Label text={t("field_type")} />
        <View style={styles.chipRow}>
          {PROPERTY_TYPES.map((tp) => {
            const active = type === tp;
            return (
              <Pressable
                key={tp}
                onPress={() => setType(tp)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text
                  style={[styles.chipText, active && styles.chipTextActive]}
                >
                  {t(propertyTypeKey(tp))}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.grid}>
          <Field label={t("field_rent")} flex={1}>
            <TextInput
              value={price}
              onChangeText={setPrice}
              keyboardType="numeric"
              style={styles.input}
              placeholderTextColor={colors.slate400}
            />
          </Field>
          <Field label={t("bedrooms")} flex={1}>
            <TextInput
              value={bedrooms}
              onChangeText={setBedrooms}
              keyboardType="numeric"
              style={styles.input}
            />
          </Field>
        </View>

        <View style={styles.grid}>
          <Field label={t("field_baths")} flex={1}>
            <TextInput
              value={bathrooms}
              onChangeText={setBathrooms}
              keyboardType="numeric"
              style={styles.input}
            />
          </Field>
          <Field label={t("field_area")} flex={1}>
            <TextInput
              value={area}
              onChangeText={setArea}
              keyboardType="numeric"
              style={styles.input}
            />
          </Field>
        </View>

        <View style={styles.grid}>
          <Field label={t("field_governorate")} flex={1}>
            <TextInput
              value={governorate}
              onChangeText={setGovernorate}
              placeholder="Tunis"
              placeholderTextColor={colors.slate400}
              style={styles.input}
            />
          </Field>
          <Field label={t("field_delegation")} flex={1}>
            <TextInput
              value={delegation}
              onChangeText={setDelegation}
              placeholder="La Marsa"
              placeholderTextColor={colors.slate400}
              style={styles.input}
            />
          </Field>
        </View>

        <Label text={t("field_address")} />
        <TextInput
          value={address}
          onChangeText={setAddress}
          placeholder={t("address_ph")}
          placeholderTextColor={colors.slate400}
          style={styles.input}
        />

        <Label text={t("field_phone")} />
        <TextInput
          value={phone}
          onChangeText={setPhone}
          placeholder={t("phone_ph")}
          placeholderTextColor={colors.slate400}
          keyboardType="phone-pad"
          style={styles.input}
        />

        <Label text={`${t("field_photos")}  (${imageUrls.length}/${MAX_LISTING_IMAGES})`} />
        {imageUrls.length > 0 && (
          <View style={styles.photoGrid}>
            {imageUrls.map((url, i) => (
              <View key={`${url}-${i}`} style={styles.photoWrap}>
                <Image
                  source={{ uri: url || PLACEHOLDER_IMAGE }}
                  style={styles.photo}
                  contentFit="cover"
                />
                <Pressable
                  style={styles.photoRemove}
                  onPress={() => removeImage(i)}
                >
                  <Text style={styles.photoRemoveText}>✕</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}
        <Pressable
          style={styles.uploadBtn}
          onPress={pickImages}
          disabled={uploading || imageUrls.length >= MAX_LISTING_IMAGES}
        >
          {uploading ? (
            <Spinner size="small" color={colors.brand} />
          ) : (
            <Text style={styles.uploadText}>{t("add_photo")}</Text>
          )}
        </Pressable>
        <View style={styles.urlRow}>
          <TextInput
            value={urlInput}
            onChangeText={setUrlInput}
            placeholder={t("or_paste_url")}
            placeholderTextColor={colors.slate400}
            autoCapitalize="none"
            style={[styles.input, { flex: 1 }]}
          />
          <Pressable style={styles.urlAdd} onPress={addUrl}>
            <Text style={styles.urlAddText}>+</Text>
          </Pressable>
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        <View style={styles.actions}>
          {isEdit && (
            <Pressable
              style={styles.deleteBtn}
              onPress={remove}
              disabled={deleting}
            >
              {deleting ? (
                <Spinner size="small" color={colors.red} />
              ) : (
                <Text style={styles.deleteText}>{t("delete")}</Text>
              )}
            </Pressable>
          )}
          <Pressable
            style={styles.submitBtn}
            onPress={submit}
            disabled={loading || uploading}
          >
            {loading ? (
              <Spinner size="small" color={colors.white} />
            ) : (
              <Text style={styles.submitText}>
                {isEdit ? t("save") : t("publish")}
              </Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Label({ text }: { text: string }) {
  return <Text style={styles.label}>{text}</Text>;
}

function Field({
  label,
  flex,
  children,
}: {
  label: string;
  flex?: number;
  children: React.ReactNode;
}) {
  return (
    <View style={{ flex }}>
      <Label text={label} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
  },
  content: { padding: 20, paddingBottom: 40 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  title: { fontSize: 20, fontWeight: "700", color: colors.slate800 },
  close: { fontSize: 20, color: colors.slate400 },
  locLine: { fontSize: 12, color: colors.blue, marginBottom: 8 },
  hint: { fontSize: 11, color: colors.slate400, marginTop: 6 },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.slate600,
    marginTop: 14,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: rad.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.slate800,
    backgroundColor: colors.white,
  },
  textarea: { height: 72, textAlignVertical: "top" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: rad.full,
    borderWidth: 1,
    borderColor: colors.slate200,
  },
  chipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  chipText: { fontSize: 13, color: colors.slate600, fontWeight: "500" },
  chipTextActive: { color: colors.white },
  grid: { flexDirection: "row", gap: 12 },
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  photoWrap: { width: 88, height: 66 },
  photo: {
    width: 88,
    height: 66,
    borderRadius: rad.sm,
    backgroundColor: colors.slate100,
  },
  photoRemove: {
    position: "absolute",
    top: 3,
    right: 3,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  photoRemoveText: { color: colors.white, fontSize: 11 },
  uploadBtn: {
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: rad.md,
    paddingVertical: 12,
    alignItems: "center",
    minHeight: 44,
    justifyContent: "center",
  },
  uploadText: { fontSize: 13, fontWeight: "600", color: colors.brand },
  urlRow: { flexDirection: "row", gap: 8, marginTop: 8, alignItems: "center" },
  urlAdd: {
    width: 44,
    height: 44,
    borderRadius: rad.md,
    borderWidth: 1,
    borderColor: colors.slate200,
    alignItems: "center",
    justifyContent: "center",
  },
  urlAddText: { fontSize: 20, color: colors.slate600 },
  error: {
    backgroundColor: colors.redLight,
    color: colors.red,
    fontSize: 12,
    padding: 10,
    borderRadius: rad.sm,
    marginTop: 14,
  },
  actions: { flexDirection: "row", gap: 10, marginTop: 20 },
  deleteBtn: {
    borderWidth: 1,
    borderColor: colors.red,
    borderRadius: rad.md,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 90,
  },
  deleteText: { color: colors.red, fontWeight: "600", fontSize: 14 },
  submitBtn: {
    flex: 1,
    backgroundColor: colors.brand,
    borderRadius: rad.md,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
  },
  submitText: { color: colors.white, fontWeight: "700", fontSize: 15 },
});
