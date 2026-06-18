export interface CatmatDocument {
  codigoItem: number;
  codigoGrupo: number;
  nomeGrupo: string;
  codigoClasse: number;
  nomeClasse: string;
  codigoPdm: number;
  nomePdm: string;
  descricaoItem: string;
  statusItem: boolean;
  itemSustentavel?: boolean;
  codigo_ncm?: string | null;
  descricao_ncm?: string | null;
  aplica_margem_preferencia?: boolean | null;
  dataHoraAtualizacao?: string;
}
