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
        <div *ngFor="let c of filteredClientes()" class="m-card" style="cursor: pointer; background: #FFF; border-radius: 12px; border: 0.5px solid rgba(0,0,0,0.09); padding: 18px; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 2px 10px rgba(0,0,0,0.02); transition: var(--transition);" (click)="openClientDetail(c)">
          
          <div>
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; border-bottom: 0.5px solid var(--border); padding-bottom: 8px;">
              <h3 style="font-size: 16px; font-weight: 800; color: #1A5FA8; margin: 0;">{{ c.nombre }}</h3>
              <span class="m-pill" style="background: #EBF5E1; color: #3A7D1E; font-weight: 700;">{{ c.reqs.length }} Requisitos</span>
            </div>

            <ul style="padding: 0; margin: 0; list-style: none; font-size: 12px; color: var(--txt-m); display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px;">
              <li *ngFor="let r of c.reqs" style="display: flex; align-items: center; gap: 6px;">
                <span style="color: #1A5FA8;">•</span> {{ r.nombre }}
              </li>
              <li *ngIf="c.reqs.length === 0" style="font-style: italic; color: #9CA3AF;">Sin requisitos definidos</li>
            </ul>

            <!-- Enablement indicator within card -->
            <div style="margin-top: 14px; padding-top: 10px; border-top: 0.5px dashed var(--border); font-size: 12px; display: flex; align-items: center; justify-content: space-between;">
              <span style="color: var(--txt-m); font-weight: 500;">Habilitación:</span>
              <span class="m-pill" 
                    [style.background]="getClientEnablementInfo(c.nombre).pct === 100 ? 'var(--green-l)' : (getClientEnablementInfo(c.nombre).pct >= 50 ? 'var(--amber-l)' : 'var(--red-l)')"
                    [style.color]="getClientEnablementInfo(c.nombre).pct === 100 ? 'var(--green-d)' : (getClientEnablementInfo(c.nombre).pct >= 50 ? 'var(--amber-d)' : 'var(--red-d)')"
                    style="font-weight: 700; font-size: 11px;">
                {{ getClientEnablementInfo(c.nombre).enabled }} de {{ getClientEnablementInfo(c.nombre).total }} técnicos ({{ getClientEnablementInfo(c.nombre).pct }}%)
              </span>
            </div>
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 6px; margin-top: 14px; border-top: 0.5px solid rgba(0,0,0,0.06); padding-top: 12px;">
            <button class="m-btn m-btn-sm" style="border-radius: 6px; font-weight: 600;" (click)="$event.stopPropagation(); openEdit(c)">
              ✎ Editar
            </button>
            <button class="m-btn m-btn-sm m-btn-dan" style="border-radius: 6px; font-weight: 600;" (click)="$event.stopPropagation(); confirmDelete(c.id)">
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

      <!-- --- CLIENT DETAIL MODAL --- -->
      <div *ngIf="clientDetailModal" class="m-modal-overlay" (click)="closeClientDetailOnOverlay($event)">
        <div class="m-modal-container" style="max-width: 600px; max-height: 85vh; display: flex; flex-direction: column;">
          <div class="m-modal-header" style="background: var(--surf); border-bottom: 0.5px solid var(--border);">
            <div>
              <span class="m-modal-title" style="font-size: 16px; font-weight: 700; margin: 0; line-height: 1.2;">
                Detalle de Habilitación: {{ clientDetailModal.nombre }}
              </span>
              <div style="font-size: 12px; color: var(--txt-m); margin-top: 2px;">
                Técnicos registrados y su estado de cumplimiento para este cliente
              </div>
            </div>
            <button class="m-modal-close" (click)="clientDetailModal = null">×</button>
          </div>
          
          <div class="m-modal-body" style="padding: 20px; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 16px;">
            <div style="display: flex; justify-content: space-between; align-items: center; background: var(--surf); padding: 12px 16px; border-radius: 8px; font-size: 12px;">
              <div>Técnicos Asignados: <strong>{{ getAssignedTechnicians(clientDetailModal.nombre).length }}</strong></div>
              <div>
                Habilitados (100%): 
                <strong style="color: var(--green-d);">
                  {{ getClientEnablementInfo(clientDetailModal.nombre).enabled }}
                </strong>
              </div>
            </div>

            <div style="display: flex; flex-direction: column; gap: 12px;">
              <div *ngFor="let t of getAssignedTechnicians(clientDetailModal.nombre)" style="border: 0.5px solid var(--border); border-radius: 8px; padding: 12px; background: #FFF;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                  <div>
                    <h4 style="font-size: 13px; font-weight: 700; margin: 0; color: #1A1A1A;">{{ t.nombre }}</h4>
                    <p style="font-size: 11px; color: var(--txt-m); margin: 2px 0 0 0;">{{ t.especialidad }}</p>
                  </div>
                  <span class="m-pill" 
                        [style.background]="t.isFullyEnabled ? 'var(--green-l)' : 'var(--red-l)'"
                        [style.color]="t.isFullyEnabled ? 'var(--green-d)' : 'var(--red-d)'"
                        style="font-size: 10px; font-weight: 700;">
                    {{ t.isFullyEnabled ? 'Habilitado' : 'Pendiente (' + t.pct + '%)' }}
                  </span>
                </div>

                <!-- Requirement list detail for this client -->
                <div style="background: rgba(0,0,0,0.01); border-radius: 6px; padding: 8px 12px; font-size: 11px; margin-top: 6px;">
                  <div *ngFor="let r of t.reqs" style="display: flex; justify-content: space-between; align-items: center; padding: 3px 0;">
                    <span style="color: #4B5563;">{{ r.nombre }}</span>
                    <div style="display: flex; align-items: center; gap: 6px;">
                      <span style="font-size: 10px; color: var(--txt-m);">{{ r.vence || 'Sin fecha' }}</span>
                      <span class="m-pill" style="font-size: 8px; padding: 1px 5px;" 
                            [style.background]="getReqStatusStyle(r.estado).bg" 
                            [style.color]="getReqStatusStyle(r.estado).fg">
                        {{ getReqStatusStyle(r.estado).lb }}
                      </span>
                    </div>
                  </div>
                  <div *ngIf="t.reqs.length === 0" style="color: var(--txt-m); font-style: italic; font-size: 10px;">
                    Sin requisitos registrados para este cliente.
                  </div>
                </div>
              </div>

              <div *ngIf="getAssignedTechnicians(clientDetailModal.nombre).length === 0" style="text-align: center; padding: 24px; color: var(--txt-m); font-size: 12px; border: 1px dashed var(--border); border-radius: 8px; font-style: italic;">
                No hay técnicos asignados a este cliente.
              </div>
            </div>
          </div>
          
          <div class="m-modal-header" style="border-top: 0.5px solid var(--border); border-bottom: none; display: flex; justify-content: flex-end; padding: 10px 20px;">
            <button class="m-btn m-btn-pri" style="background: #1A5FA8; border-color: #1A5FA8;" (click)="clientDetailModal = null">Cerrar</button>
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

  clientDetailModal: Cliente | null = null;

  getClientEnablementInfo(clientName: string) {
    const tecnicos = this.dbService.tecnicos();
    const assignedTecs = tecnicos.filter(t => t.clientes.some(tc => tc.nombre === clientName));
    const total = assignedTecs.length;
    if (total === 0) {
      return { enabled: 0, total: 0, pct: 0 };
    }
    const enabled = assignedTecs.filter(t => {
      const clientContract = t.clientes.find(tc => tc.nombre === clientName);
      if (!clientContract || !clientContract.reqs.length) return true;
      return clientContract.reqs.every(r => r.estado === 'vigente');
    }).length;
    return {
      enabled,
      total,
      pct: Math.round((enabled / total) * 100)
    };
  }

  getAssignedTechnicians(clientName: string) {
    const tecnicos = this.dbService.tecnicos();
    return tecnicos.filter(t => t.clientes.some(tc => tc.nombre === clientName)).map(t => {
      const clientContract = t.clientes.find(tc => tc.nombre === clientName);
      const reqs = clientContract?.reqs || [];
      const total = reqs.length;
      const enabledCount = reqs.filter(r => r.estado === 'vigente').length;
      const pct = total ? Math.round((enabledCount / total) * 100) : 0;
      const isFullyEnabled = total ? reqs.every(r => r.estado === 'vigente') : false;
      return {
        ...t,
        reqs,
        pct,
        isFullyEnabled
      };
    });
  }

  getReqStatusStyle(status: string): { bg: string, fg: string, lb: string } {
    const styles: Record<string, { bg: string, fg: string, lb: string }> = {
      'vigente': { bg: 'var(--green-l)', fg: 'var(--green-d)', lb: 'Vigente' },
      'vencido': { bg: 'var(--red-l)', fg: 'var(--red-d)', lb: 'Vencido' },
      'en-tramite': { bg: 'var(--amber-l)', fg: 'var(--amber-d)', lb: 'En trámite' },
      'pendiente': { bg: 'var(--gray-l)', fg: 'var(--gray-d)', lb: 'Pendiente' }
    };
    return styles[status] || { bg: 'var(--gray-l)', fg: 'var(--gray-d)', lb: 'Pendiente' };
  }

  openClientDetail(c: Cliente) {
    this.clientDetailModal = c;
  }

  closeClientDetailOnOverlay(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      this.clientDetailModal = null;
    }
  }

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
