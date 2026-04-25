export interface Appointment {
  id?: string;
  title?: string;           // titolo libero — priorità su clientName/jobDescription nella UI
  clientId?: string;        // opzionale — si esclude con jobId
  clientName?: string;      // opzionale — snapshot nome cliente
  jobId?: string;           // opzionale — si esclude con clientId
  jobDescription?: string;  // opzionale — snapshot descrizione lavoro
  date: Date;
  timeStart: string;
  duration: number;         // minuti
  workType?: string;        // opzionale
  address?: string;
  notes?: string;
  status: 'confermato' | 'da_confermare' | 'completato' | 'annullato';
  createdAt: Date;
}
