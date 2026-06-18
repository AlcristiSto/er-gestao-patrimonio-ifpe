export interface OutputSpreadsheetRow {
  d:string,
  catmat: number | null;
  nameClasse:string;
  account: string;
  uorg:string;
  expenseNatureAndSubitem: string;
  campus: string;
  date: string;
  type:number;
  situation:number;
  plaqueta:number;
acquisition:string;
      specification:string;
      price:string;
      oldTomb:string;
}

export interface AuditSpreadsheetRow {
  line: number;
  number: string;
  originalDescription: string;
  normalizedDescription: string;
  tokens: string;
  totalCandidates: number;
  candidates: string;
  selectedCatmat: number | null;
  selectedCatmatDescription: string | null;
  confidenceScore: number | null;
  llmJustification: string;
  processingStatus: string;
  error: string;
}
