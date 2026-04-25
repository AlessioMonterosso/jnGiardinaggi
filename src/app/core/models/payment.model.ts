export interface Payment {
  id?: string;
  title?: string;       // descrizione libera (es. "Mario Rossi", "Fornitura") — priorità su clientName nella UI
  clientId: string;
  clientName: string;
  jobId?: string;
  type: 'acconto' | 'saldo';
  paymentMethod: 'fattura' | 'contanti';
  amount: number;
  date: Date;
  notes?: string;
  createdAt: Date;
}
