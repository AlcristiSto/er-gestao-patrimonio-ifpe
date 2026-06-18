import { CatmatCandidate } from './catmat-candidate.interface';

export interface LlmClassificationRequest {
  descricaoOriginal: string;
  descricaoNormalizada: string;
  tokens: string[];
  candidatos: CatmatCandidate[];
}

export interface LlmClassificationResponse {
  codigoItemSelecionado: number | null;
  descricaoItemSelecionado: string | null;
  scoreConfianca: number;
  justificativa: string;
  houveCorrespondencia: boolean;
}
