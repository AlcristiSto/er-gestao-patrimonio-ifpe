export function AppFooter() {
  return (
    <footer
      style={{
        textAlign: "center",
        padding: 16,
        fontSize: 12,
        color: "var(--gray-400)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        position: "relative",
        zIndex: 10,
      }}
    >
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--green)", display: "inline-block" }} />
      Processamento em memória · Conexão via TLS · Sessão isolada
    </footer>
  );
}
