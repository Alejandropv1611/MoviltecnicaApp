import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DbService, Cliente, BaseRequirement } from '../../services/db.service';

@Component({
  selector: 'app-clientes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div>
      <!-- Page Header -->
      <div class="m-page-header" style="margin-bottom: 20px;">
        <div>
          <h1 class="m-page-title" style="font-size: 24px; font-weight: 800;">Gestión de Clientes</h1>
          <p class="m-page-subtitle" style="font-size: 13px;">Administra los clientes y sus requisitos obligatorios por defecto</p>
        </div>
        <button class="m-btn m-btn-pri" style="background: #1A5FA8; border-color: #1A5FA8; font-weight: 600;" (click)="openNew()">
          + Nuevo Cliente
        </button>
      </div>

      <!-- Search -->
      <div style="display: flex; gap: 14px; margin-bottom: 20px; align-items: center;">
        <div style="position: relative; width: 280px;">
          <input class="m-input" [ngModel]="q()" (ngModelChange)="q.set($event)" placeholder="🔍 Buscar cliente..." style="padding-left: 28px; border-radius: 8px;"/>
        </div>
        <span style="margin-left: auto; font-size: 12px; color: var(--txt-m);">
          {{ filteredClientes().length }} clientes
        </span>
      </div>

      <!-- Grid -->
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 20px;">
        <div *ngFor="let c of filteredClientes()" class="m-card" style="background: #FFF; border-radius: 12px; border: 0.5px solid rgba(0,0,0,0.09); padding: 18px; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 2px 10px rgba(0,0,0,0.02);">
          
          <div>
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; border-bottom: 0.5px solid var(--border); padding-bottom: 8px;">
              <h3 style="font-size: 16px; font-weight: 800; color: #1A5FA8; margin: 0;">{{ c.nombre }}</h3>
              <span class="m-pill" style="background: #EBF5E1; color: #3A7D1E; font-weight: 700;">{{ c.reqs.length }} Requisitos</span>
            </div>

            <ul style="padding: 0; margin: 0; list-style: none; font-size: 12px; color: var(--txt-m); display: flex; flex-direction: column; gap: 6px;">
              <li *ngFor="let r of c.reqs" style="display: flex; align-items: center; gap: 6px;">
                <span style="color: #1A5FA8;">•</span> {{ r.nombre }}
              </li>
              <li *ngIf="c.reqs.length === 0" style="font-style: italic; color: #9CA3AF;">Sin requisitos definidos</li>
            </ul>
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 6px; margin-top: 20px; border-top: 0.5px solid rgba(0,0,0,0.06); padding-top: 12px;">
            <button class="m-btn m-btn-sm" style="border-radius: 6px; font-weight: 600;" (click)="openEdit(c)">
              ✎ Editar
            </button>
            <button class="m-btn m-btn-sm m-btn-dan" style="border-radius: 6px; font-weight: 600;" (click)="confirmDelete(c.id)">
              ✕
            </button>
          </div>
        </div>
      </div>

      <!-- Modal -->
      <div *ngIf="modal === 'f'" class="m-modal-overlay" (click)="closeOnOverlay($event)">
        <div class="m-modal-container" style="max-width: 600px; height: auto; max-height: 90vh;">
          <div class="m-modal-header">
            <span class="m-modal-title" style="font-size: 16px; font-weight: 700;">
              {{ isEdit ? 'Editar Cliente' : 'Registrar Cliente' }}
            </span>
            <button class="m-modal-close" (click)="modal = null">×</button>
          </div>

          <div class="m-modal-body" style="padding: 20px; overflow-y: auto;">
            <div class="m-field">
              <label class="m-label">Nombre del Cliente *</label>
              <input class="m-input" [(ngModel)]="form.nombre" placeholder="Ej. Cerrejón, Drummond..." />
            </div>

            <div style="margin-top: 20px; border-top: 0.5px solid var(--border); padding-top: 15px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <label class="m-label" style="margin: 0;">Requisitos por Defecto</label>
                <button class="m-btn m-btn-sm" style="background: var(--surf); border-color: var(--border);" (click)="addReq()">+ Añadir Requisito</button>
              </div>

              <div *ngFor="let r of form.reqs; let i = index" style="display: flex; gap: 8px; margin-bottom: 8px; align-items: center;">
                <input class="m-input" style="flex: 1;" [(ngModel)]="r.nombre" placeholder="Nombre de la inducción o certificado" />
                <button class="m-btn m-btn-sm m-btn-dan" style="padding: 6px 10px;" (click)="removeReq(i)">✕</button>
              </div>
              <div *ngIf="form.reqs?.length === 0" style="text-align: center; padding: 15px; border: 1px dashed var(--border); border-radius: 6px; color: var(--txt-m); font-size: 12px;">
                No hay requisitos. Añade uno.
              </div>
            </div>
          </div>

          <div class="m-modal-header" style="border-top: 0.5px solid var(--border); border-bottom: none; display: flex; justify-content: flex-end; gap: 8px;">
            <button class="m-btn" (click)="modal = null">Cancelar</button>
            <button class="m-btn m-btn-pri" [disabled]="!isFormValid()" (click)="save()">
              {{ isEdit ? 'Guardar Cambios' : 'Registrar Cliente' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Delete Confirmation -->
      <div *ngIf="confId" class="m-modal-overlay" style="z-index: 1100;">
        <div class="m-card" style="max-width: 360px; width: 100%; padding: 24px; background: var(--card);">
          <div style="font-size: 14px; margin-bottom: 20px; line-height: 1.6;">
            ¿Eliminar al cliente <strong>{{ confName }}</strong>?
          </div>
          <div style="display: flex; gap: 8px; justify-content: flex-end;">
            <button class="m-btn" (click)="confId = null">Cancelar</button>
            <button class="m-btn m-btn-dan" (click)="deleteConfirmed()">Eliminar</button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class ClientesComponent {
  public dbService = inject(DbService);

  q = signal('');
  modal: 'f' | null = null;
  form: Partial<Cliente> = {};
  isEdit = false;

  confId: string | null = null;
  confName = '';

  filteredClientes = computed(() => {
    const qVal = this.q().toLowerCase();
    return this.dbService.clientes().filter(c => 
      !qVal || c.nombre.toLowerCase().includes(qVal)
    );
  });

  openNew() {
    this.isEdit = false;
    this.form = {
      id: this.nid(this.dbService.clientes(), 'CLI'),
      nombre: '',
      reqs: []
    };
    this.modal = 'f';
  }

  openEdit(c: Cliente) {
    this.isEdit = true;
    this.form = {
      ...c,
      reqs: c.reqs.map(r => ({ ...r }))
    };
    this.modal = 'f';
  }

  addReq() {
    if (!this.form.reqs) this.form.reqs = [];
    this.form.reqs.push({ nombre: '', vence: '', estado: 'vigente' });
  }

  removeReq(i: number) {
    if (this.form.reqs) this.form.reqs.splice(i, 1);
  }

  isFormValid(): boolean {
    return !!(this.form.id && this.form.nombre);
  }

  async save() {
    if (!this.isFormValid()) return;
    
    // Filter out empty reqs
    if (this.form.reqs) {
      this.form.reqs = this.form.reqs.filter(r => r.nombre.trim() !== '');
    }

    const itemToSave = {
      id: this.form.id!,
      nombre: this.form.nombre!,
      reqs: this.form.reqs || []
    };

    await this.dbService.upsert('clientes', itemToSave);
    this.modal = null;
  }

  confirmDelete(id: string) {
    const c = this.dbService.clientes().find(x => x.id === id);
    if (c) {
      this.confId = id;
      this.confName = c.nombre;
    }
  }

  deleteConfirmed() {
    if (this.confId) {
      this.dbService.remove('clientes', this.confId);
      this.confId = null;
    }
  }

  nid(list: any[], pfx: string): string {
    const nextNum = list.reduce((m, x) => {
      const match = x.id?.replace(pfx + '-', '');
      const val = parseInt(match || '0') || 0;
      return Math.max(m, val);
    }, 0) + 1;
    return `${pfx}-${String(nextNum).padStart(4, '0')}`;
  }

  closeOnOverlay(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      this.modal = null;
    }
  }
}
