export class ImportCatmatClassificationResponseDto {
  message: string;
  totalLinhas: number;
  processadas: number;
  semCandidatos: number;
  semCorrespondencia: number;
  baixaConfianca: number;
  erros: number;
  arquivoSaida: string;
  arquivoAuditoria: string;
  linkDownloadSaida: string;
  linkDownloadAuditoria: string;
}
