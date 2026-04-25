import { Injectable, inject, Injector, runInInjectionContext } from '@angular/core';
import {
  Firestore, collection, collectionData, doc, docData,
  addDoc, updateDoc, deleteDoc, query, orderBy, Timestamp
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { map, filter } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { Client } from '../models/client.model';

@Injectable({ providedIn: 'root' })
export class ClientService {
  private firestore   = inject(Firestore);
  private authService = inject(AuthService);
  private injector    = inject(Injector);

  private get colRef() {
    const uid = this.authService.currentUid!;
    return collection(this.firestore, `users/${uid}/clients`);
  }

  private docRef(id: string) {
    const uid = this.authService.currentUid!;
    return doc(this.firestore, `users/${uid}/clients/${id}`);
  }

  getAll(): Observable<Client[]> {
    return runInInjectionContext(this.injector, () =>
      collectionData(query(this.colRef, orderBy('createdAt', 'desc')), { idField: 'id' })
    ).pipe(map(docs => docs.map(d => this.fromFirestore(d))));
  }

  getById(id: string): Observable<Client> {
    return runInInjectionContext(this.injector, () =>
      docData(this.docRef(id), { idField: 'id' })
    ).pipe(
      filter(d => !!d),
      map(d => this.fromFirestore(d))
    ) as Observable<Client>;
  }

  create(item: Omit<Client, 'id' | 'createdAt'>): Promise<any> {
    return addDoc(this.colRef, {
      ...item,
      createdAt: Timestamp.fromDate(new Date()),
    });
  }

  update(id: string, item: Partial<Omit<Client, 'id'>>): Promise<void> {
    return updateDoc(this.docRef(id), item as any);
  }

  delete(id: string): Promise<void> {
    return deleteDoc(this.docRef(id));
  }

  private fromFirestore(data: any): Client {
    return {
      ...data,
      createdAt: data['createdAt']?.toDate ? data['createdAt'].toDate() : new Date(data['createdAt']),
    };
  }
}
