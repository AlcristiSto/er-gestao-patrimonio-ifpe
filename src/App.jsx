import { useState, useRef, useCallback } from "react";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import { mapearLote } from "./groq.js";

// ─── Constantes ──────────────────────────────────────────────────────────────

const LOTE_SIZE = 10;

const CONFIANCA_STYLE = {
  alta:  { bg: "#d1fae5", color: "#065f46", dot: "#10b981", label: "Alta"  },
  media: { bg: "#fef3c7", color: "#92400e", dot: "#f59e0b", label: "Média" },
  baixa: { bg: "#fee2e2", color: "#991b1b", dot: "#ef4444", label: "Baixa" },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseFile(file) {
  return new Promise((resolve, reject) => {
    const ext = file.name.split(".").pop().toLowerCase();
    if (ext === "csv") {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (r) => resolve({ rows: r.data, cols: r.meta.fields || [] }),
        error: reject,
      });
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const wb = XLSX.read(e.target.result, { type: "array" });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
          resolve({ rows, cols: rows.length ? Object.keys(rows[0]) : [] });
        } catch (err) { reject(err); }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    }
  });
}

function exportarXLSX(dadosOriginais, mapeamentos, nomeArquivo) {
  const rows = dadosOriginais.map((row, i) => {
    const m = mapeamentos[i] || {};
    return {
      ...row,
      "Código CATMAT":          m.codigo_catmat      || "",
      "Nome Padronizado":       m.nome_padronizado    || "",
      "Descrição Padronizada":  m.descricao           || "",
      "Categoria":              m.categoria           || "",
      "Confiança do Mapeamento": m.confianca          || "",
    };
  });
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Mapeamento");
  XLSX.writeFile(wb, nomeArquivo || "mapeamento_patrimonial.xlsx");
}

// ─── Subcomponentes ───────────────────────────────────────────────────────────

function Stepper({ step }) {
  const steps = ["upload", "configurar", "processando", "resultado"];
  const labels = ["Upload", "Configurar", "Processar", "Resultado"];
  const current = steps.indexOf(step);

  return (
    <div style={{ display: "flex", alignItems: "center", padding: "20px 0 0", maxWidth: 860, margin: "0 auto", paddingLeft: 24, paddingRight: 24 }}>
      {labels.map((label, i) => {
        const done   = i < current;
        const active = i === current;
        return (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: "50%", display: "flex",
              alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 700, flexShrink: 0,
              background: done ? "var(--blue)" : active ? "#fff" : "var(--gray-200)",
              border: active ? "2.5px solid var(--blue)" : done ? "none" : "2px solid var(--gray-200)",
              color: done ? "#fff" : active ? "var(--blue)" : "var(--gray-400)",
            }}>
              {done ? "✓" : i + 1}
            </div>
            <span style={{ fontSize: 13, fontWeight: active ? 700 : 400, color: active || done ? "var(--gray-900)" : "var(--gray-400)", whiteSpace: "nowrap" }}>
              {label}
            </span>
            {i < labels.length - 1 && (
              <div style={{ width: 40, height: 2, background: done ? "var(--blue)" : "var(--gray-200)", borderRadius: 2, marginLeft: 8, flexShrink: 0 }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function Badge({ confianca }) {
  const s = CONFIANCA_STYLE[confianca] || CONFIANCA_STYLE.baixa;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: s.bg, color: s.color, borderRadius: 20, padding: "3px 10px", fontSize: 12, fontWeight: 600 }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.dot }} />
      {s.label}
    </span>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [step, setStep]               = useState("upload");
  const [arquivo, setArquivo]         = useState(null);
  const [dados, setDados]             = useState([]);
  const [colunas, setColunas]         = useState([]);
  const [colDesc, setColDesc]         = useState("");
  const [mapeamentos, setMapeamentos] = useState([]);
  const [progresso, setProgresso]     = useState(0);
  const [erro, setErro]               = useState(null);
  const [dragOver, setDragOver]       = useState(false);
  const inputRef = useRef();

  // ── Carrega arquivo ────────────────────────────────────────────────────────
  const carregarArquivo = useCallback(async (file) => {
    if (!file) return;
    try {
      const { rows, cols } = await parseFile(file);
      setArquivo(file);
      setDados(rows);
      setColunas(cols);
      setColDesc(cols[0] || "");
      setStep("configurar");
    } catch {
      setErro("Não foi possível ler o arquivo. Verifique se é um CSV ou XLSX válido.");
    }
  }, []);

  // ── Inicia mapeamento ──────────────────────────────────────────────────────
  const iniciarMapeamento = async () => {
    setStep("processando");
    setErro(null);
    setProgresso(0);

    const itens = dados.map((row) => String(row[colDesc] || "").trim());
    let todos = [];

    try {
      for (let i = 0; i < itens.length; i += LOTE_SIZE) {
        const lote = itens.slice(i, i + LOTE_SIZE);
        const resultado = await mapearLote(lote);
        todos = [...todos, ...resultado];
        setProgresso(Math.round(((i + lote.length) / itens.length) * 100));
      }
      setMapeamentos(todos);
      setStep("resultado");
    } catch (e) {
      setErro(e.message);
      setStep("configurar");
    }
  };

  // ── Drag & drop ────────────────────────────────────────────────────────────
  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    carregarArquivo(e.dataTransfer.files[0]);
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: "var(--gray-50)", position: "relative" }}>

      {/* Grade de fundo */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        backgroundImage: "radial-gradient(circle, #c7d2fe 1px, transparent 1px)",
        backgroundSize: "28px 28px", opacity: 0.4,
      }} />

      {/* Header */}
      <header style={{ background: "#fff", borderBottom: "1.5px solid var(--gray-200)", position: "relative", zIndex: 10 }}>
        <div style={{ maxWidth: 860, margin: "0 auto", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <svg width="30" height="30" viewBox="0 0 28 28" fill="none">
              <rect x="2"  y="2"  width="11" height="11" rx="2" fill="var(--blue)" />
              <rect x="15" y="2"  width="11" height="11" rx="2" fill="var(--blue)" opacity=".45" />
              <rect x="2"  y="15" width="11" height="11" rx="2" fill="var(--blue)" opacity=".45" />
              <rect x="15" y="15" width="11" height="11" rx="2" fill="var(--blue)" />
            </svg>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.5px" }}>PatriMap</div>
              <div style={{ fontSize: 11, color: "var(--gray-400)" }}>IFPE · Mapeamento Patrimonial CATMAT</div>
            </div>
          </div>
          <span style={{ fontSize: 11, background: "var(--blue-light)", color: "var(--blue)", border: "1px solid var(--blue-border)", borderRadius: 20, padding: "4px 12px", fontWeight: 600 }}>
            MVP · Engenharia de Requisitos
          </span>
        </div>
      </header>

      <Stepper step={step} />

      {/* Conteúdo principal */}
      <main style={{ maxWidth: 860, margin: "0 auto", padding: "24px 24px 60px", position: "relative", zIndex: 10 }}>

        {/* ── STEP: Upload ──────────────────────────────────────────────────── */}
        {step === "upload" && (
          <div style={card}>
            <h2 style={title}>Envie sua planilha</h2>
            <p style={desc}>
              Faça upload de um arquivo <strong>CSV ou XLSX</strong> com os bens patrimoniais do seu campus.
              O sistema irá mapear cada item à nomenclatura padronizada <strong>CATMAT</strong> usando IA.
            </p>

            <div
              style={{ ...dropzone, ...(dragOver ? dropzoneActive : {}) }}
              onClick={() => inputRef.current.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
            >
              <svg width="44" height="44" viewBox="0 0 44 44" fill="none" style={{ marginBottom: 12 }}>
                <path d="M22 8v20M13 17l9-9 9 9" stroke="var(--blue)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M7 32h30" stroke="var(--blue)" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M4 38h36" stroke="var(--gray-200)" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <div style={{ fontSize: 16, fontWeight: 600, color: "var(--gray-700)" }}>
                Arraste e solte ou{" "}
                <span style={{ color: "var(--blue)", textDecoration: "underline" }}>clique para selecionar</span>
              </div>
              <div style={{ fontSize: 13, color: "var(--gray-400)", marginTop: 6 }}>CSV ou XLSX · máx. 50 MB</div>
              <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" style={{ display: "none" }}
                onChange={(e) => carregarArquivo(e.target.files[0])} />
            </div>

            {/* Exemplo */}
            <div style={{ marginTop: 28, background: "var(--gray-50)", borderRadius: 10, padding: "16px 20px", border: "1px solid var(--gray-200)", fontSize: 13 }}>
              <strong style={{ color: "var(--gray-700)" }}>Exemplo de planilha de entrada:</strong>
              <div style={{ overflowX: "auto", marginTop: 10 }}>
                <table style={{ borderCollapse: "collapse", width: "100%" }}>
                  <thead>
                    <tr>{["Tombamento", "Descrição do Bem", "Campus", "Setor"].map(h => <th key={h} style={th}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {[
                      ["001234", "computador de mesa", "Recife",  "TI" ],
                      ["001235", "Desktop Dell",        "Caruaru", "Adm"],
                      ["001236", "microcomputador",     "Olinda",  "Lab"],
                    ].map((row, i) => (
                      <tr key={i}>{row.map((c, j) => <td key={j} style={td}>{c}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP: Configurar ──────────────────────────────────────────────── */}
        {step === "configurar" && (
          <div style={card}>
            <h2 style={title}>Configure o mapeamento</h2>
            <p style={desc}>
              Arquivo: <strong>{arquivo?.name}</strong> · <strong>{dados.length}</strong> linhas encontradas.
            </p>

            <label style={labelStyle}>Qual coluna contém a <strong>descrição do bem</strong>?</label>
            <select style={select} value={colDesc} onChange={(e) => setColDesc(e.target.value)}>
              {colunas.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <p style={{ fontSize: 12, color: "var(--gray-400)", marginTop: 5, marginBottom: 20 }}>
              Esta coluna será usada como base para o mapeamento CATMAT.
            </p>

            {/* Prévia */}
            <div style={{ background: "var(--gray-50)", borderRadius: 10, padding: "14px 16px", border: "1px solid var(--gray-200)" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--gray-400)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>
                Prévia da coluna selecionada
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {dados.slice(0, 15).map((row, i) => (
                  <span key={i} style={{ background: "var(--gray-200)", color: "var(--gray-700)", borderRadius: 6, padding: "4px 10px", fontSize: 13 }}>
                    {String(row[colDesc] || "—")}
                  </span>
                ))}
                {dados.length > 15 && (
                  <span style={{ background: "var(--gray-200)", color: "var(--gray-400)", borderRadius: 6, padding: "4px 10px", fontSize: 13 }}>
                    +{dados.length - 15} mais…
                  </span>
                )}
              </div>
            </div>

            {erro && <div style={erroBox}>{erro}</div>}

            <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
              <button style={btnSecondary} onClick={() => setStep("upload")}>← Voltar</button>
              <button style={btnPrimary}   onClick={iniciarMapeamento}>Iniciar Mapeamento →</button>
            </div>
          </div>
        )}

        {/* ── STEP: Processando ─────────────────────────────────────────────── */}
        {step === "processando" && (
          <div style={{ ...card, textAlign: "center" }}>
            <svg width="56" height="56" viewBox="0 0 56 56" fill="none"
              style={{ animation: "spin 1.2s linear infinite", marginBottom: 20 }}>
              <circle cx="28" cy="28" r="22" stroke="var(--gray-200)" strokeWidth="5" />
              <path d="M28 6a22 22 0 0 1 22 22" stroke="var(--blue)" strokeWidth="5" strokeLinecap="round" />
            </svg>
            <h2 style={title}>Mapeando itens…</h2>
            <p style={desc}>A IA está consultando o CATMAT e padronizando as nomenclaturas. Aguarde.</p>
            <div style={{ background: "var(--gray-200)", borderRadius: 99, height: 10, overflow: "hidden", maxWidth: 400, margin: "20px auto 8px" }}>
              <div style={{ background: "linear-gradient(90deg, var(--blue), #60a5fa)", height: "100%", borderRadius: 99, width: `${progresso}%`, transition: "width 0.4s ease" }} />
            </div>
            <div style={{ fontSize: 14, color: "var(--gray-400)" }}>{progresso}% concluído</div>
          </div>
        )}

        {/* ── STEP: Resultado ───────────────────────────────────────────────── */}
        {step === "resultado" && (
          <div style={{ ...card, animation: "fadeIn 0.4s ease" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 20 }}>
              <div>
                <h2 style={title}>Mapeamento concluído!</h2>
                <p style={desc}>{dados.length} itens processados.</p>
              </div>
              <button style={btnDark} onClick={() => exportarXLSX(dados, mapeamentos, arquivo?.name?.replace(/\.\w+$/, "") + "_mapeado.xlsx")}>
                ⬇ Baixar XLSX
              </button>
            </div>

            {/* Stats */}
            <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
              {["alta", "media", "baixa"].map((nivel) => {
                const count = mapeamentos.filter((m) => m.confianca === nivel).length;
                const s = CONFIANCA_STYLE[nivel];
                return (
                  <div key={nivel} style={{ flex: 1, minWidth: 110, background: s.bg, borderRadius: 10, padding: "14px 18px", display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: s.dot, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{count}</div>
                      <div style={{ fontSize: 12, color: s.color }}>Confiança {s.label}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Tabela */}
            <div style={{ overflowX: "auto", borderRadius: 10, border: "1px solid var(--gray-200)" }}>
              <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 13 }}>
                <thead>
                  <tr>
                    {["Descrição Original", "Código CATMAT", "Nome Padronizado", "Categoria", "Confiança"].map((h) => (
                      <th key={h} style={th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dados.slice(0, 100).map((row, i) => {
                    const m = mapeamentos[i] || {};
                    return (
                      <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "var(--gray-50)" }}>
                        <td style={{ ...td, maxWidth: 200, wordBreak: "break-word" }}>{String(row[colDesc] || "")}</td>
                        <td style={{ ...td, fontFamily: "var(--mono)", fontWeight: 600, color: "var(--blue)" }}>{m.codigo_catmat}</td>
                        <td style={{ ...td, fontWeight: 600 }}>{m.nome_padronizado}</td>
                        <td style={td}>{m.categoria}</td>
                        <td style={td}><Badge confianca={m.confianca} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {dados.length > 100 && (
                <div style={{ textAlign: "center", padding: 12, color: "var(--gray-400)", fontSize: 13 }}>
                  Exibindo 100 de {dados.length} itens. O arquivo XLSX conterá todos.
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button style={btnSecondary} onClick={() => { setStep("upload"); setArquivo(null); setDados([]); setMapeamentos([]); setErro(null); }}>
                ← Novo mapeamento
              </button>
              <button style={btnDark} onClick={() => exportarXLSX(dados, mapeamentos, arquivo?.name?.replace(/\.\w+$/, "") + "_mapeado.xlsx")}>
                ⬇ Baixar XLSX
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer de privacidade */}
      <footer style={{ textAlign: "center", padding: 16, fontSize: 12, color: "var(--gray-400)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, position: "relative", zIndex: 10 }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--green)", display: "inline-block" }} />
        Processamento em memória · Nenhum dado é armazenado · Conexão via TLS · Sessão isolada
      </footer>
    </div>
  );
}

// ─── Estilos base ─────────────────────────────────────────────────────────────

const card        = { background: "#fff", borderRadius: 16, border: "1.5px solid var(--gray-200)", padding: "36px 40px", boxShadow: "0 4px 24px rgba(0,0,0,0.06)" };
const title       = { fontSize: 24, fontWeight: 800, letterSpacing: "-0.5px", marginBottom: 8 };
const desc        = { fontSize: 15, color: "var(--gray-600)", lineHeight: 1.6, marginBottom: 24 };
const dropzone    = { border: "2px dashed var(--gray-200)", borderRadius: 12, padding: "48px 24px", textAlign: "center", cursor: "pointer", transition: "all 0.2s", background: "var(--gray-50)" };
const dropzoneActive = { border: "2px dashed var(--blue)", background: "var(--blue-light)" };
const labelStyle  = { display: "block", fontSize: 14, color: "var(--gray-700)", marginBottom: 8 };
const select      = { width: "100%", padding: "10px 14px", border: "1.5px solid var(--gray-200)", borderRadius: 8, fontSize: 15, outline: "none", background: "#fff", fontFamily: "var(--font)" };
const erroBox     = { background: "#fee2e2", color: "#991b1b", borderRadius: 8, padding: "12px 16px", fontSize: 14, marginTop: 16 };
const btnPrimary  = { background: "var(--blue)", color: "#fff", border: "none", borderRadius: 8, padding: "12px 28px", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font)" };
const btnSecondary= { background: "#fff", color: "var(--gray-700)", border: "1.5px solid var(--gray-200)", borderRadius: 8, padding: "12px 20px", fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font)" };
const btnDark     = { background: "var(--gray-900)", color: "#fff", border: "none", borderRadius: 8, padding: "12px 24px", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font)" };
const th          = { background: "var(--gray-100)", padding: "10px 14px", textAlign: "left", fontWeight: 700, color: "var(--gray-700)", borderBottom: "1px solid var(--gray-200)", whiteSpace: "nowrap" };
const td          = { padding: "10px 14px", borderBottom: "1px solid var(--gray-100)", color: "var(--gray-700)", verticalAlign: "top" };
