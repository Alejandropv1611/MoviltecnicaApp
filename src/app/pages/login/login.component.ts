import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="login-container">
      <div class="login-card">
        <!-- Logo -->
        <div class="logo-container">
          <svg viewBox="0 0 200 200" width="120" height="120" xmlns="http://www.w3.org/2000/svg">
            <g stroke-width="24" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <!-- Left Green part of M -->
              <path d="M 100,100 L 40,40 C 20,20 20,180 40,160 L 100,100" stroke="#8BC34A" />
              <!-- Right Orange part of M -->
              <path d="M 100,100 L 160,40 C 180,20 180,180 160,160 L 100,100" stroke="#F57C00" />
            </g>
          </svg>
        </div>
        
        <h2 class="login-title">Iniciar Sesión</h2>
        <p class="login-subtitle">Ingresa tus credenciales para continuar</p>

        <form (ngSubmit)="onSubmit()" #loginForm="ngForm" class="login-form">
          <div class="m-field">
            <label class="m-label">Correo Electrónico</label>
            <input 
              type="email" 
              class="m-input" 
              [(ngModel)]="email" 
              name="email" 
              placeholder="Ej. admin@movitecnica.com" 
              required
            />
          </div>

          <div class="m-field">
            <label class="m-label">Contraseña</label>
            <input 
              type="password" 
              class="m-input" 
              [(ngModel)]="password" 
              name="password" 
              placeholder="••••••••" 
              required
            />
          </div>

          <div *ngIf="errorMsg()" class="error-msg">
            {{ errorMsg() }}
          </div>

          <button type="submit" class="m-btn m-btn-pri login-btn" [disabled]="!loginForm.form.valid || isLoading()">
            {{ isLoading() ? 'Verificando...' : 'Ingresar al sistema' }}
          </button>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .login-container {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #f5f7fa 0%, #e4e8eb 100%);
      font-family: 'Outfit', sans-serif;
    }
    .login-card {
      background: white;
      padding: 40px;
      border-radius: 20px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.05);
      width: 100%;
      max-width: 400px;
      text-align: center;
    }
    .logo-container {
      margin-bottom: 20px;
    }
    .login-title {
      font-size: 24px;
      font-weight: 800;
      color: #1A1A1A;
      margin: 0 0 8px 0;
    }
    .login-subtitle {
      font-size: 14px;
      color: #6B7280;
      margin: 0 0 30px 0;
    }
    .login-form {
      text-align: left;
    }
    .login-btn {
      width: 100%;
      padding: 12px;
      font-size: 15px;
      margin-top: 10px;
      border-radius: 10px;
      background: linear-gradient(90deg, #8BC34A 0%, #F57C00 100%);
      border: none;
      color: white;
    }
    .login-btn:hover {
      opacity: 0.9;
    }
    .error-msg {
      color: #C0392B;
      font-size: 13px;
      text-align: center;
      margin-bottom: 10px;
      background: #FDEBEA;
      padding: 8px;
      border-radius: 6px;
    }
  `]
})
export class LoginComponent {
  private authService = inject(AuthService);
  
  email = '';
  password = '';
  errorMsg = signal('');
  isLoading = signal(false);

  async onSubmit() {
    if (!this.email || !this.password) return;
    
    this.isLoading.set(true);
    this.errorMsg.set('');

    const { error } = await this.authService.login(this.email, this.password);
    
    this.isLoading.set(false);
    if (error) {
      this.errorMsg.set('Correo o contraseña incorrectos.');
    }
  }
}
