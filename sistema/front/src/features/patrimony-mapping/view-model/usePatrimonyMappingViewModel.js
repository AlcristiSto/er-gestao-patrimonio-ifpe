import { useCallback, useRef, useState } from "react";

import { validateImportFile } from "../model/mappingModel";
import { downloadGeneratedFile, importCatmatFile } from "../services/catmatImportService";

const DEFAULT_IMPORT_ERROR_MESSAGE = "Não foi possível importar a planilha. Verifique o backend e tente novamente.";

function getFriendlyErrorMessage(error) {
  const message = error?.message || "";

  if (!message || /failed to fetch/i.test(message)) {
    return DEFAULT_IMPORT_ERROR_MESSAGE;
  }

  return message;
}

export function usePatrimonyMappingViewModel() {
  const [step, setStep] = useState("upload");
  const [arquivo, setArquivo] = useState(null);
  const [resultado, setResultado] = useState(null);
  const [erro, setErro] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const abrirDownload = useCallback(async (link, fileName) => {
    setErro(null);

    try {
      await downloadGeneratedFile(link, fileName);
    } catch (error) {
      setErro(getFriendlyErrorMessage(error));
    }
  }, []);

  const carregarArquivo = useCallback(async (file) => {
    const validationError = validateImportFile(file);

    if (validationError) {
      setErro(validationError);
      setArquivo(null);
      setResultado(null);
      setStep("upload");
      return;
    }

    setArquivo(file);
    setResultado(null);
    setErro(null);
    setStep("confirmacao");
  }, []);

  const confirmarEnvio = useCallback(async () => {
    if (!arquivo) {
      setErro("Selecione uma planilha antes de confirmar o envio.");
      setStep("upload");
      return;
    }

    setStep("processando");
    setErro(null);

    try {
      const importResult = await importCatmatFile(arquivo);
      setResultado(importResult);
      setStep("resultado");
    } catch (error) {
      setErro(getFriendlyErrorMessage(error));
      setStep("upload");
    }
  }, [arquivo]);

  const novoMapeamento = useCallback(() => {
    setStep("upload");
    setArquivo(null);
    setResultado(null);
    setErro(null);
    setDragOver(false);
  }, []);

  const selecionarArquivo = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();
      setDragOver(false);
      carregarArquivo(event.dataTransfer.files[0]);
    },
    [carregarArquivo],
  );

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    setDragOver(true);
  }, []);

  const onDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  return {
    arquivo,
    dragOver,
    erro,
    inputRef,
    resultado,
    step,
    actions: {
      abrirDownload,
      carregarArquivo,
      confirmarEnvio,
      novoMapeamento,
      onDragLeave,
      onDragOver,
      onDrop,
      selecionarArquivo,
    },
  };
}
