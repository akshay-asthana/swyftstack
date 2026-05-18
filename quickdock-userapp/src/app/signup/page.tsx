import { redirect } from "next/navigation";
import Link from "next/link";
import {
  createPasswordCustomerAccount,
  env,
  SignupEmailExistsError,
} from "quickdock-shared";
import { currentUser, setUserSession } from "@/lib/auth";

const ERRORS: Record<string, string> = {
  exists: "An account with that email already exists.",
  password: "Password must be at least 8 characters.",
  required: "Name, email, and password are required.",
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  if (await currentUser()) redirect("/");
  const googleUrl = new URL("/api/auth/google/start", env.PLATFORM_BASE_URL);
  googleUrl.searchParams.set("next", "/");

  async function doSignup(formData: FormData) {
    "use server";
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const company = String(formData.get("company") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    if (!name || !email || !password) redirect("/signup?error=required");
    if (password.length < 8) redirect("/signup?error=password");

    let next = "/";
    try {
      const account = await createPasswordCustomerAccount({
        name,
        email,
        company,
        password,
      });
      setUserSession(account.user.id);
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
        <div className="brand">Quickdock</div>
        <p className="sub">Create your workspace</p>
        <a className="btn google" href={googleUrl.toString()}>Continue with Google</a>
        <div className="divider"><span>or</span></div>
        <label>Name</label>
        <input name="name" required autoFocus autoComplete="name" />
        <label>Email</label>
        <input name="email" type="email" required autoComplete="email" />
        <label>Company <span className="muted">(optional)</span></label>
        <input name="company" autoComplete="organization" />
        <label>Password</label>
        <input name="password" type="password" minLength={8} required autoComplete="new-password" />
        <div style={{ marginTop: 18 }}>
          <button className="btn" type="submit">Create account</button>
        </div>
        {error && <div className="err">{error}</div>}
        <p className="small auth-foot">
          Already have an account? <Link href="/login">Sign in</Link>
        </p>
      </form>
    </div>
  );
}
