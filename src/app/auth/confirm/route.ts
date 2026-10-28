import type { EmailOtpType } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/pool/paths";

// The email link lands here with a one time token hash (ADR-002).
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const cookieStore = await cookies();
  const next = safeNextPath(cookieStore.get("pool-next")?.value);

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      cookieStore.delete("pool-next");
      return NextResponse.redirect(new URL(next, request.url));
    }
    console.error("verifyOtp failed", error.status, error.code);
  }
  return NextResponse.redirect(new URL("/login?error=link", request.url));
}
