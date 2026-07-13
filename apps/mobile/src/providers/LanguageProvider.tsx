import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Localization from "expo-localization";
import { Locale, isRTL, translate } from "@karia/shared";

interface I18nContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  dir: "ltr" | "rtl";
  ready: boolean;
}

const I18nContext = createContext<I18nContextValue>({
  locale: "fr",
  setLocale: () => {},
  t: (k) => k,
  dir: "ltr",
  ready: false,
});

const STORAGE_KEY = "karia.locale";

function deviceDefaultLocale(): Locale {
  const code = Localization.getLocales()[0]?.languageCode?.toLowerCase();
  if (code === "ar") return "tn";
  if (code === "en") return "en";
  return "fr";
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("fr");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const saved = (await AsyncStorage.getItem(STORAGE_KEY)) as Locale | null;
        if (saved && ["fr", "en", "tn"].includes(saved)) {
          setLocaleState(saved);
        } else {
          setLocaleState(deviceDefaultLocale());
        }
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    AsyncStorage.setItem(STORAGE_KEY, l).catch(() => {});
  }, []);

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale,
      t: (key, params) => translate(locale, key, params),
      dir: isRTL(locale) ? "rtl" : "ltr",
      ready,
    }),
    [locale, setLocale, ready]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
