import { card, desc, title } from "../styles/mappingStyles";

export function ProcessingStep({ arquivo }) {
  return (
    <div style={{ ...card, textAlign: "center" }}>
      <svg width="56" height="56" viewBox="0 0 56 56" fill="none" style={{ animation: "spin 1.2s linear infinite", marginBottom: 20 }} aria-hidden="true">
        <circle cx="28" cy="28" r="22" stroke="var(--gray-200)" strokeWidth="5" />
        <path d="M28 6a22 22 0 0 1 22 22" stroke="var(--blue)" strokeWidth="5" strokeLinecap="round" />
      </svg>
      <h2 style={title}>Importando planilha…</h2>
      <p style={desc}>
        {arquivo?.name ? <><strong>{arquivo.name}</strong> está sendo enviado e processado pelo backend.</> : "A planilha está sendo enviada e processada pelo backend."}
      </p>
      <div style={{ fontSize: 14, color: "var(--gray-400)" }}>Aguarde a conclusão da classificação CATMAT.</div>
    </div>
  );
}
