import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class InstallPromptService {
  readonly canInstall = signal(false);
  private deferredPrompt: any = null;

  constructor() {
    window.addEventListener('beforeinstallprompt', (e: any) => {
      e.preventDefault();
      this.deferredPrompt = e;
      this.canInstall.set(true);
    });

    window.addEventListener('appinstalled', () => {
      this.canInstall.set(false);
      this.deferredPrompt = null;
    });
  }

  async install(): Promise<void> {
    if (!this.deferredPrompt) return;
    this.deferredPrompt.prompt();
    const { outcome } = await this.deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      this.canInstall.set(false);
      this.deferredPrompt = null;
    }
  }
}
