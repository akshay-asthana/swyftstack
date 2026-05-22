import { redirect } from "next/navigation";
import Link from "next/link";
import { login, currentUser } from "@/lib/auth";
import { env } from "swyftstack-shared";
import { Icon } from "@/components/icons";

const ERRORS: Record<string, string> = {
  "1": "Invalid credentials.",
  google: "Google sign-in could not be completed.",
  google_config: "Google sign-in is not configured correctly.",
  google_email: "Google did not return a verified email address.",
  google_state: "Google sign-in expired. Please try again.",
  disabled: "This account is not active.",
};

export default async function LoginPage({ searchParams }: { searchParams: { error?: string } }) {
  if (await currentUser()) redirect("/");
  const googleUrl = new URL("/api/auth/google/start", env.PLATFORM_BASE_URL);
  googleUrl.searchParams.set("next", "/");
  const error = searchParams.error ? ERRORS[searchParams.error] ?? ERRORS["1"] : null;

  async function doLogin(formData: FormData) {
    "use server";
    const ok = await login(
      String(formData.get("email") ?? ""),
      String(formData.get("password") ?? ""),
    );
    redirect(ok ? "/" : "/login?error=1");
  }

  return (
    <div className="login-wrap">
      <form className="login" action={doLogin}>
        <div className="brand-row">
          <div className="brand-mark"><Icon name="rocket" size={18} /></div>
          <div>
            <div className="brand-name">Swyftstack</div>
            <div className="brand-sub">Cloud Platform</div>
          </div>
        </div>
        <p className="sub" style={{ margin: "8px 0 16px" }}>Sign in to your workspace.</p>
        <a className="btn google" href={googleUrl.toString()}>Continue with Google</a>
        <div className="divider"><span>or</span></div>
        <label>Email</label>
        <input name="email" type="email" required autoFocus />
        <label>Password</label>
        <input name="password" type="password" required />
        <div style={{ marginTop: 18 }}>
          <button className="btn" type="submit" style={{ width: "100%" }}>Sign in</button>
        </div>
        {error && <div className="err">{error}</div>}
        <p className="small auth-foot">
          New to Swyftstack? <Link href="/signup">Create an account</Link>
        </p>
      </form>
    </div>
  );
}
