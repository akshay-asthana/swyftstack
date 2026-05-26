import Link from "next/link";
import { redirect } from "next/navigation";
import { resetPasswordWithToken } from "swyftstack-shared";
import { Icon } from "@/components/icons";

const ERRORS: Record<string, string> = {
  invalid: "That reset link is invalid or already used.",
  expired: "That reset link has expired. Request a fresh one.",
  password: "Password must be at least 8 characters.",
};

async function resetPassword(formData: FormData) {
  "use server";
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const result = await resetPasswordWithToken(token, password);
  if (!result.ok) redirect(`/reset-password?token=${encodeURIComponent(token)}&error=${result.reason ?? "invalid"}`);
  redirect("/login?reset=1");
}

export default function ResetPasswordPage({
  searchParams,
}: {
  searchParams: { token?: string; error?: string };
}) {
  const token = searchParams.token ?? "";
  return (
    <div className="login-wrap">
      <form className="login" action={resetPassword}>
        <div className="brand-row">
          <div className="brand-mark"><Icon name="key" size={18} /></div>
          <div>
            <div className="brand-name">Choose new password</div>
            <div className="brand-sub">Swyftstack account access</div>
          </div>
        </div>
        <input type="hidden" name="token" value={token} />
        <p className="sub" style={{ margin: "8px 0 16px" }}>Set a new password for your account.</p>
        <label>New password</label>
        <input name="password" type="password" minLength={8} required autoFocus />
        <div style={{ marginTop: 18 }}>
          <button className="btn" type="submit" style={{ width: "100%" }} disabled={!token}>Save password</button>
        </div>
        {!token && <div className="err">Reset token missing. Request a new reset link.</div>}
        {searchParams.error && <div className="err">{ERRORS[searchParams.error] ?? ERRORS.invalid}</div>}
        <p className="small auth-foot"><Link href="/forgot-password">Request another link</Link></p>
      </form>
    </div>
  );
}
