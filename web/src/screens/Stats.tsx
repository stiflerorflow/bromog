import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getExercise } from "../data/program";
import { exerciseSeries, personalRecords, weeklyVolume } from "../data/stats";
import { currentUser, getSessions } from "../data/store";
import { useStore } from "../components/useStore";

const AXIS = { stroke: "#9aa3b2", fontSize: 11 };
const GRID = "#2b303b";

export function Stats() {
  const user = useStore(currentUser);
  const sessions = useStore(() => getSessions(user));

  const prs = useMemo(() => personalRecords(sessions), [sessions]);
  const volume = useMemo(() => weeklyVolume(sessions), [sessions]);
  const exerciseKeys = useMemo(() => Object.keys(prs).sort(), [prs]);
  const [selected, setSelected] = useState<string>("");
  const focus = selected || exerciseKeys[0] || "";
  const series = useMemo(() => exerciseSeries(focus, sessions), [focus, sessions]);

  if (sessions.length === 0) {
    return (
      <div className="scroll">
        <h1>Stats</h1>
        <p className="muted">Log a workout to see PRs and graphs here.</p>
      </div>
    );
  }

  return (
    <div className="scroll">
      <h1>Stats</h1>

      <h2>Personal records</h2>
      <div className="card">
        <div className="pr-grid">
          <span className="muted small">Exercise</span>
          <span className="muted small">Top set</span>
          <span className="muted small">Est. 1RM</span>
          {exerciseKeys.map((k) => {
            const pr = prs[k];
            return (
              <FragmentRow
                key={k}
                name={getExercise(k)?.name ?? k}
                top={`${fmt(pr.bestWeight)}kg × ${pr.bestWeightReps}`}
                e1rm={`${fmt(pr.bestE1rm)}kg`}
              />
            );
          })}
        </div>
      </div>

      <h2>Progression</h2>
      <select
        value={focus}
        onChange={(e) => setSelected(e.target.value)}
        style={{
          width: "100%",
          padding: 12,
          background: "var(--surface-2)",
          color: "var(--text)",
          border: "1px solid var(--border)",
          borderRadius: 10,
          marginBottom: 12,
        }}
      >
        {exerciseKeys.map((k) => (
          <option key={k} value={k}>
            {getExercise(k)?.name ?? k}
          </option>
        ))}
      </select>

      <div className="card">
        <div className="muted small" style={{ marginBottom: 8 }}>
          Top weight &amp; estimated 1RM (kg)
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={series} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="date" tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} />
            <YAxis tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} domain={["auto", "auto"]} />
            <Tooltip contentStyle={tooltipStyle} />
            <Line type="monotone" dataKey="topWeight" stroke="#4f8cff" strokeWidth={2} dot={false} name="Top kg" />
            <Line type="monotone" dataKey="e1rm" stroke="#45c486" strokeWidth={2} dot={false} name="e1RM" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <h2>Weekly volume</h2>
      <div className="card">
        <div className="muted small" style={{ marginBottom: 8 }}>
          Total working sets per week
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={volume} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="week" tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} />
            <YAxis tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} allowDecimals={false} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#ffffff10" }} />
            <Bar dataKey="sets" fill="#4f8cff" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

const tooltipStyle = {
  background: "#21252e",
  border: "1px solid #2b303b",
  borderRadius: 8,
  color: "#eef1f6",
};

function FragmentRow({ name, top, e1rm }: { name: string; top: string; e1rm: string }) {
  return (
    <>
      <span>{name}</span>
      <span className="small">{top}</span>
      <span className="small">{e1rm}</span>
    </>
  );
}

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}
