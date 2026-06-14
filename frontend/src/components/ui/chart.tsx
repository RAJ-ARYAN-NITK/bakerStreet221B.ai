"use client";

import * as React from "react";
import * as RechartsPrimitive from "recharts";
import type { Payload } from "recharts/types/component/DefaultTooltipContent";
import { cn } from "./utils";

/* -------------------- Theme -------------------- */

const THEMES = { light: "", dark: ".dark" } as const;

/* -------------------- Types -------------------- */

export type ChartConfig = {
  [key: string]: {
    label?: React.ReactNode;
    icon?: React.ComponentType<{ className?: string }>;
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<keyof typeof THEMES, string> }
  );
};

type ChartContextProps = {
  config: ChartConfig;
};

const ChartContext = React.createContext<ChartContextProps | null>(null);

function useChart() {
  const ctx = React.useContext(ChartContext);
  if (!ctx) {
    throw new Error("useChart must be used within ChartContainer");
  }
  return ctx;
}

/* -------------------- Container -------------------- */

type ChartContainerProps = React.HTMLAttributes<HTMLDivElement> & {
  config: ChartConfig;
  children: React.ReactNode;
};

function ChartContainer({
  id,
  className,
  children,
  config,
  ...props
}: ChartContainerProps) {
  const uid = React.useId();
  const chartId = `chart-${id ?? uid.replace(/:/g, "")}`;

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-chart={chartId}
        className={cn("flex aspect-video justify-center text-xs", className)}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer>
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

/* -------------------- Styles -------------------- */

function ChartStyle({ id, config }: { id: string; config: ChartConfig }) {
  const entries = Object.entries(config).filter(
    ([, v]) => v.color || v.theme,
  );

  if (!entries.length) return null;

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: Object.entries(THEMES)
          .map(
            ([theme, prefix]) => `
${prefix} [data-chart="${id}"] {
${entries
  .map(([key, v]) => {
    const color = v.theme?.[theme as keyof typeof v.theme] ?? v.color;
    return color ? `  --color-${key}: ${color};` : "";
  })
  .join("\n")}
}
`,
          )
          .join("\n"),
      }}
    />
  );
}

/* -------------------- Tooltip -------------------- */

const ChartTooltip = RechartsPrimitive.Tooltip;

type TooltipPayload = Payload<number, string>;

type ChartTooltipContentProps =
  Omit<RechartsPrimitive.TooltipProps<number, string>, "payload"> &
  React.HTMLAttributes<HTMLDivElement> & {
    payload?: TooltipPayload[];
    label?: React.ReactNode;
    hideLabel?: boolean;
    hideIndicator?: boolean;
    indicator?: "line" | "dot" | "dashed";
    nameKey?: string;
    labelKey?: string;
  };

function ChartTooltipContent({
  active,
  payload,
  className,
  indicator = "dot",
  hideLabel = false,
  hideIndicator = false,
  label,
  labelFormatter,
  nameKey,
}: ChartTooltipContentProps) {
  const { config } = useChart();

  if (!active || !payload?.length) return null;

  return (
    <div
      className={cn(
        "grid min-w-32 gap-1.5 rounded-lg border bg-background px-2.5 py-1.5 text-xs shadow-xl",
        className,
      )}
    >
      {!hideLabel && label && (
        <div className="font-medium">
          {labelFormatter ? labelFormatter(label, payload) : label}
        </div>
      )}

      <div className="grid gap-1.5">
        {payload.map((item, index) => {
          const key = `${nameKey || item.name || item.dataKey || "value"}`;
          const itemConfig = config[key];

          return (
            <div key={index} className="flex items-center gap-2">
              {!hideIndicator && (
                <div
                  className={cn(
                    "rounded-sm",
                    indicator === "dot" && "h-2.5 w-2.5",
                    indicator === "line" && "h-4 w-1",
                    indicator === "dashed" &&
                      "h-4 w-1 border border-dashed bg-transparent",
                  )}
                  style={{ backgroundColor: item.color }}
                />
              )}

              <div className="flex flex-1 justify-between">
                <span className="text-muted-foreground">
                  {itemConfig?.label ?? item.name}
                </span>
                {typeof item.value === "number" && (
                  <span className="font-mono tabular-nums">
                    {item.value.toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* -------------------- Legend -------------------- */

const ChartLegend = RechartsPrimitive.Legend;

type ChartLegendContentProps = {
  payload?: RechartsPrimitive.LegendPayload[];
  verticalAlign?: "top" | "bottom";
  className?: string;
  hideIcon?: boolean;
  nameKey?: string;
};

function ChartLegendContent({
  payload,
  verticalAlign = "bottom",
  className,
  hideIcon = false,
  nameKey,
}: ChartLegendContentProps) {
  const { config } = useChart();

  if (!payload?.length) return null;

  return (
    <div
      className={cn(
        "flex justify-center gap-4",
        verticalAlign === "top" ? "pb-3" : "pt-3",
        className,
      )}
    >
      {payload.map((item, index) => {
        const key = `${nameKey || item.dataKey || "value"}`;
        const cfg = config[key];

        return (
          <div key={index} className="flex items-center gap-1.5">
            {!hideIcon && cfg?.icon ? (
              <cfg.icon className="h-3 w-3" />
            ) : (
              <div
                className="h-2 w-2 rounded-sm"
                style={{ backgroundColor: item.color }}
              />
            )}
            {cfg?.label}
          </div>
        );
      })}
    </div>
  );
}

/* -------------------- Exports -------------------- */

export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
};
