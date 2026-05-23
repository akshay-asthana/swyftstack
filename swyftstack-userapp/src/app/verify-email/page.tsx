import Link from "next/link";
import { redirect } from "next/navigation";
import { sendVerificationEmail, verifyEmailToken } from "swyftstack-shared";
import { currentUser } from "@/lib/auth";
import { Icon } from "@/components/icons";

const MESSAGES: Record<string, string> = {
  sent: "Verification link sent. In development, the link is printed in the app logs.",
  invalid: "That verification link is invalid or already used.",
  expired: "That verification link has expired. Send yourself a fresh one.",
};

async function resendVerification() {
  "use server";
  const user = await currentUser();
  if (!user) redirect("/login");
  if (!user.emailVerified) await sendVerificationEmail(user.id);
  redirect("/verify-email?status=sent");
}

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: { token?: string; status?: string };
}) {
  let status = searchParams.status;
  if (searchParams.token) {
    const result = await verifyEmailToken(searchParams.token);
    status = result.ok ? "verified" : result.reason ?? "invalid";
  }
  const user = await currentUser();

  return (
    <div className="login-wrap">
      <div className="login">
        <div className="brand-row">
          <div className="brand-mark"><Icon name="shield" size={18} /></div>
          <div>
            <div className="brand-name">Verify email</div>
            <div className="brand-sub">Swyftstack account security</div>
          </div>
        </div>
        {status === "verified" ? (
          <>
            <p className="sub">Your email is verified.</p>
            <Link className="btn" href="/console">Open console</Link>
          </>
        ) : (
          <>
            <p className="sub">
              Verify your email so Swyftstack can send security notifications and generated credentials.
            </p>
            {status && <div className={status === "sent" ? "note" : "err"}>{MESSAGES[status] ?? MESSAGES.invalid}</div>}
            {user ? (
              <form action={resendVerification}>
                <button className="btn" type="submit" disabled={user.emailVerified}>
                  {user.emailVerified ? "Email already verified" : "Send verification link"}
                </button>
              </form>
            ) : (
              <Link className="btn" href="/login">Sign in to resend</Link>
            )}
          </>
        )}
      </div>
    </div>
  );
}
