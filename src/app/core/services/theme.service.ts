import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  init(): void {
    document.body.classList.remove('dark');
    document.body.style.colorScheme = 'light';
    localStorage.removeItem('app-theme');
  }

  isDark(): boolean { return false; }
  toggle(): void {}
  apply(_dark: boolean): void {}
}
