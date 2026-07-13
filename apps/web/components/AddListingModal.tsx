"use client";

import { useEffect, useRef, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabaseClient";
import { useAuth } from "./AuthProvider";
import MiniMapPicker from "./MiniMapPicker";
import { useI18n } from "./LanguageProvider";
import { propertyTypeKey } from "@/lib/i18n";
import { MAX_LISTING_IMAGES, listingImages } from "@/lib/listingImages";
import {
  formatSupabaseError,
  isMissingColumnError,
} from "@/lib/supabaseErrors";
import { Listing, PropertyType } from "@/lib/types";

interface Props {
  lat: number;
  lng: number;
  existing?: Listing; // when provided, the modal edits this listing
  onClose: () => void;
  onCreated: () => void;
}

const TYPES: PropertyType[] = [
  "apartment",
  "house",
  "studio",
  "villa",
  "room",
  "office",
];

export default function AddListingModal({
  lat: initialLat,
  lng: initialLng,
  existing,
  onClose,
  onCreated,
}: Props) {
  const { user } = useAuth();
  const { t, locale } = useI18n();
  const isEdit = Boolean(existing);
  const [loc, setLoc] = useState({ lat: initialLat, lng: initialLng });
  const { lat, lng } = loc;
  const [title, setTitle] = useState(existing?.title ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [type, setType] = useState<PropertyType>(existing?.type ?? "apartment");
  const [price, setPrice] = useState(existing ? String(existing.price) : "");
  const [bedrooms, setBedrooms] = useState(String(existing?.bedrooms ?? 1));
  const [bathrooms, setBathrooms] = useState(String(existing?.bathrooms ?? 1));
  const [area, setArea] = useState(existing?.area_sqm ? String(existing.area_sqm) : "");
  const [governorate, setGovernorate] = useState(existing?.governorate ?? "");
  const [delegation, setDelegation] = useState(existing?.delegation ?? "");
  const [address, setAddress] = useState(existing?.address ?? "");
  const [phone, setPhone] = useState(existing?.phone ?? "");
  const [imageUrls, setImageUrls] = useState<string[]>(() =>
    existing ? listingImages(existing) : []
  );
  const [urlInput, setUrlInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detecting, setDetecting] = useState(!isEdit);

  const uploadFile = async (file: File) => {
    const supabase = getBrowserSupabase();
    if (!supabase || !user) {
      setError(t("login_to_upload"));
      return null;
    }
    if (!file.type.startsWith("image/")) {
      setError(t("image_only"));
      return null;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError(t("image_too_big"));
      return null;
    }
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("listing-images")
      .upload(path, file, { contentType: file.type, upsert: false });
    if (upErr) throw upErr;
    const { data } = supabase.storage.from("listing-images").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;
    if (imageUrls.length >= MAX_LISTING_IMAGES) {
      setError(t("max_photos", { max: MAX_LISTING_IMAGES }));
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const added: string[] = [];
      for (const file of files) {
        if (imageUrls.length + added.length >= MAX_LISTING_IMAGES) break;
        const url = await uploadFile(file);
        if (url) added.push(url);
      }
      if (added.length) setImageUrls((prev) => [...prev, ...added]);
    } catch (err: unknown) {
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

  const removeImage = (index: number) => {
    setImageUrls((prev) => prev.filter((_, i) => i !== index));
  };

  // Auto-detect governorate / délégation / address from the point. On an
  // existing listing we skip the very first run so we don't overwrite saved
  // values — but re-detect whenever the user moves the marker.
  const skipDetect = useRef(isEdit);
  useEffect(() => {
    if (skipDetect.current) {
      skipDetect.current = false;
      return;
    }
    let cancelled = false;
    setDetecting(true);
    fetch(`/api/reverse-geocode?lat=${lat}&lng=${lng}&lang=${locale}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d.governorate) setGovernorate(d.governorate);
        if (d.delegation) setDelegation(d.delegation);
        if (d.address) setAddress(d.address);
      })
      .catch(() => {})
      .finally(() => !cancelled && setDetecting(false));
    return () => {
      cancelled = true;
    };
  }, [lat, lng, locale]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const supabase = getBrowserSupabase();
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
      lat,
      lng,
    };
    const modern = {
      ...base,
      phone: phone.trim() || null,
      image_urls: imageUrls,
    };
    const legacy = {
      ...base,
      image_url: imageUrls[0] ?? null,
    };

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
      } catch (err: unknown) {
        const msg = formatSupabaseError(err);
        if (isMissingColumnError(msg)) {
          await persist(legacy);
        } else {
          throw err;
        }
      }
      onCreated();
      onClose();
    } catch (err: unknown) {
      setError(formatSupabaseError(err) || t("save_failed"));
    } finally {
      setLoading(false);
    }
  };

  const remove = async () => {
    if (!existing) return;
    if (!confirm(t("delete_confirm"))) return;
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("listings")
        .delete()
        .eq("id", existing.id);
      if (error) throw error;
      onCreated();
      onClose();
    } catch (err: unknown) {
      setError(formatSupabaseError(err) || t("delete_failed"));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="karia-scroll karia-sheet max-h-[min(92dvh,720px)] w-full max-w-lg overflow-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:max-h-[90vh] sm:rounded-2xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">
            {isEdit ? t("edit_title") : t("add_title")}
          </h2>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full text-slate-400 hover:bg-slate-100"
          >
            ✕
          </button>
        </div>
        <p className="mb-2 flex items-center gap-2 text-xs text-blue-600">
          <span>{t("location_label")} : {lat.toFixed(5)}, {lng.toFixed(5)}</span>
          {detecting && (
            <span className="flex items-center gap-1 text-slate-400">
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-transparent" />
              {t("detecting_address")}
            </span>
          )}
        </p>

        <div className="mb-1">
          <MiniMapPicker
            lat={lat}
            lng={lng}
            onChange={(lng2, lat2) => setLoc({ lat: lat2, lng: lng2 })}
          />
          <p className="mt-1 text-[11px] text-slate-400">{t("minimap_hint")}</p>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <Field label={t("field_title")}>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input"
              placeholder={t("title_ph")}
              required
            />
          </Field>

          <Field label={t("field_description")}>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="input resize-none"
              placeholder={t("desc_ph")}
            />
          </Field>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label={t("field_type")}>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as PropertyType)}
                className="input"
              >
                {TYPES.map((tp) => (
                  <option key={tp} value={tp}>
                    {t(propertyTypeKey(tp))}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t("field_rent")}>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="input"
                min={0}
                required
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Field label={t("bedrooms")}>
              <input
                type="number"
                value={bedrooms}
                onChange={(e) => setBedrooms(e.target.value)}
                className="input"
                min={0}
              />
            </Field>
            <Field label={t("field_baths")}>
              <input
                type="number"
                value={bathrooms}
                onChange={(e) => setBathrooms(e.target.value)}
                className="input"
                min={0}
              />
            </Field>
            <Field label={t("field_area")}>
              <input
                type="number"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                className="input"
                min={0}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label={t("field_governorate")}>
              <input
                value={governorate}
                onChange={(e) => setGovernorate(e.target.value)}
                className="input"
                placeholder="Tunis"
              />
            </Field>
            <Field label={t("field_delegation")}>
              <input
                value={delegation}
                onChange={(e) => setDelegation(e.target.value)}
                className="input"
                placeholder="La Marsa"
              />
            </Field>
          </div>

          <Field label={t("field_address")}>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="input"
              placeholder={t("address_ph")}
            />
          </Field>

          <Field label={t("field_phone")}>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="input"
              placeholder={t("phone_ph")}
            />
          </Field>

          <Field label={t("field_photos")}>
            <div className="space-y-2">
              {imageUrls.length > 0 && (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {imageUrls.map((url, i) => (
                    <div
                      key={`${url}-${i}`}
                      className="relative aspect-[4/3] overflow-hidden rounded-lg border border-slate-200 bg-slate-100"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/55 text-xs text-white hover:bg-black/75"
                        title={t("remove_photo")}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <label
                  className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:border-brand hover:text-brand ${
                    imageUrls.length >= MAX_LISTING_IMAGES || uploading
                      ? "pointer-events-none opacity-50"
                      : ""
                  }`}
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                  </svg>
                  {uploading ? t("uploading") : t("add_photo")}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFiles}
                    disabled={uploading || imageUrls.length >= MAX_LISTING_IMAGES}
                    className="hidden"
                  />
                </label>
                <span className="text-[11px] text-slate-400">
                  {imageUrls.length}/{MAX_LISTING_IMAGES}
                </span>
              </div>
              <div className="flex gap-2">
                <input
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  className="input flex-1"
                  placeholder={t("or_paste_url")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addUrl();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={addUrl}
                  disabled={!urlInput.trim() || imageUrls.length >= MAX_LISTING_IMAGES}
                  className="shrink-0 rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  +
                </button>
              </div>
            </div>
          </Field>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
              {error}
            </p>
          )}

          <div className="sticky bottom-0 -mx-5 flex gap-2 border-t border-slate-100 bg-white px-5 py-3 pb-safe sm:static sm:mx-0 sm:border-0 sm:p-0 sm:pt-1">
            {isEdit && (
              <button
                type="button"
                onClick={remove}
                disabled={deleting}
                className="flex items-center justify-center gap-2 rounded-lg border border-red-200 px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
              >
                {deleting && (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
                )}
                {t("delete")}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              {t("cancel")}
            </button>
            <button
              type="submit"
              disabled={loading || uploading}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-brand py-2.5 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-60"
            >
              {loading && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              )}
              {isEdit ? t("save") : t("publish")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600">
        {label}
      </span>
      {children}
    </label>
  );
}
