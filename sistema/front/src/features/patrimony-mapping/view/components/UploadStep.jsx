import { TEMPLATE_FILE_NAME, TEMPLATE_FILE_PATH } from "../../model/mappingConstants";
import { btnSecondary, card, desc, dropzone, dropzoneActive, erroBox, title } from "../styles/mappingStyles";

export function UploadStep({ dragOver, erro, inputRef, onDragLeave, onDragOver, onDrop, onFileChange, onSelectFile }) {
  return (
    <div style={card}>
      <h2 style={title}>Envie sua planilha</h2>
      <p style={desc}>
        Faça upload de um arquivo <strong>CSV, XLSX ou XLS</strong> com os bens patrimoniais do seu campus. A planilha
        será enviada ao serviço de classificação CATMAT para processamento.
      </p>

      <div
        style={{ ...dropzone, ...(dragOver ? dropzoneActive : {}) }}
        onClick={onSelectFile}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <svg width="44" height="44" viewBox="0 0 44 44" fill="none" style={{ marginBottom: 12 }} aria-hidden="true">
          <path d="M22 8v20M13 17l9-9 9 9" stroke="var(--blue)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M7 32h30" stroke="var(--blue)" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M4 38h36" stroke="var(--gray-200)" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <div style={{ fontSize: 16, fontWeight: 600, color: "var(--gray-700)" }}>
          Arraste e solte ou{" "}
          <span style={{ color: "var(--blue)", textDecoration: "underline" }}>clique para selecionar</span>
        </div>
        <div style={{ fontSize: 13, color: "var(--gray-400)", marginTop: 6 }}>CSV, XLSX ou XLS · máx. 50 MB</div>
        <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" style={{ display: "none" }} onChange={onFileChange} />
      </div>

      {erro && <div style={erroBox}>{erro}</div>}

      <div style={{ marginTop: 28, background: "var(--gray-50)", borderRadius: 8, padding: "18px 20px", border: "1px solid var(--gray-200)", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <strong style={{ color: "var(--gray-700)", display: "block", marginBottom: 4 }}>Modelo de planilha de entrada</strong>
          <span style={{ color: "var(--gray-600)", lineHeight: 1.5 }}>
            Baixe o arquivo com as colunas esperadas pelo processo de classificação.
          </span>
        </div>
        <a href={TEMPLATE_FILE_PATH} download={TEMPLATE_FILE_NAME} style={{ ...btnSecondary, display: "inline-flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }}>
          Baixar modelo CSV
        </a>
      </div>
    </div>
  );
}
