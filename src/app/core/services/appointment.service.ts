import { Injectable, inject, Injector, runInInjectionContext } from '@angular/core';
import {
  Firestore, collection, collectionData, doc, docData,
  addDoc, updateDoc, deleteDoc, query, orderBy, where, Timestamp
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { Appointment } from '../models/appointment.model';

@Injectable({ providedIn: 'root' })
export class AppointmentService {
  private firestore   = inject(Firestore);
  private authService = inject(AuthService);
  private injector    = inject(Injector);

  private get colRef() {
    const uid = this.authService.currentUid!;
    return collection(this.firestore, `users/${uid}/appointments`);
  }

  private docRef(id: string) {
    const uid = this.authService.currentUid!;
    return doc(this.firestore, `users/${uid}/appointments/${id}`);
  }

  getAll(): Observable<Appointment[]> {
    return runInInjectionContext(this.injector, () =>
      collectionData(query(this.colRef, orderBy('date', 'desc')), { idField: 'id' })
    ).pipe(map(docs => docs.map(d => this.fromFirestore(d))));
  }

  /** Solo gli appuntamenti del mese indicato — usato da AgendaPage */
  getByMonth(year: number, month: number): Observable<Appointment[]> {
    const start = new Date(year, month - 1, 1);
    const end   = new Date(year, month, 1);
    return runInInjectionContext(this.injector, () =>
      collectionData(
        query(
          this.colRef,
          where('date', '>=', Timestamp.fromDate(start)),
          where('date', '<',  Timestamp.fromDate(end)),
          orderBy('date', 'asc')
        ),
        { idField: 'id' }
      )
    ).pipe(map(docs => docs.map(d => this.fromFirestore(d))));
  }

  /** Solo gli appuntamenti di una settimana — usato da AgendaPage vista settimana */
  getByWeek(weekStart: Date, weekEnd: Date): Observable<Appointment[]> {
    return runInInjectionContext(this.injector, () =>
      collectionData(
        query(
          this.colRef,
          where('date', '>=', Timestamp.fromDate(weekStart)),
          where('date', '<=', Timestamp.fromDate(weekEnd)),
          orderBy('date', 'asc')
        ),
        { idField: 'id' }
      )
    ).pipe(map(docs => docs.map(d => this.fromFirestore(d))));
  }

  /** Solo gli appuntamenti di un giorno — usato da HomePage */
  getByDay(date: Date): Observable<Appointment[]> {
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const end   = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
    return runInInjectionContext(this.injector, () =>
      collectionData(
        query(
          this.colRef,
          where('date', '>=', Timestamp.fromDate(start)),
          where('date', '<',  Timestamp.fromDate(end)),
          orderBy('date', 'asc')
        ),
        { idField: 'id' }
      )
    ).pipe(map(docs => docs.map(d => this.fromFirestore(d))));
  }

  /** Appuntamenti di un lavoro — usato da LavoroDettaglioPage */
  getByJobId(jobId: string): Observable<Appointment[]> {
    return runInInjectionContext(this.injector, () =>
      collectionData(
        query(
          this.colRef,
          where('jobId', '==', jobId),
          orderBy('date', 'desc')
        ),
        { idField: 'id' }
      )
    ).pipe(map(docs => docs.map(d => this.fromFirestore(d))));
  }

  /** Appuntamenti di un cliente — usato da ClienteDettaglioPage */
  getByClientId(clientId: string): Observable<Appointment[]> {
    return runInInjectionContext(this.injector, () =>
      collectionData(
        query(
          this.colRef,
          where('clientId', '==', clientId),
          orderBy('date', 'desc')
        ),
        { idField: 'id' }
      )
    ).pipe(map(docs => docs.map(d => this.fromFirestore(d))));
  }

  getById(id: string): Observable<Appointment> {
    return runInInjectionContext(this.injector, () =>
      docData(this.docRef(id), { idField: 'id' })
    ).pipe(map(d => this.fromFirestore(d))) as Observable<Appointment>;
  }

  create(item: Omit<Appointment, 'id' | 'createdAt'>): Promise<any> {
    // Filtra undefined per non inviare campi non definiti a Firestore
    const data: Record<string, any> = {
      date:      item.date instanceof Date ? Timestamp.fromDate(item.date) : item.date,
      timeStart: item.timeStart,
      duration:  item.duration,
      status:    item.status,
      createdAt: Timestamp.fromDate(new Date()),
      ...(item.title           ? { title: item.title }                                   : {}),
      ...(item.clientId        ? { clientId: item.clientId, clientName: item.clientName ?? '' } : {}),
      ...(item.jobId           ? { jobId: item.jobId, jobDescription: item.jobDescription ?? '' } : {}),
      ...(item.workType        ? { workType: item.workType }                              : {}),
      ...(item.address         ? { address: item.address }                                : {}),
      ...(item.notes           ? { notes: item.notes }                                    : {}),
    };
    return addDoc(this.colRef, data);
  }

  update(id: string, item: Partial<Omit<Appointment, 'id'>>): Promise<void> {
    const data: Record<string, any> = {};
    if (item.date !== undefined)
      data['date'] = item.date instanceof Date ? Timestamp.fromDate(item.date) : item.date;
    if (item.timeStart        !== undefined) data['timeStart']        = item.timeStart;
    if (item.duration         !== undefined) data['duration']         = item.duration;
    if (item.status           !== undefined) data['status']           = item.status;
    if (item.title            !== undefined) data['title']            = item.title;
    if (item.clientId         !== undefined) data['clientId']         = item.clientId;
    if (item.clientName       !== undefined) data['clientName']       = item.clientName;
    if (item.jobId            !== undefined) data['jobId']            = item.jobId;
    if (item.jobDescription   !== undefined) data['jobDescription']   = item.jobDescription;
    if (item.workType         !== undefined) data['workType']         = item.workType;
    if (item.address          !== undefined) data['address']          = item.address;
    if (item.notes            !== undefined) data['notes']            = item.notes;
    return updateDoc(this.docRef(id), data);
  }

  delete(id: string): Promise<void> {
    return deleteDoc(this.docRef(id));
  }

  private fromFirestore(data: any): Appointment {
    return {
      ...data,
      date:      data['date']?.toDate      ? data['date'].toDate()      : new Date(data['date']),
      createdAt: data['createdAt']?.toDate  ? data['createdAt'].toDate() : new Date(data['createdAt']),
    };
  }
}
