export function AppHeader() {
  return (
    <header style={{ background: "#fff", borderBottom: "1.5px solid var(--gray-200)", position: "relative", zIndex: 10 }}>
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <svg width="30" height="30" viewBox="0 0 28 28" fill="none" aria-hidden="true">
            <rect x="2" y="2" width="11" height="11" rx="2" fill="var(--blue)" />
            <rect x="15" y="2" width="11" height="11" rx="2" fill="var(--blue)" opacity=".45" />
            <rect x="2" y="15" width="11" height="11" rx="2" fill="var(--blue)" opacity=".45" />
            <rect x="15" y="15" width="11" height="11" rx="2" fill="var(--blue)" />
          </svg>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: 0 }}>PatriMap</div>
            <div style={{ fontSize: 11, color: "var(--gray-400)" }}>IFPE · Mapeamento Patrimonial CATMAT</div>
          </div>
        </div>
        <span style={{ fontSize: 11, background: "var(--blue-light)", color: "var(--blue)", border: "1px solid var(--blue-border)", borderRadius: 20, padding: "4px 12px", fontWeight: 600, whiteSpace: "nowrap" }}>
          MVP · Engenharia de Requisitos
        </span>
      </div>
    </header>
  );
}
