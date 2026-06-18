import { BadRequestException, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as ExcelJS from 'exceljs';
import { AddressInfo } from 'node:net';
import { basename, join } from 'node:path';
import { CatmatClassificationController } from '../src/modules/catmat-classification/controllers/catmat-classification.controller';
import { ClassificationStatus } from '../src/modules/catmat-classification/enums/classification-status.enum';
import { SpreadsheetExportService } from '../src/modules/catmat-classification/exporters/spreadsheet-export.service';
import { CatmatCandidate } from '../src/modules/catmat-classification/interfaces/catmat-candidate.interface';
import { CatmatRepository } from '../src/modules/catmat-classification/repositories/catmat.repository';
import { CatmatCandidateRankingService } from '../src/modules/catmat-classification/services/catmat-candidate-ranking.service';
import { CatmatClassificationService } from '../src/modules/catmat-classification/services/catmat-classification.service';
import { ClassificationDecisionService } from '../src/modules/catmat-classification/services/classification-decision.service';
import { DescriptionTokenizerService } from '../src/modules/catmat-classification/tokenizer/description-tokenizer.service';
import { InputSpreadsheetValidator } from '../src/modules/catmat-classification/validators/input-spreadsheet.validator';
import { REQUIRED_INPUT_COLUMNS } from '../src/modules/catmat-classification/validators/required-columns';

class FakeConfigService {
  constructor(private readonly values: Record<string, unknown> = {}) {}

  get<T>(key: string, defaultValue?: T): T {
    return (this.values[key] ?? defaultValue) as T;
  }

  getOrThrow<T>(key: string): T {
    const value = this.values[key];

    if (value === undefined) {
      throw new Error(`Missing ${key}`);
    }

    return value as T;
  }
}

function createCursor(docs: unknown[]) {
  return {
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    toArray: jest.fn().mockResolvedValue(docs),
  };
}

async function createDownloadTestApp(exporter: SpreadsheetExportService): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    controllers: [CatmatClassificationController],
    providers: [
      {
        provide: CatmatClassificationService,
        useValue: {},
      },
      {
        provide: SpreadsheetExportService,
        useValue: exporter,
      },
    ],
  }).compile();
  const app = moduleRef.createNestApplication();
  await app.listen(0);
  return app;
}

async function fetchFromApp(app: INestApplication, path: string): Promise<Response> {
  const address = app.getHttpServer().address() as AddressInfo | string | null;

  if (!address || typeof address === 'string') {
    throw new Error('Invalid test server address.');
  }

  return fetch(`http://127.0.0.1:${address.port}${path}`);
}

describe('CATMAT classification', () => {
  it('validates required spreadsheet columns', () => {
    const validator = new InputSpreadsheetValidator();

    expect(() => validator.validateHeaders([...REQUIRED_INPUT_COLUMNS])).not.toThrow();
  });

  it('throws when required spreadsheet columns are missing', () => {
    const validator = new InputSpreadsheetValidator();

    expect(() => validator.validateHeaders(['NUMERO', 'STATUS'])).toThrow(BadRequestException);
  });

  it('tokenizes ARMARIO DE ACO descriptions', () => {
    const tokenizer = new DescriptionTokenizerService();

    expect(tokenizer.tokenize('3315CREC - ARMARIO DE ACO (MARCA JS REF 014)')).toEqual({
      descricaoOriginal: '3315CREC - ARMARIO DE ACO (MARCA JS REF 014)',
      descricaoNormalizada: 'ARMARIO DE ACO JS 014',
      tokens: ['ARMARIO', 'ACO', 'JS'],
    });
  });

  it('tokenizes CAMERA DE VIDEO descriptions', () => {
    const tokenizer = new DescriptionTokenizerService();

    expect(tokenizer.tokenize('25996CREC - CAMERA DE VIDEO (PANASONIC S-VHS SERIE J7HB00132)')).toEqual({
      descricaoOriginal: '25996CREC - CAMERA DE VIDEO (PANASONIC S-VHS SERIE J7HB00132)',
      descricaoNormalizada: 'CAMERA DE VIDEO PANASONIC S-VHS J7HB00132',
      tokens: ['CAMERA', 'VIDEO', 'PANASONIC', 'S-VHS'],
    });
  });

  it('searches CATMAT candidates with active item filters', async () => {
    const docs = [
      {
        codigoItem: 123456,
        nomeGrupo: 'MOBILIARIO',
        nomeClasse: 'ARMARIOS',
        descricaoItem: 'ARMARIO ACO',
      },
    ];
    const textCursor = createCursor([]);
    const regexCursor = createCursor(docs);
    const collection = {
      find: jest.fn().mockReturnValueOnce(textCursor).mockReturnValueOnce(regexCursor),
    };
    const database = {
      collection: jest.fn().mockReturnValue(collection),
    };
    const repository = new CatmatRepository(
      database as never,
      new FakeConfigService({ MONGO_CATMAT_COLLECTION: 'catmat' }) as never,
    );

    const candidates = await repository.findCandidates(['ARMARIO', 'ACO'], 20);

    expect(candidates).toEqual(docs);
    expect(collection.find).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ statusItem: true, $text: { $search: 'ARMARIO ACO' } }),
      expect.any(Object),
    );
    expect(collection.find).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ statusItem: true, $or: expect.any(Array) }),
      expect.any(Object),
    );
  });

  it('falls back to regex search when MongoDB text search is unavailable', async () => {
    const docs = [
      {
        codigoItem: 123456,
        nomeGrupo: 'MOBILIARIO',
        nomeClasse: 'ARMARIOS',
        descricaoItem: 'ARMARIO ACO',
      },
    ];
    const regexCursor = createCursor(docs);
    const collection = {
      find: jest.fn().mockImplementationOnce(() => {
        throw new Error("text index required for $text query (no such collection 'patrimonio.catmat')");
      }).mockReturnValueOnce(regexCursor),
    };
    const database = {
      collection: jest.fn().mockReturnValue(collection),
    };
    const repository = new CatmatRepository(
      database as never,
      new FakeConfigService({ MONGO_CATMAT_COLLECTION: 'catmat' }) as never,
    );

    const candidates = await repository.findCandidates(['ARMARIO', 'ACO'], 20);

    expect(candidates).toEqual(docs);
  });

  it('rejects invented CATMAT codes from the LLM', () => {
    const decisionService = new ClassificationDecisionService();
    const candidates: CatmatCandidate[] = [
      {
        codigoItem: 10,
        nomeGrupo: 'GROUP',
        nomeClasse: 'CLASS',
        descricaoItem: 'ITEM',
      },
    ];

    const decision = decisionService.resolveDecision(
      {
        codigoItemSelecionado: 999,
        descricaoItemSelecionado: 'INVENTED',
        scoreConfianca: 0.95,
        justificativa: 'Invalid choice.',
        houveCorrespondencia: true,
      },
      candidates,
      0.75,
    );

    expect(decision.status).toBe(ClassificationStatus.LlmError);
  });

  it('applies the low confidence rule', () => {
    const decisionService = new ClassificationDecisionService();
    const candidates: CatmatCandidate[] = [
      {
        codigoItem: 10,
        nomeGrupo: 'GROUP',
        nomeClasse: 'CLASS',
        descricaoItem: 'ITEM',
      },
    ];

    const decision = decisionService.resolveDecision(
      {
        codigoItemSelecionado: 10,
        descricaoItemSelecionado: 'ITEM',
        scoreConfianca: 0.5,
        justificativa: 'Weak match.',
        houveCorrespondencia: true,
      },
      candidates,
      0.75,
    );

    expect(decision.status).toBe(ClassificationStatus.LowConfidence);
  });

  it('generates the output spreadsheet headers', async () => {
    const exportDir = join('/tmp', `catmat-output-${Date.now()}`);
    const exporter = new SpreadsheetExportService(new FakeConfigService({ CATMAT_EXPORT_DIR: exportDir }) as never);

    const filePath = await exporter.exportOutput([
      {
        d: 'D',
        catmat: 123456,
        nameClasse: 'ARMARIO',
        account: '123110103',
        uorg: 'SiadsId042774',
        expenseNatureAndSubitem: '449052-42',
        campus: 'REIFPE',
        date: '16062010',
        type: 1,
        situation: 1,
        plaqueta: 1,
        acquisition: 'COMPRA',
        specification: 'ARMARIO ACO',
        price: '0,01',
        oldTomb: '835',
      },
    ]);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const headers = (workbook.worksheets[0].getRow(1).values as string[]).slice(1);
    const widths = workbook.worksheets[0].columns.map((column) => column.width);

    expect(headers).toEqual([
      '"D"',
      'Código do material',
      'Descrição',
      'Código da conta',
      'Endereço',
      'UORG',
      'Tipo',
      'Situação',
      'Tipo de plaqueta',
      'Data Tombamento',
      'Valor do Bem',
      'Forma de aquisição',
      'Especificação',
      'Tombo Antigo',
    ]);
    expect(widths).toEqual([8, 18, 32, 18, 20, 18, 10, 12, 18, 18, 16, 22, 48, 16]);
  });

  it('generates unique timestamped output file names', async () => {
    const exportDir = join('/tmp', `catmat-output-unique-${Date.now()}`);
    const exporter = new SpreadsheetExportService(new FakeConfigService({ CATMAT_EXPORT_DIR: exportDir }) as never);

    const firstFilePath = await exporter.exportOutput([]);
    const secondFilePath = await exporter.exportOutput([]);

    expect(basename(firstFilePath)).toMatch(/^saida_\d{8}T\d{9}Z\.xlsx$/);
    expect(basename(secondFilePath)).toMatch(/^saida_\d{8}T\d{9}Z\.xlsx$/);
    expect(firstFilePath).not.toBe(secondFilePath);
  });

  it('generates the audit spreadsheet headers', async () => {
    const exportDir = join('/tmp', `catmat-audit-${Date.now()}`);
    const exporter = new SpreadsheetExportService(new FakeConfigService({ CATMAT_EXPORT_DIR: exportDir }) as never);

    const filePath = await exporter.exportAudit([
      {
        line: 2,
        number: '835',
        originalDescription: 'ARMARIO',
        normalizedDescription: 'ARMARIO',
        tokens: '["ARMARIO"]',
        totalCandidates: 1,
        candidates: '[]',
        selectedCatmat: 123456,
        selectedCatmatDescription: 'ARMARIO ACO',
        confidenceScore: 0.9,
        llmJustification: 'Match.',
        processingStatus: ClassificationStatus.Processed,
        error: '',
      },
    ]);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const headers = (workbook.worksheets[0].getRow(1).values as string[]).slice(1);
    const widths = workbook.worksheets[0].columns.map((column) => column.width);

    expect(headers).toEqual([
      'LINHA',
      'NUMERO',
      'DESCRICAO_ORIGINAL',
      'DESCRICAO_NORMALIZADA',
      'TOKENS',
      'TOTAL_CANDIDATOS',
      'CANDIDATOS',
      'CATMAT_SELECIONADO',
      'DESC_CATMAT_SELECIONADA',
      'SCORE_CONFIANCA',
      'JUSTIFICATIVA_LLM',
      'STATUS_PROCESSAMENTO',
      'ERRO',
    ]);
    expect(widths).toEqual([10, 14, 48, 48, 36, 18, 64, 20, 48, 18, 48, 24, 40]);
  });

  it('keeps processing the batch when one row fails validation', async () => {
    const candidate = {
      codigoItem: 123456,
      nomeGrupo: 'MOBILIARIO',
      nomeClasse: 'ARMARIO',
      descricaoItem: 'ARMARIO ACO',
    };
    const reader = {
      read: jest.fn().mockReturnValue({
        headers: [...REQUIRED_INPUT_COLUMNS],
        rows: [
          { NUMERO: '1', DESCRICAO: '', ED: '449052-42', 'CAMPUS DA CARGA': 'REIFPE', 'DATA DA ENTRADA': '16/06/2010' },
          {
            NUMERO: '2',
            DESCRICAO: '3315CREC - ARMARIO DE ACO',
            ED: '449052-42',
            'CAMPUS DA CARGA': 'REIFPE',
            'DATA DA ENTRADA': '16/06/10',
          },
          {
            NUMERO: '3',
            DESCRICAO: '25996CREC - CAMERA DE VIDEO',
            ED: '449052-33',
            'CAMPUS DA CARGA': 'REIFPE',
            'DATA DA ENTRADA': '16/06/2010',
          },
          {
            NUMERO: '4',
            DESCRICAO: 'CADEIRA DE ESCRITORIO',
            ED: '449052-42',
            'CAMPUS DA CARGA': 'REIFPE',
            'DATA DA ENTRADA': '07/08/2024',
          },
        ],
      }),
    };
    const repository = {
      findCandidates: jest.fn().mockResolvedValue([candidate]),
    };
    const llm = {
      classify: jest.fn().mockResolvedValueOnce({
        codigoItemSelecionado: 123456,
        descricaoItemSelecionado: 'ARMARIO ACO',
        scoreConfianca: 0.95,
        justificativa: 'Strong match.',
        houveCorrespondencia: true,
      }).mockResolvedValueOnce({
        codigoItemSelecionado: null,
        descricaoItemSelecionado: null,
        scoreConfianca: 0,
        justificativa: 'No compatible item.',
        houveCorrespondencia: false,
      }).mockResolvedValueOnce({
        codigoItemSelecionado: 123456,
        descricaoItemSelecionado: 'ARMARIO ACO',
        scoreConfianca: 0.9,
        justificativa: 'Compatible item.',
        houveCorrespondencia: true,
      }),
    };
    const exporter = {
      exportOutput: jest.fn().mockResolvedValue('/tmp/saida.xlsx'),
      exportAudit: jest.fn().mockResolvedValue('/tmp/auditoria.xlsx'),
      createExportTimestamp: jest.fn().mockReturnValue('20260618T143012345Z'),
    };
    const service = new CatmatClassificationService(
      reader as never,
      new DescriptionTokenizerService(),
      repository as never,
      new CatmatCandidateRankingService(new DescriptionTokenizerService()),
      llm as never,
      new ClassificationDecisionService(),
      exporter as never,
      new FakeConfigService({
        CATMAT_LLM_CONCURRENCY: 2,
        CATMAT_MAX_CANDIDATES: 20,
        CATMAT_MIN_CONFIDENCE: 0.75,
        CATMAT_OUTPUT_UG: '158000',
        CATMAT_OUTPUT_CONTA: '111111111',
        CATMAT_OUTPUT_CHAMADO: '4444444444',
      }) as never,
    );

    const result = await service.importSpreadsheet({ originalname: 'input.csv' } as Express.Multer.File);

    expect(result.totalRows).toBe(4);
    expect(result.processed).toBe(2);
    expect(result.errors).toBe(1);
    expect(result.noMatch).toBe(1);
    expect(result.auditRows.map((row) => row.processingStatus)).toEqual([
      ClassificationStatus.ValidationError,
      ClassificationStatus.Processed,
      ClassificationStatus.NoMatch,
      ClassificationStatus.Processed,
    ]);
    expect(exporter.exportOutput).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ date: '16062010' }),
        expect.objectContaining({ date: '07082024' }),
      ]),
      '20260618T143012345Z',
    );
    expect(exporter.exportAudit).toHaveBeenCalledWith(expect.any(Array), '20260618T143012345Z');
  });

  it('downloads an exported spreadsheet using the clean output file name', async () => {
    const exportDir = join('/tmp', `catmat-download-${Date.now()}`);
    const exporter = new SpreadsheetExportService(new FakeConfigService({ CATMAT_EXPORT_DIR: exportDir }) as never);
    const filePath = await exporter.exportOutput([]);
    const app = await createDownloadTestApp(exporter);

    const response = await fetchFromApp(app, `/catmat-classificacao/download/${basename(filePath)}`);

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    expect(response.headers.get('content-disposition')).toBe('attachment; filename="saida.xlsx"');

    await app.close();
  });

  it('returns not found when the export file does not exist', async () => {
    const exportDir = join('/tmp', `catmat-download-missing-${Date.now()}`);
    const exporter = new SpreadsheetExportService(new FakeConfigService({ CATMAT_EXPORT_DIR: exportDir }) as never);
    const app = await createDownloadTestApp(exporter);

    const response = await fetchFromApp(app, '/catmat-classificacao/download/saida_20260618T143012345Z.xlsx');

    expect(response.status).toBe(404);

    await app.close();
  });

  it('rejects invalid export file names before download', async () => {
    const exportDir = join('/tmp', `catmat-download-invalid-${Date.now()}`);
    const exporter = new SpreadsheetExportService(new FakeConfigService({ CATMAT_EXPORT_DIR: exportDir }) as never);
    const app = await createDownloadTestApp(exporter);

    const response = await fetchFromApp(app, '/catmat-classificacao/download/..%2Fsaida_20260618T143012345Z.xlsx');

    expect(response.status).toBe(400);

    await app.close();
  });
});
