import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { CatmatClassificationController } from './controllers/catmat-classification.controller';
import { SpreadsheetExportService } from './exporters/spreadsheet-export.service';
import { CatmatLlmService } from './llm/catmat-llm.service';
import { CatmatRepository } from './repositories/catmat.repository';
import { CatmatCandidateRankingService } from './services/catmat-candidate-ranking.service';
import { CatmatClassificationService } from './services/catmat-classification.service';
import { ClassificationDecisionService } from './services/classification-decision.service';
import { SpreadsheetReaderService } from './services/spreadsheet-reader.service';
import { DescriptionTokenizerService } from './tokenizer/description-tokenizer.service';
import { InputSpreadsheetValidator } from './validators/input-spreadsheet.validator';

@Module({
  imports: [DatabaseModule],
  controllers: [CatmatClassificationController],
  providers: [
    CatmatClassificationService,
    SpreadsheetReaderService,
    InputSpreadsheetValidator,
    DescriptionTokenizerService,
    CatmatRepository,
    CatmatCandidateRankingService,
    ClassificationDecisionService,
    CatmatLlmService,
    SpreadsheetExportService,
  ],
})
export class CatmatClassificationModule {}
