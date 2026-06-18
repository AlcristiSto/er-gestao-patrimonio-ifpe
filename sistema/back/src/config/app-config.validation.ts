import { z } from 'zod';

const booleanStringSchema = z
  .string()
  .optional()
  .default('false')
  .transform((value) => value === 'true');

const numberStringSchema = (defaultValue: number) =>
  z
    .string()
    .optional()
    .default(String(defaultValue))
    .transform((value, context) => {
      const parsed = Number(value);
      if (Number.isNaN(parsed)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Invalid numeric environment variable',
        });
        return z.NEVER;
      }

      return parsed;
    });

const envSchema = z.object({
  MONGO_URI: z.string().default('mongodb://localhost:27017'),
  MONGO_PORT: numberStringSchema(27017),
  MONGO_DATABASE: z.string().default('patrimonio'),
  MONGO_CATMAT_COLLECTION: z.string().default('catmat'),
  CATMAT_MAX_CANDIDATES: numberStringSchema(20),
  CATMAT_MIN_CONFIDENCE: numberStringSchema(0.75),
  CATMAT_AUTO_SELECT_HIGH_CONFIDENCE: booleanStringSchema,
  CATMAT_OUTPUT_UG: z.string().default('158000'),
  CATMAT_OUTPUT_CONTA: z.string().default('111111111'),
  CATMAT_OUTPUT_CHAMADO: z.string().default('4444444444'),
  CATMAT_EXPORT_DIR: z.string().default('./exports'),
  CATMAT_MAX_UPLOAD_BYTES: numberStringSchema(26214400),
  OPENAI_API_KEY: z.string().optional(),
  CATMAT_LLM_MODEL: z.string().default('gpt-4.1-mini'),
  CATMAT_LLM_CONCURRENCY: numberStringSchema(3),
  CATMAT_LLM_TIMEOUT_MS: numberStringSchema(30000),
  CATMAT_LLM_RETRY_ATTEMPTS: numberStringSchema(2),
});

export type AppEnvironment = z.infer<typeof envSchema>;

export function appConfigValidation(config: Record<string, unknown>): AppEnvironment {
  const parsed = envSchema.safeParse(config);

  if (!parsed.success) {
    throw new Error(`Invalid environment configuration: ${parsed.error.message}`);
  }

  return parsed.data;
}
