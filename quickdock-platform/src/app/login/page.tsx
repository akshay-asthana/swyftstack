import { redirect } from "next/navigation";
import { login, currentAdmin } from "@/lib/auth";
import { Icon } from "@/components/icons";

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
        <div className="brand-row">
          <div className="brand-mark"><Icon name="rocket" size={18} /></div>
          <div>
            <div className="brand-name">Quickdock</div>
            <div className="brand-sub">Infra Control Panel</div>
          </div>
        </div>
        <p className="sub" style={{ margin: "8px 0 16px" }}>Sign in to the admin control plane.</p>
        <label>Email</label>
        <input name="email" type="email" required autoFocus />
        <label>Password</label>
        <input name="password" type="password" required />
        <div style={{ marginTop: 18 }}>
          <button className="btn" type="submit" style={{ width: "100%" }}>Sign in</button>
        </div>
        {searchParams.error && <div className="err" style={{ marginTop: 12 }}>Invalid credentials or not an admin.</div>}
      </form>
    </div>
  );
}
