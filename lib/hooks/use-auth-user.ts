"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export interface AuthUser {
  id: string;
  email: string | null;
  name: string | null;
}

function toAuthUser(user: User): AuthUser {
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const name = typeof meta.full_name === "string" ? meta.full_name : null;
  return { id: user.id, email: user.email ?? null, name };
}

/**
 * Current signed-in customer/staff (client-side), kept in sync via Supabase's
 * onAuthStateChange. `loading` is true until the first check resolves so the
 * header can avoid a flash of the wrong state.
 */
export function useAuthUser(): { user: AuthUser | null; loading: boolean } {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let active = true;

    void supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setUser(data.user ? toAuthUser(data.user) : null);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ? toAuthUser(session.user) : null);
      setLoading(false);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { user, loading };
}
