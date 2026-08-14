import { KeychainAccess, SecureStorage } from "@aparajita/capacitor-secure-storage";
import { Capacitor } from "@capacitor/core";
import { createClient } from "@supabase/supabase-js";
import {
  createMemoryStorage,
  createSecureSessionStorage,
} from "./secure-session-storage.js";

const native = Capacitor.isNativePlatform();
const environment = import.meta.env ?? {};
const supabaseUrl = environment.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = environment.VITE_SUPABASE_ANON_KEY?.trim();

const installationMarker = native
  ? {
      async getItem(key) {
        return globalThis.localStorage.getItem(key);
      },
      async setItem(key, value) {
        globalThis.localStorage.setItem(key, value);
      },
    }
  : null;

export const mobileAuthStorage = native
  ? createSecureSessionStorage({
      access: KeychainAccess.whenUnlockedThisDeviceOnly,
      installationMarker,
      secureStorage: SecureStorage,
    })
  : createMemoryStorage();

export const mobileSupabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          autoRefreshToken: native,
          detectSessionInUrl: false,
          flowType: "pkce",
          persistSession: native,
          storage: mobileAuthStorage,
        },
      })
    : null;

export const mobileSupabaseConfigState = Object.freeze({
  native,
  ready: Boolean(mobileSupabase),
});
