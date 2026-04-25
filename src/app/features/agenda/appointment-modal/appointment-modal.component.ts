import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonItem,
  IonInput, IonTextarea, IonSelect, IonSelectOption,
  IonButtons, IonNote, IonSearchbar,
  ModalController, AlertController, LoadingController, ToastController
} from '@ionic/angular/standalone';
import { firstValueFrom } from 'rxjs';
import { AppointmentService } from '../../../core/services/appointment.service';
import { ClientService } from '../../../core/services/client.service';
import { JobService } from '../../../core/services/job.service';
import { Appointment } from '../../../core/models/appointment.model';
import { Client } from '../../../core/models/client.model';
import { Job } from '../../../core/models/job.model';

const DURATIONS = [
  { value: 30,  label: '30 min' },
  { value: 60,  label: '1h' },
  { value: 90,  label: '1h 30min' },
  { value: 120, label: '2h' },
  { value: 180, label: '3h' },
  { value: -1,  label: 'Altro…' },
];

@Component({
  selector: 'app-appointment-modal',
  templateUrl: 'appointment-modal.component.html',
  styleUrls: ['appointment-modal.component.scss'],
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonItem,
    IonInput, IonTextarea, IonSelect, IonSelectOption,
    IonButtons, IonNote, IonSearchbar,
  ],
})
export class AppointmentModalComponent implements OnInit {
  @Input() appointment: Appointment | null = null;
  @Input() preselectedDate: Date = new Date();

  private fb                 = inject(FormBuilder);
  private appointmentService = inject(AppointmentService);
  private clientService      = inject(ClientService);
  private jobService         = inject(JobService);
  private modalCtrl          = inject(ModalController);
  private alertCtrl          = inject(AlertController);
  private loadingCtrl        = inject(LoadingController);
  private toastCtrl          = inject(ToastController);

  readonly durations = DURATIONS;

  // ── Link mode ─────────────────────────────────────────────────
  linkMode: 'client' | 'job' = 'client';

  // ── Client search ─────────────────────────────────────────────
  allClients:      Client[] = [];
  filteredClients: Client[] = [];
  selectedClientName = '';
  showClientList     = false;

  // ── Job search ────────────────────────────────────────────────
  allJobs:      Job[] = [];
  filteredJobs: Job[] = [];
  selectedJobDescription = '';
  selectedJobClientName  = '';
  showJobList            = false;

  form = this.fb.group({
    title:          [''],
    clientId:       [''],
    jobId:          [''],
    date:           ['',  Validators.required],
    timeStart:      ['',  Validators.required],
    duration:       [60,  Validators.required],
    customDuration: [null as number | null],
    workType:       [''],
    address:        [''],
    notes:          [''],
    status:         ['da_confermare', Validators.required],
  });

  get isEditing()          { return !!this.appointment?.id; }
  get isCustomDuration()   { return this.form.get('duration')?.value === -1; }
  get title()              { return this.isEditing ? 'Modifica appuntamento' : 'Nuovo appuntamento'; }

  // ── Init ─────────────────────────────────────────────────────
  async ngOnInit() {
    const [clients, jobs] = await Promise.all([
      firstValueFrom(this.clientService.getAll()),
      firstValueFrom(this.jobService.getAll()),
    ]);
    this.allClients      = clients;
    this.filteredClients = [...clients];
    this.allJobs         = jobs;
    this.filteredJobs    = [...jobs];

    if (this.appointment) {
      this.populateForm();
    } else {
      const dateStr = this.toDateString(this.preselectedDate);
      this.form.patchValue({ date: dateStr });
    }
  }

  private populateForm() {
    const a = this.appointment!;

    // Determina link mode
    if (a.jobId) {
      this.linkMode = 'job';
      const job = this.allJobs.find(j => j.id === a.jobId);
      this.selectedJobDescription = job?.description ?? a.jobDescription ?? '';
      this.selectedJobClientName  = job?.clientName  ?? '';
    } else {
      this.linkMode = 'client';
      const client = this.allClients.find(c => c.id === a.clientId);
      this.selectedClientName = client?.name ?? a.clientName ?? '';
    }

    const knownDur = DURATIONS.find(d => d.value === a.duration && d.value !== -1);
    const dateStr  = this.toDateString(a.date instanceof Date ? a.date : new Date(a.date));

    this.form.patchValue({
      title:          a.title    ?? '',
      clientId:       a.clientId ?? '',
      jobId:          a.jobId    ?? '',
      date:           dateStr,
      timeStart:      a.timeStart,
      duration:       knownDur ? a.duration : -1,
      customDuration: knownDur ? null : a.duration,
      workType:       a.workType ?? '',
      address:        a.address  ?? '',
      notes:          a.notes    ?? '',
      status:         a.status,
    });
  }

  // ── Link mode ─────────────────────────────────────────────────
  setLinkMode(mode: 'client' | 'job') {
    this.linkMode = mode;
    this.showClientList = false;
    this.showJobList    = false;
  }

  // ── Client search ─────────────────────────────────────────────
  onClientSearch(ev: CustomEvent) {
    const term = ((ev.detail.value as string) ?? '').toLowerCase();
    this.filteredClients = term
      ? this.allClients.filter(c => c.name.toLowerCase().includes(term))
      : [...this.allClients];
    this.showClientList = true;
  }

  selectClient(client: Client) {
    this.form.patchValue({ clientId: client.id });
    this.selectedClientName = client.name;
    this.filteredClients    = [...this.allClients];
    this.showClientList     = false;
  }

  openClientSearch() {
    this.filteredClients = [...this.allClients];
    this.showClientList  = true;
  }

  closeClientList() {
    setTimeout(() => { this.showClientList = false; }, 200);
  }

  clearClient() {
    this.form.patchValue({ clientId: '' });
    this.selectedClientName = '';
  }

  // ── Job search ────────────────────────────────────────────────
  onJobSearch(ev: CustomEvent) {
    const term = ((ev.detail.value as string) ?? '').toLowerCase();
    this.filteredJobs = term
      ? this.allJobs.filter(j =>
          j.description.toLowerCase().includes(term) ||
          (j.clientName ?? '').toLowerCase().includes(term))
      : [...this.allJobs];
    this.showJobList = true;
  }

  selectJob(job: Job) {
    this.form.patchValue({ jobId: job.id });
    this.selectedJobDescription = job.description;
    this.selectedJobClientName  = job.clientName ?? '';
    this.filteredJobs           = [...this.allJobs];
    this.showJobList            = false;
  }

  openJobSearch() {
    this.filteredJobs = [...this.allJobs];
    this.showJobList  = true;
  }

  closeJobList() {
    setTimeout(() => { this.showJobList = false; }, 200);
  }

  clearJob() {
    this.form.patchValue({ jobId: '' });
    this.selectedJobDescription = '';
    this.selectedJobClientName  = '';
  }

  // ── Save / Delete ─────────────────────────────────────────────
  async salva() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    const v = this.form.value;
    const actualDuration = v.duration === -1
      ? (v.customDuration ?? 60)
      : (v.duration ?? 60);

    const basePayload: Omit<Appointment, 'id' | 'createdAt'> = {
      date:      this.parseLocalDate(v.date!),
      timeStart: v.timeStart!,
      duration:  actualDuration,
      status:    v.status as Appointment['status'],
      ...(v.title    ? { title: v.title }       : {}),
      ...(v.workType ? { workType: v.workType } : {}),
      ...(v.address  ? { address: v.address }   : {}),
      ...(v.notes    ? { notes: v.notes }       : {}),
    };

    // Link: client o job si escludono a vicenda
    if (this.linkMode === 'client' && v.clientId) {
      const client = this.allClients.find(c => c.id === v.clientId);
      Object.assign(basePayload, {
        clientId:   v.clientId,
        clientName: client?.name ?? this.selectedClientName,
      });
    } else if (this.linkMode === 'job' && v.jobId) {
      const job = this.allJobs.find(j => j.id === v.jobId);
      Object.assign(basePayload, {
        jobId:          v.jobId,
        jobDescription: job?.description ?? this.selectedJobDescription,
      });
    }

    const loading = await this.loadingCtrl.create({ message: 'Salvataggio…' });
    await loading.present();
    try {
      if (this.isEditing) {
        await this.appointmentService.update(this.appointment!.id!, basePayload);
      } else {
        await this.appointmentService.create(basePayload);
      }
      await loading.dismiss();
      const toast = await this.toastCtrl.create({ message: 'Salvato!', duration: 2000, color: 'success' });
      await toast.present();
      this.modalCtrl.dismiss({ saved: true });
    } catch (err) {
      console.error('Errore salvataggio appuntamento:', err);
      await loading.dismiss();
      const toast = await this.toastCtrl.create({ message: 'Errore nel salvataggio', duration: 2000, color: 'danger' });
      await toast.present();
    }
  }

  async elimina() {
    const alert = await this.alertCtrl.create({
      header:  'Elimina appuntamento',
      message: 'Confermi l\'eliminazione?',
      buttons: [
        { text: 'Annulla', role: 'cancel' },
        {
          text: 'Elimina', role: 'destructive',
          handler: async () => {
            await this.appointmentService.delete(this.appointment!.id!);
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

  // ── Helpers ───────────────────────────────────────────────────
  err(field: string, error: string) {
    const c = this.form.get(field);
    return c?.touched && c?.hasError(error);
  }

  private parseLocalDate(s: string): Date {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  private toDateString(d: Date): string {
    const y   = d.getFullYear();
    const m   = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}
