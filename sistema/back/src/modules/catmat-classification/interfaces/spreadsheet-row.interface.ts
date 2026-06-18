export type SpreadsheetRow = Record<string, string>;

export interface ParsedSpreadsheet {
  headers: string[];
  rows: SpreadsheetRow[];
}
