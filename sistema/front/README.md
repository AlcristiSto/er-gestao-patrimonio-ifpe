# PatriMap · IFPE

Sistema de mapeamento patrimonial para padronização de nomenclaturas via CATMAT.

## Requisitos

- Node.js 18+
- Chave de API do [groq](https://console.groq.com/keys)

## Configuração

```bash
# 1. Instale as dependências
npm install

# 2. Crie o arquivo .env a partir do template
cp .env.example .env

# 3. Edite o .env e insira sua chave
# VITE_GOOGLE_API_KEY=sua_chave_aqui
```

## Rodando localmente

```bash
npm run dev
```

Acesse `http://localhost:5173`

## Build para produção

```bash
npm run build
npm run preview
```

## Como usar

1. **Upload** — envie um CSV ou XLSX com os bens patrimoniais
2. **Configurar** — selecione a coluna que contém a descrição do bem
3. **Processar** — aguarde o mapeamento via Gemini (Google AI)
4. **Resultado** — visualize e baixe a planilha com mapeamento CATMAT

## Privacidade (conforme análise LINDDUN/PLOT4AI)

- Processamento em memória — nenhum dado é gravado em disco ou banco
- Comunicação via TLS (HTTPS)
- Sessões isoladas por usuário
- Logs de erro sem conteúdo de células (apenas tipo de erro)

## Estrutura

```
patrimap/
├── src/
│   ├── App.jsx       # Componente principal (UI + fluxo)
│   ├── groq.js     # Serviço de chamada à API do Google AI Studio
│   ├── main.jsx      # Entry point React
│   └── index.css     # Reset e variáveis CSS
├── .env.example      # Template de configuração
├── .gitignore
├── index.html
├── package.json
└── vite.config.js
```
