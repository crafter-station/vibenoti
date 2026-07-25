import { EChartsActivityAreaChart } from "@/components/evilcharts/blocks/portfolio-echarts-area-chart";
import { getDashboardActivity } from "./get-dashboard-activity";

interface DashboardActivityProps {
  userId: string;
}

export async function DashboardActivity({ userId }: DashboardActivityProps) {
  const data = await getDashboardActivity(userId);

  return (
    <section
      className="-ml-4 mt-6 w-[calc(100%+1rem)] max-w-[calc(50vw+24rem)] sm:-ml-6 sm:w-[calc(100%+1.5rem)]"
      aria-label="Activity chart"
    >
      <div className="h-96">
        <EChartsActivityAreaChart data={data} />
      </div>
    </section>
  );
}
