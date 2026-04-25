import { Injectable, inject, Injector, runInInjectionContext } from '@angular/core';
import {
  Firestore, collection, collectionData, doc, docData,
  addDoc, updateDoc, deleteDoc, query, orderBy, Timestamp
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { Job } from '../models/job.model';

@Injectable({ providedIn: 'root' })
export class JobService {
  private firestore   = inject(Firestore);
  private authService = inject(AuthService);
  private injector    = inject(Injector);

  private get colRef() {
    const uid = this.authService.currentUid!;
    return collection(this.firestore, `users/${uid}/jobs`);
  }

  private docRef(id: string) {
    const uid = this.authService.currentUid!;
    return doc(this.firestore, `users/${uid}/jobs/${id}`);
  }

  getAll(): Observable<Job[]> {
    return runInInjectionContext(this.injector, () =>
      collectionData(query(this.colRef, orderBy('createdAt', 'desc')), { idField: 'id' })
    ).pipe(map(docs => docs.map(d => this.fromFirestore(d))));
  }

  getById(id: string): Observable<Job> {
    return runInInjectionContext(this.injector, () =>
      docData(this.docRef(id), { idField: 'id' })
    ).pipe(map(d => this.fromFirestore(d))) as Observable<Job>;
  }

  create(item: Omit<Job, 'id' | 'createdAt'>): Promise<any> {
    return addDoc(this.colRef, {
      ...item,
      createdAt: Timestamp.fromDate(new Date()),
    });
  }

  update(id: string, item: Partial<Omit<Job, 'id'>>): Promise<void> {
    const data: any = { ...item };
    if (data.completedAt instanceof Date) {
      data.completedAt = Timestamp.fromDate(data.completedAt);
    }
    return updateDoc(this.docRef(id), data);
  }

  delete(id: string): Promise<void> {
    return deleteDoc(this.docRef(id));
  }

  private fromFirestore(data: any): Job {
    return {
      ...data,
      completedAt: data['completedAt']?.toDate ? data['completedAt'].toDate() : (data['completedAt'] ? new Date(data['completedAt']) : undefined),
      createdAt: data['createdAt']?.toDate ? data['createdAt'].toDate() : new Date(data['createdAt']),
    };
  }
}
