import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class QuestionsRefreshService {
  private readonly refreshSubject = new Subject<void>();

  get refresh$(): Observable<void> {
    return this.refreshSubject.asObservable();
  }

  triggerRefresh(): void {
    this.refreshSubject.next();
  }
}
