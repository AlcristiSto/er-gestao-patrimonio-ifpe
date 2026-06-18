export interface CatmatCandidate {
  codigoItem: number;
  nomeGrupo: string;
  nomeClasse: string;
  descricaoItem: string;
}

export interface RankedCatmatCandidate extends CatmatCandidate {
  localScore: number;
}
