import { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { createClient } from "@/lib/supabase/client";
import { verifiedUser } from "@/lib/auth/identity";
import { appReturnPath } from "@/lib/auth/paths";
import { Paragraph } from "@/ui/elements";
export default function Callback() {
  const { code, next, error } = useLocalSearchParams<{
    code: string;
    next: string;
    error: string;
  }>();
  const [message, setMessage] = useState("Checking your email link…");
  useEffect(() => {
    let active = true;
    async function exchange() {
      if (error || !code || code.length >= 2048) {
        router.replace("/auth/error");
        return;
      }
      const client = createClient();
      const result = await client.auth.exchangeCodeForSession(code);
      if (!active) return;
      if (result.error || !(await verifiedUser(client)))
        router.replace("/auth/error");
      else router.replace(appReturnPath(next) as never);
    }
    void exchange().catch(() =>
      setMessage("This link could not be used. Request another link."),
    );
    return () => {
      active = false;
    };
  }, [code, next, error]);
  return <Paragraph role="status">{message}</Paragraph>;
}
