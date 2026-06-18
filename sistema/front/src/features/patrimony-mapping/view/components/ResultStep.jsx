import { btnSecondary, card, desc, erroBox, title } from "../styles/mappingStyles";

export function ResultStep({
  erro,
  resultado,
  onDownloadAuditoria,
  onDownloadSaida,
  onNewMapping,
}) {
  const metrics = [
    { label: "Total de linhas", value: resultado?.totalLinhas ?? 0, bg: "var(--blue-light)", color: "var(--blue)" },
    { label: "Processadas", value: resultado?.processadas ?? 0, bg: "#d1fae5", color: "#065f46" },
    { label: "Sem correspondencia", value: resultado?.semCorrespondencia ?? 0, bg: "#fef3c7", color: "#92400e" },
    { label: "Baixa confiança", value: resultado?.baixaConfianca ?? 0, bg: "#fee2e2", color: "#991b1b" },
    { label: "Sem candidatos", value: resultado?.semCandidatos ?? 0, bg: "var(--gray-100)", color: "var(--gray-700)" },
  ];

  return (
    <div style={{ ...card, animation: "fadeIn 0.4s ease" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 20 }}>
        <div>
          <h2 style={title}>Importação concluída!</h2>
          <p style={desc}>{"A planilha foi processada pelo serviço de classificação CATMAT."}</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12, marginBottom: 24 }}>
        {metrics.map((metric) => (
          <div key={metric.label} style={{ background: metric.bg, borderRadius: 8, padding: "14px 18px" }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: metric.color }}>{metric.value}</div>
            <div style={{ fontSize: 12, color: metric.color }}>{metric.label}</div>
          </div>
        ))}
      </div>

      {erro && <div style={{ ...erroBox, marginBottom: 20 }}>{erro}</div>}

      <div style={{ background: "var(--gray-50)", borderRadius: 8, border: "1px solid var(--gray-200)", padding: "16px 18px", marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--gray-400)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
          Arquivos gerados
        </div>
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--gray-700)" }}>Arquivo de saída</div>
              <div style={{ fontSize: 13, color: "var(--gray-400)" }}>{resultado?.arquivoSaida || "Não informado"}</div>
            </div>
            <button style={btnSecondary} onClick={onDownloadSaida}>Baixar saída</button>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--gray-700)" }}>Arquivo de auditoria</div>
              <div style={{ fontSize: 13, color: "var(--gray-400)" }}>{resultado?.arquivoAuditoria || "Não informado"}</div>
            </div>
            <button style={btnSecondary} onClick={onDownloadAuditoria}>Baixar auditoria</button>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 20, flexWrap: "wrap" }}>
        <button style={btnSecondary} onClick={onNewMapping}>Novo mapeamento</button>
      </div>
    </div>
  );
}
