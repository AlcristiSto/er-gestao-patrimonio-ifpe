import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Collection, Db, Filter } from 'mongodb';
import { MONGO_DATABASE } from '../../../database/database.constants';
import { CatmatCandidate } from '../interfaces/catmat-candidate.interface';
import { CatmatDocument } from '../interfaces/catmat-document.interface';

@Injectable()
export class CatmatRepository {
  private readonly logger = new Logger(CatmatRepository.name);
  private readonly collection: Collection<CatmatDocument>;

  constructor(
    @Inject(MONGO_DATABASE) database: Db,
    private readonly configService: ConfigService,
  ) {
    this.collection = database.collection<CatmatDocument>(
      this.configService.getOrThrow<string>('MONGO_CATMAT_COLLECTION'),
    );
  }

  async findCandidates(tokens: string[], limit: number): Promise<CatmatCandidate[]> {
    if (tokens.length === 0) {
      return [];
    }

    const textCandidates = await this.tryFindByTextSearch(tokens, limit);

    if (textCandidates.length >= limit) {
      return textCandidates.slice(0, limit);
    }

    const fallbackCandidates = await this.findByRegex(tokens, limit);
    return this.deduplicateCandidates([...textCandidates, ...fallbackCandidates]).slice(0, limit);
  }

  private async tryFindByTextSearch(tokens: string[], limit: number): Promise<CatmatCandidate[]> {
    try {
      return await this.findByTextSearch(tokens, limit);
    } catch (error) {
      if (!this.isTextSearchUnavailableError(error)) {
        throw error;
      }

      this.logger.warn('MongoDB text search is unavailable. Falling back to regex candidate search.');
      return [];
    }
  }

  private async findByTextSearch(tokens: string[], limit: number): Promise<CatmatCandidate[]> {
    const docs = await this.collection
      .find(
        {
          statusItem: true,
          $text: {
            $search: tokens.join(' '),
          },
        },
        {
          projection: {
            _id: 0,
            codigoItem: 1,
            nomeGrupo: 1,
            nomeClasse: 1,
            descricaoItem: 1,
            score: { $meta: 'textScore' },
          },
        },
      )
      .sort({ score: { $meta: 'textScore' } })
      .limit(limit)
      .toArray();

    return docs.map((doc) => this.toCandidate(doc));
  }

  private async findByRegex(tokens: string[], limit: number): Promise<CatmatCandidate[]> {
    const strongestTokens = tokens.slice(0, 6);
    const query: Filter<CatmatDocument> = {
      statusItem: true,
      $or: strongestTokens.flatMap((token) => {
        const regex = new RegExp(this.escapeRegex(token), 'i');
        return [{ nomeGrupo: regex }, { nomeClasse: regex }, { descricaoItem: regex }];
      }),
    };

    const docs = await this.collection
      .find(query, {
        projection: {
          _id: 0,
          codigoItem: 1,
          nomeGrupo: 1,
          nomeClasse: 1,
          descricaoItem: 1,
        },
      })
      .limit(limit)
      .toArray();

    return docs.map((doc) => this.toCandidate(doc));
  }

  private deduplicateCandidates(candidates: CatmatCandidate[]): CatmatCandidate[] {
    const uniqueCandidates = new Map<number, CatmatCandidate>();

    for (const candidate of candidates) {
      uniqueCandidates.set(candidate.codigoItem, candidate);
    }

    return [...uniqueCandidates.values()];
  }

  private toCandidate(document: Pick<CatmatDocument, 'codigoItem' | 'nomeGrupo' | 'nomeClasse' | 'descricaoItem'>): CatmatCandidate {
    return {
      codigoItem: document.codigoItem,
      nomeGrupo: document.nomeGrupo,
      nomeClasse: document.nomeClasse,
      descricaoItem: document.descricaoItem,
    };
  }

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private isTextSearchUnavailableError(error: unknown): boolean {
    if (!(error instanceof Error)) {
      return false;
    }

    return (
      error.message.includes('text index required') ||
      error.message.includes('IndexNotFound') ||
      error.message.includes('no such collection')
    );
  }
}
