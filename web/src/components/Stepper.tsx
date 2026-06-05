interface Props {
  value: number;
  step: number;
  unit: string;
  min?: number;
  onChange: (v: number) => void;
}

/** Big +/- stepper sized for sweaty-thumb tapping mid-set. */
export function Stepper({ value, step, unit, min = 0, onChange }: Props) {
  const set = (v: number) => onChange(Math.max(min, Math.round(v * 100) / 100));
  return (
    <div className="stepper">
      <button aria-label="decrease" onClick={() => set(value - step)}>
        −
      </button>
      <div className="val">
        <div className="n">{fmt(value)}</div>
        <div className="u">{unit}</div>
      </div>
      <button aria-label="increase" onClick={() => set(value + step)}>
        +
      </button>
    </div>
  );
}

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}
