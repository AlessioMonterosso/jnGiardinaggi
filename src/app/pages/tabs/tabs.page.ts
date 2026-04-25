import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import {
  IonTabs, IonTabBar, IonTabButton, IonLabel, IonIcon,
  IonMenu, IonMenuToggle, IonContent, IonList, IonItem,
  IonSplitPane
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  homeOutline, calendarOutline, peopleOutline,
  cardOutline, constructOutline
} from 'ionicons/icons';
import { CommonModule } from '@angular/common';
import { NetworkStatusService } from '../../core/services/network-status.service';

@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  styleUrls: ['tabs.page.scss'],
  standalone: true,
  imports: [
    CommonModule, RouterLink, RouterLinkActive,
    IonTabs, IonTabBar, IonTabButton, IonLabel, IonIcon,
    IonMenu, IonMenuToggle, IonContent, IonList, IonItem,
    IonSplitPane
  ],
})
export class TabsPage {
  networkStatus = inject(NetworkStatusService);

  constructor() {
    addIcons({ homeOutline, calendarOutline, peopleOutline, cardOutline, constructOutline });
  }
}
