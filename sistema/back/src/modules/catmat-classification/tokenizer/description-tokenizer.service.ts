import { Injectable } from '@nestjs/common';
import { TokenizedDescription } from '../interfaces/tokenized-description.interface';

const STOPWORDS = new Set([
  'DE',
  'DA',
  'DO',
  'DAS',
  'DOS',
  'COM',
  'C',
  'REF',
  'REFERENCIA',
  'MARCA',
  'MODELO',
  'SERIE',
  'N',
  'Nº',
  'NO',
]);

const NORMALIZED_DESCRIPTION_MARKERS = /\b(MARCA|REF|REFERENCIA|MODELO|SERIE|N|Nº|NO)\b/g;

@Injectable()
export class DescriptionTokenizerService {
  tokenize(description: string): TokenizedDescription {
    const descricaoOriginal = description;
    const descricaoNormalizada = this.normalizeDescription(description);
    const tokens = this.extractTokens(descricaoNormalizada);

    return {
      descricaoOriginal,
      descricaoNormalizada,
      tokens,
    };
  }

  normalizeDescription(description: string): string {
    return this.removeAccents(description)
      .toUpperCase()
      .replace(/^\s*\d+[A-Z]*\s*-\s*/, '')
      .replace(/[()[\]{}.,;:!?/\\"]/g, ' ')
      .replace(NORMALIZED_DESCRIPTION_MARKERS, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private extractTokens(normalizedDescription: string): string[] {
    const uniqueTokens = new Set<string>();

    for (const token of normalizedDescription.split(/\s+/)) {
      const normalizedToken = token.trim();

      if (!this.isRelevantToken(normalizedToken)) {
        continue;
      }

      uniqueTokens.add(normalizedToken);
    }

    return [...uniqueTokens];
  }

  private isRelevantToken(token: string): boolean {
    if (!token || STOPWORDS.has(token)) {
      return false;
    }

    if (/^\d+$/.test(token)) {
      return false;
    }

    if (/^(?=.*[A-Z])(?=.*\d)[A-Z0-9-]{6,}$/.test(token)) {
      return false;
    }

    return token.length > 1 || token.includes('-');
  }

  private removeAccents(value: string): string {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }
}
