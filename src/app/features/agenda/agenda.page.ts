import { Component, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { CommonModule } from '@angular/common';
import {
  IonHeader, IonToolbar, IonContent, IonSegment, IonSegmentButton,
  IonLabel, IonFab, IonFabButton, IonIcon, IonButton, IonButtons,
  IonBadge, ModalController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addOutline, chevronBackOutline, chevronForwardOutline } from 'ionicons/icons';
import { AppointmentService } from '../../core/services/appointment.service';
import { Appointment } from '../../core/models/appointment.model';
import { AppointmentModalComponent } from './appointment-modal/appointment-modal.component';

export type AgendaView = 'giorno' | 'settimana' | 'mese';

@Component({
  selector: 'app-agenda',
  templateUrl: 'agenda.page.html',
  styleUrls: ['agenda.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader, IonToolbar, IonContent, IonSegment, IonSegmentButton,
    IonLabel, IonFab, IonFabButton, IonIcon, IonButton, IonButtons, IonBadge,
  ],
})
export class AgendaPage {
  private appointmentService = inject(AppointmentService);
  private modalCtrl          = inject(ModalController);

  view: AgendaView  = 'giorno';
  selectedDate      = new Date();
  today             = new Date();
  allAppointments: Appointment[] = [];
  isLoading         = false;

  // Mese attualmente caricato da Firestore
  private currentViewMonth = {
    year:  new Date().getFullYear(),
    month: new Date().getMonth() + 1,
  };

  // Contatore versione dati — incrementato ad ogni reload, invalida tutte le cache dei getter
  private _dataVersion = 0;

  // Cache calendarDays — evita ricalcoli ad ogni ciclo CD
  private _calendarDays: { date: Date; isCurrentMonth: boolean; hasApps: boolean }[] = [];
  private _calendarDaysKey = '';

  /** Ore visualizzate nella vista settimanale: 07–20 */
  readonly hours = Array.from({ length: 14 }, (_, i) => i + 7);

  /** Nomi brevi giorni per la griglia mensile */
  readonly weekdayHeaders = ['L', 'M', 'M', 'G', 'V', 'S', 'D'];

  constructor() {
    addIcons({ addOutline, chevronBackOutline, chevronForwardOutline });
  }

  // ── Ionic lifecycle — ricarica al ritorno sul tab ──────────────
  async ionViewWillEnter(): Promise<void> {
    await this.loadCurrentMonth();
  }

  // ── Navigation ────────────────────────────────────────────────
  onViewChange(ev: CustomEvent) {
    this.view = ev.detail.value as AgendaView;
  }

  async prev(): Promise<void> {
    const d = new Date(this.selectedDate);
    if (this.view === 'giorno')          d.setDate(d.getDate() - 1);
    else if (this.view === 'settimana')  d.setDate(d.getDate() - 7);
    else                                 d.setMonth(d.getMonth() - 1);
    this.selectedDate = d;
    await this.syncMonth();
  }

  async next(): Promise<void> {
    const d = new Date(this.selectedDate);
    if (this.view === 'giorno')          d.setDate(d.getDate() + 1);
    else if (this.view === 'settimana')  d.setDate(d.getDate() + 7);
    else                                 d.setMonth(d.getMonth() + 1);
    this.selectedDate = d;
    await this.syncMonth();
  }

  /** Ricarica da Firestore solo se il mese di selectedDate è cambiato */
  private async syncMonth(): Promise<void> {
    const y = this.selectedDate.getFullYear();
    const m = this.selectedDate.getMonth() + 1;
    if (this.currentViewMonth.year !== y || this.currentViewMonth.month !== m) {
      this.currentViewMonth = { year: y, month: m };
      await this.loadCurrentMonth();
    }
  }

  /** Carica gli appuntamenti del mese corrente con firstValueFrom (one-shot) */
  private async loadCurrentMonth(): Promise<void> {
    this.isLoading = true;
    try {
      const { year, month } = this.currentViewMonth;
      this.allAppointments = await firstValueFrom(
        this.appointmentService.getByMonth(year, month)
      );
      this._dataVersion++; // invalida le cache di tutti i getter dipendenti da allAppointments
    } finally {
      this.isLoading = false;
    }
  }

  get headerLabel(): string {
    const locale = 'it-IT';
    if (this.view === 'giorno') {
      return this.selectedDate.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' });
    }
    if (this.view === 'settimana') {
      const end = new Date(this.weekStart);
      end.setDate(end.getDate() + 6);
      const s = this.weekStart.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
      const e = end.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
      return `${s} – ${e}`;
    }
    return this.selectedDate.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
  }

  // ── Day view ──────────────────────────────────────────────────

  // Cache weekDays — ricalcola solo quando selectedDate cambia settimana
  private _weekDays: Date[] = [];
  private _weekDaysKey = '';

  get weekDays(): Date[] {
    const mon = this.getMondayOf(this.selectedDate);
    const key = mon.toDateString();
    if (key === this._weekDaysKey) return this._weekDays;
    this._weekDays = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(mon);
      d.setDate(d.getDate() + i);
      return d;
    });
    this._weekDaysKey = key;
    return this._weekDays;
  }

  // Cache dayAppointments — ricalcola solo quando cambia giorno o dati
  private _dayAppointments: Appointment[] = [];
  private _dayAppKey = '';

  get dayAppointments(): Appointment[] {
    const key = `${this.selectedDate.toDateString()}_v${this._dataVersion}`;
    if (key === this._dayAppKey) return this._dayAppointments;
    this._dayAppointments = this.allAppointments
      .filter(a => this.isSameDay(a.date, this.selectedDate))
      .sort((a, b) => a.timeStart.localeCompare(b.timeStart));
    this._dayAppKey = key;
    return this._dayAppointments;
  }

  // trackBy functions — impediscono ad Angular di distruggere/ricreare il DOM
  // iOS Safari ha un delay tra touchstart e click; senza trackBy, Angular
  // ricrea gli elementi nel mezzo e il click si perde.
  trackByDate(_: number, date: Date): number { return date.getTime(); }
  trackByAppId(_: number, app: Appointment): string { return app.id ?? app.timeStart + (app.clientName ?? app.jobId ?? ''); }
  trackByIndex(index: number): number { return index; }

  /** Restituisce il nome da visualizzare: clientName > jobDescription (troncata) > title > '—' */
  getAppDisplayName(app: Appointment): string {
    if (app.clientName) return app.clientName;
    if (app.jobDescription) {
      return app.jobDescription.length > 30
        ? app.jobDescription.slice(0, 30) + '…'
        : app.jobDescription;
    }
    if (app.title) return app.title;
    return '—';
  }

  async selectDay(date: Date): Promise<void> {
    this.selectedDate = new Date(date);
    if (this.view === 'mese') this.view = 'giorno';
    await this.syncMonth();
  }

  // ── Week view ─────────────────────────────────────────────────
  get weekStart(): Date { return this.getMondayOf(this.selectedDate); }

  getWeekDay(i: number): Date {
    const d = new Date(this.weekStart);
    d.setDate(d.getDate() + i);
    return d;
  }

  getWeekDayAppointments(i: number): Appointment[] {
    const d = this.getWeekDay(i);
    return this.allAppointments
      .filter(a => this.isSameDay(a.date, d))
      .sort((a, b) => a.timeStart.localeCompare(b.timeStart));
  }

  /** px dall'inizio della griglia (07:00 = 0px, 1px = 1min) */
  getAppTop(app: Appointment): number {
    const [h, m] = app.timeStart.split(':').map(Number);
    return Math.max(0, (h - 7) * 60 + m);
  }

  /** px di altezza proporzionale alla durata */
  getAppHeight(app: Appointment): number {
    return Math.max(20, app.duration);
  }

  // ── Month view ────────────────────────────────────────────────
  get calendarDays(): { date: Date; isCurrentMonth: boolean; hasApps: boolean }[] {
    const year  = this.selectedDate.getFullYear();
    const month = this.selectedDate.getMonth();
    const key   = `${year}-${month}_v${this._dataVersion}`;
    if (key === this._calendarDaysKey) return this._calendarDays;

    const start = this.getMondayOf(new Date(year, month, 1));
    const endOfMonth = new Date(year, month + 1, 0);
    const end   = this.getSundayOf(endOfMonth);
    const days  = [];
    const cur   = new Date(start);
    while (cur <= end) {
      const dateSnap = new Date(cur);
      days.push({
        date: dateSnap,
        isCurrentMonth: dateSnap.getMonth() === month,
        hasApps: this.allAppointments.some(a => this.isSameDay(a.date, dateSnap)),
      });
      cur.setDate(cur.getDate() + 1);
    }
    this._calendarDaysKey = key;
    this._calendarDays = days;
    return days;
  }

  // ── Modal ─────────────────────────────────────────────────────
  async openModal(appointment?: Appointment): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: AppointmentModalComponent,
      componentProps: { appointment: appointment ?? null, preselectedDate: this.selectedDate },
      cssClass: 'fullscreen-modal',
    });
    await modal.present();
    // Ricarica dopo chiusura modal (potrebbe esserci un nuovo appuntamento)
    await modal.onDidDismiss();
    await this.loadCurrentMonth();
  }

  // ── Helpers ───────────────────────────────────────────────────
  isSameDay(d1: Date, d2: Date): boolean {
    return d1.getFullYear() === d2.getFullYear()
        && d1.getMonth()    === d2.getMonth()
        && d1.getDate()     === d2.getDate();
  }

  isToday(d: Date): boolean    { return this.isSameDay(d, this.today); }
  isSelected(d: Date): boolean { return this.isSameDay(d, this.selectedDate); }

  getDayName(date: Date): string {
    return date.toLocaleDateString('it-IT', { weekday: 'short' }).slice(0, 3).toUpperCase();
  }

  getStatusColor(status: string): string {
    const map: Record<string, string> = {
      confermato:    'success',
      da_confermare: 'warning',
      completato:    'medium',
      annullato:     'danger',
    };
    return map[status] ?? 'medium';
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

  formatDuration(min: number): string {
    if (min < 60) return `${min}min`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m ? `${h}h ${m}min` : `${h}h`;
  }

  private getMondayOf(date: Date): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const dow = d.getDay();
    const diff = dow === 0 ? -6 : 1 - dow;
    d.setDate(d.getDate() + diff);
    return d;
  }

  private getSundayOf(date: Date): Date {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    const dow = d.getDay();
    const diff = dow === 0 ? 0 : 7 - dow;
    d.setDate(d.getDate() + diff);
    return d;
  }
}
