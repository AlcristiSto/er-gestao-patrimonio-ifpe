import { STEP_LABELS, STEPS } from "../../model/mappingConstants";

export function Stepper({ step }) {
  const current = STEPS.indexOf(step);

  return (
    <nav
      aria-label="Progresso da importação"
      style={{
        display: "flex",
        alignItems: "center",
        padding: "20px 24px 0",
        maxWidth: 860,
        margin: "0 auto",
        overflowX: "auto",
      }}
    >
      {STEP_LABELS.map((label, index) => {
        const done = index < current;
        const active = index === current;
        const inactive = !done && !active;

        return (
          <div
            key={label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <div
              aria-current={active ? "step" : undefined}
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 13,
                fontWeight: 700,
                flexShrink: 0,

                background: done || active ? "var(--blue)" : "var(--gray-200)",

                border: active
                  ? "2px solid var(--blue)"
                  : done
                    ? "2px solid var(--blue)"
                    : "2px solid var(--gray-200)",

                color: done || active ? "#fff" : "var(--gray-500)",

                boxShadow: active
                  ? "0 0 0 4px rgba(37, 99, 235, 0.12)"
                  : "none",

                transition: "all 0.2s ease",
              }}
            >
              {done ? "✓" : index + 1}
            </div>

            <span
              style={{
                fontSize: 14,
                fontWeight: active ? 700 : done ? 600 : 400,
                color: active
                  ? "var(--blue)"
                  : done
                    ? "var(--gray-900)"
                    : "var(--gray-500)",
                whiteSpace: "nowrap",
                transition: "color 0.2s ease",
              }}
            >
              {label}
            </span>

            {index < STEP_LABELS.length - 1 && (
              <div
                aria-hidden="true"
                style={{
                  width: 48,
                  height: 2,
                  background: done ? "var(--blue)" : "var(--gray-200)",
                  borderRadius: 999,
                  marginLeft: 8,
                  flexShrink: 0,
                  transition: "background 0.2s ease",
                }}
              />
            )}
          </div>
        );
      })}
    </nav>
  );
}