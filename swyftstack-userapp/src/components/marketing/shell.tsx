// Marketing site shell: wraps every public page with the dark-theme `.m`
// scope, the sticky nav, and the detailed footer. Server component that only
// reads the lightweight `currentUser` cookie so the nav can swap CTAs.
import { currentUser } from "@/lib/auth";
import { MarketingNavbar } from "./navbar";
import { MarketingFooter } from "./footer";
import "@/styles/theme.css";
import "@/styles/marketing.css";

export async function MarketingShell({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  return (
    <div className="m">
      <div className="m-page">
        <MarketingNavbar signedIn={!!user} />
        <main className="m-main" id="main">{children}</main>
        <MarketingFooter />
      </div>
    </div>
  );
}
