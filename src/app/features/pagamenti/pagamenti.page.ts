import { Component, inject, DestroyRef, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import {
  IonHeader, IonToolbar, IonTitle, IonContent,
  IonButton, IonIcon, IonFab, IonFabButton,
  IonSegment, IonSegmentButton, IonLabel,
  ModalController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { chevronBackOutline, chevronForwardOutline, addOutline } from 'ionicons/icons';
import { BehaviorSubject, switchMap } from 'rxjs';
import { PaymentService, YearReport } from '../../core/services/payment.service';
import { Payment } from '../../core/models/payment.model';
import { PaymentModalComponent } from './payment-modal/payment-modal.component';

export interface WeekDayBar {
  label: string; date: Date;
  fattura: number; contanti: number;
  totalH: number; fatturaH: number; contantiH: number;
  isToday: boolean;
}

export interface MonthBar {
  label: string; month: number;
  fattura: number; contanti: number; total: number;
  totalH: number; fatturaH: number; contantiH: number;
}

const MONTH_NAMES  = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno',
                      'Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
const MONTH_SHORT  = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];
const WEEK_LABELS  = ['Lun','Mar','Mer','Gio','Ven','Sab','Dom'];

@Component({
  selector: 'app-pagamenti',
  templateUrl: 'pagamenti.page.html',
  styleUrls: ['pagamenti.page.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonButton, IonIcon, IonFab, IonFabButton,
    IonSegment, IonSegmentButton, IonLabel,
  ],
})
export class PagamentiPage {
  private paymentSvc = inject(PaymentService);
  private modalCtrl  = inject(ModalController);
  private destroyRef = inject(DestroyRef);
  private cdr        = inject(ChangeDetectorRef);

  private readonly now = new Date();

  // ── Segment ───────────────────────────────────────────────────
  activeView: 'movimenti' | 'report' = 'movimenti';

  // ── Movimenti state ───────────────────────────────────────────
  private period$ = new BehaviorSubject<{ year: number; month: number }>({
    year:  this.now.getFullYear(),
    month: this.now.getMonth() + 1,
  });

  payments: Payment[]   = [];
  weekDays: WeekDayBar[] = [];
  movLoading = true;

  // ── Report state ──────────────────────────────────────────────
  repYear                           = this.now.getFullYear();
  repData: YearReport               = { fattura: 0, contanti: 0, total: 0, byMonth: [] };
  repPrevTotal                      = 0;
  repMonthBars: MonthBar[]          = [];
  repLoading                        = false;
  repLoaded                         = false;

  readonly monthNames = MONTH_NAMES;

  constructor() {
    addIcons({ chevronBackOutline, chevronForwardOutline, addOutline });

    this.period$.pipe(
      switchMap(({ year, month }) => {
        this.movLoading = true;
        const from = new Date(year, month - 1, 1,  0,  0,  0);
        const to   = new Date(year, month,     0, 23, 59, 59);
        return this.paymentSvc.getByDateRange(from, to);
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(payments => {
      this.payments   = payments;
      this.weekDays   = this.buildWeekChart(payments);
      this.movLoading = false;
      this.cdr.markForCheck();
    });
  }

  // ── Segment ───────────────────────────────────────────────────
  onViewChange(ev: CustomEvent) {
    this.activeView = ev.detail.value;
    if (this.activeView === 'report' && !this.repLoaded) {
      this.loadReport(this.repYear);
    }
  }

  // ── Movimenti nav ─────────────────────────────────────────────
  get movYear()  { return this.period$.value.year; }
  get movMonth() { return this.period$.value.month; }
  get monthLabel() { return `${MONTH_NAMES[this.movMonth - 1]} ${this.movYear}`; }

  prevMonth() {
    const { year, month } = this.period$.value;
    this.period$.next(month === 1
      ? { year: year - 1, month: 12 }
      : { year, month: month - 1 });
  }

  nextMonth() {
    const { year, month } = this.period$.value;
    this.period$.next(month === 12
      ? { year: year + 1, month: 1 }
      : { year, month: month + 1 });
  }

  // ── Movimenti KPI ─────────────────────────────────────────────
  get totFattura()  { return this.payments.filter(p => p.paymentMethod === 'fattura').reduce((s, p) => s + p.amount, 0); }
  get totContanti() { return this.payments.filter(p => p.paymentMethod === 'contanti').reduce((s, p) => s + p.amount, 0); }
  get totale()      { return this.totFattura + this.totContanti; }

  // ── Report nav ────────────────────────────────────────────────
  prevRepYear() { this.repYear--; this.loadReport(this.repYear); }
  nextRepYear() { this.repYear++; this.loadReport(this.repYear); }

  async loadReport(year: number) {
    this.repLoading = true;
    try {
      const [current, prev] = await Promise.all([
        this.paymentSvc.getTotalByYear(year),
        this.paymentSvc.getTotalByYear(year - 1),
      ]);
      this.repData      = current;
      this.repPrevTotal = prev.total;
      this.repMonthBars = this.buildMonthBars(current.byMonth);
      this.repLoaded    = true;
    } catch (err) {
      console.error('Errore caricamento report annuale:', err);
    }
    this.repLoading = false;
    this.cdr.markForCheck();
  }

  get repDeltaPct(): number {
    if (this.repPrevTotal === 0) return this.repData.total > 0 ? 100 : 0;
    return Math.round(((this.repData.total - this.repPrevTotal) / this.repPrevTotal) * 100);
  }

  get repDeltaPositive(): boolean { return this.repDeltaPct >= 0; }

  goToMovimenti(monthIndex: number) {
    this.period$.next({ year: this.repYear, month: monthIndex + 1 });
    this.activeView = 'movimenti';
  }

  // ── Monthly chart ─────────────────────────────────────────────
  private buildMonthBars(byMonth: YearReport['byMonth']): MonthBar[] {
    const MAX_H  = 50;
    const maxTot = Math.max(...byMonth.map(m => m.total), 1);

    return byMonth.map((m, i) => {
      const totalH   = (m.total / maxTot) * MAX_H;
      const fatturaH = m.total > 0 ? (m.fattura / m.total) * totalH : 0;
      return {
        label:     MONTH_SHORT[i],
        month:     m.month,
        fattura:   m.fattura,
        contanti:  m.contanti,
        total:     m.total,
        totalH,
        fatturaH,
        contantiH: totalH - fatturaH,
      };
    });
  }

  // ── Weekly chart ──────────────────────────────────────────────
  private buildWeekChart(payments: Payment[]): WeekDayBar[] {
    const today  = new Date();
    const monday = this.getMonday(today);

    const days: WeekDayBar[] = WEEK_LABELS.map((label, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return { label, date: d, fattura: 0, contanti: 0, totalH: 0, fatturaH: 0, contantiH: 0, isToday: this.sameDay(d, today) };
    });

    payments.forEach(p => {
      const idx = this.weekDayIndex(p.date, monday);
      if (idx >= 0 && idx < 7) {
        if (p.paymentMethod === 'fattura') days[idx].fattura += p.amount;
        else                               days[idx].contanti += p.amount;
      }
    });

    const MAX_H  = 60;
    const maxTot = Math.max(...days.map(d => d.fattura + d.contanti), 1);
    days.forEach(d => {
      const total  = d.fattura + d.contanti;
      d.totalH    = (total / maxTot) * MAX_H;
      d.fatturaH  = total > 0 ? (d.fattura / total) * d.totalH : 0;
      d.contantiH = d.totalH - d.fatturaH;
    });

    return days;
  }

  private getMonday(d: Date): Date {
    const copy = new Date(d);
    const day  = copy.getDay();
    copy.setDate(copy.getDate() + (day === 0 ? -6 : 1 - day));
    copy.setHours(0, 0, 0, 0);
    return copy;
  }

  private weekDayIndex(date: Date, monday: Date): number {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return Math.round((d.getTime() - monday.getTime()) / 86_400_000);
  }

  private sameDay(a: Date, b: Date): boolean {
    return a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
  }

  // ── Modal ─────────────────────────────────────────────────────
  async apriModalNuovo() {
    const modal = await this.modalCtrl.create({
      component: PaymentModalComponent,
      componentProps: { payment: null },
      cssClass: 'fullscreen-modal',
    });
    await modal.present();
  }

  async apriModalModifica(payment: Payment) {
    const modal = await this.modalCtrl.create({
      component: PaymentModalComponent,
      componentProps: { payment },
      cssClass: 'fullscreen-modal',
    });
    await modal.present();
  }

  // ── Formatters ────────────────────────────────────────────────
  formatAmount(amount: number): string {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amount ?? 0);
  }

  formatDate(date: Date): string {
    return new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
  }
}
