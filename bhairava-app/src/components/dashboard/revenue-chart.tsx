"use client";

import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";

type Point = { label: string; amount: number };

export function RevenueChart({ data }: { data: Point[] }) {
  const hasData = data.some((d) => d.amount > 0);

  return (
    <div className="h-36 w-full">
      {hasData ? (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
            <defs>
              <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1a56b0" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#1a56b0" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#5b6b7c", fontSize: 11 }}
            />
            <Tooltip
              contentStyle={{
                borderRadius: 12,
                border: "1px solid #d8e0ea",
                fontSize: 12,
              }}
              formatter={(value) => [
                new Intl.NumberFormat("en-IN", {
                  style: "currency",
                  currency: "INR",
                  maximumFractionDigits: 0,
                }).format(Number(value ?? 0)),
                "Collected",
              ]}
            />
            <Area
              type="monotone"
              dataKey="amount"
              stroke="#0b3d91"
              strokeWidth={2.5}
              fill="url(#revFill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="relative h-full overflow-hidden rounded-2xl bg-gradient-to-br from-brand-light via-white to-brand-soft">
          <svg className="absolute inset-0 h-full w-full opacity-70" viewBox="0 0 360 120" preserveAspectRatio="none">
            <path
              d="M0 90 C40 70, 70 95, 110 75 S180 40, 220 55 S300 95, 360 48"
              fill="none"
              stroke="#1a56b0"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <path
              d="M0 90 C40 70, 70 95, 110 75 S180 40, 220 55 S300 95, 360 48 V120 H0 Z"
              fill="url(#emptyGrad)"
              opacity="0.35"
            />
            <defs>
              <linearGradient id="emptyGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1a56b0" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex items-end p-4">
            <p className="text-xs font-medium text-primary/80">Collections will appear here once payments are recorded</p>
          </div>
        </div>
      )}
    </div>
  );
}
