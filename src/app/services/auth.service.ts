import { Injectable, signal, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private supabaseSvc = inject(SupabaseService);
  private supabase = this.supabaseSvc.supabase;

  // Global authentication state
  isLoggedIn = signal<boolean>(false);

  constructor() {
    this.checkSession();
    
    // Listen to auth changes globally
    this.supabase.auth.onAuthStateChange((event, session) => {
      this.isLoggedIn.set(!!session);
    });
  }

  async checkSession() {
    const { data: { session } } = await this.supabase.auth.getSession();
    this.isLoggedIn.set(!!session);
  }

  async login(email: string, pass: string): Promise<{error: any}> {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email: email,
      password: pass
    });
    
    if (!error && data.session) {
      this.isLoggedIn.set(true);
    }
    return { error };
  }

  async logout() {
    await this.supabase.auth.signOut();
    this.isLoggedIn.set(false);
  }
}
