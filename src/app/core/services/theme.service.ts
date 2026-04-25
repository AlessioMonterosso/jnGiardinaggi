import { Injectable } from '@angular/core';

const STORAGE_KEY = 'app-theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private dark = true;

  init(): void {
    const saved = localStorage.getItem(STORAGE_KEY);
    const isDark = saved !== null ? saved === 'dark' : true; // default: dark
    this.apply(isDark);
  }

  isDark(): boolean {
    return this.dark;
  }

  toggle(): void {
    this.apply(!this.dark);
  }

  apply(dark: boolean): void {
    this.dark = dark;
    document.body.classList.toggle('dark', dark);
    document.body.style.colorScheme = dark ? 'dark' : 'light';
    localStorage.setItem(STORAGE_KEY, dark ? 'dark' : 'light');
  }
}
