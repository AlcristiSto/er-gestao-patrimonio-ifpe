import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { createReadStream } from 'node:fs';
import { ImportCatmatClassificationResponseDto } from '../dto/import-catmat-classification-response.dto';
import { SpreadsheetExportService } from '../exporters/spreadsheet-export.service';
import { CatmatClassificationService } from '../services/catmat-classification.service';

@Controller('catmat-classificacao')
export class CatmatClassificationController {
  constructor(
    private readonly catmatClassificationService: CatmatClassificationService,
    private readonly spreadsheetExportService: SpreadsheetExportService,
  ) {}

  @Post('importar')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: Number(process.env.CATMAT_MAX_UPLOAD_BYTES ?? 26214400),
      },
    }),
  )
  async importSpreadsheet(@UploadedFile() file?: Express.Multer.File): Promise<ImportCatmatClassificationResponseDto> {
    if (!file) {
      throw new BadRequestException('File is required.');
    }

    const result = await this.catmatClassificationService.importSpreadsheet(file);

    return {
      message: 'Processing finished',
      totalLinhas: result.totalRows,
      processadas: result.processed,
      semCandidatos: result.noCandidates,
      semCorrespondencia: result.noMatch,
      baixaConfianca: result.lowConfidence,
      erros: result.errors,
      arquivoSaida: result.outputFile,
      arquivoAuditoria: result.auditFile,
      linkDownloadSaida: this.buildDownloadLink(result.outputFile),
      linkDownloadAuditoria: this.buildDownloadLink(result.auditFile),
    };
  }

  @Get('download/:fileName')
  async downloadFile(@Param('fileName') fileName: string, @Res({ passthrough: true }) response: Response): Promise<StreamableFile> {
    const downloadFile = await this.spreadsheetExportService.getDownloadFile(fileName);

    response.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${downloadFile.downloadFileName}"`,
    });

    return new StreamableFile(createReadStream(downloadFile.filePath));
  }

  private buildDownloadLink(fileName: string): string {
    return `/catmat-classificacao/download/${encodeURIComponent(fileName)}`;
  }
}
