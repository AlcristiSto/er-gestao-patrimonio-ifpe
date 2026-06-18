import { ALLOWED_FILE_EXTENSIONS, MAX_FILE_SIZE_BYTES } from "./mappingConstants";

export function getFileExtension(fileName = "") {
  return fileName.split(".").pop()?.toLowerCase() || "";
}

export function validateImportFile(file) {
  if (!file) {
    return "Selecione uma planilha para importar.";
  }

  const extension = getFileExtension(file.name);

  if (!ALLOWED_FILE_EXTENSIONS.includes(extension)) {
    return "Formato inválido. Envie um arquivo CSV, XLSX ou XLS.";
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return "Arquivo muito grande. Envie uma planilha com no máximo 50 MB.";
  }

  return null;
}

export function formatFileSize(bytes = 0) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
