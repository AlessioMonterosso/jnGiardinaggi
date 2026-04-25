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
import { createOutline, checkmarkCircleOutline, personOutline, calendarOutline } from 'ionicons/icons';
import { firstValueFrom } from 'rxjs';
import { JobService } from '../../../core/services/job.service';
import { PaymentService } from '../../../core/services/payment.service';
import { ClientService } from '../../../core/services/client.service';
import { AppointmentService } from '../../../core/services/appointment.service';
import { Job } from '../../../core/models/job.model';
import { Payment } from '../../../core/models/payment.model';
import { Appointment } from '../../../core/models/appointment.model';
import { JobModalComponent } from '../job-modal/job-modal.component';

@Component({
  selector: 'app-lavoro-dettaglio',
  templateUrl: 'lavoro-dettaglio.page.html',
  styleUrls: ['lavoro-dettaglio.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonButtons,
    IonBackButton, IonIcon,
  ],
})
export class LavoroDettaglioPage implements OnInit {
  private route          = inject(ActivatedRoute);
  private router         = inject(Router);
  private jobSvc         = inject(JobService);
  private paymentSvc     = inject(PaymentService);
  private clientSvc      = inject(ClientService);
  private appointmentSvc = inject(AppointmentService);
  private modalCtrl      = inject(ModalController);
  private alertCtrl      = inject(AlertController);
  private toastCtrl      = inject(ToastController);
  private destroyRef     = inject(DestroyRef);

  jobId = this.route.snapshot.paramMap.get('id')!;

  job:          Job | null    = null;
  payments:     Payment[]     = [];
  appointments: Appointment[] = [];
  loading       = true;

  constructor() {
    addIcons({ createOutline, checkmarkCircleOutline, personOutline, calendarOutline });
  }

  async ngOnInit() {
    this.loading = true;
    try {
      const [job, payments, appointments] = await Promise.all([
        firstValueFrom(this.jobSvc.getById(this.jobId)),
        firstValueFrom(this.paymentSvc.getByJobId(this.jobId)),
        firstValueFrom(this.appointmentSvc.getByJobId(this.jobId)),
      ]);
      this.job          = job;
      this.payments     = payments;
      this.appointments = appointments;
    } finally {
      this.loading = false;
    }

    // Real-time subscriptions
    this.jobSvc.getById(this.jobId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(j => this.job = j);

    this.paymentSvc.getByJobId(this.jobId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(p => this.payments = p);

    this.appointmentSvc.getByJobId(this.jobId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(a => this.appointments = a);
  }

  // ── Ore lavorate (solo appuntamenti completati) ───────────────
  get totalHoursWorked(): string {
    const mins = this.appointments
      .filter(a => a.status === 'completato')
      .reduce((sum, a) => sum + (a.duration ?? 0), 0);
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (mins === 0) return '0h';
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }

  // ── Segna completato ──────────────────────────────────────────
  async segnaCompletato() {
    const alert = await this.alertCtrl.create({
      header:  'Segna come completato',
      message: 'Confermi il completamento di questo lavoro?',
      buttons: [
        { text: 'Annulla', role: 'cancel' },
        {
          text: 'Conferma',
          handler: async () => {
            await this.jobSvc.update(this.jobId, {
              status:      'completato',
              completedAt: new Date(),
            });
            const toast = await this.toastCtrl.create({ message: 'Lavoro completato!', duration: 2000, color: 'success' });
            await toast.present();
          }
        }
      ]
    });
    await alert.present();
  }

  // ── Modifica ──────────────────────────────────────────────────
  async modificaLavoro() {
    if (!this.job) return;
    const modal = await this.modalCtrl.create({
      component: JobModalComponent,
      componentProps: { job: this.job },
      cssClass: 'fullscreen-modal',
    });
    await modal.present();
  }

  // ── Elimina ───────────────────────────────────────────────────
  async eliminaLavoro() {
    const alert = await this.alertCtrl.create({
      header:  'Elimina lavoro',
      message: 'Sei sicuro? L\'operazione non può essere annullata.',
      buttons: [
        { text: 'Annulla', role: 'cancel' },
        {
          text: 'Elimina', role: 'destructive',
          handler: async () => {
            await this.jobSvc.delete(this.jobId);
            const toast = await this.toastCtrl.create({ message: 'Lavoro eliminato', duration: 2000, color: 'medium' });
            await toast.present();
            this.router.navigate(['/tabs/lavori']);
          }
        }
      ]
    });
    await alert.present();
  }

  // ── Navigate to client ────────────────────────────────────────
  vaiAlCliente() {
    if (this.job?.clientId) {
      this.router.navigate(['/clienti', this.job.clientId]);
    }
  }

  // ── trackBy ───────────────────────────────────────────────────
  trackByAppId(_: number, app: Appointment): string {
    return app.id ?? app.timeStart;
  }

  // ── Payment totals ────────────────────────────────────────────
  get totFattura()  { return this.payments.filter(p => p.paymentMethod === 'fattura').reduce((s, p) => s + p.amount, 0); }
  get totContanti() { return this.payments.filter(p => p.paymentMethod === 'contanti').reduce((s, p) => s + p.amount, 0); }
  get totale()      { return this.totFattura + this.totContanti; }

  // ── Formatters ────────────────────────────────────────────────
  formatAmount(amount: number): string {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amount);
  }

  formatDate(date: Date): string {
    return new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
  }

  getPaymentMethodLabel(method: string): string {
    return method === 'fattura' ? 'Fattura' : 'Contanti';
  }

  getPaymentTypeLabel(type: string): string {
    return type === 'saldo' ? 'Saldo' : 'Acconto';
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      confermato:    'Confermato',
      da_confermare: 'Da confermare',
      completato:    'Completato',
      annullato:     'Annullato',
    };
    return map[status] ?? status;
  }
}
