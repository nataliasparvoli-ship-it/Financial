import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import EmptyState from "../components/EmptyState";
import { fmtK } from "../utils/formatters";

export default function ClassePieChart({ data }) {
  if (!data.length) {
    return (
      <EmptyState title="Sem classes importadas">
        Inclua linhas com dataset=classe e colunas classe,valor.
      </EmptyState>
    );
  }

  return (
    <div
      style={{
        height: 220,
        background: "#0f172a",
        borderRadius: 12,
        padding: "8px 0",
      }}
    >
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            dataKey="valor"
            nameKey="classe"
            cx="40%"
            cy="50%"
            outerRadius={80}
            innerRadius={45}
          >
            {data.map((item) => (
              <Cell key={item.id} fill={item.cor} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => fmtK(value)}
            contentStyle={{
              background: "#0f172a",
              border: "1px solid #1e293b",
              borderRadius: 8,
            }}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            formatter={(value) => (
              <span style={{ color: "#94a3b8", fontSize: 11 }}>{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
