import { Component, inject, AfterViewInit, OnDestroy } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { Firestore } from '@angular/fire/firestore';
import { disableNetwork, enableNetwork } from 'firebase/firestore';
import { ThemeService } from './core/services/theme.service';
import { PwaUpdateService } from './core/services/pwa-update.service';
import { LockService } from './core/services/lock.service';
import { LockScreenComponent } from './shared/components/lock-screen/lock-screen.component';

@Component({
  selector: 'app-root',
  template: `
    <ion-app>
      <ion-router-outlet></ion-router-outlet>
      @if (lockService.isLocked()) {
        <app-lock-screen></app-lock-screen>
      }
    </ion-app>
  `,
  standalone: true,
  imports: [IonApp, IonRouterOutlet, LockScreenComponent],
})
export class AppComponent implements AfterViewInit, OnDestroy {
  private firestore = inject(Firestore);
  lockService       = inject(LockService);

  // Blocca solo se l'app era in background per almeno 15 secondi
  private readonly LOCK_DELAY_MS = 15_000;
  private hiddenAt: number | null = null;

  constructor() {
    inject(ThemeService).init();
    inject(PwaUpdateService).init();
    this.lockService.init();
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.hideSplash(), 600);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
  }

  ngOnDestroy(): void {
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
  }

  private onVisibilityChange = async (): Promise<void> => {
    if (document.hidden) {
      disableNetwork(this.firestore as any);
      this.hiddenAt = Date.now();
    } else {
      enableNetwork(this.firestore as any);
      if (this.hiddenAt && (Date.now() - this.hiddenAt) >= this.LOCK_DELAY_MS) {
        if (this.lockService.isLockEnabled()) this.lockService.lock();
      }
      this.hiddenAt = null;
    }
  };

  private hideSplash(): void {
    const splash = document.getElementById('app-splash');
    if (!splash) return;
    splash.classList.add('splash-hidden');
    setTimeout(() => splash.remove(), 500);
  }
}
