import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase environment variables are not set");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: {
      getItem: async (key: string) => {
        if (typeof chrome !== "undefined" && chrome.storage) {
          const result = await chrome.storage.local.get(key);
          return (result[key] as string | null) ?? null;
        }
        return localStorage.getItem(key);
      },
      setItem: async (key: string, value: string) => {
        if (typeof chrome !== "undefined" && chrome.storage) {
          await chrome.storage.local.set({ [key]: value });
        } else {
          localStorage.setItem(key, value);
        }
      },
      removeItem: async (key: string) => {
        if (typeof chrome !== "undefined" && chrome.storage) {
          await chrome.storage.local.remove(key);
        } else {
          localStorage.removeItem(key);
        }
      },
    },
    detectSessionInUrl: true,
    persistSession: true,
    autoRefreshToken: true,
  },
});
