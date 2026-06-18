import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { basename } from 'node:path';
import { ClassificationStatus } from '../enums/classification-status.enum';
import { SpreadsheetExportService } from '../exporters/spreadsheet-export.service';
import { RankedCatmatCandidate } from '../interfaces/catmat-candidate.interface';
import { CatmatClassificationResult } from '../interfaces/classification-result.interface';
import { AuditSpreadsheetRow, OutputSpreadsheetRow } from '../interfaces/export-row.interface';
import { LlmClassificationResponse } from '../interfaces/llm-classification.interface';
import { SpreadsheetRow } from '../interfaces/spreadsheet-row.interface';
import { TokenizedDescription } from '../interfaces/tokenized-description.interface';
import { CatmatLlmService } from '../llm/catmat-llm.service';
import { CatmatRepository } from '../repositories/catmat.repository';
import { DescriptionTokenizerService } from '../tokenizer/description-tokenizer.service';
import { CatmatCandidateRankingService } from './catmat-candidate-ranking.service';
import { ClassificationDecisionService } from './classification-decision.service';
import { SpreadsheetReaderService } from './spreadsheet-reader.service';

const HIGH_LOCAL_SCORE_THRESHOLD = 0.92;

interface RowProcessingResult {
  outputRow: OutputSpreadsheetRow | null;
  auditRow: AuditSpreadsheetRow;
}

interface CachedClassification {
  rankedCandidates: RankedCatmatCandidate[];
  llmResponse: LlmClassificationResponse | null;
  status: ClassificationStatus;
  error: string;
}

@Injectable()
export class CatmatClassificationService {
  private readonly logger = new Logger(CatmatClassificationService.name);
  private readonly classificationCache = new Map<string, Promise<CachedClassification>>();

  constructor(
    private readonly spreadsheetReaderService: SpreadsheetReaderService,
    private readonly descriptionTokenizerService: DescriptionTokenizerService,
    private readonly catmatRepository: CatmatRepository,
    private readonly catmatCandidateRankingService: CatmatCandidateRankingService,
    private readonly catmatLlmService: CatmatLlmService,
    private readonly classificationDecisionService: ClassificationDecisionService,
    private readonly spreadsheetExportService: SpreadsheetExportService,
    private readonly configService: ConfigService,
  ) {}

  async importSpreadsheet(file: Express.Multer.File): Promise<CatmatClassificationResult> {
    this.logger.log(`CATMAT import started for ${file.originalname}`);
    this.classificationCache.clear();
    const spreadsheet = this.spreadsheetReaderService.read(file);
    const concurrency = this.configService.get<number>('CATMAT_LLM_CONCURRENCY', 3);
    const rowResults = await this.mapWithConcurrency(spreadsheet.rows, concurrency, (row, index) =>
      this.processRow(row, index + 2),
    );
    const outputRows = rowResults.flatMap((result) => (result.outputRow ? [result.outputRow] : []));
    const auditRows = rowResults.map((result) => result.auditRow);
    const exportTimestamp = this.spreadsheetExportService.createExportTimestamp();
    const outputFilePath = await this.spreadsheetExportService.exportOutput(outputRows, exportTimestamp);
    const auditFilePath = await this.spreadsheetExportService.exportAudit(auditRows, exportTimestamp);
    const result = this.buildResult(spreadsheet.rows.length, outputRows, auditRows, outputFilePath, auditFilePath);

    this.logger.log(
      `CATMAT import finished. Rows: ${result.totalRows}. Processed: ${result.processed}. Errors: ${result.errors}.`,
    );

    return result;
  }

  private async processRow(row: SpreadsheetRow, lineNumber: number): Promise<RowProcessingResult> {
    try {
      if (!row.DESCRICAO?.trim()) {
        return this.createValidationError(row, lineNumber, 'Missing DESCRICAO value.');
      }

      const tokenizedDescription = this.descriptionTokenizerService.tokenize(row.DESCRICAO);
      const classification = await this.getCachedClassification(tokenizedDescription);
      const selectedCandidate = classification.llmResponse?.codigoItemSelecionado
        ? classification.rankedCandidates.find(
            (candidate) => candidate.codigoItem === classification.llmResponse?.codigoItemSelecionado,
          ) ?? null
        : null;
      const auditRow = this.createAuditRow(row, lineNumber, tokenizedDescription, classification);
      const outputRow =
        classification.status === ClassificationStatus.Processed && selectedCandidate
          ? this.createOutputRow(row, selectedCandidate)
          : null;

      return {
        outputRow,
        auditRow,
      };
    } catch (error) {
      return this.createProcessingError(row, lineNumber, error);
    }
  }

  private getCachedClassification(tokenizedDescription: TokenizedDescription): Promise<CachedClassification> {
    const cached = this.classificationCache.get(tokenizedDescription.descricaoNormalizada);

    if (cached) {
      return cached;
    }

    const classification = this.classifyDescription(tokenizedDescription);
    this.classificationCache.set(tokenizedDescription.descricaoNormalizada, classification);
    return classification;
  }

  private async classifyDescription(tokenizedDescription: TokenizedDescription): Promise<CachedClassification> {
    const maxCandidates = this.configService.get<number>('CATMAT_MAX_CANDIDATES', 20);
    const minConfidence = this.configService.get<number>('CATMAT_MIN_CONFIDENCE', 0.75);
    const candidates = await this.catmatRepository.findCandidates(tokenizedDescription.tokens, maxCandidates);
    const rankedCandidates = this.catmatCandidateRankingService.rankCandidates(candidates, tokenizedDescription);

    if (rankedCandidates.length === 0) {
      return {
        rankedCandidates,
        llmResponse: null,
        status: ClassificationStatus.NoCandidates,
        error: '',
      };
    }

    const automaticSelection = this.tryAutomaticSelection(rankedCandidates, minConfidence);

    if (automaticSelection) {
      return automaticSelection;
    }

    try {
      const llmResponse = await this.catmatLlmService.classify({
        ...tokenizedDescription,
        candidatos: rankedCandidates.map((candidate) => ({
          codigoItem: candidate.codigoItem,
          nomeGrupo: candidate.nomeGrupo,
          nomeClasse: candidate.nomeClasse,
          descricaoItem: candidate.descricaoItem,
        })),
      });
      const decision = this.classificationDecisionService.resolveDecision(llmResponse, rankedCandidates, minConfidence);

      return {
        rankedCandidates,
        llmResponse,
        status: decision.status,
        error: decision.error,
      };
    } catch (error) {
      return {
        rankedCandidates,
        llmResponse: null,
        status: ClassificationStatus.LlmError,
        error: error instanceof Error ? error.message : 'LLM classification failed.',
      };
    }
  }

  private tryAutomaticSelection(
    rankedCandidates: RankedCatmatCandidate[],
    minConfidence: number,
  ): CachedClassification | null {
    const autoSelectEnabled = this.configService.get<boolean>('CATMAT_AUTO_SELECT_HIGH_CONFIDENCE', false);

    if (!autoSelectEnabled || rankedCandidates.length !== 1 || rankedCandidates[0].localScore < HIGH_LOCAL_SCORE_THRESHOLD) {
      return null;
    }

    const selectedCandidate = rankedCandidates[0];
    const confidenceScore = Math.max(minConfidence, selectedCandidate.localScore);

    return {
      rankedCandidates,
      status: ClassificationStatus.Processed,
      error: '',
      llmResponse: {
        codigoItemSelecionado: selectedCandidate.codigoItem,
        descricaoItemSelecionado: selectedCandidate.descricaoItem,
        scoreConfianca: confidenceScore,
        justificativa: 'Automatically selected by high local confidence.',
        houveCorrespondencia: true,
      },
    };
  }

  private createOutputRow(row: SpreadsheetRow, selectedCandidate: RankedCatmatCandidate): OutputSpreadsheetRow {
    return {
      d:"D",
      catmat: selectedCandidate.codigoItem,
      nameClasse: selectedCandidate.nomeClasse,
      account: this.configService.get<string>('CATMAT_OUTPUT_CONTA', '123110103'),
      expenseNatureAndSubitem: row.ED ?? '',
      campus: row['CAMPUS DA CARGA'] ?? '',
      date: this.normalizeOutputDate(row['DATA DA ENTRADA'] ?? ''),
      uorg:'SiadsId042774',
      type:1,
      situation:1,
      plaqueta:1,
      acquisition:"COMPRA",
      specification:selectedCandidate.descricaoItem,
      price:row['VALOR'],
      oldTomb:row['NUMERO'],
    };
  }

  private normalizeOutputDate(date: string): string {
    const trimmedDate = date.trim();
    const match = /^(\d{2})\/(\d{2})\/(\d{2}|\d{4})$/.exec(trimmedDate);

    if (!match) {
      return trimmedDate;
    }

    const [, day, month, year] = match;
    const normalizedYear = year.length === 2 ? `20${year}` : year;

    return `${day}${month}${normalizedYear}`;
  }

  private createAuditRow(
    row: SpreadsheetRow,
    lineNumber: number,
    tokenizedDescription: TokenizedDescription,
    classification: CachedClassification,
  ): AuditSpreadsheetRow {
    const selectedCandidate = classification.llmResponse?.codigoItemSelecionado
      ? classification.rankedCandidates.find(
          (candidate) => candidate.codigoItem === classification.llmResponse?.codigoItemSelecionado,
        ) ?? null
      : null;

    return {
      line: lineNumber,
      number: row.NUMERO ?? '',
      originalDescription: tokenizedDescription.descricaoOriginal,
      normalizedDescription: tokenizedDescription.descricaoNormalizada,
      tokens: JSON.stringify(tokenizedDescription.tokens),
      totalCandidates: classification.rankedCandidates.length,
      candidates: JSON.stringify(
        classification.rankedCandidates.slice(0, 10).map((candidate) => ({
          codigoItem: candidate.codigoItem,
          nomeGrupo: candidate.nomeGrupo,
          nomeClasse: candidate.nomeClasse,
          descricaoItem: candidate.descricaoItem,
          localScore: candidate.localScore,
        })),
      ),
      selectedCatmat: selectedCandidate?.codigoItem ?? null,
      selectedCatmatDescription: selectedCandidate?.descricaoItem ?? null,
      confidenceScore: classification.llmResponse?.scoreConfianca ?? null,
      llmJustification: classification.llmResponse?.justificativa ?? '',
      processingStatus: classification.status,
      error: classification.error,
    };
  }

  private createValidationError(row: SpreadsheetRow, lineNumber: number, error: string): RowProcessingResult {
    return {
      outputRow: null,
      auditRow: {
        line: lineNumber,
        number: row.NUMERO ?? '',
        originalDescription: row.DESCRICAO ?? '',
        normalizedDescription: '',
        tokens: '[]',
        totalCandidates: 0,
        candidates: '[]',
        selectedCatmat: null,
        selectedCatmatDescription: null,
        confidenceScore: null,
        llmJustification: '',
        processingStatus: ClassificationStatus.ValidationError,
        error,
      },
    };
  }

  private createProcessingError(row: SpreadsheetRow, lineNumber: number, error: unknown): RowProcessingResult {
    return {
      outputRow: null,
      auditRow: {
        line: lineNumber,
        number: row.NUMERO ?? '',
        originalDescription: row.DESCRICAO ?? '',
        normalizedDescription: '',
        tokens: '[]',
        totalCandidates: 0,
        candidates: '[]',
        selectedCatmat: null,
        selectedCatmatDescription: null,
        confidenceScore: null,
        llmJustification: '',
        processingStatus: ClassificationStatus.ProcessingError,
        error: error instanceof Error ? error.message : 'Unexpected row processing error.',
      },
    };
  }

  private buildResult(
    totalRows: number,
    outputRows: OutputSpreadsheetRow[],
    auditRows: AuditSpreadsheetRow[],
    outputFilePath: string,
    auditFilePath: string,
  ): CatmatClassificationResult {
    const noCandidates = auditRows.filter((row) => row.processingStatus === ClassificationStatus.NoCandidates).length;
    const noMatch = auditRows.filter((row) => row.processingStatus === ClassificationStatus.NoMatch).length;
    const lowConfidence = auditRows.filter((row) => row.processingStatus === ClassificationStatus.LowConfidence).length;
    const errors = auditRows.filter((row) =>
      [
        ClassificationStatus.ValidationError,
        ClassificationStatus.LlmError,
        ClassificationStatus.ProcessingError,
      ].includes(row.processingStatus as ClassificationStatus),
    ).length;

    return {
      totalRows,
      processed: outputRows.length,
      noCandidates,
      noMatch,
      lowConfidence,
      errors,
      outputFile: basename(outputFilePath),
      auditFile: basename(auditFilePath),
      outputRows,
      auditRows,
    };
  }

  private async mapWithConcurrency<T, R>(
    items: T[],
    concurrency: number,
    mapper: (item: T, index: number) => Promise<R>,
  ): Promise<R[]> {
    const results = new Array<R>(items.length);
    let nextIndex = 0;

    const workerCount = Math.max(1, Math.min(concurrency, items.length));
    const workers = Array.from({ length: workerCount }, async () => {
      while (nextIndex < items.length) {
        const currentIndex = nextIndex;
        nextIndex += 1;
        results[currentIndex] = await mapper(items[currentIndex], currentIndex);
      }
    });

    await Promise.all(workers);
    return results;
  }
}
