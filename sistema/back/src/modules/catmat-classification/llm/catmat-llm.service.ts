import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { z } from 'zod';
import {
  LlmClassificationRequest,
  LlmClassificationResponse,
} from '../interfaces/llm-classification.interface';

const llmClassificationResponseSchema = z.object({
  codigoItemSelecionado: z.number().int().nullable(),
  descricaoItemSelecionado: z.string().nullable(),
  scoreConfianca: z.number().min(0).max(1),
  justificativa: z.string(),
  houveCorrespondencia: z.boolean(),
});

@Injectable()
export class CatmatLlmService {
  private readonly openai: OpenAI | null;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    this.openai = apiKey ? new OpenAI({ apiKey }) : null;
  }

  async classify(request: LlmClassificationRequest): Promise<LlmClassificationResponse> {
    if (!this.openai) {
      throw new InternalServerErrorException('OPENAI_API_KEY is required for LLM classification.');
    }

    const attempts = this.configService.get<number>('CATMAT_LLM_RETRY_ATTEMPTS', 2) + 1;
    let lastError: unknown;

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        return await this.classifyWithTimeout(request);
      } catch (error) {
        lastError = error;
        if (attempt === attempts) {
          break;
        }
      }
    }

    throw lastError instanceof Error ? lastError : new Error('LLM classification failed.');
  }

  validateResponse(response: unknown): LlmClassificationResponse {
    return llmClassificationResponseSchema.parse(response);
  }

  private async classifyWithTimeout(request: LlmClassificationRequest): Promise<LlmClassificationResponse> {
    const controller = new AbortController();
    const timeoutMs = this.configService.get<number>('CATMAT_LLM_TIMEOUT_MS', 30000);
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const completion = await this.openai!.chat.completions.create(
        {
          model: this.configService.get<string>('CATMAT_LLM_MODEL', 'gpt-4.1-mini'),
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'user',
              content: this.buildPrompt(request),
            },
          ],
        },
        {
          signal: controller.signal,
        },
      );

      const content = completion.choices[0]?.message?.content;

      if (!content) {
        throw new Error('The LLM returned an empty response.');
      }

      return this.validateResponse(JSON.parse(content));
    } finally {
      clearTimeout(timeout);
    }
  }

  private buildPrompt(request: LlmClassificationRequest): string {
    return `Você é um especialista em classificação de bens patrimoniais e associação com itens CATMAT.

Sua tarefa é analisar a descrição original de um bem patrimonial e escolher, entre os candidatos fornecidos, qual item CATMAT possui maior relação semântica com o bem descrito.

Regras obrigatórias:
- Você não pode inventar código CATMAT.
- Você só pode escolher um dos candidatos fornecidos.
- Se nenhum candidato for adequado, retorne houveCorrespondencia como false.
- Responda exclusivamente em JSON válido.
- Não inclua comentários fora do JSON.
- O scoreConfianca deve ser um número entre 0 e 1.

Descrição original:
${request.descricaoOriginal}

Descrição normalizada:
${request.descricaoNormalizada}

Tokens extraídos:
${JSON.stringify(request.tokens)}

Candidatos CATMAT:
${JSON.stringify(request.candidatos)}

Formato obrigatório da resposta:

{
  "codigoItemSelecionado": number | null,
  "descricaoItemSelecionado": string | null,
  "scoreConfianca": number,
  "justificativa": string,
  "houveCorrespondencia": boolean
}`;
  }
}
