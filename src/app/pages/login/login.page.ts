import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import {
  IonContent, IonButton, IonInput, IonItem,
  IonLabel, IonNote,
  ToastController, LoadingController
} from '@ionic/angular/standalone';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  templateUrl: 'login.page.html',
  styleUrls: ['login.page.scss'],
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    IonContent, IonButton, IonInput, IonItem, IonLabel, IonNote
  ],
})
export class LoginPage {
  private authService  = inject(AuthService);
  themeService         = inject(ThemeService);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private toastCtrl = inject(ToastController);
  private loadingCtrl = inject(LoadingController);

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  async onSubmit() {
    if (this.form.invalid) return;
    const loading = await this.loadingCtrl.create({ message: 'Accesso in corso...' });
    await loading.present();
    try {
      await this.authService.login(this.form.value.email!, this.form.value.password!);
      await loading.dismiss();
      this.router.navigate(['/tabs/home']);
    } catch (err: any) {
      await loading.dismiss();
      const msg = this.getErrorMessage(err.code);
      const toast = await this.toastCtrl.create({ message: msg, duration: 3000, color: 'danger', position: 'bottom' });
      await toast.present();
    }
  }

  private getErrorMessage(code: string): string {
    switch (code) {
      case 'auth/user-not-found': return 'Utente non trovato.';
      case 'auth/wrong-password': return 'Password errata.';
      case 'auth/invalid-email': return 'Email non valida.';
      case 'auth/too-many-requests': return 'Troppi tentativi. Riprova più tardi.';
      default: return 'Errore di accesso. Controlla le credenziali.';
    }
  }
}
