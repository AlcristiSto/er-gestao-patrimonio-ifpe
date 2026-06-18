# Gestão De Patrimônio IFPE

Este repositório reúne a documentação do projeto e o sistema desenvolvido para apoiar a classificação de bens patrimoniais com base no catálogo CATMAT.

## Estrutura Do Repositório

```text
.
├── documentos/
└── sistema/
```

## `documentos/`

A pasta `documentos/` contém os artefatos produzidos durante o desenvolvimento do projeto, incluindo materiais de levantamento, validação, status reports e entrega final.

Ela está organizada por etapa:

- `KickOff/`: materiais iniciais do projeto, como elicitação, BPMN, kanban e design thinking.
- `1StatusReport/`: documentos, entrevistas, checklist e apresentação do primeiro status report.
- `2StatusReport/`: materiais do segundo status report, incluindo MVP, ameaças de privacidade e apresentação.
- `EntregaFinal/`: materiais finais do projeto, como política de privacidade, fluxos BPMN, demonstração e documentos de entrega.

Essa pasta serve como histórico e evidência do processo de construção do sistema.

## `sistema/`

A pasta `sistema/` contém a aplicação executável.

Ela é dividida em:

- `front/`: interface React/Vite usada pelo usuário para baixar o modelo de planilha, enviar o arquivo de entrada, confirmar o envio, acompanhar o processamento e baixar os arquivos gerados.
- `back/`: API NestJS responsável por receber a planilha, validar o arquivo, consultar a base CATMAT no MongoDB, classificar os itens e gerar as planilhas de saída e auditoria.
- `docker-compose.yml`: configuração para subir frontend, backend e MongoDB juntos.
- `README.md`: guia detalhado de instalação, configuração, Docker Compose, execução separada e variáveis de ambiente.

Para executar o sistema, consulte:

```text
sistema/README.md
```

## Resumo Do Fluxo

1. O usuário acessa o frontend.
2. Baixa o modelo de planilha de entrada.
3. Envia uma planilha `.csv`, `.xlsx` ou `.xls`.
4. O frontend faz apenas validações básicas e envia o arquivo ao backend.
5. O backend processa a planilha, consulta a base CATMAT no MongoDB e gera os resultados.
6. O usuário baixa a planilha de saída e a planilha de auditoria.

## Observação Sobre A Carga CATMAT

A carga completa CATMAT (`sistema/back/data/catmat/carga.json`) não é versionada no Git por ser um arquivo grande. O diretório existe no projeto, mas o arquivo deve ser gerado ou colocado localmente seguindo as instruções de `sistema/README.md`.
