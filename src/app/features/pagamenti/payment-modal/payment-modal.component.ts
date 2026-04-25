import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonItem,
  IonInput, IonTextarea, IonNote, IonButtons, IonSegment, IonSegmentButton,
  IonLabel, IonSearchbar,
  ModalController, AlertController, LoadingController, ToastController
} from '@ionic/angular/standalone';
import { firstValueFrom, map } from 'rxjs';
import { PaymentService } from '../../../core/services/payment.service';
import { ClientService } from '../../../core/services/client.service';
import { JobService } from '../../../core/services/job.service';
import { Payment } from '../../../core/models/payment.model';
import { Client } from '../../../core/models/client.model';
import { Job } from '../../../core/models/job.model';

@Component({
  selector: 'app-payment-modal',
  templateUrl: 'payment-modal.component.html',
  styleUrls: ['payment-modal.component.scss'],
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonItem,
    IonInput, IonTextarea, IonNote, IonButtons, IonSegment, IonSegmentButton,
    IonLabel, IonSearchbar,
  ],
})
export class PaymentModalComponent implements OnInit {
  @Input() payment: Payment | null = null;

  private fb          = inject(FormBuilder);
  private paymentSvc  = inject(PaymentService);
  private clientSvc   = inject(ClientService);
  private jobSvc      = inject(JobService);
  private modalCtrl   = inject(ModalController);
  private alertCtrl   = inject(AlertController);
  private loadingCtrl = inject(LoadingController);
  private toastCtrl   = inject(ToastController);

  allClients:       Client[] = [];
  filteredClients:  Client[] = [];
  clientJobs:       Job[]    = [];
  showClientList    = false;
  selectedClientName = '';

  form = this.fb.group({
    title:       [''],
    clientId:    [''],
    jobId:       [null as string | null],
    type:        ['acconto' as 'acconto' | 'saldo', Validators.required],
    paymentMethod: ['fattura' as 'fattura' | 'contanti', Validators.required],
    amount:      [null as number | null, [Validators.required, Validators.min(1)]],
    date:        ['',  Validators.required],
    notes:       [''],
  });

  get isEditing() { return !!this.payment?.id; }
  get title()     { return this.isEditing ? 'Modifica pagamento' : 'Nuovo pagamento'; }

  async ngOnInit() {
    this.allClients     = await firstValueFrom(this.clientSvc.getAll());
    this.filteredClients = [...this.allClients];

    if (this.payment) {
      const client = this.allClients.find(c => c.id === this.payment!.clientId);
      this.selectedClientName = client?.name ?? '';
      if (this.payment.clientId) await this.loadClientJobs(this.payment.clientId);
      this.form.patchValue({
        title:         this.payment.title ?? '',
        clientId:      this.payment.clientId,
        jobId:         this.payment.jobId ?? null,
        type:          this.payment.type,
        paymentMethod: this.payment.paymentMethod,
        amount:        this.payment.amount,
        date:          this.toDateString(this.payment.date),
        notes:         this.payment.notes ?? '',
      });
    } else {
      this.form.patchValue({ date: this.toDateString(new Date()) });
    }
  }

  // ── Client search ─────────────────────────────────────────────
  openClientSearch() {
    this.filteredClients = [...this.allClients];
    this.showClientList  = true;
  }

  onClientSearch(ev: CustomEvent) {
    const term = ((ev.detail.value as string) ?? '').toLowerCase();
    this.filteredClients = term
      ? this.allClients.filter(c => c.name.toLowerCase().includes(term))
      : [...this.allClients];
    this.showClientList = true;
  }

  async selectClient(client: Client) {
    this.form.patchValue({ clientId: client.id, jobId: null });
    this.selectedClientName  = client.name;
    this.filteredClients     = [...this.allClients];
    this.showClientList      = false;
    await this.loadClientJobs(client.id!);
  }

  closeClientList() {
    setTimeout(() => { this.showClientList = false; }, 200);
  }

  private async loadClientJobs(clientId: string) {
    const allJobs  = await firstValueFrom(this.jobSvc.getAll());
    this.clientJobs = allJobs.filter(j => j.clientId === clientId && j.status === 'da_fare');
  }

  // ── Save / Delete ─────────────────────────────────────────────
  async salva() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    const v = this.form.value;
    const client = this.allClients.find(c => c.id === v.clientId);

    const payload: Omit<Payment, 'id' | 'createdAt'> = {
      ...(v.title    ? { title: v.title }                                                                  : {}),
      ...(v.clientId ? { clientId: v.clientId, clientName: client?.name ?? '' } : { clientId: '', clientName: '' }),
      type:          v.type!,
      paymentMethod: v.paymentMethod!,
      amount:        Number(v.amount),
      date:          this.parseLocalDate(v.date!),
      notes:         v.notes ?? '',
      ...(v.jobId ? { jobId: v.jobId } : {}),
    };

    const loading = await this.loadingCtrl.create({ message: 'Salvataggio…' });
    await loading.present();
    try {
      if (this.isEditing) {
        await this.paymentSvc.update(this.payment!.id!, payload);
      } else {
        await this.paymentSvc.create(payload);
      }
      await loading.dismiss();
      const toast = await this.toastCtrl.create({ message: 'Salvato!', duration: 2000, color: 'success' });
      await toast.present();
      this.modalCtrl.dismiss({ saved: true });
    } catch (err) {
      console.error('Errore salvataggio pagamento:', err);
      await loading.dismiss();
      const toast = await this.toastCtrl.create({ message: 'Errore nel salvataggio', duration: 2000, color: 'danger' });
      await toast.present();
    }
  }

  async elimina() {
    const alert = await this.alertCtrl.create({
      header:  'Elimina pagamento',
      message: 'Confermi l\'eliminazione?',
      buttons: [
        { text: 'Annulla', role: 'cancel' },
        {
          text: 'Elimina', role: 'destructive',
          handler: async () => {
            await this.paymentSvc.delete(this.payment!.id!);
            const toast = await this.toastCtrl.create({ message: 'Eliminato', duration: 2000, color: 'medium' });
            await toast.present();
            this.modalCtrl.dismiss({ deleted: true });
          }
        }
      ]
    });
    await alert.present();
  }

  annulla() { this.modalCtrl.dismiss(); }

  err(field: string, error: string) {
    const c = this.form.get(field);
    return c?.touched && c?.hasError(error);
  }

  private parseLocalDate(s: string): Date {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  private toDateString(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}
