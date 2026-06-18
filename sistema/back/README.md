# Sistema de classificação CATMAT

API NestJS para importar uma planilha patrimonial em CSV, XLSX ou XLS, classificar cada item contra uma base CATMAT no MongoDB com busca textual e LLM, e gerar arquivos de saída e auditoria para download.

## Configuração

Copie `.env.example` para `.env` e ajuste os valores:

```env
MONGO_URI=mongodb://localhost:27017
MONGO_PORT=27017
MONGO_DATABASE=patrimonio
MONGO_CATMAT_COLLECTION=catmat

CATMAT_MAX_CANDIDATES=20
CATMAT_MIN_CONFIDENCE=0.75
CATMAT_AUTO_SELECT_HIGH_CONFIDENCE=false

CATMAT_OUTPUT_UG=158000
CATMAT_OUTPUT_CONTA=111111111
CATMAT_OUTPUT_CHAMADO=4444444444
CATMAT_EXPORT_DIR=./exports
CATMAT_MAX_UPLOAD_BYTES=26214400

OPENAI_API_KEY=
CATMAT_LLM_MODEL=gpt-4.1-mini
CATMAT_LLM_CONCURRENCY=3
CATMAT_LLM_TIMEOUT_MS=30000
CATMAT_LLM_RETRY_ATTEMPTS=2
```

`OPENAI_API_KEY` é necessário quando a seleção automática por alta confiança local não for suficiente e o fluxo precisar chamar a LLM.

## Índice textual no MongoDB

Com Docker Compose, o índice é criado automaticamente pelo script de inicialização quando o volume do MongoDB nasce.

Para criar manualmente, use:

Crie o índice textual na coleção configurada em `MONGO_CATMAT_COLLECTION`:

```js
db.catmat.createIndex({
  nomeGrupo: "text",
  nomeClasse: "text",
  descricaoItem: "text"
})
```

A busca considera apenas documentos com `statusItem: true`.

## MongoDB com Docker Compose

Coloque o arquivo de carga oficial em `data/catmat/carga.json`. O formato esperado é um objeto com o array `resultado`:

```json
{
  "totalRegistros": 342660,
  "resultado": [
    {
      "codigoItem": 206504,
      "nomeGrupo": "MOBILIÁRIOS",
      "nomeClasse": "MOBILIÁRIO PARA ESCRITÓRIO",
      "descricaoItem": "CADEIRA ESCRITÓRIO...",
      "statusItem": true
    }
  ]
}
```

O script também aceita um array JSON direto, um único documento JSON, ou documentos JSON separados por linha.

Suba o MongoDB:

```bash
docker compose up -d mongodb
```

Na primeira criação do volume `mongodb_data`, o container carrega os documentos de `data/catmat/carga.json` na coleção definida por `MONGO_CATMAT_COLLECTION` e cria o índice textual em `nomeGrupo`, `nomeClasse` e `descricaoItem`.

Para refazer a carga inicial do zero, remova o volume e suba o serviço novamente:

```bash
docker compose down -v
docker compose up -d mongodb
```

## Execução

Instale as dependências e inicie a API:

```bash
npm install
npm run start:dev
```

Endpoint:

```http
POST /catmat-classificacao/importar
Content-Type: multipart/form-data
```

Campo do arquivo:

```text
file
```

Exemplo com `curl`:

```bash
curl -F "file=@patrimonio.csv" http://localhost:3000/catmat-classificacao/importar
```

Resposta:

```json
{
  "message": "Processing finished",
  "totalLinhas": 100,
  "processadas": 82,
  "semCandidatos": 5,
  "semCorrespondencia": 2,
  "baixaConfianca": 10,
  "erros": 3,
  "arquivoSaida": "saida_20260618T143012345Z.xlsx",
  "arquivoAuditoria": "auditoria_20260618T143012345Z.xlsx",
  "linkDownloadSaida": "/catmat-classificacao/download/saida_20260618T143012345Z.xlsx",
  "linkDownloadAuditoria": "/catmat-classificacao/download/auditoria_20260618T143012345Z.xlsx"
}
```

Os arquivos são salvos em `CATMAT_EXPORT_DIR` com timestamp para evitar sobrescrita entre importações.

Endpoint de download:

```http
GET /catmat-classificacao/download/:fileName
```

Ao baixar, a API envia o arquivo com nome limpo, sem timestamp:

```text
saida.xlsx
auditoria.xlsx
```

## Entrada

A planilha deve conter as colunas obrigatórias:

```text
#
NUMERO
STATUS
ED
DESCRICAO
RÓTULOS
CARGA ATUAL
SETOR DO RESPONSÁVEL
CAMPUS DA CARGA
VALOR
NUMERO NOTA FISCAL
DATA DA ENTRADA
DATA DA CARGA
FORNECEDOR
SALA
```

Se alguma coluna estiver ausente, o processamento é interrompido com `missingColumns`.

## Saída

`saida.xlsx` é gerado com as colunas:

```text
CATMAT
DESC CATMAT
UG
CONTA
Natureza de Despesa + Subitem
CAMPUS
DATA
CHAMADO
```

`Natureza de Despesa + Subitem` vem da coluna `ED`, `CAMPUS` vem de `CAMPUS DA CARGA`, e `DATA` vem de `DATA DA ENTRADA`.

## Auditoria

`auditoria.xlsx` registra a rastreabilidade por linha:

```text
LINHA
NUMERO
DESCRICAO_ORIGINAL
DESCRICAO_NORMALIZADA
TOKENS
TOTAL_CANDIDATOS
CANDIDATOS
CATMAT_SELECIONADO
DESC_CATMAT_SELECIONADA
SCORE_CONFIANCA
JUSTIFICATIVA_LLM
STATUS_PROCESSAMENTO
ERRO
```

Status possíveis:

```text
PROCESSADO
SEM_CANDIDATOS
SEM_CORRESPONDENCIA
BAIXA_CONFIANCA
ERRO_VALIDACAO
ERRO_LLM
ERRO_PROCESSAMENTO
```

Linhas com erro não interrompem o lote; elas são registradas na auditoria.

## Testes

```bash
npm run test
```
