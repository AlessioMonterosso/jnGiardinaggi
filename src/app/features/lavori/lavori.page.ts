import { Component, inject, DestroyRef } from '@angular/core';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import {
  IonHeader, IonToolbar, IonTitle, IonContent,
  IonButton, IonIcon, IonFab, IonFabButton,
  ModalController, ActionSheetController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addOutline, filterOutline, chevronDownOutline, chevronForwardOutline } from 'ionicons/icons';
import { JobService } from '../../core/services/job.service';
import { Job } from '../../core/models/job.model';
import { JobModalComponent } from './job-modal/job-modal.component';
import { takeUntilDestroyed as tUD } from '@angular/core/rxjs-interop';

type FilterState = 'all' | 'da_fare' | 'completato';

@Component({
  selector: 'app-lavori',
  templateUrl: 'lavori.page.html',
  styleUrls: ['lavori.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonButton, IonIcon, IonFab, IonFabButton,
  ],
})
export class LavoriPage {
  private jobSvc         = inject(JobService);
  private modalCtrl      = inject(ModalController);
  private actionSheetCtrl = inject(ActionSheetController);
  private router         = inject(Router);
  private destroyRef     = inject(DestroyRef);

  allJobs:    Job[] = [];
  activeFilter: FilterState = 'all';

  daFareOpen     = true;
  completatiOpen = false;

  constructor() {
    addIcons({ addOutline, filterOutline, chevronDownOutline, chevronForwardOutline });

    this.jobSvc.getAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(jobs => this.allJobs = jobs);
  }

  // ── Filtered lists ────────────────────────────────────────────
  get daFare(): Job[] {
    return this.allJobs.filter(j => j.status === 'da_fare');
  }

  get completati(): Job[] {
    return this.allJobs.filter(j => j.status === 'completato');
  }

  get showDaFare():    boolean { return this.activeFilter === 'all' || this.activeFilter === 'da_fare'; }
  get showCompletati(): boolean { return this.activeFilter === 'all' || this.activeFilter === 'completato'; }

  get filterLabel(): string {
    const map: Record<FilterState, string> = { all: 'Tutti', da_fare: 'Da fare', completato: 'Completati' };
    return map[this.activeFilter];
  }

  // ── Filter action sheet ───────────────────────────────────────
  async apriFiltra() {
    const sheet = await this.actionSheetCtrl.create({
      header: 'Filtra per stato',
      buttons: [
        { text: 'Tutti',      handler: () => { this.activeFilter = 'all'; } },
        { text: 'Da fare',    handler: () => { this.activeFilter = 'da_fare'; } },
        { text: 'Completati', handler: () => { this.activeFilter = 'completato'; } },
        { text: 'Annulla', role: 'cancel' },
      ],
    });
    await sheet.present();
  }

  // ── Section toggle ────────────────────────────────────────────
  toggleDaFare()     { this.daFareOpen     = !this.daFareOpen; }
  toggleCompletati() { this.completatiOpen = !this.completatiOpen; }

  // ── Navigation ────────────────────────────────────────────────
  vaiAlDettaglio(id: string) {
    this.router.navigate(['/lavori', id]);
  }

  // ── Modal nuovo ───────────────────────────────────────────────
  async apriModalNuovo() {
    const modal = await this.modalCtrl.create({
      component: JobModalComponent,
      componentProps: { job: null },
      cssClass: 'fullscreen-modal',
    });
    await modal.present();
  }

  // ── Formatters ────────────────────────────────────────────────
  formatDate(date: Date): string {
    return new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
  }
}
