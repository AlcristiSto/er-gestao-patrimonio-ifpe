# AGENTS.md

## Project Guidance for Codex

This file defines how AI coding agents should work in this repository.

Follow these instructions for every code change unless a more specific instruction is provided in the task.

---

## 1. Main Rule

All source code must be written in English.

This includes:

* file names;
* folder names;
* class names;
* function names;
* method names;
* variable names;
* DTO names;
* enum names;
* interface names;
* type names;
* constants;
* comments inside source code;
* log messages;
* error messages returned by the API.

Documentation may be written in Portuguese when appropriate, especially README files, task notes, business rules, and product documentation.

---

## 2. Technology Stack

Prefer the existing stack and patterns already used in the project.

If this is a NestJS project, follow NestJS best practices.

Do not introduce unnecessary frameworks, architectural layers, or dependencies.

Before making changes:

1. Inspect the current project structure.
2. Identify the module organization.
3. Identify the configuration pattern.
4. Identify the database access pattern.
5. Identify the testing pattern.
6. Reuse existing conventions whenever possible.

---

## 3. NestJS Development Standards

Use idiomatic NestJS.

Prefer:

* modules for feature boundaries;
* controllers only for HTTP concerns;
* services for application/business logic;
* providers for reusable infrastructure logic;
* repositories or data-access services for persistence;
* DTOs for input/output contracts;
* pipes and validators for validation;
* interceptors only when there is a cross-cutting concern;
* guards only for authentication/authorization;
* filters only for centralized exception handling.

Avoid putting business rules inside controllers.

Controllers should be thin.

---

## 4. Suggested Feature Structure

When creating a new feature module and there is no existing project convention, use:

```text
src/modules/<feature-name>/
  controllers/
  dto/
  enums/
  interfaces/
  services/
  repositories/
  validators/
  mappers/
  tests/
  <feature-name>.module.ts
```

Use singular or plural folder names according to the existing project convention.

Do not create folders that are not needed.

---

## 5. Naming Conventions

Use English names and clear domain intent.

Examples:

```ts
CatmatClassificationService
CatmatRepository
SpreadsheetReaderService
InputSpreadsheetValidator
DescriptionTokenizerService
CatmatCandidate
ClassificationAuditStatus
```

Avoid vague names such as:

```ts
Helper
Util
Manager
Processor
Handler
DataService
```

Unless the project already uses this convention.

Prefer explicit names:

```ts
SpreadsheetExportService
CatmatCandidateRankingService
LlmClassificationService
```

---

## 6. DTO and Validation Rules

Use DTOs for request and response contracts.

Use `class-validator`, `class-transformer`, `zod`, or the validation library already adopted by the project.

Do not trust external input.

Validate:

* request body;
* query params;
* route params;
* uploaded files;
* parsed spreadsheet rows;
* environment variables;
* LLM responses;
* database records when necessary.

If a DTO represents an API response, name it clearly:

```ts
ImportCatmatClassificationResponseDto
```

If a DTO represents an input, name it clearly:

```ts
ImportCatmatClassificationRequestDto
```

---

## 7. Error Handling

Use NestJS exceptions when dealing with HTTP APIs.

Prefer:

```ts
BadRequestException
NotFoundException
ConflictException
UnprocessableEntityException
InternalServerErrorException
BadGatewayException
```

Do not throw raw strings.

Do not leak internal stack traces, secrets, tokens, database connection strings, or provider responses to the API response.

Errors should be clear, safe, and actionable.

---

## 8. Configuration

Use the existing configuration system.

If the project uses `@nestjs/config`, follow that.

Add new environment variables to `.env.example`.

Validate required environment variables at startup when possible.

Do not hardcode values that should be configurable.

For constants that are part of business rules, prefer named constants.

Example:

```ts
export const DEFAULT_CATMAT_MIN_CONFIDENCE = 0.75
```

---

## 9. Database Access

Follow the existing database pattern.

If the project uses TypeORM, use repositories/entities according to the existing convention.

If the project uses MongoDB or Mongoose, keep database access isolated in repositories or dedicated data-access services.

Do not access the database directly from controllers.

Do not spread query logic across unrelated services.

Keep MongoDB collection names configurable when they are integration-specific.

---

## 10. External Services and LLMs

External integrations must be isolated behind services or gateways.

For LLM usage:

* create a dedicated service;
* validate the LLM response;
* never trust free-form output;
* prefer JSON-only responses;
* reject invalid structures;
* reject invented IDs;
* log enough context for audit, but do not log sensitive data;
* add timeout and retry only when appropriate;
* keep prompts centralized and versionable.

The LLM must not be allowed to create domain data that does not exist in the system.

When selecting from candidates, always verify that the selected item exists in the candidate list.

---

## 11. File Upload and Spreadsheet Processing

When implementing CSV or Excel imports:

* validate file type;
* validate required columns;
* keep row-level errors isolated;
* do not stop the entire batch because of one invalid row unless the file structure is invalid;
* preserve original row order;
* generate audit information;
* normalize text consistently;
* keep parsing, validation, processing, and exporting separated.

Recommended service separation:

```text
SpreadsheetReaderService
InputSpreadsheetValidator
DescriptionTokenizerService
CatmatCandidateSearchService
CatmatCandidateRankingService
LlmClassificationService
SpreadsheetExportService
AuditReportService
```

Only create these services if they are actually needed.

---

## 12. Logging

Use the logger already adopted by the project.

If there is no logger standard, use NestJS `Logger`.

Log important events:

* import started;
* import finished;
* number of rows processed;
* number of row errors;
* number of LLM failures;
* number of low-confidence classifications;
* export file generated.

Avoid noisy logs.

Never log secrets, tokens, credentials, full request headers, or private data unnecessarily.

---

## 13. Testing

Add or update tests whenever business logic is created or changed.

Prefer unit tests for:

* validators;
* tokenizers;
* mappers;
* ranking logic;
* config parsing;
* LLM response validation;
* output generation rules.

Prefer integration tests for:

* module wiring;
* database repositories;
* import flow;
* API endpoint behavior.

Use the existing test runner and test style.

Do not add a new testing framework unless strictly necessary.

---

## 14. Code Style

Follow the formatter and linter already configured in the repository.

Do not manually reformat unrelated files.

Prefer simple, readable code.

Avoid premature abstractions.

Avoid large functions.

Avoid hidden side effects.

Prefer early returns when they improve readability.

Prefer explicit types for public methods, service methods, DTOs, interfaces, and exported functions.

---

## 15. Dependency Rules

Before adding a dependency:

1. Check if the project already has an equivalent dependency.
2. Prefer built-in Node.js/NestJS capabilities when reasonable.
3. Avoid large dependencies for small tasks.
4. Add dependencies only when they reduce complexity meaningfully.

When adding a dependency, update the appropriate package file and lock file.

---

## 16. API Design

For REST APIs:

* use resource-oriented routes;
* use clear HTTP methods;
* keep request and response contracts explicit;
* return consistent response shapes;
* avoid exposing internal database models directly;
* use pagination for list endpoints when needed;
* use proper HTTP status codes.

Example:

```http
POST /catmat-classifications/import
```

Avoid routes with verbs when a resource-based name is clearer.

---

## 17. Security

Never commit secrets.

Never expose credentials.

Never log tokens.

Validate uploaded files.

Limit file sizes when dealing with uploads.

Validate external URLs before using them.

Sanitize user-controlled input before using it in queries.

Use parameterized queries or ORM query builders where applicable.

For MongoDB, avoid directly passing untrusted objects into queries.

---

## 18. Performance

For batch processing:

* process rows in controlled concurrency;
* avoid unbounded `Promise.all`;
* cache repeated expensive operations;
* avoid unnecessary LLM calls;
* limit candidates sent to the LLM;
* avoid loading huge files into memory when the project requires large-scale processing;
* keep export generation efficient.

Use concurrency limits for external calls.

---

## 19. Documentation

Update documentation when adding:

* new environment variables;
* new endpoints;
* new commands;
* new modules;
* new database indexes;
* new external integrations;
* new file formats;
* new business rules.

README updates may be written in Portuguese.

Source code comments must be in English.

---

## 20. Git and Change Scope

Keep changes focused on the requested task.

Do not refactor unrelated code.

Do not rename unrelated files.

Do not change public contracts unless required.

Do not introduce breaking changes without explicitly documenting them.

Prefer small, cohesive commits when commits are requested.

---

## 21. Before Finishing

Before finalizing a task, verify:

1. The code compiles.
2. Tests were added or updated when needed.
3. Existing tests pass when possible.
4. Lint/format rules are respected.
5. `.env.example` is updated if new env vars were added.
6. README or documentation is updated if behavior changed.
7. No secrets were introduced.
8. No unrelated files were changed.
9. Public APIs are documented.
10. Error cases are handled.

If tests, build, or lint cannot be run, explain why.

---

## 22. Response Expected from Codex

When finishing a task, provide:

1. Summary of what was implemented.
2. Files created or changed.
3. Tests added or updated.
4. Commands executed.
5. Any assumptions made.
6. Any pending manual steps.

Keep the response objective and technical.

---

## 23. Project-Specific Preference

The business domain, documentation, and product requirements may be written in Portuguese.

The implementation must remain in English.

Examples:

Good:

```ts
export class CatmatClassificationService {}
```

Bad:

```ts
export class ServicoClassificacaoCatmat {}
```

Good:

```ts
const normalizedDescription = this.descriptionTokenizer.normalize(description)
```

Bad:

```ts
const descricaoNormalizada = this.tokenizadorDescricao.normalizar(descricao)
```

Good:

```ts
throw new BadRequestException('Invalid spreadsheet format')
```

Bad:

```ts
throw new BadRequestException('Formato de planilha inválido')
```
