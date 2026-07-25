"use client";

import {
  type ChartConfig,
  EChartsAreaChart,
} from "@/components/evilcharts/charts/echarts-area-chart";
import type { DashboardActivityPoint } from "@/modules/dashboard/dashboard.types";

const chartConfig = {
  completedTasks: {
    label: "Completed tasks",
    colors: { light: ["#16a34a"], dark: ["#4ade80"] },
  },
  attentionEvents: {
    label: "Attention events",
    colors: { light: ["#d97706"], dark: ["#fbbf24"] },
  },
} satisfies ChartConfig;

interface EChartsActivityAreaChartProps {
  data: DashboardActivityPoint[];
}

export function EChartsActivityAreaChart({
  data,
}: EChartsActivityAreaChartProps) {
  return (
    <div className="flex h-full w-full flex-col pt-4">
      <EChartsAreaChart
        data={data}
        config={chartConfig}
        xDataKey="date"
        className="mt-4 min-h-0 w-full flex-1"
        curveType="step"
        enableHoverReveal
        hoverRevealMode="spotlight"
        chartOptions={{
          grid: { left: 0, right: 0, top: 16, bottom: 0 },
          yAxis: {
            type: "value",
            show: false,
            scale: true,
            boundaryGap: ["12%", "16%"],
          },
        }}
      >
        <EChartsAreaChart.Tooltip variant="frosted-glass" />
        <EChartsAreaChart.Area
          dataKey="completedTasks"
          variant="dotted"
          strokeVariant="solid"
        >
          <EChartsAreaChart.ActiveDot variant="ping" />
        </EChartsAreaChart.Area>
        <EChartsAreaChart.Area
          dataKey="attentionEvents"
          variant="dotted"
          strokeVariant="solid"
        >
          <EChartsAreaChart.ActiveDot variant="ping" />
        </EChartsAreaChart.Area>
      </EChartsAreaChart>
    </div>
  );
}
