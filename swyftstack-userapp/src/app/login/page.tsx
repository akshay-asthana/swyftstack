import { redirect } from "next/navigation";
import Link from "next/link";
import { login, currentUser } from "@/lib/auth";
import { env } from "swyftstack-shared";
import { Icon } from "@/components/icons";
import { isEarlyAccessMode } from "@/lib/early-access";

const ERRORS: Record<string, string> = {
  "1": "Invalid credentials.",
  google: "Google sign-in could not be completed.",
  google_config: "Google sign-in is not configured correctly.",
  google_email: "Google did not return a verified email address.",
  google_state: "Google sign-in expired. Please try again.",
  disabled: "This account is not active.",
};

function safeNext(value: string | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/console";
  return value;
}

export default async function LoginPage({ searchParams }: { searchParams: { error?: string; next?: string } }) {
  const next = safeNext(searchParams.next);
  if (isEarlyAccessMode()) redirect("/request-early-access");
  if (await currentUser()) redirect(next);
  const googleUrl = new URL("/api/auth/google/start", env.PLATFORM_BASE_URL);
  googleUrl.searchParams.set("next", next);
  const error = searchParams.error ? ERRORS[searchParams.error] ?? ERRORS["1"] : null;

  async function doLogin(formData: FormData) {
    "use server";
    const ok = await login(
      String(formData.get("email") ?? ""),
      String(formData.get("password") ?? ""),
    );
    const nextUrl = safeNext(String(formData.get("next") ?? ""));
    redirect(ok ? nextUrl : `/login?error=1&next=${encodeURIComponent(nextUrl)}`);
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
        <p className="sub" style={{ margin: "8px 0 16px" }}>Sign in to your organization.</p>
        <a className="btn google" href={googleUrl.toString()}>Continue with Google</a>
        <div className="divider"><span>or</span></div>
        <input type="hidden" name="next" value={next} />
        <label>Email</label>
        <input name="email" type="email" required autoFocus />
        <label>Password</label>
        <input name="password" type="password" required />
        <div className="row right" style={{ marginTop: 6 }}>
          <Link className="small" href="/forgot-password">Forgot password?</Link>
        </div>
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
