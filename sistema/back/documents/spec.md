# Tarefa para Codex — Sistema de classificação CATMAT por planilha patrimonial

Implemente no projeto um sistema para importar uma planilha patrimonial em CSV ou Excel, validar suas colunas, classificar cada item contra uma base CATMAT no MongoDB usando busca textual + LLM, e gerar uma planilha final de saída e um relatório de auditoria.

## 1. Stack e premissas

Use a stack do projeto atual.

Se o projeto for NestJS + TypeScript, implemente usando NestJS.

Se já existir padrão de módulos, services, repositories, DTOs, use o padrão existente do projeto.

Não crie uma arquitetura paralela se o projeto já tiver convenções claras.

Caso não exista estrutura definida, use esta organização:

```text
src/modules/catmat-classificacao/
  controllers/
  dto/
  services/
  repositories/
  validators/
  tokenizer/
  llm/
  exporters/
  logs/
```

## 2. Objetivo funcional

Criar uma funcionalidade que receba uma planilha `.csv`, `.xlsx` ou `.xls` contendo bens patrimoniais.

Para cada linha da planilha:

1. Validar as colunas obrigatórias.
2. Ler a coluna `DESCRICAO`.
3. Normalizar e tokenizar a descrição.
4. Buscar candidatos CATMAT no MongoDB.
5. Enviar os candidatos encontrados para uma LLM.
6. Receber da LLM o item CATMAT mais compatível.
7. Gerar uma nova linha na planilha de saída.
8. Gerar também um relatório de auditoria com a rastreabilidade da decisão.

## 3. Colunas obrigatórias da planilha de entrada

A planilha de entrada deve possuir exatamente estas colunas obrigatórias:

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

Se uma ou mais colunas não existirem, interrompa o processamento e retorne erro informando as colunas ausentes.

Exemplo de retorno esperado:

```json
{
  "message": "Planilha inválida",
  "missingColumns": ["DESCRICAO", "ED"]
}
```

## 4. Exemplo de entrada

```csv
#,NUMERO,STATUS,ED,DESCRICAO,RÓTULOS,CARGA ATUAL,SETOR DO RESPONSÁVEL,CAMPUS DA CARGA,VALOR,NUMERO NOTA FISCAL,DATA DA ENTRADA,DATA DA CARGA,FORNECEDOR,SALA
1,835,Ativo,449052-42,3315CREC - ARMARIO DE ACO (MARCA JS REF 014),Inventário 2016 - REIT - DADT|Inventário 2016 - REIT - TOTALIZADO,MARCO ANTONIO EUGENIO ARAUJO (REIFPE REI-DTI),REI-DTI,REIFPE,"0,01",-,16/06/2010,23/12/2010,IFPE - CAMPUS RECIFE,REI - A39 - DADT
2,882,Ativo,449052-42,3552CREC - ESTANTE DE ACO (DESMONTAVEL INDUSA C/5 PRATELEIRAS MEDINDO 200X100X40CM),Inventário 2016 - REIT - DADT|Inventário 2016 - REIT - TOTALIZADO,MARCO ANTONIO EUGENIO ARAUJO (REIFPE REI-DTI),REI-DTI,REIFPE,"0,01",-,16/06/2010,23/12/2010,IFPE - CAMPUS RECIFE,REI - A39 - DADT
3,888,Ativo,449052-42,3560CREC - ESTANTE DE ACO (DEAMONTAVEL INDUSA C/5 PRATELEIRAS MEDINDO 200X100X40CM),Inventário 2016 - REIT - DADT|Inventário 2016 - REIT - TOTALIZADO,MARCO ANTONIO EUGENIO ARAUJO (REIFPE REI-DTI),REI-DTI,REIFPE,"0,01",-,16/06/2010,23/12/2010,IFPE - CAMPUS RECIFE,REI - A39 - DADT
4,7263,Ativo,449052-33,25996CREC - CAMERA DE VIDEO (PANASONIC S-VHS SERIE J7HB00132),Bens Móveis Inservíveis - Desfazimento|Inventário 2024 - reit - BI,Daniel de Oliveira Quaresma (REIFPE REI-DTI),REI-DTI,REIFPE,"0,01",-,16/06/2010,16/05/2011,IFPE - CAMPUS RECIFE,REI - DEPÓSITO - CORREDOR B
```

## 5. Estrutura dos documentos CATMAT no MongoDB

A coleção MongoDB contém documentos neste formato:

```json
{
  "codigoItem": 218668,
  "codigoGrupo": 73,
  "nomeGrupo": "EQUIPAMENTOS PARA PREPARAR E SERVIR ALIMENTOS",
  "codigoClasse": 7310,
  "nomeClasse": "EQUIPAMENTOS PARA COZINHAR, ASSAR E SERVIR ALIMENTOS",
  "codigoPdm": 1055,
  "nomePdm": "ASSADEIRA",
  "descricaoItem": "ASSADEIRA, MATERIAL: AÇO INOXIDÁVEL , APLICAÇÃO: COMERCIAL , FUNCIONAMENTO: ELÉTRICO , QUANTIDADE QUEIMADOR: NÃO APLICÁVEL UN, VOLTAGEM: 220 V, VOLTAGEM SISTEMA GIRATÓRIO: 110/220 V, CAPACIDADE: ATÉ 60 KG ALIMENTOS , ACABAMENTO SUPERFICIAL: PINTURA EPOXI EXTERNA , COMPRIMENTO: 0,98 M, LARGURA: 0,98 M, ALTURA: 1,70 M, CARACTERÍSTICAS ADICIONAIS: INDICAÇÃO SONORA ",
  "statusItem": true,
  "itemSustentavel": false,
  "codigo_ncm": null,
  "descricao_ncm": null,
  "aplica_margem_preferencia": null,
  "dataHoraAtualizacao": "2021-10-16T09:43:08.030221"
}
```

A busca deve considerar somente itens com:

```ts
statusItem === true
```

## 6. Campos pesquisáveis no MongoDB

Pesquisar os tokens da descrição nos campos:

```text
nomeGrupo
nomeClasse
descricaoItem
```

Implemente busca textual com índice no MongoDB.

Também implemente fallback por regex ou busca parcial normalizada quando a busca textual não retornar candidatos suficientes.

Crie um script, migration ou documentação no README ensinando a criar o índice textual:

```js
db.catmat.createIndex({
  nomeGrupo: "text",
  nomeClasse: "text",
  descricaoItem: "text"
})
```

O nome da coleção deve ser configurável via `.env`.

Exemplo:

```env
MONGO_CATMAT_COLLECTION=catmat
```

## 7. Tokenização da descrição

Criar um serviço de tokenização para a coluna `DESCRICAO`.

Regras:

1. Converter para caixa alta.
2. Remover acentos.
3. Remover pontuações irrelevantes.
4. Remover código patrimonial inicial quando existir.

   * Exemplo: `3315CREC - ARMARIO DE ACO` deve virar `ARMARIO DE ACO`.
5. Remover stopwords.
6. Preservar palavras relevantes do bem.
7. Preservar termos técnicos, medidas, materiais e marcas quando úteis.
8. Retornar:

   * descrição original;
   * descrição normalizada;
   * tokens.

Stopwords mínimas:

```ts
[
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
  'Nº'
]
```

Exemplo 1:

Entrada:

```text
3315CREC - ARMARIO DE ACO (MARCA JS REF 014)
```

Saída esperada:

```json
{
  "descricaoOriginal": "3315CREC - ARMARIO DE ACO (MARCA JS REF 014)",
  "descricaoNormalizada": "ARMARIO DE ACO JS 014",
  "tokens": ["ARMARIO", "ACO", "JS"]
}
```

Exemplo 2:

Entrada:

```text
25996CREC - CAMERA DE VIDEO (PANASONIC S-VHS SERIE J7HB00132)
```

Saída esperada:

```json
{
  "descricaoOriginal": "25996CREC - CAMERA DE VIDEO (PANASONIC S-VHS SERIE J7HB00132)",
  "descricaoNormalizada": "CAMERA DE VIDEO PANASONIC S-VHS J7HB00132",
  "tokens": ["CAMERA", "VIDEO", "PANASONIC", "S-VHS"]
}
```

## 8. Busca de candidatos CATMAT

Para cada linha da planilha:

1. Gerar tokens.
2. Buscar candidatos no MongoDB.
3. Limitar a quantidade de candidatos.

Configurações via `.env`:

```env
CATMAT_MAX_CANDIDATES=20
CATMAT_MIN_CONFIDENCE=0.75
```

Cada candidato enviado para a LLM deve conter apenas os campos necessários:

```ts
{
  codigoItem: number;
  nomeGrupo: string;
  nomeClasse: string;
  descricaoItem: string;
}
```

Não envie o documento inteiro do MongoDB para a LLM.

## 9. Pré-ranking antes da LLM

Antes de chamar a LLM, implemente um score local simples para ordenar os candidatos.

Considere:

1. Quantidade de tokens encontrados em `descricaoItem`.
2. Quantidade de tokens encontrados em `nomeGrupo`.
3. Quantidade de tokens encontrados em `nomeClasse`.
4. Similaridade textual simples entre descrição normalizada e `descricaoItem`.
5. Peso maior para tokens que aparecem no início da descrição.

A LLM deve receber apenas os melhores candidatos, já ordenados.

Se não houver candidatos, não chamar a LLM.

Se houver somente um candidato com score local muito alto, permitir seleção automática apenas se isso estiver habilitado por configuração:

```env
CATMAT_AUTO_SELECT_HIGH_CONFIDENCE=false
```

## 10. Classificação com LLM

Criar um serviço responsável por chamar a LLM.

A LLM recebe:

```ts
{
  descricaoOriginal: string;
  descricaoNormalizada: string;
  tokens: string[];
  candidatos: CatmatCandidate[];
}
```

A LLM deve retornar JSON válido.

Formato obrigatório:

```ts
{
  codigoItemSelecionado: number | null;
  descricaoItemSelecionado: string | null;
  scoreConfianca: number;
  justificativa: string;
  houveCorrespondencia: boolean;
}
```

Validar a resposta da LLM com `zod` ou validação equivalente.

Regra obrigatória:

A LLM não pode inventar CATMAT.

Depois da resposta, validar se `codigoItemSelecionado` existe dentro da lista de candidatos enviada.

Se não existir, marcar a linha como `ERRO_LLM`.

## 11. Prompt interno da LLM

Use este prompt para classificação:

```text
Você é um especialista em classificação de bens patrimoniais e associação com itens CATMAT.

Sua tarefa é analisar a descrição original de um bem patrimonial e escolher, entre os candidatos fornecidos, qual item CATMAT possui maior relação semântica com o bem descrito.

Regras obrigatórias:
- Você não pode inventar código CATMAT.
- Você só pode escolher um dos candidatos fornecidos.
- Se nenhum candidato for adequado, retorne houveCorrespondencia como false.
- Responda exclusivamente em JSON válido.
- Não inclua comentários fora do JSON.
- O scoreConfianca deve ser um número entre 0 e 1.

Descrição original:
{{descricaoOriginal}}

Descrição normalizada:
{{descricaoNormalizada}}

Tokens extraídos:
{{tokens}}

Candidatos CATMAT:
{{candidatos}}

Formato obrigatório da resposta:

{
  "codigoItemSelecionado": number | null,
  "descricaoItemSelecionado": string | null,
  "scoreConfianca": number,
  "justificativa": string,
  "houveCorrespondencia": boolean
}
```

## 12. Regra de confiança

Usar score mínimo configurável:

```env
CATMAT_MIN_CONFIDENCE=0.75
```

Se `houveCorrespondencia` for `false`, marcar como:

```text
SEM_CORRESPONDENCIA
```

Se `scoreConfianca` for menor que o mínimo, marcar como:

```text
BAIXA_CONFIANCA
```

Se o score for suficiente, marcar como:

```text
PROCESSADO
```

## 13. Planilha de saída

Gerar uma planilha final com as colunas exatamente nesta ordem:

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

## 14. Mapeamento da saída

### CATMAT

Origem:

```text
MongoDB.codigoItem
```

Usar o `codigoItem` escolhido pela LLM.

### DESC CATMAT

Origem:

```text
MongoDB.descricaoItem
```

Usar a `descricaoItem` do candidato escolhido pela LLM.

### UG

Origem configurável.

Usar variável de ambiente:

```env
CATMAT_OUTPUT_UG=158000
```

### CONTA

Valor fixo configurável, com default:

```env
CATMAT_OUTPUT_CONTA=111111111
```

### Natureza de Despesa + Subitem

Origem:

```text
Planilha de entrada: ED
```

### CAMPUS

Origem:

```text
Planilha de entrada: CAMPUS DA CARGA
```

### DATA

Origem:

```text
Planilha de entrada: DATA DA ENTRADA
```

### CHAMADO

Valor fixo configurável, com default:

```env
CATMAT_OUTPUT_CHAMADO=4444444444
```

## 15. Exemplo de saída

```csv
CATMAT,DESC CATMAT,UG,CONTA,Natureza de Despesa + Subitem,CAMPUS,DATA,CHAMADO
123456,"ARMARIO AÇO, MATERIAL: AÇO, TIPO: ALTO...",158000,111111111,449052-42,REIFPE,16/06/2010,4444444444
```

## 16. Relatório de auditoria

Além da planilha final, gerar uma planilha de auditoria com as colunas:

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

Possíveis valores de `STATUS_PROCESSAMENTO`:

```text
PROCESSADO
SEM_CANDIDATOS
SEM_CORRESPONDENCIA
BAIXA_CONFIANCA
ERRO_VALIDACAO
ERRO_LLM
ERRO_PROCESSAMENTO
```

A coluna `CANDIDATOS` pode ser um JSON stringificado contendo os principais candidatos avaliados.

## 17. Saídas esperadas

Ao final do processamento, gerar:

```text
saida.xlsx
auditoria.xlsx
```

Se o projeto já tiver padrão de armazenamento de arquivos, siga esse padrão.

Caso contrário, salvar os arquivos em uma pasta temporária ou pasta de exports configurável.

Exemplo:

```env
CATMAT_EXPORT_DIR=./exports
```

## 18. Endpoint ou comando

Se o projeto for API NestJS, criar endpoint para upload:

```http
POST /catmat-classificacao/importar
Content-Type: multipart/form-data
```

Campo do arquivo:

```text
file
```

O endpoint deve retornar:

```json
{
  "message": "Processamento finalizado",
  "totalLinhas": 100,
  "processadas": 82,
  "semCandidatos": 5,
  "baixaConfianca": 10,
  "erros": 3,
  "arquivoSaida": "saida.xlsx",
  "arquivoAuditoria": "auditoria.xlsx"
}
```

Se o projeto for CLI, criar comando equivalente.

## 19. Tratamento de erros

O processamento deve continuar mesmo se uma linha falhar.

Erros por linha devem ir para a auditoria.

Erros estruturais da planilha, como colunas obrigatórias ausentes, devem interromper o processamento.

## 20. Performance

O sistema deve ser preparado para milhares de linhas.

Implemente:

1. Cache por descrição normalizada.
2. Limite de concorrência para chamadas à LLM.
3. Timeout para chamada da LLM.
4. Retry simples em erro transitório da LLM.
5. Logs de progresso.
6. Não chamar LLM quando não houver candidatos.
7. Não enviar candidatos duplicados para a LLM.

Configurações sugeridas:

```env
CATMAT_LLM_CONCURRENCY=3
CATMAT_LLM_TIMEOUT_MS=30000
CATMAT_LLM_RETRY_ATTEMPTS=2
```

## 21. Bibliotecas sugeridas

Para NestJS + TypeScript, preferir:

```text
exceljs
csv-parse
mongodb ou mongoose, conforme padrão do projeto
zod
multer
pino ou logger existente do projeto
openai ou SDK já usado no projeto
```

Não adicione dependências desnecessárias se o projeto já tiver alternativas equivalentes.

## 22. Variáveis de ambiente

Adicionar ao `.env.example`:

```env
MONGO_URI=mongodb://localhost:27017
MONGO_DATABASE=patrimonio
MONGO_CATMAT_COLLECTION=catmat

CATMAT_MAX_CANDIDATES=20
CATMAT_MIN_CONFIDENCE=0.75
CATMAT_AUTO_SELECT_HIGH_CONFIDENCE=false

CATMAT_OUTPUT_UG=158000
CATMAT_OUTPUT_CONTA=111111111
CATMAT_OUTPUT_CHAMADO=4444444444
CATMAT_EXPORT_DIR=./exports

CATMAT_LLM_MODEL=gpt-4.1-mini
CATMAT_LLM_CONCURRENCY=3
CATMAT_LLM_TIMEOUT_MS=30000
CATMAT_LLM_RETRY_ATTEMPTS=2
```

Se o projeto já usar outro padrão de configuração, adapte para o padrão existente.

## 23. Testes obrigatórios

Criar testes para:

1. Validação de colunas obrigatórias.
2. Erro quando colunas obrigatórias estão ausentes.
3. Tokenização de `ARMARIO DE ACO`.
4. Tokenização de `CAMERA DE VIDEO`.
5. Busca de candidatos no repository.
6. Validação para impedir CATMAT inventado pela LLM.
7. Regra de baixa confiança.
8. Geração da planilha de saída.
9. Geração da auditoria.
10. Processamento parcial com erro em uma linha sem quebrar o lote.

## 24. README

Atualizar ou criar documentação com:

1. Como configurar `.env`.
2. Como criar índice textual no MongoDB.
3. Como executar a funcionalidade.
4. Exemplo de entrada.
5. Exemplo de saída.
6. Explicação dos status da auditoria.
7. Como rodar os testes.

## 25. Critérios de aceite

A implementação será considerada concluída quando:

1. A planilha CSV ou Excel for lida corretamente.
2. As colunas obrigatórias forem validadas.
3. A coluna `DESCRICAO` for tokenizada.
4. Os candidatos forem buscados no MongoDB usando `nomeGrupo`, `nomeClasse` e `descricaoItem`.
5. Somente itens com `statusItem = true` forem considerados.
6. A LLM receber apenas candidatos reais do MongoDB.
7. A resposta da LLM for validada.
8. CATMAT inventado pela LLM for rejeitado.
9. A planilha `saida.xlsx` for gerada.
10. A planilha `auditoria.xlsx` for gerada.
11. A saída tiver exatamente as colunas:

    * `CATMAT`
    * `DESC CATMAT`
    * `UG`
    * `CONTA`
    * `Natureza de Despesa + Subitem`
    * `CAMPUS`
    * `DATA`
    * `CHAMADO`
12. `CONTA` usar default `111111111`.
13. `CHAMADO` usar default `4444444444`.
14. `Natureza de Despesa + Subitem` vir da coluna `ED`.
15. `CAMPUS` vir da coluna `CAMPUS DA CARGA`.
16. `DATA` vir da coluna `DATA DA ENTRADA`.
17. Linhas com erro não interromperem o lote.
18. Testes automatizados passarem.

## 26. Instruções de execução para o Codex

Antes de implementar:

1. Inspecione a estrutura do projeto.
2. Identifique framework, padrão de módulos, padrão de configuração e padrão de testes.
3. Reutilize serviços, logger, configuração e padrões existentes.
4. Não reescreva partes não relacionadas.
5. Não altere contratos existentes sem necessidade.
6. Implemente em pequenos arquivos coesos.
7. Ao final, rode os testes disponíveis.
8. Se não for possível rodar os testes, informe o motivo.
9. Entregue um resumo objetivo dos arquivos criados/alterados.
10. Liste qualquer pendência ou decisão assumida.

Não pare para perguntar se uma decisão estiver razoavelmente inferível. Use as premissas descritas neste prompt.
