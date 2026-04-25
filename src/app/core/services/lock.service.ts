import { Injectable, signal } from '@angular/core';

const PIN_KEY          = 'dam_pin_hash';
const LOCK_ENABLED_KEY = 'dam_lock_enabled';

@Injectable({ providedIn: 'root' })
export class LockService {
  isLocked = signal(false);

  async init(): Promise<void> {
    if (this.isLockEnabled()) this.isLocked.set(true);
  }

  isLockEnabled(): boolean {
    return localStorage.getItem(LOCK_ENABLED_KEY) === 'true';
  }

  isPinSet(): boolean {
    return !!localStorage.getItem(PIN_KEY);
  }

  async setPin(pin: string): Promise<void> {
    localStorage.setItem(PIN_KEY, await this.hash(pin));
    localStorage.setItem(LOCK_ENABLED_KEY, 'true');
  }

  async verifyPin(pin: string): Promise<boolean> {
    const stored = localStorage.getItem(PIN_KEY);
    return !!stored && (await this.hash(pin)) === stored;
  }

  async disableLock(pin: string): Promise<boolean> {
    if (!(await this.verifyPin(pin))) return false;
    localStorage.removeItem(PIN_KEY);
    localStorage.setItem(LOCK_ENABLED_KEY, 'false');
    return true;
  }

  lock(): void   { this.isLocked.set(true); }
  unlock(): void { this.isLocked.set(false); }

  private async hash(pin: string): Promise<string> {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pin));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  }
}
