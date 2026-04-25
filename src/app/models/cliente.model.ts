export interface Cliente {
  id?: string;
  tipo: 'azienda' | 'privato';
  nome: string;
  cognome?: string;
  ragioneSociale?: string;
  telefono: string;
  email?: string;
  indirizzo?: string;
  note?: string;
  piva?: string;
  referente?: string;
  pec?: string;
  codiceSdi?: string;
  codiceFiscale?: string;
  creatoIl?: any;
}
