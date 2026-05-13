import { useEffect, useRef, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { useArcalistStore } from "../store/useArcalistStore";
import { clearWorkspaceCacheForUser } from "../lib/storage";

type AuthHookState = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

export function useAuth(): AuthHookState {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const lastUserIdRef = useRef<string | null>(null);
  const signInWithGoogle = useArcalistStore((state) => state.signInWithGoogle);
  const signOut = useArcalistStore((state) => state.signOut);
  const setAuthenticatedUser = useArcalistStore(
    (state) => state.setAuthenticatedUser,
  );
  const clearWorkspaceStore = useArcalistStore(
    (state) => state.clearWorkspaceStore,
  );

  useEffect(() => {
    let active = true;

    const syncSession = async (nextSession: Session | null) => {
      if (!active) return;
      const nextUser = nextSession?.user ?? null;
      setSession(nextSession);
      setUser(nextUser);
      lastUserIdRef.current = nextUser?.id ?? lastUserIdRef.current;
      await setAuthenticatedUser(nextUser);
      if (!nextUser) {
        clearWorkspaceStore();
      }
    };

    void supabase.auth.getSession().then(async ({ data }) => {
      await syncSession(data.session);
      if (active) setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
      await syncSession(nextSession);
      if (event === "SIGNED_OUT") {
        await clearWorkspaceCacheForUser(lastUserIdRef.current);
        lastUserIdRef.current = null;
      }
      if (active) setLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [clearWorkspaceStore, setAuthenticatedUser]);

  return {
    user,
    session,
    loading,
    signInWithGoogle,
    signOut,
  };
}
