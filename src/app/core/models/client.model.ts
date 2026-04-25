export interface Client {
  id?: string;
  name: string;
  phone: string;
  address?: string;
  email?: string;
  notes?: string;
  createdAt: Date;
}
