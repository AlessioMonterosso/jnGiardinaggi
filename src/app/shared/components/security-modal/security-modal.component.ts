import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonIcon,
  ModalController, ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { backspaceOutline, closeOutline } from 'ionicons/icons';
import { LockService } from '../../../core/services/lock.service';

type Step = 'menu' | 'enter-new' | 'confirm-new' | 'enter-current';

@Component({
  selector: 'app-security-modal',
  templateUrl: './security-modal.component.html',
  styleUrls: ['./security-modal.component.scss'],
  standalone: true,
  imports: [CommonModule, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonIcon],
})
export class SecurityModalComponent implements OnInit {
  private lockService = inject(LockService);
  private modalCtrl  = inject(ModalController);
  private toastCtrl  = inject(ToastController);

  pinSet    = false;
  step: Step = 'menu';
  pin       = '';
  firstPin  = '';
  errorMsg  = '';
  isShaking = false;

  readonly PIN_LENGTH = 4;
  readonly digits     = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  get stepTitle(): string {
    const titles: Record<Step, string> = {
      'menu': 'Sicurezza', 'enter-new': 'Nuovo PIN',
      'confirm-new': 'Conferma PIN', 'enter-current': 'PIN attuale',
    };
    return titles[this.step];
  }

  constructor() { addIcons({ backspaceOutline, closeOutline }); }

  ngOnInit(): void { this.pinSet = this.lockService.isPinSet(); }

  startSetup():   void { this.reset(); this.step = 'enter-new'; }
  startDisable(): void { this.reset(); this.step = 'enter-current'; }
  goBack():       void { this.reset(); this.step = 'menu'; }
  close():        void { this.modalCtrl.dismiss(); }

  async pressDigit(d: string): Promise<void> {
    if (this.pin.length >= this.PIN_LENGTH) return;
    this.pin += d;
    if (this.pin.length === this.PIN_LENGTH) await this.handleComplete();
  }

  deleteDigit(): void { if (this.pin.length > 0) this.pin = this.pin.slice(0, -1); }

  private async handleComplete(): Promise<void> {
    if (this.step === 'enter-new') {
      this.firstPin = this.pin; this.pin = ''; this.step = 'confirm-new'; return;
    }
    if (this.step === 'confirm-new') {
      if (this.pin !== this.firstPin) { this.shake('I PIN non coincidono'); return; }
      await this.lockService.setPin(this.pin);
      await this.toast('PIN impostato. L\'app si bloccherà automaticamente.');
      this.modalCtrl.dismiss({ changed: true }); return;
    }
    if (this.step === 'enter-current') {
      const ok = await this.lockService.disableLock(this.pin);
      if (!ok) { this.shake('PIN errato'); return; }
      await this.toast('Blocco disattivato');
      this.modalCtrl.dismiss({ changed: true });
    }
  }

  private shake(msg: string): void {
    this.isShaking = true; this.errorMsg = msg;
    setTimeout(() => { this.isShaking = false; this.pin = ''; this.errorMsg = ''; }, 600);
  }

  private reset(): void { this.pin = ''; this.firstPin = ''; this.errorMsg = ''; }

  private async toast(message: string): Promise<void> {
    const t = await this.toastCtrl.create({ message, duration: 2500, position: 'bottom' });
    await t.present();
  }
}
