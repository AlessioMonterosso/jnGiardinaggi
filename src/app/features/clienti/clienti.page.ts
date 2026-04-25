import { Component, inject, DestroyRef } from '@angular/core';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonSearchbar,
  IonFab, IonFabButton, IonIcon, IonButton, IonButtons,
  ModalController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addOutline, searchOutline, chevronForwardOutline } from 'ionicons/icons';
import { ClientService } from '../../core/services/client.service';
import { Client } from '../../core/models/client.model';
import { ClientModalComponent } from './client-modal/client-modal.component';
import { Observable, map, combineLatest, BehaviorSubject } from 'rxjs';

@Component({
  selector: 'app-clienti',
  templateUrl: 'clienti.page.html',
  styleUrls: ['clienti.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonSearchbar,
    IonFab, IonFabButton, IonIcon, IonButton, IonButtons,
  ],
})
export class ClientiPage {
  private clientService = inject(ClientService);
  private modalCtrl     = inject(ModalController);
  private router        = inject(Router);
  private destroyRef    = inject(DestroyRef);

  showSearch = false;
  private searchTerm$ = new BehaviorSubject<string>('');
  clientiFiltrati$: Observable<Client[]>;

  constructor() {
    addIcons({ addOutline, searchOutline, chevronForwardOutline });

    this.clientiFiltrati$ = combineLatest([
      this.clientService.getAll(),
      this.searchTerm$,
    ]).pipe(
      map(([clients, term]) => {
        const filtered = term
          ? clients.filter(c =>
              c.name.toLowerCase().includes(term.toLowerCase()) ||
              (c.phone ?? '').toLowerCase().includes(term.toLowerCase())
            )
          : [...clients];
        return filtered.sort((a, b) => a.name.localeCompare(b.name, 'it'));
      }),
      takeUntilDestroyed(this.destroyRef)
    );
  }

  onSearch(event: any) {
    this.searchTerm$.next(event.detail.value ?? '');
  }

  toggleSearch() {
    this.showSearch = !this.showSearch;
    if (!this.showSearch) {
      this.searchTerm$.next('');
    }
  }

  async apriFormNuovoCliente() {
    const modal = await this.modalCtrl.create({
      component: ClientModalComponent,
      componentProps: { client: null },
      cssClass: 'fullscreen-modal',
    });
    await modal.present();
  }

  vaiAlDettaglio(id: string) {
    this.router.navigate(['/clienti', id]);
  }

  getInitials(name: string): string {
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map(w => w[0]?.toUpperCase() ?? '')
      .join('');
  }
}
