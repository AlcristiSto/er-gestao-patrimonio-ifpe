import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as ExcelJS from 'exceljs';
import { access, mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { AuditSpreadsheetRow, OutputSpreadsheetRow } from '../interfaces/export-row.interface';

const OUTPUT_FILE_PREFIX = 'saida';
const AUDIT_FILE_PREFIX = 'auditoria';
const XLSX_EXTENSION = 'xlsx';
const EXPORT_FILE_PATTERN = /^(saida|auditoria)_(\d{8}T\d{9}Z)\.xlsx$/;

export interface ExportDownloadFile {
  filePath: string;
  downloadFileName: string;
}

@Injectable()
export class SpreadsheetExportService {
  private lastExportTimestampMs = 0;

  constructor(private readonly configService: ConfigService) {}

  createExportTimestamp(date = new Date()): string {
    const timestampMs = Math.max(date.getTime(), this.lastExportTimestampMs + 1);
    this.lastExportTimestampMs = timestampMs;

    return new Date(timestampMs).toISOString().replace(/[-:.]/g, '');
  }

  async exportOutput(rows: OutputSpreadsheetRow[], exportTimestamp = this.createExportTimestamp()): Promise<string> {
    const exportDir = await this.ensureExportDir();
    const filePath = join(exportDir, this.buildExportFileName(OUTPUT_FILE_PREFIX, exportTimestamp));
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('saida');

    worksheet.columns = [
      { header: '"D"', key: 'd', width: 8 },
      { header: 'Código do material', key: 'catmat', width: 18 },
      { header: 'Descrição', key: 'nameClasse', width: 32 },
      { header: 'Código da conta', key: 'account', width: 18 },
      { header: 'Endereço', key: 'campus', width: 20 },
      { header: 'UORG', key: 'uorg', width: 18 },
      { header: 'Tipo', key: 'type', width: 10 },
      { header: 'Situação', key: 'situation', width: 12 },
      { header: 'Tipo de plaqueta', key: 'plaqueta', width: 18 },
      { header: 'Data Tombamento', key: 'date', width: 18 },
      { header: 'Valor do Bem', key: 'price', width: 16 },
      { header: 'Forma de aquisição', key: 'acquisition', width: 22 },
      { header: 'Especificação', key: 'specification', width: 48 },
      { header: 'Tombo Antigo', key: 'oldTomb', width: 16 },
    ];

    worksheet.addRows(rows);
    await workbook.xlsx.writeFile(filePath);

    return filePath;
  }

  async exportAudit(rows: AuditSpreadsheetRow[], exportTimestamp = this.createExportTimestamp()): Promise<string> {
    const exportDir = await this.ensureExportDir();
    const filePath = join(exportDir, this.buildExportFileName(AUDIT_FILE_PREFIX, exportTimestamp));
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('auditoria');

    worksheet.columns = [
      { header: 'LINHA', key: 'line', width: 10 },
      { header: 'NUMERO', key: 'number', width: 14 },
      { header: 'DESCRICAO_ORIGINAL', key: 'originalDescription', width: 48 },
      { header: 'DESCRICAO_NORMALIZADA', key: 'normalizedDescription', width: 48 },
      { header: 'TOKENS', key: 'tokens', width: 36 },
      { header: 'TOTAL_CANDIDATOS', key: 'totalCandidates', width: 18 },
      { header: 'CANDIDATOS', key: 'candidates', width: 64 },
      { header: 'CATMAT_SELECIONADO', key: 'selectedCatmat', width: 20 },
      { header: 'DESC_CATMAT_SELECIONADA', key: 'selectedCatmatDescription', width: 48 },
      { header: 'SCORE_CONFIANCA', key: 'confidenceScore', width: 18 },
      { header: 'JUSTIFICATIVA_LLM', key: 'llmJustification', width: 48 },
      { header: 'STATUS_PROCESSAMENTO', key: 'processingStatus', width: 24 },
      { header: 'ERRO', key: 'error', width: 40 },
    ];

    worksheet.addRows(rows);
    await workbook.xlsx.writeFile(filePath);

    return filePath;
  }

  async getDownloadFile(fileName: string): Promise<ExportDownloadFile> {
    const match = EXPORT_FILE_PATTERN.exec(fileName);

    if (!match) {
      throw new BadRequestException('Invalid export file name.');
    }

    const exportDir = resolve(this.configService.get<string>('CATMAT_EXPORT_DIR', './exports'));
    const filePath = resolve(exportDir, fileName);

    if (!filePath.startsWith(`${exportDir}/`)) {
      throw new BadRequestException('Invalid export file name.');
    }

    try {
      await access(filePath);
    } catch {
      throw new NotFoundException('Export file not found.');
    }

    return {
      filePath,
      downloadFileName: `${match[1]}.${XLSX_EXTENSION}`,
    };
  }

  private buildExportFileName(prefix: string, exportTimestamp: string): string {
    return `${prefix}_${exportTimestamp}.${XLSX_EXTENSION}`;
  }

  private async ensureExportDir(): Promise<string> {
    const exportDir = this.configService.get<string>('CATMAT_EXPORT_DIR', './exports');
    await mkdir(exportDir, { recursive: true });
    return exportDir;
  }
}
