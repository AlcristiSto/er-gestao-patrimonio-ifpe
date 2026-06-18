import { Injectable } from '@nestjs/common';
import { CatmatCandidate, RankedCatmatCandidate } from '../interfaces/catmat-candidate.interface';
import { TokenizedDescription } from '../interfaces/tokenized-description.interface';
import { DescriptionTokenizerService } from '../tokenizer/description-tokenizer.service';

@Injectable()
export class CatmatCandidateRankingService {
  constructor(private readonly descriptionTokenizerService: DescriptionTokenizerService) {}

  rankCandidates(candidates: CatmatCandidate[], tokenizedDescription: TokenizedDescription): RankedCatmatCandidate[] {
    return candidates
      .map((candidate) => ({
        ...candidate,
        localScore: this.scoreCandidate(candidate, tokenizedDescription),
      }))
      .sort((left, right) => right.localScore - left.localScore);
  }

  private scoreCandidate(candidate: CatmatCandidate, tokenizedDescription: TokenizedDescription): number {
    const candidateDescription = this.descriptionTokenizerService.normalizeDescription(candidate.descricaoItem);
    const group = this.descriptionTokenizerService.normalizeDescription(candidate.nomeGrupo);
    const classificationClass = this.descriptionTokenizerService.normalizeDescription(candidate.nomeClasse);

    const tokenScore = this.scoreTokenMatches(tokenizedDescription.tokens, candidateDescription, group, classificationClass);
    const similarityScore = this.calculateJaccardSimilarity(tokenizedDescription.descricaoNormalizada, candidateDescription);
    const prefixScore = this.calculatePrefixScore(tokenizedDescription.tokens, candidateDescription);
    const combinedScore = tokenScore * 0.55 + similarityScore * 0.3 + prefixScore * 0.15;

    return Number(Math.min(1, combinedScore).toFixed(4));
  }

  private scoreTokenMatches(tokens: string[], description: string, group: string, classificationClass: string): number {
    if (tokens.length === 0) {
      return 0;
    }

    const maxScore = tokens.length * 6.5;
    const score = tokens.reduce((total, token) => {
      let tokenScore = 0;

      if (description.includes(token)) {
        tokenScore += 3;
      }

      if (group.includes(token)) {
        tokenScore += 1.5;
      }

      if (classificationClass.includes(token)) {
        tokenScore += 2;
      }

      return total + tokenScore;
    }, 0);

    return Math.min(1, score / maxScore);
  }

  private calculatePrefixScore(tokens: string[], description: string): number {
    if (tokens.length === 0) {
      return 0;
    }

    const leadingDescription = description.split(/\s+/).slice(0, 8).join(' ');
    const matches = tokens.filter((token) => leadingDescription.includes(token)).length;

    return matches / tokens.length;
  }

  private calculateJaccardSimilarity(left: string, right: string): number {
    const leftTokens = new Set(left.split(/\s+/).filter(Boolean));
    const rightTokens = new Set(right.split(/\s+/).filter(Boolean));

    if (leftTokens.size === 0 || rightTokens.size === 0) {
      return 0;
    }

    const intersectionSize = [...leftTokens].filter((token) => rightTokens.has(token)).length;
    const unionSize = new Set([...leftTokens, ...rightTokens]).size;

    return intersectionSize / unionSize;
  }
}
