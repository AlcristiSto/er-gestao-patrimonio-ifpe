const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const NETWORK_ERROR_MESSAGE =
  "Não foi possível conectar ao serviço de importação. Verifique se o backend está rodando em http://localhost:3000 e tente novamente.";
const DOWNLOAD_NETWORK_ERROR_MESSAGE =
  "Não foi possível conectar ao serviço de download. Verifique se o backend está rodando e tente novamente.";

function getApiUrl(path) {
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export function resolveDownloadUrl(link) {
  if (!link) {
    return "";
  }

  if (/^https?:\/\//i.test(link)) {
    return link;
  }

  return getApiUrl(link);
}

function getResponseMessage(body) {
  if (typeof body === "string") {
    return body;
  }

  if (Array.isArray(body?.message)) {
    return body.message.join(", ");
  }

  return body?.message || body?.error?.message || body?.error || "";
}

function formatMissingColumns(columns) {
  if (!Array.isArray(columns) || !columns.length) {
    return "";
  }

  return ` Colunas ausentes: ${columns.join(", ")}.`;
}

function getImportErrorMessage(status, body) {
  const message = getResponseMessage(body);

  if (status === 400 && message === "File is required.") {
    return "Nenhum arquivo foi enviado. Selecione uma planilha antes de confirmar a importação.";
  }

  if (status === 400 && message === "Invalid file type. Upload a CSV, XLSX, or XLS file.") {
    return "Formato de arquivo não aceito. Envie uma planilha nos formatos CSV, XLSX ou XLS.";
  }

  if (status === 400 && message === "Spreadsheet has no worksheets.") {
    return "A planilha enviada não possui abas para leitura. Verifique o arquivo ou baixe o modelo de entrada.";
  }

  if (status === 400 && message === "Invalid spreadsheet") {
    return `A planilha não possui todas as colunas obrigatórias.${formatMissingColumns(body?.missingColumns)} Baixe o modelo de entrada e confira o cabeçalho.`;
  }

  if (status === 413 || message === "File too large") {
    return "O arquivo ultrapassa o tamanho máximo permitido. Reduza a planilha ou divida os dados em arquivos menores.";
  }

  if (status >= 500) {
    return "Ocorreu um erro inesperado ao importar a planilha. Tente novamente em instantes.";
  }

  return "Não foi possível importar a planilha. Confira o arquivo enviado e tente novamente.";
}

function getDownloadErrorMessage(status, body) {
  const message = getResponseMessage(body);

  if (status === 400 && message === "Invalid export file name.") {
    return "O link de download recebido é inválido. Faça uma nova importação e tente baixar o arquivo novamente.";
  }

  if (status === 404 && message === "Export file not found.") {
    return "O arquivo gerado não foi encontrado no servidor. Faça uma nova importação para gerar os arquivos novamente.";
  }

  if (status >= 500) {
    return "Ocorreu um erro inesperado ao baixar o arquivo. Tente novamente em instantes.";
  }

  return "Não foi possível baixar o arquivo gerado. Tente novamente.";
}

async function readResponseBody(response) {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json().catch(() => ({}));
  }

  return response.text().catch(() => "");
}

function getFileNameFromDisposition(disposition) {
  const utf8Match = disposition?.match(/filename\*=UTF-8''([^;]+)/i);
  const defaultMatch = disposition?.match(/filename="?([^"]+)"?/i);
  const fileName = utf8Match?.[1] || defaultMatch?.[1];

  return fileName ? decodeURIComponent(fileName) : "";
}

function getFileNameFromLink(link) {
  const cleanLink = link?.split("?")[0] || "";
  const fileName = cleanLink.split("/").filter(Boolean).pop();

  return fileName ? decodeURIComponent(fileName) : "";
}

export async function importCatmatFile(file) {
  const formData = new FormData();
  formData.append("file", file);

  let response;

  try {
    response = await fetch(getApiUrl("/catmat-classificacao/importar"), {
      method: "POST",
      body: formData,
    });
  } catch {
    throw new Error(NETWORK_ERROR_MESSAGE);
  }

  const body = await readResponseBody(response);

  if (!response.ok) {
    throw new Error(getImportErrorMessage(response.status, body));
  }

  return body;
}

export async function downloadGeneratedFile(link, fallbackFileName) {
  const url = resolveDownloadUrl(link);

  if (!url) {
    throw new Error("Link de download não encontrado na resposta da importação.");
  }

  let response;

  try {
    response = await fetch(url);
  } catch {
    throw new Error(DOWNLOAD_NETWORK_ERROR_MESSAGE);
  }

  if (!response.ok) {
    const body = await readResponseBody(response);
    throw new Error(getDownloadErrorMessage(response.status, body));
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const dispositionFileName = getFileNameFromDisposition(response.headers.get("content-disposition"));
  const linkFileName = getFileNameFromLink(link);

  anchor.href = objectUrl;
  anchor.download = dispositionFileName || fallbackFileName || linkFileName || "arquivo-catmat";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}
