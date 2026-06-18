import { AuditSpreadsheetRow, OutputSpreadsheetRow } from './export-row.interface';

export interface CatmatClassificationResult {
  totalRows: number;
  processed: number;
  noCandidates: number;
  noMatch: number;
  lowConfidence: number;
  errors: number;
  outputFile: string;
  auditFile: string;
  outputRows: OutputSpreadsheetRow[];
  auditRows: AuditSpreadsheetRow[];
}
