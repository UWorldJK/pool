import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifiedUser } from "@/lib/auth/identity";
import { appReturnPath } from "@/lib/auth/paths";
import { privateAuthHeaders } from "@/lib/auth/cache";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const code = params.get("code");
  let target = "/auth/error";
  if (!params.has("error") && code && code.length < 2048) {
    const client = await createClient();
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (!error && (await verifiedUser(client))) {
      // Recovery mail uses the explicit token-hash confirmation flow. This
      // compatibility callback accepts only protected application return paths.
      target = appReturnPath(params.get("next"));
    }
  }
  // Relative Location avoids trusting forwarded hosts for a callback redirect.
  return new NextResponse(null, {
    status: 303,
    headers: {
      ...privateAuthHeaders,
      Location: target,
      "Referrer-Policy": "strict-origin",
    },
  });
}
