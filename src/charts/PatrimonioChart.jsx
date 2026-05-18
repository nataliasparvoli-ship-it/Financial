import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import EmptyState from "../components/EmptyState";
import CustomTooltip from "../components/CustomTooltip";
import { fmtK } from "../utils/formatters";

export default function PatrimonioChart({ data }) {
  if (!data.length) {
    return (
      <EmptyState title="Sem patrimônio importado">
        Inclua linhas com dataset=patrimonio e colunas mes,total.
      </EmptyState>
    );
  }

  return (
    <div
      style={{
        height: 200,
        background: "#0f172a",
        borderRadius: 12,
        padding: "16px 8px 8px",
      }}
    >
      <ResponsiveContainer>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="patriGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#34d399" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="mes"
            tick={{ fill: "#475569", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "#475569", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={fmtK}
            width={72}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="total"
            stroke="#34d399"
            strokeWidth={2}
            fill="url(#patriGrad)"
            name="Patrimônio"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
