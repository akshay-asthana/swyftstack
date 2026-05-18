import { redirect } from "next/navigation";
import { login, currentAdmin } from "@/lib/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  if (await currentAdmin()) redirect("/");

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
        <div className="brand">Quickdock</div>
        <p className="sub">Infra Control Plane — admin sign in</p>
        <label>Email</label>
        <input name="email" type="email" required autoFocus />
        <label>Password</label>
        <input name="password" type="password" required />
        <div style={{ marginTop: 18 }}>
          <button className="btn" type="submit">Sign in</button>
        </div>
        {searchParams.error && <div className="err">Invalid credentials or not an admin.</div>}
      </form>
    </div>
  );
}
