import { redirect } from "next/navigation";
import Link from "next/link";
import {
  createPasswordCustomerAccount,
  env,
  sendVerificationEmail,
  SignupEmailExistsError,
} from "swyftstack-shared";
import { currentUser, setUserSession } from "@/lib/auth";
import { Icon } from "@/components/icons";
import { isEarlyAccessMode } from "@/lib/early-access";

const ERRORS: Record<string, string> = {
  exists: "An account with that email already exists.",
  password: "Password must be at least 8 characters.",
  required: "Name, organization name, email, and password are required.",
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  if (isEarlyAccessMode()) redirect("/request-early-access");
  if (await currentUser()) redirect("/console");
  const googleUrl = new URL("/api/auth/google/start", env.PLATFORM_BASE_URL);
  googleUrl.searchParams.set("next", "/console");

  async function doSignup(formData: FormData) {
    "use server";
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const company = String(formData.get("company") ?? "").trim();
    const organizationName = String(formData.get("organizationName") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    if (!name || !organizationName || !email || !password) redirect("/signup?error=required");
    if (password.length < 8) redirect("/signup?error=password");

    let next = "/console";
    try {
      const account = await createPasswordCustomerAccount({
        name,
        email,
        company,
        organizationName,
        password,
      });
      await setUserSession(account.user.id);
      await sendVerificationEmail(account.user.id);
    } catch (err) {
      if (err instanceof SignupEmailExistsError) {
        next = "/signup?error=exists";
      } else {
        throw err;
      }
    }
    redirect(next);
  }

  const error = searchParams.error ? ERRORS[searchParams.error] : null;

  return (
    <div className="login-wrap">
      <form className="login signup" action={doSignup}>
        <div className="brand-row">
          <div className="brand-mark"><Icon name="rocket" size={18} /></div>
          <div>
            <div className="brand-name">Swyftstack</div>
            <div className="brand-sub">Cloud Platform</div>
          </div>
        </div>
        <p className="sub" style={{ margin: "8px 0 16px" }}>Create your organization.</p>
        <a className="btn google" href={googleUrl.toString()}>Continue with Google</a>
        <div className="divider"><span>or</span></div>
        <label>Name</label>
        <input name="name" required autoFocus autoComplete="name" />
        <label>Email</label>
        <input name="email" type="email" required autoComplete="email" />
        <label>Organization name</label>
        <input name="organizationName" required autoComplete="organization" />
        <label>Company <span className="muted">(optional)</span></label>
        <input name="company" autoComplete="organization" />
        <label>Password</label>
        <input name="password" type="password" minLength={8} required autoComplete="new-password" />
        <div style={{ marginTop: 18 }}>
          <button className="btn" type="submit" style={{ width: "100%" }}>Create account</button>
        </div>
        {error && <div className="err">{error}</div>}
        <p className="small auth-foot">
          Already have an account? <Link href="/login">Sign in</Link>
        </p>
      </form>
    </div>
  );
}
