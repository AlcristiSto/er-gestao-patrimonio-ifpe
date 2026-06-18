import { Injectable } from '@nestjs/common';
import { ClassificationStatus } from '../enums/classification-status.enum';
import { CatmatCandidate } from '../interfaces/catmat-candidate.interface';
import { LlmClassificationResponse } from '../interfaces/llm-classification.interface';

export interface ClassificationDecision {
  status: ClassificationStatus;
  selectedCandidate: CatmatCandidate | null;
  error: string;
}

@Injectable()
export class ClassificationDecisionService {
  resolveDecision(
    llmResponse: LlmClassificationResponse,
    candidates: CatmatCandidate[],
    minConfidence: number,
  ): ClassificationDecision {
    if (!llmResponse.houveCorrespondencia) {
      return {
        status: ClassificationStatus.NoMatch,
        selectedCandidate: null,
        error: '',
      };
    }

    if (llmResponse.codigoItemSelecionado === null) {
      return {
        status: ClassificationStatus.LlmError,
        selectedCandidate: null,
        error: 'The LLM response did not include a selected CATMAT code.',
      };
    }

    const selectedCandidate = candidates.find((candidate) => candidate.codigoItem === llmResponse.codigoItemSelecionado) ?? null;

    if (!selectedCandidate) {
      return {
        status: ClassificationStatus.LlmError,
        selectedCandidate: null,
        error: 'The LLM selected a CATMAT code outside the candidate list.',
      };
    }

    if (llmResponse.scoreConfianca < minConfidence) {
      return {
        status: ClassificationStatus.LowConfidence,
        selectedCandidate,
        error: '',
      };
    }

    return {
      status: ClassificationStatus.Processed,
      selectedCandidate,
      error: '',
    };
  }
}
