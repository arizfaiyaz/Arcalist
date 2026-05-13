import { createClient } from "@supabase/supabase-js";
import { browserApi } from "./browserApi";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase environment variables are not set");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: {
      getItem: async (key: string) => {
        const result = await browserApi.storage.get<Record<string, string | null>>(key);
        return result[key] ?? null;
      },
      setItem: async (key: string, value: string) => {
        await browserApi.storage.set({ [key]: value });
      },
      removeItem: async (key: string) => {
        await browserApi.storage.remove(key);
      },
    },
    detectSessionInUrl: true,
    persistSession: true,
    autoRefreshToken: true,
  },
});
