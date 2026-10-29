import NetInfo from "@react-native-community/netinfo";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { AppState, Platform } from "react-native";
import {
  focusManager,
  onlineManager,
  QueryClientProvider,
} from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { verifiedUser } from "@/lib/auth/identity";
import { queryClient } from "./cache";
const Session = createContext<{ user: User | null; ready: boolean }>({
  user: null,
  ready: false,
});
export const useSession = () => useContext(Session);
export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ user: User | null; ready: boolean }>({
    user: null,
    ready: false,
  });
  useEffect(() => {
    const client = createClient();
    let alive = true;
    let revision = 0;
    let account: string | null = null;
    async function verify() {
      const current = ++revision;
      const user = await verifiedUser(client);
      if (!alive || current !== revision) return;
      if (account !== (user?.id ?? null)) {
        await queryClient.cancelQueries();
        queryClient.clear();
        account = user?.id ?? null;
      }
      if (alive && current === revision) setState({ user, ready: true });
    }
    void verify();
    const { data } = client.auth.onAuthStateChange((event, session) => {
      // Supabase repeats SIGNED_IN on foreground. Keep the verified account's
      // mounted forms while rechecking; only an identity change hides them.
      // Session payloads never grant authority: verify() still calls getUser().
      if (event === "SIGNED_OUT" || (session?.user.id ?? null) !== account)
        setState((current) => ({ ...current, ready: false }));
      setTimeout(() => {
        if (alive) void verify();
      }, 0);
    });
    const stopNetwork = NetInfo.addEventListener((state) =>
      onlineManager.setOnline(
        state.isConnected !== false && state.isInternetReachable !== false,
      ),
    );
    const subscription = AppState.addEventListener("change", (next) => {
      if (next === "active") {
        client.auth.startAutoRefresh();
        focusManager.setFocused(true);
        void verify();
      } else {
        client.auth.stopAutoRefresh();
        focusManager.setFocused(false);
      }
    });
    if (Platform.OS !== "web" && AppState.currentState !== "active")
      client.auth.stopAutoRefresh();
    return () => {
      alive = false;
      data.subscription.unsubscribe();
      subscription.remove();
      stopNetwork();
    };
  }, []);
  return (
    <QueryClientProvider client={queryClient}>
      <Session.Provider value={state}>{children}</Session.Provider>
    </QueryClientProvider>
  );
}
