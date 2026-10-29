import { useEffect } from "react";
import { Text } from "react-native";
import { render, screen, waitFor, act } from "@testing-library/react-native";
import { SessionProvider, useSession } from "@/services/session";
import { createClient } from "@/lib/supabase/client";
jest.mock("@/lib/supabase/client", () => ({ createClient: jest.fn() }));
jest.mock("@react-native-community/netinfo", () => ({
  __esModule: true,
  default: { addEventListener: () => () => {} },
}));
test("foreground SIGNED_IN for the same verified adult retains drafts; sign-out removes protected content", async () => {
  let callback: (event: string, session: unknown) => void = () => {};
  let user: Record<string, unknown> | null = {
    id: "adult",
    email: "adult@example.test",
    email_confirmed_at: "confirmed",
    is_anonymous: false,
  };
  let mounts = 0;
  jest.mocked(createClient).mockReturnValue({
    auth: {
      getUser: async () => ({ data: { user }, error: null }),
      onAuthStateChange: (listener: typeof callback) => {
        callback = listener;
        return { data: { subscription: { unsubscribe: jest.fn() } } };
      },
      startAutoRefresh: jest.fn(),
      stopAutoRefresh: jest.fn(),
    },
  } as unknown as ReturnType<typeof createClient>);
  function Draft() {
    useEffect(() => {
      mounts++;
    }, []);
    return <Text>Draft still here</Text>;
  }
  function Protected() {
    const { ready, user } = useSession();
    return ready && user ? <Draft /> : <Text>Signed out or checking</Text>;
  }
  await render(
    <SessionProvider>
      <Protected />
    </SessionProvider>,
  );
  await waitFor(() =>
    expect(screen.getByText("Draft still here")).toBeTruthy(),
  );
  expect(mounts).toBe(1);
  await act(async () => {
    callback("SIGNED_IN", { user });
    await new Promise((resolve) => setTimeout(resolve, 20));
  });
  await waitFor(() =>
    expect(screen.getByText("Draft still here")).toBeTruthy(),
  );
  expect(mounts).toBe(1);
  user = null;
  await act(async () => {
    callback("SIGNED_OUT", null);
    await new Promise((resolve) => setTimeout(resolve, 20));
  });
  await waitFor(() =>
    expect(screen.queryByText("Draft still here")).toBeNull(),
  );
});
