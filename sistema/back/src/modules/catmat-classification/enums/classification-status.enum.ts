export enum ClassificationStatus {
  Processed = 'PROCESSADO',
  NoCandidates = 'SEM_CANDIDATOS',
  NoMatch = 'SEM_CORRESPONDENCIA',
  LowConfidence = 'BAIXA_CONFIANCA',
  ValidationError = 'ERRO_VALIDACAO',
  LlmError = 'ERRO_LLM',
  ProcessingError = 'ERRO_PROCESSAMENTO',
}
