import {
  Bar,
  BarChart,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import EmptyState from "../components/EmptyState";
import CustomTooltip from "../components/CustomTooltip";

export default function FluxoChart({ data }) {
  if (!data.length) {
    return (
      <EmptyState title="Sem fluxo importado">
        Importe transações para calcular renda, despesas e aportes.
      </EmptyState>
    );
  }

  return (
    <div
      style={{
        height: 240,
        background: "#0f172a",
        borderRadius: 12,
        padding: "16px 8px 8px",
      }}
    >
      <ResponsiveContainer>
        <BarChart data={data} barGap={4}>
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
            tickFormatter={(value) => `R$${(value / 1000).toFixed(0)}K`}
            width={52}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            iconType="square"
            iconSize={10}
            formatter={(value) => (
              <span style={{ color: "#94a3b8", fontSize: 11 }}>{value}</span>
            )}
          />
          <Bar
            dataKey="renda"
            name="Renda"
            fill="#34d399"
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey="despesas"
            name="Despesas"
            fill="#f87171"
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey="aportes"
            name="Aportes"
            fill="#60a5fa"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
