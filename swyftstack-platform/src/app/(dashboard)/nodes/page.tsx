// Node management moved under Infrastructure → Nodes (§5/§6). Kept as a
// redirect so old links and bookmarks keep working. Node detail stays at
// /nodes/[id].
import { redirect } from "next/navigation";

export default function NodesRedirect() {
  redirect("/infrastructure?tab=nodes");
}
