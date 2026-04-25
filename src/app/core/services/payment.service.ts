import { Injectable, inject, Injector, runInInjectionContext } from '@angular/core';
import {
  Firestore, collection, collectionData, doc, docData,
  addDoc, updateDoc, deleteDoc, query, orderBy, where, Timestamp
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { map, take, firstValueFrom } from 'rxjs';
import { AuthService } from './auth.service';
import { Payment } from '../models/payment.model';

export interface MonthlyTotals {
  fattura: number;
  contanti: number;
  total: number;
}

export interface YearReport {
  fattura: number;
  contanti: number;
  total: number;
  byMonth: { month: number; fattura: number; contanti: number; total: number }[];
}

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private firestore   = inject(Firestore);
  private authService = inject(AuthService);
  private injector    = inject(Injector);

  private get colRef() {
    const uid = this.authService.currentUid!;
    return collection(this.firestore, `users/${uid}/payments`);
  }

  private docRef(id: string) {
    const uid = this.authService.currentUid!;
    return doc(this.firestore, `users/${uid}/payments/${id}`);
  }

  getAll(): Observable<Payment[]> {
    return runInInjectionContext(this.injector, () =>
      collectionData(query(this.colRef, orderBy('date', 'desc')), { idField: 'id' })
    ).pipe(map(docs => docs.map(d => this.fromFirestore(d))));
  }

  getById(id: string): Observable<Payment> {
    return runInInjectionContext(this.injector, () =>
      docData(this.docRef(id), { idField: 'id' })
    ).pipe(map(d => this.fromFirestore(d))) as Observable<Payment>;
  }

  /** Pagamenti in un intervallo di date (per filtro mensile) */
  getByDateRange(from: Date, to: Date): Observable<Payment[]> {
    return runInInjectionContext(this.injector, () =>
      collectionData(
        query(
          this.colRef,
          where('date', '>=', Timestamp.fromDate(from)),
          where('date', '<=', Timestamp.fromDate(to)),
          orderBy('date', 'desc')
        ),
        { idField: 'id' }
      )
    ).pipe(map(docs => docs.map(d => this.fromFirestore(d))));
  }

  /** Tutti i pagamenti associati a un lavoro specifico */
  getByJobId(jobId: string): Observable<Payment[]> {
    return runInInjectionContext(this.injector, () =>
      collectionData(
        query(this.colRef, where('jobId', '==', jobId), orderBy('date', 'desc')),
        { idField: 'id' }
      )
    ).pipe(map(docs => docs.map(d => this.fromFirestore(d))));
  }

  /** Somma amount per mese, separata per paymentMethod */
  async getTotalByMonth(year: number, month: number): Promise<MonthlyTotals> {
    const dal = new Date(year, month - 1, 1, 0, 0, 0);
    const al  = new Date(year, month,     0, 23, 59, 59);

    const payments = await firstValueFrom(
      runInInjectionContext(this.injector, () =>
        collectionData(
          query(
            this.colRef,
            where('date', '>=', Timestamp.fromDate(dal)),
            where('date', '<=', Timestamp.fromDate(al)),
            orderBy('date', 'desc')
          ),
          { idField: 'id' }
        )
      ).pipe(map(docs => docs.map(d => this.fromFirestore(d))))
    );

    const totals: MonthlyTotals = { fattura: 0, contanti: 0, total: 0 };
    for (const p of payments) {
      totals[p.paymentMethod] += p.amount;
      totals.total += p.amount;
    }
    return totals;
  }

  async getTotalByYear(year: number): Promise<YearReport> {
    const from = new Date(year,  0,  1,  0,  0,  0);
    const to   = new Date(year, 11, 31, 23, 59, 59);

    const payments = await firstValueFrom(
      runInInjectionContext(this.injector, () =>
        collectionData(
          query(
            this.colRef,
            where('date', '>=', Timestamp.fromDate(from)),
            where('date', '<=', Timestamp.fromDate(to)),
            orderBy('date', 'asc')
          ),
          { idField: 'id' }
        )
      ).pipe(map(docs => docs.map(d => this.fromFirestore(d))))
    );

    const byMonth = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1, fattura: 0, contanti: 0, total: 0,
    }));
    let fattura = 0, contanti = 0, total = 0;

    for (const p of payments) {
      const m = (p.date as Date).getMonth();
      byMonth[m].total += p.amount;
      total += p.amount;
      if (p.paymentMethod === 'fattura') {
        byMonth[m].fattura += p.amount;
        fattura += p.amount;
      } else {
        byMonth[m].contanti += p.amount;
        contanti += p.amount;
      }
    }

    return { fattura, contanti, total, byMonth };
  }

  create(item: Omit<Payment, 'id' | 'createdAt'>): Promise<any> {
    return addDoc(this.colRef, {
      ...item,
      date: item.date instanceof Date ? Timestamp.fromDate(item.date) : item.date,
      createdAt: Timestamp.fromDate(new Date()),
    });
  }

  update(id: string, item: Partial<Omit<Payment, 'id'>>): Promise<void> {
    const data: any = { ...item };
    if (data.date instanceof Date) {
      data.date = Timestamp.fromDate(data.date);
    }
    return updateDoc(this.docRef(id), data);
  }

  delete(id: string): Promise<void> {
    return deleteDoc(this.docRef(id));
  }

  private fromFirestore(data: any): Payment {
    return {
      ...data,
      date: data['date']?.toDate ? data['date'].toDate() : new Date(data['date']),
      createdAt: data['createdAt']?.toDate ? data['createdAt'].toDate() : new Date(data['createdAt']),
    };
  }
}
