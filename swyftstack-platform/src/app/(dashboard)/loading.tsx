import { PageSkeleton } from "@/components/ui";

export default function Loading() {
  return <PageSkeleton cards={5} charts={2} tables={1} />;
}
