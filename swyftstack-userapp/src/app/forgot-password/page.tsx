import Link from "next/link";
import { redirect } from "next/navigation";
import { sendPasswordResetEmail } from "swyftstack-shared";
import { Icon } from "@/components/icons";

async function requestReset(formData: FormData) {
  "use server";
  const email = String(formData.get("email") ?? "").trim();
  if (email) await sendPasswordResetEmail(email);
  redirect("/forgot-password?sent=1");
}

export default function ForgotPasswordPage({ searchParams }: { searchParams: { sent?: string } }) {
  return (
    <div className="login-wrap">
      <form className="login" action={requestReset}>
        <div className="brand-row">
          <div className="brand-mark"><Icon name="key" size={18} /></div>
          <div>
            <div className="brand-name">Reset password</div>
            <div className="brand-sub">Swyftstack account access</div>
          </div>
        </div>
        <p className="sub" style={{ margin: "8px 0 16px" }}>
          Enter your email and we&apos;ll send a reset link if the account exists.
        </p>
        <label>Email</label>
        <input name="email" type="email" required autoFocus />
        <div style={{ marginTop: 18 }}>
          <button className="btn" type="submit" style={{ width: "100%" }}>Send reset link</button>
        </div>
        {searchParams.sent && <div className="note">If an account exists, a reset link has been sent.</div>}
        <p className="small auth-foot"><Link href="/login">Back to sign in</Link></p>
      </form>
    </div>
  );
}
