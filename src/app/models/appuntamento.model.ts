export type StatoPagamento = 'non_pagato' | 'parziale' | 'pagato';
export type TipoPagamento = 'contante' | 'bonifico' | null;

export interface Appuntamento {
  id?: string;
  clienteId: string;
  clienteNome: string;
  inizio: any;
  fine: any;
  note?: string;
  importo: number | null;
  importoPagato: number;
  statoPagamento: StatoPagamento;
  tipoPagamento: TipoPagamento;
  creatoIl?: any;
}
