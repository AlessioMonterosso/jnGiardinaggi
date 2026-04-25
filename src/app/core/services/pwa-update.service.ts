import { Injectable, inject, ApplicationRef } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter, first } from 'rxjs/operators';
import { interval, concat } from 'rxjs';
import { ToastController } from '@ionic/angular/standalone';

@Injectable({ providedIn: 'root' })
export class PwaUpdateService {
  private swUpdate   = inject(SwUpdate);
  private appRef     = inject(ApplicationRef);
  private toastCtrl = inject(ToastController);

  init(): void {
    if (!this.swUpdate.isEnabled) return;

    const appIsStable$ = this.appRef.isStable.pipe(first(isStable => isStable));
    const everyHour$   = interval(60 * 60 * 1000);
    concat(appIsStable$, everyHour$).subscribe(() => this.swUpdate.checkForUpdate());

    this.swUpdate.versionUpdates.pipe(
      filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY')
    ).subscribe(() => this.showUpdateToast());
  }

  private async showUpdateToast(): Promise<void> {
    const toast = await this.toastCtrl.create({
      message: 'Nuova versione disponibile',
      duration: 0,
      position: 'bottom',
      cssClass: 'update-toast',
      buttons: [
        {
          text: 'Aggiorna',
          role: 'confirm',
          handler: () => {
            this.swUpdate.activateUpdate().then(() => window.location.reload());
          }
        },
        { text: 'Più tardi', role: 'cancel' }
      ]
    });
    await toast.present();
  }
}
