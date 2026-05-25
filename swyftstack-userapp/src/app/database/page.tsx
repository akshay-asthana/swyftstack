// /database — alias for the managed PostgreSQL product page. Redirects to
// /postgres so we have a single canonical URL for SEO.
import { redirect } from "next/navigation";
export default function DatabaseRedirect() { redirect("/postgres"); }
