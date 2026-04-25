import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonItem,
  IonTextarea, IonNote, IonButtons, IonSegment, IonSegmentButton,
  IonLabel, IonSearchbar,
  ModalController, AlertController, LoadingController, ToastController
} from '@ionic/angular/standalone';
import { firstValueFrom } from 'rxjs';
import { JobService } from '../../../core/services/job.service';
import { ClientService } from '../../../core/services/client.service';
import { AppointmentService } from '../../../core/services/appointment.service';
import { Job } from '../../../core/models/job.model';
import { Client } from '../../../core/models/client.model';
import { Appointment } from '../../../core/models/appointment.model';

@Component({
  selector: 'app-job-modal',
  templateUrl: 'job-modal.component.html',
  styleUrls: ['job-modal.component.scss'],
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonItem,
    IonTextarea, IonNote, IonButtons, IonSegment, IonSegmentButton,
    IonLabel, IonSearchbar,
  ],
})
export class JobModalComponent implements OnInit {
  @Input() job: Job | null = null;

  private fb              = inject(FormBuilder);
  private jobSvc          = inject(JobService);
  private clientSvc       = inject(ClientService);
  private appointmentSvc  = inject(AppointmentService);
  private modalCtrl       = inject(ModalController);
  private alertCtrl       = inject(AlertController);
  private loadingCtrl     = inject(LoadingController);
  private toastCtrl       = inject(ToastController);

  allClients:          Client[]      = [];
  filteredClients:     Client[]      = [];
  clientAppointments:  Appointment[] = [];
  showClientList       = false;
  selectedClientName   = '';

  form = this.fb.group({
    clientId:       ['',  Validators.required],
    appointmentId:  [null as string | null],
    description:    ['',  Validators.required],
    status:         ['da_fare' as 'da_fare' | 'completato', Validators.required],
    notes:          [''],
  });

  get isEditing() { return !!this.job?.id; }
  get title()     { return this.isEditing ? 'Modifica lavoro' : 'Nuovo lavoro'; }

  async ngOnInit() {
    this.allClients      = await firstValueFrom(this.clientSvc.getAll());
    this.filteredClients = [...this.allClients];

    if (this.job) {
      const client = this.allClients.find(c => c.id === this.job!.clientId);
      this.selectedClientName = client?.name ?? '';
      await this.loadClientAppointments(this.job.clientId);
      this.form.patchValue({
        clientId:      this.job.clientId,
        appointmentId: this.job.appointmentId ?? null,
        description:   this.job.description,
        status:        this.job.status,
        notes:         (this.job as any).notes ?? '',
      });
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
    this.form.patchValue({ clientId: client.id, appointmentId: null });
    this.selectedClientName   = client.name;
    this.filteredClients      = [...this.allClients];
    this.showClientList       = false;
    await this.loadClientAppointments(client.id!);
  }

  closeClientList() {
    setTimeout(() => { this.showClientList = false; }, 200);
  }

  private async loadClientAppointments(clientId: string) {
    const all = await firstValueFrom(this.appointmentSvc.getAll());
    this.clientAppointments = all.filter(a => a.clientId === clientId);
  }

  formatAppDate(date: Date): string {
    return new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
  }

  // ── Save / Delete ─────────────────────────────────────────────
  async salva() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    const v = this.form.value;
    const client = this.allClients.find(c => c.id === v.clientId);

    const payload: Omit<Job, 'id' | 'createdAt'> = {
      clientId:    v.clientId!,
      clientName:  client?.name ?? '',
      description: v.description!,
      status:      v.status!,
      ...(v.appointmentId ? { appointmentId: v.appointmentId } : {}),
    };

    if (v.status === 'completato' && !this.job?.completedAt) {
      (payload as any).completedAt = new Date();
    } else if (this.job?.completedAt) {
      (payload as any).completedAt = this.job.completedAt;
    }

    const loading = await this.loadingCtrl.create({ message: 'Salvataggio…' });
    await loading.present();
    try {
      if (this.isEditing) {
        await this.jobSvc.update(this.job!.id!, payload);
      } else {
        await this.jobSvc.create(payload);
      }
      await loading.dismiss();
      const toast = await this.toastCtrl.create({ message: 'Salvato!', duration: 2000, color: 'success' });
      await toast.present();
      this.modalCtrl.dismiss({ saved: true });
    } catch (err) {
      console.error('Errore salvataggio lavoro:', err);
      await loading.dismiss();
      const toast = await this.toastCtrl.create({ message: 'Errore nel salvataggio', duration: 2000, color: 'danger' });
      await toast.present();
    }
  }

  async elimina() {
    const alert = await this.alertCtrl.create({
      header:  'Elimina lavoro',
      message: 'Confermi l\'eliminazione?',
      buttons: [
        { text: 'Annulla', role: 'cancel' },
        {
          text: 'Elimina', role: 'destructive',
          handler: async () => {
            await this.jobSvc.delete(this.job!.id!);
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
}
