export const REQUIRED_INPUT_COLUMNS = [
  '#',
  'NUMERO',
  'STATUS',
  'ED',
  'DESCRICAO',
  'RÓTULOS',
  'CARGA ATUAL',
  'SETOR DO RESPONSÁVEL',
  'CAMPUS DA CARGA',
  'VALOR',
  'NUMERO NOTA FISCAL',
  'DATA DA ENTRADA',
  'DATA DA CARGA',
  'FORNECEDOR',
  'SALA',
] as const;

export type RequiredInputColumn = (typeof REQUIRED_INPUT_COLUMNS)[number];
