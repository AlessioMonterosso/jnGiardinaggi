import { Component, inject, DestroyRef, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonButtons,
  IonBackButton, IonIcon,
  ModalController, AlertController, ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { createOutline, callOutline, locationOutline, mailOutline, documentTextOutline } from 'ionicons/icons';
import { firstValueFrom, map } from 'rxjs';
import { ClientService } from '../../../core/services/client.service';
import { JobService } from '../../../core/services/job.service';
import { PaymentService } from '../../../core/services/payment.service';
import { AppointmentService } from '../../../core/services/appointment.service';
import { Client } from '../../../core/models/client.model';
import { Job } from '../../../core/models/job.model';
import { Payment } from '../../../core/models/payment.model';
import { Appointment } from '../../../core/models/appointment.model';
import { ClientModalComponent } from '../client-modal/client-modal.component';

@Component({
  selector: 'app-cliente-dettaglio',
  templateUrl: 'cliente-dettaglio.page.html',
  styleUrls: ['cliente-dettaglio.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonButtons,
    IonBackButton, IonIcon,
  ],
})
export class ClienteDettaglioPage implements OnInit {
  private route           = inject(ActivatedRoute);
  private router          = inject(Router);
  private clientSvc       = inject(ClientService);
  private jobSvc          = inject(JobService);
  private paymentSvc      = inject(PaymentService);
  private appointmentSvc  = inject(AppointmentService);
  private modalCtrl       = inject(ModalController);
  private alertCtrl       = inject(AlertController);
  private toastCtrl       = inject(ToastController);
  private destroyRef      = inject(DestroyRef);

  clienteId = this.route.snapshot.paramMap.get('id')!;

  client:             Client | null  = null;
  jobs:               Job[]          = [];
  payments:           Payment[]      = [];
  clientAppointments: Appointment[]  = [];
  loading = true;

  constructor() {
    addIcons({ createOutline, callOutline, locationOutline, mailOutline, documentTextOutline });
  }

  async ngOnInit() {
    this.loading = true;
    try {
      const [client, allJobs, allPayments, appointments] = await Promise.all([
        firstValueFrom(this.clientSvc.getById(this.clienteId)),
        firstValueFrom(this.jobSvc.getAll()),
        firstValueFrom(this.paymentSvc.getAll()),
        firstValueFrom(this.appointmentSvc.getByClientId(this.clienteId)),
      ]);
      this.client             = client;
      this.jobs               = allJobs.filter(j => j.clientId === this.clienteId).slice(0, 3);
      this.payments           = allPayments.filter(p => p.clientId === this.clienteId).slice(0, 3);
      this.clientAppointments = appointments;
    } finally {
      this.loading = false;
    }

    // Subscribe real-time after initial load
    this.clientSvc.getById(this.clienteId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(c => this.client = c);

    this.jobSvc.getAll()
      .pipe(
        map(jobs => jobs.filter(j => j.clientId === this.clienteId).slice(0, 3)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(j => this.jobs = j);

    this.paymentSvc.getAll()
      .pipe(
        map(payments => payments.filter(p => p.clientId === this.clienteId).slice(0, 3)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(p => this.payments = p);

    this.appointmentSvc.getByClientId(this.clienteId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(a => this.clientAppointments = a);
  }

  // ── Ore lavorate (solo appuntamenti completati) ───────────────
  get totalHoursWorked(): string {
    const mins = this.clientAppointments
      .filter(a => a.status === 'completato')
      .reduce((sum, a) => sum + (a.duration ?? 0), 0);
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (mins === 0) return '0h';
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }

  async modificaCliente() {
    if (!this.client) return;
    const modal = await this.modalCtrl.create({
      component: ClientModalComponent,
      componentProps: { client: this.client },
      cssClass: 'fullscreen-modal',
    });
    await modal.present();
  }

  async eliminaCliente() {
    const alert = await this.alertCtrl.create({
      header:  'Elimina cliente',
      message: 'Sei sicuro di voler eliminare questo cliente? L\'operazione non può essere annullata.',
      buttons: [
        { text: 'Annulla', role: 'cancel' },
        {
          text: 'Elimina', role: 'destructive',
          handler: async () => {
            await this.clientSvc.delete(this.clienteId);
            const toast = await this.toastCtrl.create({ message: 'Cliente eliminato', duration: 2000, color: 'medium' });
            await toast.present();
            this.router.navigate(['/tabs/clienti']);
          }
        }
      ]
    });
    await alert.present();
  }

  callPhone() {
    if (this.client?.phone) {
      window.open(`tel:${this.client.phone}`);
    }
  }

  getJobStatusLabel(status: string): string {
    return status === 'completato' ? 'Completato' : 'Da fare';
  }

  getJobStatusColor(status: string): string {
    return status === 'completato' ? 'var(--color-primary)' : 'var(--color-cash)';
  }

  getPaymentTypeLabel(type: string): string {
    return type === 'saldo' ? 'Saldo' : 'Acconto';
  }

  getPaymentMethodColor(method: string): string {
    return method === 'contanti' ? 'var(--color-cash)' : 'var(--color-primary)';
  }

  formatAmount(amount: number): string {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amount);
  }

  formatDate(date: Date): string {
    return new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
  }
}
