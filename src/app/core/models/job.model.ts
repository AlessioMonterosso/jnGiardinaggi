export interface Job {
  id?: string;
  clientId: string;
  clientName: string;
  appointmentId?: string;
  description: string;
  status: 'da_fare' | 'completato';
  completedAt?: Date;
  createdAt: Date;
}
