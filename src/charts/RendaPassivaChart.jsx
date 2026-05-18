import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import EmptyState from "../components/EmptyState";
import CustomTooltip from "../components/CustomTooltip";

export default function RendaPassivaChart({ data }) {
  if (!data.length) {
    return (
      <EmptyState title="Sem renda passiva">
        Importe transações de renda passiva ou dataset=renda_passiva.
      </EmptyState>
    );
  }

  return (
    <div
      style={{
        height: 220,
        background: "#0f172a",
        borderRadius: 12,
        padding: "16px 8px 8px",
      }}
    >
      <ResponsiveContainer>
        <BarChart data={data}>
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
            tickFormatter={(value) => `R$${value / 1000}K`}
            width={48}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="dividendos"
            name="Dividendos"
            fill="#fbbf24"
            stackId="a"
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="juros"
            name="Juros CRI/CRA"
            fill="#60a5fa"
            stackId="a"
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="cupom"
            name="Cupom Tesouro"
            fill="#34d399"
            stackId="a"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
