# Erros retornados pela API

Este documento lista os erros conhecidos que o backend pode retornar ou registrar durante o fluxo de classificação CATMAT.

## Erros HTTP

Erros HTTP interrompem a requisição e são retornados diretamente pela API.

### Importação de planilha

Endpoint:

```http
POST /catmat-classificacao/importar
```

| Status | Quando acontece | Resposta |
| --- | --- | --- |
| `400 Bad Request` | Nenhum arquivo foi enviado no campo `file`. | `File is required.` |
| `400 Bad Request` | O arquivo enviado não é `.csv`, `.xlsx` ou `.xls`. | `Invalid file type. Upload a CSV, XLSX, or XLS file.` |
| `400 Bad Request` | A planilha Excel não possui abas. | `Spreadsheet has no worksheets.` |
| `400 Bad Request` | A planilha não possui uma ou mais colunas obrigatórias. | `{ "message": "Invalid spreadsheet", "missingColumns": [...] }` |
| `413 Payload Too Large` | O arquivo enviado ultrapassa `CATMAT_MAX_UPLOAD_BYTES`. | `File too large` |
| `500 Internal Server Error` | Erro inesperado fora do processamento individual das linhas, como falha ao salvar/exportar arquivo. | Resposta padrão do NestJS. |

### Download de arquivo gerado

Endpoint:

```http
GET /catmat-classificacao/download/:fileName
```

| Status | Quando acontece | Resposta |
| --- | --- | --- |
| `400 Bad Request` | O nome do arquivo não segue o padrão esperado ou tenta acessar caminho inválido. | `Invalid export file name.` |
| `404 Not Found` | O arquivo exportado não existe em `CATMAT_EXPORT_DIR`. | `Export file not found.` |
| `500 Internal Server Error` | Erro inesperado ao acessar ou enviar o arquivo. | Resposta padrão do NestJS. |

## Status por linha na auditoria

Alguns problemas não interrompem a importação inteira. Nesses casos, o backend continua processando o lote e registra o resultado na planilha de auditoria.

Status possíveis:

| Status | Significado |
| --- | --- |
| `PROCESSADO` | A linha foi classificada com sucesso e entrou na planilha de saída. |
| `SEM_CANDIDATOS` | Nenhum candidato CATMAT foi encontrado para a descrição. |
| `SEM_CORRESPONDENCIA` | A LLM informou que nenhum candidato encontrado corresponde ao item. |
| `BAIXA_CONFIANCA` | Houve candidato selecionado, mas o score ficou abaixo de `CATMAT_MIN_CONFIDENCE`. |
| `ERRO_VALIDACAO` | A linha possui erro de validação, como `DESCRICAO` vazia. |
| `ERRO_LLM` | Houve falha na chamada, resposta ou validação da LLM. |
| `ERRO_PROCESSAMENTO` | Houve erro inesperado ao processar a linha. |

## Resumo no response da importação

O response do endpoint de importação resume parte dos status da auditoria:

```json
{
  "semCandidatos": 5,
  "semCorrespondencia": 2,
  "baixaConfianca": 10,
  "erros": 3
}
```

O campo `erros` soma linhas com:

```text
ERRO_VALIDACAO
ERRO_LLM
ERRO_PROCESSAMENTO
```

Exemplos:

| Situação | Status registrado |
| --- | --- |
| Campo `DESCRICAO` vazio. | `ERRO_VALIDACAO` |
| LLM sem chave configurada, timeout, resposta inválida ou código CATMAT inventado. | `ERRO_LLM` |
| Erro inesperado durante o processamento de uma linha. | `ERRO_PROCESSAMENTO` |
