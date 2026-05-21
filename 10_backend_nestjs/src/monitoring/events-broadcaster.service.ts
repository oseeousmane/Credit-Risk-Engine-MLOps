import { Injectable } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';

export interface SseEvent {
  type: 'alert.created' | 'decision.submitted' | 'model.status_changed' | 'scoring.completed' | 'pipeline.stage_changed';
  data: Record<string, any>;
  timestamp: string;
}

@Injectable()
export class EventsBroadcasterService {
  private readonly subject = new Subject<SseEvent>();

  /** Emit an event to all connected SSE clients. */
  emit(type: SseEvent['type'], data: Record<string, any>) {
    this.subject.next({ type, data, timestamp: new Date().toISOString() });
  }

  /** Observable consumed by the SSE endpoint. */
  stream(): Observable<SseEvent> {
    return this.subject.asObservable();
  }
}
