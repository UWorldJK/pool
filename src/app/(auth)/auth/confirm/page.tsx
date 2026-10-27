import { redirect } from "next/navigation";
import { appReturnPath, emailLinkType, validTokenHash } from "@/lib/auth/paths";
import { confirmEmail } from "../../actions";
import { SubmitButton } from "../../submit-button";

export const metadata = { referrer: "strict-origin" as const };

export default async function Confirm({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string; type?: string; next?: string }>;
}) {
  const params = await searchParams;
  const type = emailLinkType(params.type);
  if (!validTokenHash(params.token_hash) || !type) redirect("/auth/error");
  return (
    <>
      <h1>
        {type === "recovery"
          ? "Reset your Pool password"
          : "Confirm your email"}
      </h1>
      <p>
        Continue to use this single-use email link. If it has expired, request a
        new one.
      </p>
      <form action={confirmEmail} className="auth-form">
        <input type="hidden" name="token_hash" value={params.token_hash} />
        <input type="hidden" name="type" value={type} />
        <input type="hidden" name="next" value={appReturnPath(params.next)} />
        <SubmitButton>
          {type === "recovery" ? "Choose a new password" : "Confirm email"}
        </SubmitButton>
      </form>
    </>
  );
}
