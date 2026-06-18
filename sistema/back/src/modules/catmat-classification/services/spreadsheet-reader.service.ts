import { BadRequestException, Injectable } from '@nestjs/common';
import { parse } from 'csv-parse/sync';
import { extname } from 'node:path';
import * as XLSX from 'xlsx';
import { ParsedSpreadsheet, SpreadsheetRow } from '../interfaces/spreadsheet-row.interface';
import { InputSpreadsheetValidator } from '../validators/input-spreadsheet.validator';

@Injectable()
export class SpreadsheetReaderService {
  constructor(private readonly inputSpreadsheetValidator: InputSpreadsheetValidator) {}

  read(file: Express.Multer.File): ParsedSpreadsheet {
    const extension = extname(file.originalname).toLowerCase();

    if (extension === '.csv') {
      return this.readCsv(file.buffer);
    }

    if (extension === '.xlsx' || extension === '.xls') {
      return this.readExcel(file.buffer);
    }

    throw new BadRequestException('Invalid file type. Upload a CSV, XLSX, or XLS file.');
  }

  private readCsv(buffer: Buffer): ParsedSpreadsheet {
    let headers: string[] = [];
    const rows = parse(buffer.toString('utf8'), {
      bom: true,
      columns: (headerRow: string[]) => {
        headers = headerRow.map((header) => header.trim());
        return headers;
      },
      skip_empty_lines: true,
      relax_quotes: true,
      trim: true,
    }) as SpreadsheetRow[];

    this.inputSpreadsheetValidator.validateHeaders(headers);
    return {
      headers,
      rows: rows.map((row) => this.stringifyRowValues(row)),
    };
  }

  private readExcel(buffer: Buffer): ParsedSpreadsheet {
    const workbook = XLSX.read(buffer, {
      type: 'buffer',
      cellDates: false,
      raw: false,
    });
    const sheetName = workbook.SheetNames[0];

    if (!sheetName) {
      throw new BadRequestException('Spreadsheet has no worksheets.');
    }

    const sheet = workbook.Sheets[sheetName];
    const table = XLSX.utils.sheet_to_json<string[]>(sheet, {
      header: 1,
      defval: '',
      raw: false,
    });
    const headers = (table[0] ?? []).map((header) => String(header).trim());

    this.inputSpreadsheetValidator.validateHeaders(headers);

    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: '',
      raw: false,
    });

    return {
      headers,
      rows: rows.map((row) => this.stringifyRowValues(row)),
    };
  }

  private stringifyRowValues(row: Record<string, unknown>): SpreadsheetRow {
    return Object.fromEntries(
      Object.entries(row).map(([key, value]) => [key.trim(), value === null || value === undefined ? '' : String(value).trim()]),
    );
  }
}
