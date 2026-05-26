// Marketing site shell: wraps every public page with the dark-theme `.m`
// scope, the sticky nav, and the detailed footer. Server component that only
// reads the lightweight `currentUser` cookie so the nav can swap CTAs.
import { currentUser } from "@/lib/auth";
import { MarketingNavbar } from "./navbar";
import { MarketingFooter } from "./footer";
import "@/styles/marketing.css";
import { isEarlyAccessMode } from "@/lib/early-access";

export async function MarketingShell({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  const earlyAccess = isEarlyAccessMode();
  return (
    <div className="m">
      <div className="m-page">
        <MarketingNavbar signedIn={!!user} earlyAccess={earlyAccess} />
        <main className="m-main" id="main">{children}</main>
        <MarketingFooter />
      </div>
    </div>
  );
}
