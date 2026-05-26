import { ChartSkeleton, StatCardSkeleton, TableSkeleton } from "@/components/ui";

export default function Loading() {
  return (
    <>
      <StatCardSkeleton count={5} />
      <div className="split-even">
        <ChartSkeleton />
        <ChartSkeleton />
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
      <TableSkeleton columns={7} rows={5} />
    </>
  );
}
