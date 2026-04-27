import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader, IonToolbar, IonButtons, IonContent, IonSkeletonText, IonIcon,
  ActionSheetController, ModalController,
} from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { addIcons } from 'ionicons';
import {
  logOutOutline, cloudOfflineOutline,
  downloadOutline, closeOutline, lockClosedOutline,
} from 'ionicons/icons';
import { ThemeService } from '../../core/services/theme.service';
import { NetworkStatusService } from '../../core/services/network-status.service';
import { InstallPromptService } from '../../core/services/install-prompt.service';
import { PaymentService, MonthlyTotals } from '../../core/services/payment.service';
import { AppointmentService } from '../../core/services/appointment.service';
import { AuthService } from '../../core/services/auth.service';
import { LockService } from '../../core/services/lock.service';
import { Payment } from '../../core/models/payment.model';
import { Appointment } from '../../core/models/appointment.model';
import { SecurityModalComponent } from '../../shared/components/security-modal/security-modal.component';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader, IonToolbar, IonButtons, IonContent, IonSkeletonText, IonIcon,
  ],
})
export class HomePage {
  private paymentService     = inject(PaymentService);
  private appointmentService = inject(AppointmentService);
  private authService        = inject(AuthService);
  private themeService       = inject(ThemeService);
  private lockService        = inject(LockService);
  private actionSheetCtrl   = inject(ActionSheetController);
  private modalCtrl         = inject(ModalController);
  private router             = inject(Router);

  networkStatus = inject(NetworkStatusService);
  installPrompt = inject(InstallPromptService);

  isLoading     = true;
  monthlyTotals: MonthlyTotals = { fattura: 0, contanti: 0, total: 0 };
  todayAppointments: Appointment[] = [];
  lastPayments: Payment[] = [];

  constructor() {
    addIcons({ logOutOutline, cloudOfflineOutline, downloadOutline, closeOutline, lockClosedOutline });
  }

  async ionViewWillEnter(): Promise<void> {
    this.isLoading = true;
    const now = new Date();
    try {
      const [totals, todayApps, allPayments] = await Promise.all([
        this.paymentService.getTotalByMonth(now.getFullYear(), now.getMonth() + 1),
        firstValueFrom(this.appointmentService.getByDay(now)),
        firstValueFrom(this.paymentService.getAll()),
      ]);
      this.monthlyTotals     = totals;
      this.todayAppointments = todayApps.sort((a, b) => a.timeStart.localeCompare(b.timeStart));
      this.lastPayments      = allPayments.slice(0, 3);
    } finally {
      this.isLoading = false;
    }
  }

  async openUserMenu(): Promise<void> {
    const fireUser = await firstValueFrom(this.authService.currentUser$);
    const email    = fireUser?.email ?? '';
    const pinSet   = this.lockService.isPinSet();

    const sheet = await this.actionSheetCtrl.create({
      header: email,
      cssClass: 'user-menu-sheet',
      buttons: [
        {
          text: pinSet ? 'Sicurezza (PIN attivo)' : 'Imposta blocco PIN',
          icon: 'lock-closed-outline',
          handler: () => this.openSecurityModal(),
        },
        {
          text: 'Esci',
          icon: 'log-out-outline',
          role: 'destructive',
          handler: () => this.logout(),
        },
        { text: 'Annulla', role: 'cancel' },
      ],
    });
    await sheet.present();
  }

  async openSecurityModal(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: SecurityModalComponent,
      cssClass: 'fullscreen-modal',
    });
    await modal.present();
  }

  installApp() { this.installPrompt.install(); }

  dismissInstall(event: Event) {
    event.stopPropagation();
    this.installPrompt.canInstall.set(false);
  }

  private async logout(): Promise<void> {
    await this.authService.logout();
    await this.router.navigateByUrl('/login');
  }

  get greeting(): string {
    return new Date().getHours() < 14 ? 'Buongiorno' : 'Buonasera';
  }

  fmt(val: number): string {
    return '€\u00A0' + new Intl.NumberFormat('it-IT', { maximumFractionDigits: 0 }).format(val ?? 0);
  }
}
