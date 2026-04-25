import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonItem,
  IonInput, IonTextarea, IonNote, IonButtons,
  ModalController, AlertController, LoadingController, ToastController
} from '@ionic/angular/standalone';
import { ClientService } from '../../../core/services/client.service';
import { Client } from '../../../core/models/client.model';

@Component({
  selector: 'app-client-modal',
  templateUrl: 'client-modal.component.html',
  styleUrls: ['client-modal.component.scss'],
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonItem,
    IonInput, IonTextarea, IonNote, IonButtons,
  ],
})
export class ClientModalComponent implements OnInit {
  @Input() client: Client | null = null;

  private fb          = inject(FormBuilder);
  private clientSvc   = inject(ClientService);
  private modalCtrl   = inject(ModalController);
  private alertCtrl   = inject(AlertController);
  private loadingCtrl = inject(LoadingController);
  private toastCtrl   = inject(ToastController);

  form = this.fb.group({
    name:    ['', Validators.required],
    phone:   [''],
    address: [''],
    email:   ['', Validators.email],
    notes:   [''],
  });

  get isEditing() { return !!this.client?.id; }
  get title()     { return this.isEditing ? 'Modifica cliente' : 'Nuovo cliente'; }

  ngOnInit() {
    if (this.client) {
      this.form.patchValue({
        name:    this.client.name,
        phone:   this.client.phone,
        address: this.client.address ?? '',
        email:   this.client.email   ?? '',
        notes:   this.client.notes   ?? '',
      });
    }
  }

  async salva() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    const v = this.form.value;
    const payload: Omit<Client, 'id' | 'createdAt'> = {
      name:    v.name!,
      phone:   v.phone!,
      address: v.address ?? '',
      email:   v.email   ?? '',
      notes:   v.notes   ?? '',
    };

    const loading = await this.loadingCtrl.create({ message: 'Salvataggio…' });
    await loading.present();
    try {
      if (this.isEditing) {
        await this.clientSvc.update(this.client!.id!, payload);
      } else {
        await this.clientSvc.create(payload);
      }
      await loading.dismiss();
      const toast = await this.toastCtrl.create({ message: 'Salvato!', duration: 2000, color: 'success' });
      await toast.present();
      this.modalCtrl.dismiss({ saved: true });
    } catch {
      await loading.dismiss();
      const toast = await this.toastCtrl.create({ message: 'Errore nel salvataggio', duration: 2000, color: 'danger' });
      await toast.present();
    }
  }

  async elimina() {
    const alert = await this.alertCtrl.create({
      header:  'Elimina cliente',
      message: 'Confermi l\'eliminazione?',
      buttons: [
        { text: 'Annulla', role: 'cancel' },
        {
          text: 'Elimina', role: 'destructive',
          handler: async () => {
            await this.clientSvc.delete(this.client!.id!);
            const toast = await this.toastCtrl.create({ message: 'Cliente eliminato', duration: 2000, color: 'medium' });
            await toast.present();
            this.modalCtrl.dismiss({ deleted: true });
          }
        }
      ]
    });
    await alert.present();
  }

  annulla() { this.modalCtrl.dismiss(); }

  err(field: string, error: string) {
    const c = this.form.get(field);
    return c?.touched && c?.hasError(error);
  }
}
