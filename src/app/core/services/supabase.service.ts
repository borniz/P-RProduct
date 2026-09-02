import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environments';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {

  readonly client: SupabaseClient;

  constructor() {

    this.client = createClient(
      environment.supabaseUrl,
      environment.supabaseKey,
      {
        realtime: {
          params: {
            eventsPerSecond: 10
          }
        }
      }
    );

  }
}