import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDashboardMetrics } from "./get-dashboard-metrics";

const numberFormatter = new Intl.NumberFormat("en-US");

interface DashboardMetricsProps {
  userId: string;
}

export async function DashboardMetrics({ userId }: DashboardMetricsProps) {
  const metrics = await getDashboardMetrics(userId);
  const metricCards = [
    { label: "Tasks completed", value: metrics.completedTasks },
    { label: "Active sessions", value: metrics.activeSessions },
    { label: "Attention events", value: metrics.attentionEvents },
  ];

  return (
    <section
      className="mx-auto grid w-full max-w-3xl gap-3 sm:grid-cols-3"
      aria-label="Analytics overview"
    >
      {metricCards.map(({ label, value }) => (
        <Card key={label} size="sm" className="bg-muted ring-0">
          <CardHeader>
            <CardTitle className="text-xs font-medium text-muted-foreground">
              {label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tracking-tight tabular-nums">
              {numberFormatter.format(value)}
            </p>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}
