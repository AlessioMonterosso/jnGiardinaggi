# DAM Impianti — Contesto progetto per Claude Code

## Stack tecnico

| Layer | Tecnologia |
|-------|-----------|
| Framework | Angular 20 + Ionic 8 (standalone components) |
| Backend | Firebase (Firestore + Authentication) |
| ORM Firebase | AngularFire 20 (`@angular/fire`) |
| Linguaggio | TypeScript ~5.9 |
| Stili | SCSS + Ionic CSS variables |
| Mobile | Capacitor 8 (iOS/Android) |
| PWA | `@angular/service-worker` + `ngsw-config.json` |
| Calendario | FullCalendar 6 (installato ma non più usato — rimpiazzato da UI custom) |

## Firebase

```ts
// src/environments/environment.ts
firebase: {
  apiKey: "AIzaSyDW1DgVGvNbrhWX2SATe_yKndEA4gVl9mA",
  authDomain: "dam-impianti.firebaseapp.com",
  projectId: "dam-impianti",
  storageBucket: "dam-impianti.firebasestorage.app",
  messagingSenderId: "71710522372",
  appId: "1:71710522372:web:4a17f64083f6c9964ac951"
}
```

Autenticazione: email/password. Ogni utente ha i propri dati sotto `users/{uid}/`.
Regole Firestore: `allow read, write: if request.auth != null` (qualsiasi utente auth).

## Struttura cartelle

```
src/app/
├── core/
│   ├── guards/
│   │   └── auth.guard.ts          — canActivate: reindirizza a /login se non auth
│   ├── models/
│   │   ├── client.model.ts        — Client
│   │   ├── appointment.model.ts   — Appointment
│   │   ├── job.model.ts           — Job
│   │   └── payment.model.ts       — Payment
│   └── services/
│       ├── auth.service.ts        — login/logout/currentUid/currentUser$
│       ├── theme.service.ts       — isDark/toggle/apply/init (localStorage)
│       ├── client.service.ts      — CRUD su users/{uid}/clients
│       ├── appointment.service.ts — CRUD su users/{uid}/appointments
│       ├── job.service.ts         — CRUD su users/{uid}/jobs
│       └── payment.service.ts     — CRUD + getByJobId + getTotalByMonth + getTotalByYear
│
├── features/
│   ├── home/                      — Dashboard: KPI mese, appuntamenti oggi, ultimi pagamenti
│   ├── agenda/                    — Calendario 3 viste (giorno/settimana/mese) + modal CRUD
│   ├── clienti/                   — Lista clienti + dettaglio + modal CRUD
│   ├── pagamenti/                 — Movimenti mensili + Report annuale con segment
│   └── lavori/                    — Lista lavori + dettaglio + modal CRUD
│
├── shared/
│   └── components/
│       ├── lock-screen/           — Overlay fullscreen PIN pad (attivato da LockService)
│       └── security-modal/        — Modal impostazioni sicurezza (setup/cambia/disattiva PIN)
│
└── pages/
    ├── login/                     — Login email/password con Firebase Auth
    └── tabs/                      — Shell con bottom tab bar (5 tab) + sidebar desktop
```

## Routing

```
/login                  → LoginPage (pubblica)
/tabs                   → TabsPage (auth guard)
  /tabs/home            → HomePage
  /tabs/agenda          → AgendaPage
  /tabs/clienti         → ClientiPage (legacy)
  /tabs/pagamenti       → PagamentiPage
  /tabs/lavori          → LavoriPage
/clienti/:id            → ClienteDettaglioPage (auth guard)
/lavori/:id             → LavoroDettaglioPage (auth guard)
```

## Modelli TypeScript (core/models)

### `Client` (client.model.ts)
```ts
{ id?, name, phone, address?, email?, notes?, createdAt: Date }
```
Collection Firestore: `users/{uid}/clients`

### `Appointment` (appointment.model.ts)
```ts
{
  id?,
  title?: string,           // titolo libero — priorità display su clientName/jobDescription
  clientId?: string,        // opzionale — si esclude con jobId
  clientName?: string,      // opzionale — snapshot nome cliente
  jobId?: string,           // opzionale — si esclude con clientId
  jobDescription?: string,  // opzionale — snapshot descrizione lavoro
  date: Date,
  timeStart: string,
  duration: number,         // minuti
  workType?: string,        // opzionale
  address?: string,
  notes?: string,
  status: 'confermato'|'da_confermare'|'completato'|'annullato',
  createdAt: Date
}
```
Mutualmente esclusivi: `clientId/clientName` oppure `jobId/jobDescription` — mai entrambi insieme.
Collection Firestore: `users/{uid}/appointments`

### `Job` (job.model.ts)
```ts
{
  id?, clientId, clientName, appointmentId?,
  description: string, status: 'da_fare'|'completato',
  completedAt?: Date, createdAt: Date
}
```
Collection Firestore: `users/{uid}/jobs`

### `Payment` (payment.model.ts)
```ts
{
  id?, clientId, clientName, jobId?,
  type: 'acconto'|'saldo',
  paymentMethod: 'fattura'|'contanti',
  amount: number, date: Date, notes?, createdAt: Date
}
```
Collection Firestore: `users/{uid}/payments`

### Modelli legacy (usati da clienti/lavori feature)
- `Cliente` in `cliente.model.ts` — tipo azienda/privato con P.IVA, PEC, ecc.
- `Appuntamento` in `appuntamento.model.ts` — con statoPagamento, importo, ecc.

## Servizi implementati (core/services)

### `AuthService`
- `login(email, password)` / `logout()` / `currentUid` / `currentUser$`

### `ClientService`
- `getAll()` → obs lista ordinata per `createdAt desc`
- `getById(id)` → obs singolo
- `create(item)` → aggiunge con `createdAt: now`
- `update(id, item)` / `delete(id)`
- Conversione automatica Firestore Timestamp → Date

### `AppointmentService`
- `getAll()` → obs ordinata per `date desc`
- `getById(id)` / `create(item)` / `update(id, item)` / `delete(id)`
- `getByMonth(year, month)` / `getByWeek(weekStart, weekEnd)` / `getByDay(date)` → obs filtrate per range date
- `getByJobId(jobId)` → obs appuntamenti di un lavoro (ordinati per `date desc`)
- `getByClientId(clientId)` → obs appuntamenti di un cliente (ordinati per `date desc`)
- `create()`/`update()` usano spread condizionale per tutti i campi opzionali (no `undefined` a Firestore)
- Conversione automatica `date` e `createdAt` Timestamp → Date

### `JobService`
- `getAll()` → obs ordinata per `createdAt desc`
- `getById(id)` / `create(item)` / `update(id, item)` / `delete(id)`
- Gestisce `completedAt` opzionale

### `PaymentService`
- `getAll()` → obs ordinata per `date desc`
- `getById(id)` / `create(item)` / `update(id, item)` / `delete(id)`
- `getByJobId(jobId)` → obs pagamenti di un lavoro
- `getByDateRange(from, to)` → obs pagamenti in intervallo date (query Firestore)
- `getTotalByMonth(year, month): Promise<MonthlyTotals>` — aggregazione client-side
- `getTotalByYear(year): Promise<YearReport>` — aggregazione per mese su intero anno; `YearReport = { fattura, contanti, total, byMonth[12] }`

### `LockService`
- `init()` → legge `localStorage`, se blocco attivo imposta `isLocked = true`
- `isLocked` signal — usato da `AppComponent` per mostrare/nascondere `LockScreenComponent`
- `isPinSet()` / `isLockEnabled()` → lettura sincrona da `localStorage`
- `setPin(pin)` → salva hash SHA-256 in `localStorage['dam_pin_hash']`; abilita blocco
- `verifyPin(pin)` → confronta hash; ritorna `Promise<boolean>`
- `disableLock(pin)` → verifica PIN poi rimuove hash e disabilita; ritorna `Promise<boolean>`
- `lock()` / `unlock()` — aggiornano il signal `isLocked`
- Nessuna dipendenza nativa — funziona su PWA pura (Web Crypto API + localStorage)

### `ThemeService`
- `init()` → legge `localStorage['app-theme']`, applica il tema (default: dark)
- `isDark()` / `toggle()` / `apply(dark: boolean)`

### `NetworkStatusService`
- `isOnline` signal — true/false in base agli eventi `online`/`offline` del browser

### `PwaUpdateService`
- `init()` chiamato in `AppComponent.constructor()` — ascolta `VERSION_READY` dal SW, mostra toast con pulsante "Aggiorna" che chiama `activateUpdate()` + `reload()`

### `InstallPromptService`
- `canInstall` signal — intercetta `beforeinstallprompt`, espone `install()` per triggerare il prompt nativo Android/Chrome

## Pagine implementate

| Pagina | Stato | Descrizione |
|--------|-------|-------------|
| `LoginPage` | ✅ | Form email/password con Firebase Auth, gestione errori |
| `TabsPage` | ✅ | Shell con 5 tab + sidebar desktop (split pane) |
| `HomePage` | ✅ | Dashboard: KPI mese (getTotalByMonth), appuntamenti oggi, ultimi 3 pagamenti; skeleton loading |
| `AgendaPage` | ✅ | 3 viste: giorno (strip settimanale + lista), settimana (griglia oraria 07-20), mese (calendario con dot) |
| `AppointmentModalComponent` | ✅ | Modal fullscreen CRUD appuntamento: campo titolo opzionale, selettore "Cliente\|Lavoro" (linkMode), ricerca searchable per entrambi, payload condizionale |
| `ClientiPage` | ✅ | Lista clienti EN: avatar iniziali, ricerca toggle, ordinamento alfabetico, FAB nuovo cliente |
| `ClienteDettaglioPage` | ✅ | Dettaglio cliente EN: info con bordo verde, card "Ore lavorate" (appuntamenti completati del cliente), ultimi 3 job/pagamenti, elimina con alert |
| `ClientModalComponent` | ✅ | Modal fullscreen CRUD cliente (EN): nome, telefono, indirizzo, email, note; elimina in modifica |
| `PagamentiPage` | ✅ | Navigatore mese/anno, 3 KPI card (fattura/contanti/totale), grafico barre settimanale, lista movimenti con dot colorato |
| `PaymentModalComponent` | ✅ | Modal fullscreen CRUD pagamento: cliente searchable, job del cliente, tipo acconto/saldo, metodo fattura/contanti, importo €, data |
| `LavoriPage` | ✅ | Lista lavori EN: sezioni Da fare/Completati collassabili, filtro stato (action sheet), FAB nuovo |
| `LavoroDettaglioPage` | ✅ | Dettaglio lavoro: info con link cliente, card "Ore lavorate" (solo completati), pagamenti per jobId con totali, sezione appuntamenti, bottone segna completato, elimina |
| `JobModalComponent` | ✅ | Modal fullscreen CRUD lavoro: cliente searchable, appuntamento opzionale, descrizione, stato |
| `PagamentiPage` (Report) | ✅ | Segment Movimenti/Report; vista Report: navigatore anno, 3 KPI annuali, grafico 12 barre mensili, tabella riepilogo (tap → movimenti), card delta % vs anno precedente |

## Tema e design system

```scss
// Variabili custom (src/theme/variables.scss)
--color-primary:    #2baa72  // verde principale — invariato tra temi
--color-cash:       #e8a020  // ambra — invariato tra temi

// Dark theme (body.dark)
--color-background: #0f0f0f
--color-surface:    #181818
--color-border:     #2a2a2a

// Light theme (body:not(.dark))
--color-background: #f5f5f5
--color-surface:    #ffffff
--color-border:     #e0e0e0

// Font (Google Fonts)
Rajdhani 500/600/700  → titoli, numeri, KPI, nav label
DM Sans 300/400/500   → body, label, testo corrente
```

### Toggle tema (ThemeService)
- `src/app/core/services/theme.service.ts` — `providedIn: 'root'`
- `init()`: chiamato in `AppComponent.constructor()` — legge `localStorage['app-theme']`, default: dark
- `toggle()` / `isDark()` / `apply(dark)`
- Meccanismo: aggiunge/rimuove classe `body.dark` + imposta `document.body.style.colorScheme`
- Persistenza: `localStorage` con chiave `app-theme` (`'dark'` | `'light'`)
- UI: ActionSheet sull'avatar "DA" in `HomePage` — voce dinamica con icona `sunny-outline` / `moon-outline`
- Logo login: `[src]` dinamico — `logo-sfondo-black.png` in dark, `logo.png` in light

### CSS palette Ionic
- `global.scss` usa `dark.class.css` (NON `dark.always.css`) → dark solo quando `body.dark` presente
- Le variabili Ionic (`--ion-toolbar-background`, `--ion-text-color`, ecc.) sono definite in
  `body.dark {}` e `body:not(.dark) {}` dentro `variables.scss`
- `global.scss` usa `var(--ion-toolbar-background)`, `var(--ion-tab-bar-background)`, ecc.
  — **nessun colore hardcoded** in toolbar, tab bar, sidebar, action sheet

### Convenzioni UI
- Card: `background: var(--color-surface); border: 0.5px solid var(--color-border); border-radius: 14px`
- Card totale principale: `border-color: var(--color-primary)`
- Section title: `11px uppercase letter-spacing: 1.5px color: #6b6b6b`
- Valori monetari: `€ 1.234` (Intl.NumberFormat it-IT, nessun decimale)
- Blocchi appuntamento settimana: `background: rgba(43,170,114,0.18); border-left: 3px solid var(--color-primary)`
- Modal fullscreen mobile: `cssClass: 'fullscreen-modal'` → definita in global.scss

## Decisioni architetturali

1. **Doppio sistema modelli**: Esistono modelli EN (Client, Appointment, Job, Payment) per i nuovi servizi e modelli IT (Cliente, Appuntamento) usati dalle feature legacy. Obiettivo: migrare completamente ai modelli EN.

2. **Standalone components ovunque**: Nessun NgModule tranne `app.module.ts` (legacy, non usato). Tutti i componenti usano `standalone: true` con imports espliciti.

3. **Lazy loading su tutti i tab**: Le route caricano i componenti con `loadComponent: () => import(...)`.

4. **Auth guard funzionale**: `authGuard` usa `CanActivateFn` (non class-based), injetta `Auth` da AngularFire e verifica con `user(auth).pipe(take(1))`.

5. **Dati utente isolati**: Ogni collection è sotto `users/{uid}/...` — nessun dato condiviso tra utenti.

6. **Real-time + initial load**: Le pagine usano `firstValueFrom()` per il caricamento iniziale con loading state, poi attivano subscription Firestore per aggiornamenti real-time.

7. **`takeUntilDestroyed(destroyRef)`**: Pattern usato ovunque con `DestroyRef` iniettato per gestire il cleanup delle subscription.

## Vincoli critici e pattern obbligatori

### Firebase SDK — versione compatibile
`@angular/fire@20.0.1` supporta **solo `firebase@^11.8.0`**, NON firebase v12.
Firebase v12 cambia le strutture interne delle classi causando l'errore:
`FirebaseError: Type does not match the expected instance. Did you pass a reference from a different Firestore SDK?`
→ **Non aggiornare `firebase` oltre `^11`** finché `@angular/fire` non lo supporta ufficialmente.

### AngularFire — injection context obbligatorio
`collectionData` e `docData` da `@angular/fire/firestore` chiamano `inject()` internamente
(per integrarsi con NgZone / change detection in Angular 20+).
Devono essere chiamate all'interno di un injection context.

**Pattern obbligatorio in tutti i service Firestore:**
```ts
import { Injectable, inject, Injector, runInInjectionContext } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class MyService {
  private firestore = inject(Firestore);
  private injector  = inject(Injector);   // ← sempre presente

  getAll(): Observable<Item[]> {
    return runInInjectionContext(this.injector, () =>  // ← sempre wrappato
      collectionData(query(this.colRef, orderBy('createdAt', 'desc')), { idField: 'id' })
    ).pipe(map(docs => docs.map(d => this.fromFirestore(d))));
  }
}
```
Questo vale per `getAll()`, `getById()`, `getByDateRange()`, `getByJobId()`, ecc.
**Tutti i sei servizi** (`appointment`, `client`, `job`, `payment`, `appuntamenti`, `clienti`) già aggiornati.

### Ionicons — registrazione in `constructor()`
`addIcons()` deve essere chiamato nel **`constructor()`**, non in `ngOnInit()`.
Angular crea la view prima di eseguire il rendering del template;
chiamare `addIcons` in `ngOnInit` può causare warning "icon not found" al primo render.
```ts
constructor() {
  addIcons({ addOutline, chevronBackOutline, chevronForwardOutline });
}
```

### Firestore — niente `undefined` nei payload
Firestore rifiuta `undefined` come valore di campo e lancia un errore runtime.
Nei payload da scrivere, i campi opzionali vanno inclusi solo se presenti:
```ts
// ✗ SBAGLIATO — undefined causa errore Firestore
{ jobId: v.jobId ?? undefined }

// ✓ CORRETTO — il campo viene omesso se assente
{ ...(v.jobId ? { jobId: v.jobId } : {}) }
```
Questo vale per tutti i campi opzionali nei modelli (`jobId`, `appointmentId`, `notes`, ecc.).

### Catch nei modal — loggare sempre l'errore
I blocchi `catch` nei modal devono sempre loggare l'errore originale, altrimenti i bug Firestore
risultano invisibili (toast di errore ma nessun dettaglio in console):
```ts
// ✗ SBAGLIATO
} catch {
  // errore inghiottito silenziosamente
}

// ✓ CORRETTO
} catch (err) {
  console.error('Errore salvataggio:', err);
}
```

### `docData` — filtrare `undefined` dopo cancellazione
`docData()` di AngularFire emette `undefined` quando un documento viene eliminato.
Se un componente è ancora in ascolto su `getById()` al momento della cancellazione,
`fromFirestore(undefined)` esplode. Soluzione: aggiungere `filter(d => !!d)` nella pipe:
```ts
getById(id: string): Observable<Client> {
  return runInInjectionContext(this.injector, () =>
    docData(this.docRef(id), { idField: 'id' })
  ).pipe(
    filter(d => !!d),   // ← blocca l'emissione undefined post-delete
    map(d => this.fromFirestore(d))
  ) as Observable<Client>;
}
```
Applicare lo stesso pattern in tutti i service che usano `docData`.

### Tema — nessun colore hardcoded in file globali
`global.scss` e `variables.scss` non devono contenere colori hardcoded per elementi strutturali
(toolbar, tab bar, sidebar, action sheet). Usare sempre le CSS variables:
```scss
// ✗ SBAGLIATO
ion-toolbar { --background: #111111; }

// ✓ CORRETTO
ion-toolbar { --background: var(--ion-toolbar-background); }
```
I valori concreti sono definiti nei blocchi `body.dark {}` e `body:not(.dark) {}` in `variables.scss`.
I file SCSS delle singole feature page possono ancora contenere colori hardcoded (refactor separato).

### `IonButton expand` — `block` vs `full`
- `expand="full"`: larghezza piena ma **ignora `--border-radius`** → bottone con angoli squadrati
- `expand="block"`: larghezza piena **rispettando `--border-radius`** → usare sempre questo
```html
<!-- ✓ CORRETTO per bottoni full-width con border-radius -->
<ion-button expand="block" ...>
```

### `IonInput` con `position="floating"` — no placeholder
Quando si usa `<ion-label position="floating">`, il placeholder viene sovrapposto dalla label
e appare come testo duplicato. Non usare `placeholder` su questi input.

### Modal fullscreen mobile
Usare sempre `cssClass: 'fullscreen-modal'` nella chiamata `modalCtrl.create()`.
La classe è definita in `global.scss`:
```scss
ion-modal.fullscreen-modal { --height: 100%; --width: 100%; --border-radius: 0; }
```

### iOS PWA — `*ngFor` su getter non cachati blocca i click

Su iOS Safari/WebKit c'è un delay tra `touchstart` e `click` (~50-100ms).
Zone.js (Angular) monkey-patcha tutti gli eventi DOM, quindi `touchstart` triggera change detection **prima** che il `click` venga dispatchato.

Se un `*ngFor` itera su un **getter senza cache** che crea nuovi oggetti ad ogni chiamata, Angular confronta per identity, vede tutto "cambiato", e **distrugge/ricrea l'intero DOM** durante quel delay. Quando il `click` arriva, l'elemento non esiste più → l'evento viene perso silenziosamente. Su Chrome/Android il click è istantaneo e arriva prima del re-render, quindi il bug non si manifesta.

**Sintomi**: click su elementi in `*ngFor` non funzionano su iPhone (Safari + Chrome), funzionano su Android. Il FAB dentro `ion-content` può mostrare l'animazione ma il handler non esegue. La tab bar diventa non cliccabile.

**Regole obbligatorie:**

1. Usare sempre `trackBy` su ogni `*ngFor`
2. I getter usati in `*ngFor` devono essere cachati (stessa referenza array finché i dati non cambiano)

```ts
// ✗ SBAGLIATO — nuovo array ad ogni CD cycle → DOM distrutto/ricreato su iOS
get weekDays(): Date[] {
  return Array.from({ length: 7 }, (_, i) => { ... }); // nuovi oggetti ogni volta
}

// ✓ CORRETTO — cache + trackBy
private _weekDays: Date[] = [];
private _weekDaysKey = '';
get weekDays(): Date[] {
  const key = this.getMondayOf(this.selectedDate).toDateString();
  if (key === this._weekDaysKey) return this._weekDays;  // stessa referenza
  this._weekDays = Array.from({ length: 7 }, (_, i) => { ... });
  this._weekDaysKey = key;
  return this._weekDays;
}

trackByDate(_: number, date: Date): number { return date.getTime(); }
trackByAppId(_: number, app: Appointment): string { return app.id ?? app.timeStart; }
trackByIndex(index: number): number { return index; }
```

```html
<!-- ✗ SBAGLIATO -->
<div *ngFor="let d of weekDays">

<!-- ✓ CORRETTO -->
<div *ngFor="let d of weekDays; trackBy: trackByDate">
```

### iOS PWA — subscription management nei tab

Con `IonicRouteStrategy` (attivo in `app.config.ts`) i componenti dei tab **non vengono mai distrutti** quando si cambia tab. `takeUntilDestroyed(destroyRef)` non scatta mai per i tab → le subscription Firestore restano aperte per tutta la sessione.

**Regola**: i tab page non devono avere subscription live a Firestore. Usare invece:
- `ionViewWillEnter()` + `firstValueFrom()` per dati che non richiedono aggiornamento real-time (KPI, liste snapshot)
- `BehaviorSubject + switchMap()` quando i dati cambiano in base a un parametro (es. mese selezionato in AgendaPage) — `switchMap` cancella la query precedente, mantenendo sempre **1 sola** connessione attiva
- Le subscription real-time (`collectionData`) vanno usate solo in pagine di dettaglio (`/clienti/:id`, `/lavori/:id`) che vengono distrutte alla navigazione

**Stato attuale tab:**
- `HomePage` — `ionViewWillEnter` + `firstValueFrom` (0 WebChannel aperti)
- `AgendaPage` — `ionViewWillEnter` + `firstValueFrom(getByMonth)` + ricarica su cambio mese (0 WebChannel aperti)
- `ClientiPage` — 1 subscription (`combineLatest` + `takeUntilDestroyed`) — necessaria per la ricerca live
- `PagamentiPage` — 1 subscription (`switchMap(getByDateRange)`) — cambia mese = auto-cancellazione
- `LavoriPage` — 1 subscription (`getAll`) — totale max connessioni simultanee: **3**, ben sotto il limite iOS di 6

### AgendaPage — query per range, non getAll()

`AgendaPage` deve usare `getByMonth(year, month)` invece di `getAll()`.
`getAll()` scarica TUTTI gli appuntamenti di sempre → memory-intensive + connessione permanente.
`getByMonth` carica solo il mese corrente; navigando al mese precedente/successivo `switchMap` cancella la query precedente e ne apre una nuova.

**Pattern in `AppointmentService`:**
```ts
getByMonth(year, month): Observable<Appointment[]>  // usato da AgendaPage
getByWeek(weekStart, weekEnd): Observable<Appointment[]>  // disponibile per future ottimizzazioni
getByDay(date): Observable<Appointment[]>  // usato da HomePage
```

**Pattern in `AgendaPage`:**
```ts
private currentViewMonth = { year: now.getFullYear(), month: now.getMonth() + 1 };

async ionViewWillEnter() { await this.loadCurrentMonth(); }

private async loadCurrentMonth() {
  this.allAppointments = await firstValueFrom(
    this.appointmentService.getByMonth(year, month)
  );
}

// prev()/next() aggiornano selectedDate → syncMonth() ricarica solo se il mese cambia
// openModal() ricarica dopo onDidDismiss() per riflettere eventuali nuovi appuntamenti
```

### Firestore cache — persistentMultipleTabManager + experimentalAutoDetectLongPolling

In `app.config.ts` usare **`persistentMultipleTabManager()`** (non `persistentSingleTabManager`).

**Perché non singleTabManager**: `persistentSingleTabManager` mantiene un lease IDB (IndexedDB lock)
che deve essere rinnovato ogni ~4 secondi. iOS sospende i timer JavaScript della PWA anche quando
è in foreground se il telefono si oscura per pochi secondi. Alla ripresa, il lease risulta scaduto →
Firestore tenta di riacquisire il lock IDB → contesa con le connessioni esistenti → freeze totale.
`persistentMultipleTabManager` usa invece BroadcastChannel per il coordinamento, che non dipende
da timer rinnovabili → non scade durante la sospensione iOS.

**`experimentalAutoDetectLongPolling: true`**: iOS Safari ha problemi noti con WebChannel (il trasporto
default di Firestore). Questa opzione abilita l'auto-detection e fa switch a long-polling HTTP quando
il WebChannel risulta instabile — riduce i WebChannel aperti simultaneamente.

```ts
// ✓ CORRETTO — app.config.ts
provideFirestore(() => initializeFirestore(getApp(), {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  experimentalAutoDetectLongPolling: true,
}))

// ✗ SBAGLIATO — lease IDB scade su iOS background
localCache: persistentLocalCache({ tabManager: persistentSingleTabManager(undefined) })
```

### Firestore — sospensione rete su visibilitychange

`AppComponent` registra un listener su `document.visibilitychange`:
- `document.hidden === true` → `disableNetwork(firestore)` — sospende tutti i listener Firestore
- `document.hidden === false` → `enableNetwork(firestore)` — riprende

Questo è il fix più importante per il freeze iOS: impedisce che 4+ connessioni Firestore rimangano
aperte mentre iOS sospende la PWA, che è la condizione che scatena il lock IDB e il freeze.
Il listener viene rimosso in `ngOnDestroy` di `AppComponent`.

### Service Worker — non cachare Firestore né Firebase Auth
I `dataGroups` di `ngsw-config.json` **non devono includere** `firestore.googleapis.com` né gli endpoint Firebase Auth.
Firestore usa richieste HTTP long-polling che restano aperte 20-30 secondi: il SW Angular le intercetta e su iOS PWA esaurisce la capacità di gestione delle richieste dopo 2-3 navigazioni, causando freeze dell'app. Su desktop Chrome il problema non si manifesta perché il browser ha più risorse.
Il Firestore SDK gestisce già il proprio caching offline tramite IndexedDB (`persistentLocalCache`) — avere anche il SW che cacha le stesse URL crea conflitti.
```json
// ngsw-config.json — CORRETTO
{ "dataGroups": [] }

// ✗ SBAGLIATO — causa freeze su iOS PWA
{ "dataGroups": [{ "name": "firebase-firestore", "urls": ["https://firestore.googleapis.com/**"] }] }
```

### Sass @import
Il file `global.scss` usa `@import './theme/variables.scss'` (non `@use`).
`@use` non è utilizzabile perché deve precedere gli `@import` di Ionic CSS,
e non si può cambiare quell'ordine senza rompere Ionic.
Il warning Sass è atteso e non è un errore.

## Da implementare (task rimanenti)

- [x] **TASK 5 — Clienti**: `ClientiPage`, `ClienteDettaglioPage`, `ClientModalComponent` riscritti con modelli EN (`Client`, `ClientService`, `JobService`, `PaymentService`)
- [x] **TASK 6 — Lavori**: `LavoriPage`, `LavoroDettaglioPage`, `JobModalComponent` implementati con `JobService`; filtro stato, sezioni collassabili, pagamenti per job
- [x] **TASK 7 — Pagamenti**: `PagamentiPage` + `PaymentModalComponent` riscritti con `PaymentService`; navigatore mese, grafico settimanale, CRUD pagamenti con link clienti/lavori
- [x] **Fix runtime errors**: firebase downgrade v12→v11; `runInInjectionContext` su tutti i service Firestore; `addIcons` in constructor
- [x] **Fix bug salvataggio Pagamenti/Lavori**: `jobId: undefined` e `appointmentId: undefined` sostituiti con spread condizionale `...(val ? { field: val } : {})` — Firestore rifiuta `undefined` come valore di campo; aggiunto `console.error` nei `catch` dei modal
- [x] **Fix errore eliminazione cliente**: `getById()` in `ClientService` ora filtra le emissioni `undefined` con `filter(d => !!d)` — `docData` emette `undefined` quando il documento viene cancellato, causava crash in `fromFirestore`
- [x] **Fix navigazione post-login**: dopo il login si naviga su `/tabs/home` (era `/tabs/clienti`)
- [x] **UI Login**: logo reale (`logo-sfondo-black.png`), bottone `expand="block"` con `--border-radius: 10px` e `--color-primary`, placeholder rimossi dai campi floating label
- [x] **Menu logout**: avatar "DA" in `home.page.html` apre un `ActionSheetController` con email utente e voce "Esci" → `AuthService.logout()` + naviga a `/login`
- [x] **Validazione form**: `phone` non più obbligatorio in `ClientModalComponent`; `workType` non più obbligatorio in `AppointmentModalComponent`
- [x] **Fix offset date timezone**: `toDateString()` usa `getFullYear/Month/Date()` locali (non `toISOString()`); `new Date(stringa)` rimpiazzato con `new Date(y, m-1, d)` in `AppointmentModal` e `PaymentModal`
- [x] **Toggle tema dark/light**: `ThemeService` con `localStorage`, classe `body.dark`, default dark; voce nel menu utente (avatar "DA"); logo login dinamico; variabili CSS separate per dark/light in `variables.scss`
- [x] **TASK 8 — Report annuale in PagamentiPage**: segment Movimenti/Report; navigatore anno; 3 KPI annuali; grafico 12 barre; tabella mesi (tap → switch a movimenti con quel mese); card delta % vs anno precedente; `PaymentService.getTotalByYear()`
- [x] **Migrazione legacy**: eliminati `clienti.service`, `appuntamenti.service`, `cliente.model`, `appuntamento.model`, cartella `src/app/services/`, componenti orfani `appuntamento-dettaglio`, `appuntamento-form`, `cliente-form`, vecchie pages `calendario/`, `clienti/`, `report/`
- [x] **TASK 9b — Splash Screen PWA**: div `#app-splash` inline in `index.html` (prima di `<app-root>`), CSS inline in `<head>`; rimossa da `AppComponent.ngAfterViewInit()` con `setTimeout(600ms)` + classe `splash-hidden` (transizione opacity 0.5s) + rimozione dal DOM dopo 500ms; Apple splash per iOS via `apple-touch-startup-image` (5 dimensioni iPhone); immagini generate con `scripts/generate-splash.mjs` in `src/assets/splash/`
- [x] **Fix freeze iOS PWA — fase 1**: rimossi `dataGroups` Firestore/Auth da `ngsw-config.json`; memoizzato getter `calendarDays` in `AgendaPage`
- [x] **Fix freeze iOS PWA — fase 2 (audit completo)**: `persistentMultipleTabManager` → `persistentSingleTabManager` in `app.config.ts`; `AgendaPage` usa `getByMonth()` + `BehaviorSubject+switchMap` invece di `getAll()`; `HomePage` usa `ionViewWillEnter`+`firstValueFrom` invece di 2 subscription live (eliminati 2 WebChannel permanenti); aggiunti `getByMonth/getByWeek/getByDay` in `AppointmentService`; `firestore.indexes.json` aggiornato con indici per query range su `date`
- [x] **Fix freeze iOS PWA — fase 3 (lease IDB + visibility)**: `persistentSingleTabManager` → `persistentMultipleTabManager` (lease IDB scade quando iOS sospende i timer PWA in background); `experimentalAutoDetectLongPolling: true` (auto-switch a long-polling su Safari); `disableNetwork`/`enableNetwork` su `visibilitychange` in `AppComponent` (sospende connessioni Firestore quando PWA va in background); `ChangeDetectionStrategy.OnPush` + `markForCheck()` su `PagamentiPage`
- [x] **Cliente opzionale negli appuntamenti** — rimosso `Validators.required` da `clientId` in `AppointmentModalComponent`; payload usa spread condizionale; fallback `'Nessun cliente'` in Day view e Week view di `AgendaPage`
- [x] **Fix bug Day view non aggiorna appuntamenti modificati** — aggiunto `_dataVersion` in `AgendaPage` (incrementato in `loadCurrentMonth`); chiavi cache di `dayAppointments` e `calendarDays` includono `_v${_dataVersion}` invece di `allAppointments.length` (la lunghezza non cambia con le modifiche)
- [x] **Titolo libero su appuntamenti** — campo `title?: string` in `Appointment`; input "Titolo" in cima al modal; display `title || clientName || 'Nessun titolo'` in Day/Week view e HomePage
- [x] **Titolo libero su pagamenti** — campo `title?: string` in `Payment`; input "Descrizione" in cima al `PaymentModalComponent`; `clientId` non più obbligatorio; display `title || clientName` in `PagamentiPage` e `HomePage`
- [x] **TASK 10 — Appuntamenti: link a Lavoro, ore lavorate**: `jobId`/`jobDescription` nel modello; `getByJobId`/`getByClientId` in `AppointmentService`; `AppointmentModalComponent` refactored con selettore Cliente|Lavoro (linkMode); `LavoroDettaglioPage` + sezione appuntamenti e card ore lavorate; `ClienteDettaglioPage` + card ore lavorate; indici Firestore per `jobId+date` e `clientId+date`
- [ ] **Push notifications** via FCM per promemoria appuntamenti
- [x] **Offline support** — Firestore offline persistence (`persistentLocalCache` + IndexedDB), Angular Service Worker, PWA manifest, icone, banner offline/install
- [ ] **Export PDF** per fatture/report
- [ ] **Duplica appuntamento** — copia un appuntamento esistente come punto di partenza per uno nuovo
- [x] **Blocco PIN** — `LockService` + `LockScreenComponent` + `SecurityModalComponent`; PIN a 4 cifre salvato come hash SHA-256 in `localStorage`; overlay fullscreen attivato all'avvio e al ritorno dal background (dopo 15s); shake + blocco 30s dopo 5 tentativi errati; impostazioni nel menu avatar (avatar "DA" → "Imposta blocco PIN" / "Sicurezza (PIN attivo)"); PWA-only, nessuna dipendenza nativa

## GitHub

Repository: `https://github.com/AlessioMonterosso/dam-impianti.git`
Branch principale: `main`

## Firebase CLI

Il progetto Firebase è inizializzato (`firebase.json` + `.firebaserc` presenti).
Progetto: `dam-impianti` | Database: `(default)` | Regione: `europe-west8`

```bash
firebase login                              # autenticazione Firebase CLI
firebase deploy --only firestore:rules      # deploya le regole Firestore
firebase deploy --only firestore:indexes    # deploya gli indici Firestore
firebase deploy --only hosting              # deploya il build su Firebase Hosting
firebase deploy                             # deploya tutto
```

Le regole Firestore (`firestore.rules`) consentono lettura/scrittura a qualsiasi utente autenticato:
```
allow read, write: if request.auth != null;
```
Le regole vanno deployate ogni volta che vengono modificate localmente.

## Comandi utili

```bash
# Sviluppo
npm start                    # ng serve → http://localhost:4200

# Build
npm run build               # build production
```
