import { formatFileSize, getFileExtension } from "../../model/mappingModel";
import { btnPrimary, btnSecondary, card, desc, title } from "../styles/mappingStyles";

export function ConfirmUploadStep({ arquivo, onCancel, onConfirm }) {
  const extension = getFileExtension(arquivo?.name).toUpperCase();

  return (
    <div style={card}>
      <h2 style={title}>Confirmar envio</h2>
      <p style={desc}>
        Confira a planilha selecionada antes de enviar para o serviço de classificação CATMAT.
      </p>

      <div style={{ background: "var(--gray-50)", border: "1px solid var(--gray-200)", borderRadius: 8, padding: "18px 20px", marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--gray-400)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
          Arquivo selecionado
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
          <div>
            <div style={{ fontSize: 12, color: "var(--gray-400)", marginBottom: 4 }}>Nome</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--gray-700)", wordBreak: "break-word" }}>{arquivo?.name || "Não informado"}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: "var(--gray-400)", marginBottom: 4 }}>Formato</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--gray-700)" }}>{extension || "N/D"}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: "var(--gray-400)", marginBottom: 4 }}>Tamanho</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--gray-700)" }}>{formatFileSize(arquivo?.size || 0)}</div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button style={btnSecondary} onClick={onCancel}>Trocar arquivo</button>
        <button style={btnPrimary} onClick={onConfirm}>Confirmar envio →</button>
      </div>
    </div>
  );
}
