import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { backspaceOutline } from 'ionicons/icons';
import { LockService } from '../../../core/services/lock.service';
import { ThemeService } from '../../../core/services/theme.service';

@Component({
  selector: 'app-lock-screen',
  templateUrl: './lock-screen.component.html',
  styleUrls: ['./lock-screen.component.scss'],
  standalone: true,
  imports: [CommonModule, IonIcon],
})
export class LockScreenComponent {
  private lockService  = inject(LockService);
  private themeService = inject(ThemeService);

  pin       = '';
  errorMsg  = '';
  isShaking = false;
  failCount = 0;
  isBlocked = false;

  readonly PIN_LENGTH = 4;
  readonly digits     = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  constructor() {
    addIcons({ backspaceOutline });
  }

  async pressDigit(d: string): Promise<void> {
    if (this.isBlocked || this.pin.length >= this.PIN_LENGTH) return;
    this.pin += d;
    if (this.pin.length === this.PIN_LENGTH) await this.verify();
  }

  deleteDigit(): void {
    if (this.pin.length > 0) this.pin = this.pin.slice(0, -1);
  }

  get logoSrc(): string {
    return this.themeService.isDark()
      ? 'assets/logo/logo-sfondo-black.png'
      : 'assets/logo/logo.png';
  }

  private async verify(): Promise<void> {
    const ok = await this.lockService.verifyPin(this.pin);
    if (ok) { this.lockService.unlock(); return; }

    this.failCount++;
    const msg = this.failCount >= 5 ? 'Troppi tentativi. Riprova tra 30s' : 'PIN errato';
    this.shake(msg);

    if (this.failCount >= 5) {
      this.isBlocked = true;
      setTimeout(() => { this.isBlocked = false; this.failCount = 0; this.errorMsg = ''; }, 30_000);
    }
  }

  private shake(msg: string): void {
    this.isShaking = true;
    this.errorMsg  = msg;
    setTimeout(() => { this.isShaking = false; this.pin = ''; if (this.failCount < 5) this.errorMsg = ''; }, 600);
  }
}
