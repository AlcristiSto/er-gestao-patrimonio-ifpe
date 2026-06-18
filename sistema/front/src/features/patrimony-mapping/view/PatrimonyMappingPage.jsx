import { usePatrimonyMappingViewModel } from "../view-model/usePatrimonyMappingViewModel";
import { AppFooter } from "./components/AppFooter";
import { AppHeader } from "./components/AppHeader";
import { ConfirmUploadStep } from "./components/ConfirmUploadStep";
import { ProcessingStep } from "./components/ProcessingStep";
import { ResultStep } from "./components/ResultStep";
import { Stepper } from "./components/Stepper";
import { UploadStep } from "./components/UploadStep";

export function PatrimonyMappingPage() {
  const vm = usePatrimonyMappingViewModel();
  const { actions } = vm;

  return (
    <div style={{ minHeight: "100vh", background: "var(--gray-50)", position: "relative" }}>
      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 0,
          backgroundImage: "radial-gradient(circle, #c7d2fe 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          opacity: 0.4,
        }}
      />

      <AppHeader />
      <Stepper step={vm.step} />

      <main style={{ maxWidth: 860, margin: "0 auto", padding: "24px 24px 60px", position: "relative", zIndex: 10 }}>
        {vm.step === "upload" && (
          <UploadStep
            dragOver={vm.dragOver}
            erro={vm.erro}
            inputRef={vm.inputRef}
            onDragLeave={actions.onDragLeave}
            onDragOver={actions.onDragOver}
            onDrop={actions.onDrop}
            onFileChange={(event) => {
              actions.carregarArquivo(event.target.files[0]);
              event.target.value = "";
            }}
            onSelectFile={actions.selecionarArquivo}
          />
        )}

        {vm.step === "confirmacao" && (
          <ConfirmUploadStep
            arquivo={vm.arquivo}
            onCancel={actions.novoMapeamento}
            onConfirm={actions.confirmarEnvio}
          />
        )}

        {vm.step === "processando" && <ProcessingStep arquivo={vm.arquivo} />}

        {vm.step === "resultado" && (
          <ResultStep
            erro={vm.erro}
            resultado={vm.resultado}
            onDownloadAuditoria={() => actions.abrirDownload(vm.resultado?.linkDownloadAuditoria, vm.resultado?.arquivoAuditoria)}
            onDownloadSaida={() => actions.abrirDownload(vm.resultado?.linkDownloadSaida, vm.resultado?.arquivoSaida)}
            onNewMapping={actions.novoMapeamento}
          />
        )}
      </main>

      <AppFooter />
    </div>
  );
}
