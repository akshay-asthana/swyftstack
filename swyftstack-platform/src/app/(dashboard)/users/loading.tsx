import { PageSkeleton } from "@/components/ui";

export default function Loading() {
  return <PageSkeleton cards={6} charts={2} tables={1} />;
}
