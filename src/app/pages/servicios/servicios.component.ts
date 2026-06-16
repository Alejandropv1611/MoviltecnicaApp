import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DbService, Servicio } from '../../services/db.service';

@Component({
  selector: 'app-servicios',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div>
      <!-- Page Header -->
      <div class="m-page-header">
        <div>
          <h1 class="m-page-title">Control de servicios</h1>
          <p class="m-page-subtitle">Registro y seguimiento de órdenes de venta</p>
        </div>
        <button class="m-btn m-btn-pri" (click)="openNew()">+ Nueva OV</button>
      </div>

      <!-- Filters Row -->
      <div style="display: flex; gap: 10px; margin-bottom: 12px; flex-wrap: wrap; align-items: center;">
        <input class="m-input" [ngModel]="q()" (ngModelChange)="q.set($event)" placeholder="🔍 Buscar OV, cliente, OT…" style="width: 240px;"/>
        
        <select class="m-input" [ngModel]="fE()" (ngModelChange)="fE.set($event)" style="width: 175px;">
          <option value="">Todos los estados</option>
          <option value="En progreso">En progreso</option>
          <option value="Finalizado">Finalizado</option>
          <option value="En riesgo">En riesgo</option>
          <option value="Programado">Programado</option>
        </select>
        
        <select class="m-input" [ngModel]="fT()" (ngModelChange)="fT.set($event)" style="width: 155px;">
          <option value="">Todos los tipos</option>
          <option value="Preventivo">Preventivo</option>
          <option value="Correctivo">Correctivo</option>
          <option value="Emergencia">Emergencia</option>
        </select>

        <span style="margin-left: auto; font-size: 12px; color: var(--txt-m);">{{ rows().length }} registros</span>
      </div>

      <!-- Services Table -->
      <div class="m-card-flat">
        <div class="m-table-container">
          <table class="m-table">
            <thead>
              <tr>
                <th class="m-th">OV</th>
                <th class="m-th">F. Creación</th>
                <th class="m-th">Cliente</th>
                <th class="m-th">OC</th>
                <th class="m-th">Descripción</th>
                <th class="m-th">Tipo</th>
                <th class="m-th">Valor OV</th>
                <th class="m-th">Vendedor</th>
                <th class="m-th">OT</th>
                <th class="m-th">Lugar</th>
                <th class="m-th">F.Prog</th>
                <th class="m-th">F.Fin</th>
                <th class="m-th">Días</th>
                <th class="m-th">HH P/E</th>
                <th class="m-th">UB Real</th>
                <th class="m-th">Estado</th>
                <th class="m-th"></th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let x of rows()" class="m-tr">
                <td class="m-td"><strong style="color: var(--blue);">{{ x.id }}</strong></td>
                <td class="m-td" style="font-size: 11px; color: var(--txt-m);">{{ x.creado }}</td>
                <td class="m-td">{{ x.cliente }}</td>
                <td class="m-td" style="font-size: 11px; color: var(--txt-m);">{{ x.oc || '—' }}</td>
                <td class="m-td" style="max-width: 170px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" [title]="x.desc">
                  {{ x.desc }}
                </td>
                <td class="m-td">
                  <span class="m-pill" [style.background]="getTipoColor(x.tipo) + '22'" [style.color]="getTipoColor(x.tipo)">
                    {{ x.tipo }}
                  </span>
                </td>
                <td class="m-td" style="white-space: nowrap;">{{ cop(x.valor) }}</td>
                <td class="m-td" style="white-space: nowrap; font-size: 11px;">{{ x.vendedor }}</td>
                <td class="m-td" style="font-size: 11px; color: var(--txt-m);">{{ x.ot || '—' }}</td>
                <td class="m-td" style="white-space: nowrap; font-size: 11px;">{{ x.lugar || '—' }}</td>
                <td class="m-td" style="font-size: 11px;">{{ x.fp || '—' }}</td>
                <td class="m-td" style="font-size: 11px;">{{ x.ff || '—' }}</td>
                <td class="m-td">
                  <span *ngIf="dd(x.fp, x.ff) !== null" class="m-pill" 
                        [style.background]="dd(x.fp, x.ff)! <= 30 ? 'var(--green-l)' : 'var(--red-l)'" 
                        [style.color]="dd(x.fp, x.ff)! <= 30 ? 'var(--green-d)' : 'var(--red-d)'">
                    {{ dd(x.fp, x.ff) }}d
                  </span>
                  <span *ngIf="dd(x.fp, x.ff) === null">—</span>
                </td>
                <td class="m-td" style="white-space: nowrap;">
                  <span>{{ x.hhp }}h/{{ x.hhe }}h</span>
                  <div *ngIf="x.hhp > 0" style="margin-top: 3px; height: 5px; border-radius: 5px; background: var(--border); overflow: hidden;">
                    <div style="height: 100%; transition: width 0.3s;"
                         [style.width.%]="mathMin(mathRound(x.hhe / x.hhp * 100), 100)"
                         [style.background]="(x.hhe / x.hhp * 100) >= 95 ? 'var(--green)' : 'var(--amber)'">
                    </div>
                  </div>
                </td>
                <td class="m-td">
                  <span *ngIf="x.ubr !== null && x.ubr !== undefined" class="m-pill"
                        [style.background]="x.ubr >= 36 ? 'var(--green-l)' : 'var(--red-l)'"
                        [style.color]="x.ubr >= 36 ? 'var(--green-d)' : 'var(--red-d)'">
                    {{ x.ubr }}%
                  </span>
                  <span *ngIf="x.ubr === null || x.ubr === undefined" style="color: var(--txt-m); font-size: 11px;">—</span>
                </td>
                <td class="m-td">
                  <span class="m-pill" [style.background]="getEstadoStyle(x.estado).bg" [style.color]="getEstadoStyle(x.estado).fg">
                    {{ x.estado }}
                  </span>
                </td>
                <td class="m-td">
                  <div style="display: flex; gap: 4px;">
                    <button class="m-btn m-btn-sm" (click)="openEdit(x)">✎</button>
                    <button class="m-btn m-btn-sm m-btn-dan" (click)="confirmDelete(x.id)">✕</button>
                  </div>
                </td>
              </tr>
              <tr *ngIf="rows().length === 0">
                <td colspan="16" style="text-align: center; padding: 36px; color: var(--txt-m);">
                  No hay servicios registrados
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Add/Edit Modal -->
      <div *ngIf="modal === 'f'" class="m-modal-overlay" (click)="closeOnOverlay($event)">
        <div class="m-modal-container" style="max-width: 780px;">
          <div class="m-modal-header">
            <span class="m-modal-title">{{ form.creado ? 'Editar OV' : 'Nueva orden de servicio' }}</span>
            <button class="m-modal-close" (click)="closeModal()">×</button>
          </div>
          <div class="m-modal-body">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0 18px;">
              <div class="m-field">
                <label class="m-label">OV *</label>
                <input class="m-input" [(ngModel)]="form.id" placeholder="Ej: OV-2601"/>
              </div>
              <div class="m-field">
                <label class="m-label">OC *</label>
                <input class="m-input" [(ngModel)]="form.oc" placeholder="Ej: OC-4501"/>
              </div>
              <div class="m-field">
                <label class="m-label">Cliente *</label>
                <select class="m-input" [(ngModel)]="form.cliente">
                  <option *ngFor="let c of clientesList()" [value]="c">{{ c }}</option>
                </select>
              </div>
              <div class="m-field">
                <label class="m-label">Vendedor</label>
                <select class="m-input" [(ngModel)]="form.vendedor">
                  <option *ngFor="let v of VEND" [value]="v">{{ v }}</option>
                </select>
              </div>
              <div class="m-field">
                <label class="m-label">Tipo</label>
                <select class="m-input" [(ngModel)]="form.tipo">
                  <option value="Preventivo">Preventivo</option>
                  <option value="Correctivo">Correctivo</option>
                  <option value="Emergencia">Emergencia</option>
                </select>
              </div>
              <div class="m-field">
                <label class="m-label">Estado</label>
                <select class="m-input" [(ngModel)]="form.estado">
                  <option value="En progreso">En progreso</option>
                  <option value="Programado">Programado</option>
                  <option value="En riesgo">En riesgo</option>
                  <option value="Finalizado">Finalizado</option>
                </select>
              </div>
            </div>

            <div class="m-field">
              <label class="m-label">Descripción *</label>
              <textarea class="m-input" [(ngModel)]="form.desc" style="min-height: 56px; resize: vertical;"></textarea>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0 18px;">
              <div class="m-field">
                <label class="m-label">OT</label>
                <input class="m-input" [(ngModel)]="form.ot"/>
              </div>
              <div class="m-field">
                <label class="m-label">Unidad/Equipo</label>
                <input class="m-input" [(ngModel)]="form.unidad"/>
              </div>
              <div class="m-field">
                <label class="m-label">Centro de costo</label>
                <input class="m-input" [(ngModel)]="form.cc"/>
              </div>
              <div class="m-field" style="grid-column: span 3;">
                <label class="m-label">Lugar</label>
                <input class="m-input" [(ngModel)]="form.lugar"/>
              </div>
              <div class="m-field">
                <label class="m-label">F. Programación</label>
                <input class="m-input" type="date" [(ngModel)]="form.fp"/>
              </div>
              <div class="m-field">
                <label class="m-label">F. Finalización</label>
                <input class="m-input" type="date" [(ngModel)]="form.ff"/>
              </div>
              <div class="m-field">
                <label class="m-label">Técnico Asignado</label>
                <select class="m-input" [(ngModel)]="form.tecnico">
                  <option value="">(Ninguno)</option>
                  <option *ngFor="let t of tecnicos()" [value]="t.nombre">{{ t.nombre }}</option>
                </select>
              </div>
              <div class="m-field">
                <label class="m-label">HH programadas</label>
                <input class="m-input" type="number" [(ngModel)]="form.hhp"/>
              </div>
              <div class="m-field">
                <label class="m-label">HH ejecutadas</label>
                <input class="m-input" type="number" [(ngModel)]="form.hhe"/>
              </div>
            </div>

            <!-- Financial Block -->
            <div style="background: var(--surf); border-radius: var(--radius-sm); padding: 11px 14px; margin-bottom: 14px;">
              <div style="font-size: 11px; font-weight: 700; margin-bottom: 8px; color: var(--txt-m); text-transform: uppercase;">
                Financiero
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 0 18px;">
                <div class="m-field" style="margin-bottom: 0;">
                  <label class="m-label">Valor OV (S/)</label>
                  <input class="m-input" type="number" [(ngModel)]="form.valor"/>
                </div>
                <div class="m-field" style="margin-bottom: 0;">
                  <label class="m-label">Costo estimado</label>
                  <input class="m-input" type="number" [(ngModel)]="form.costo"/>
                </div>
                <div class="m-field" style="margin-bottom: 0;">
                  <label class="m-label">UB Proyectada %</label>
                  <input class="m-input" readonly [value]="getProjectedUB()" 
                         [style.background]="getProjectedUBColorBg()" 
                         [style.color]="getProjectedUBColorText()" 
                         style="font-weight: 700;"/>
                </div>
                <div class="m-field" style="margin-bottom: 0;">
                  <label class="m-label">UB Real %</label>
                  <input class="m-input" type="number" [(ngModel)]="form.ubr"/>
                </div>
              </div>
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 8px;">
              <button class="m-btn" (click)="closeModal()">Cancelar</button>
              <button class="m-btn m-btn-pri" [disabled]="!isFormValid()" (click)="save()">
                {{ form.creado ? 'Guardar cambios' : 'Registrar OV' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Delete Confirmation -->
      <div *ngIf="confId" class="m-modal-overlay" style="z-index: 1100;">
        <div class="m-card" style="max-width: 360px; width: 100%; padding: 24px; background: var(--card); border-radius: var(--radius-md);">
          <div style="font-size: 14px; margin-bottom: 20px; line-height: 1.6;">
            ¿Eliminar el servicio <strong>{{ confId }}</strong>? Esta acción no se puede deshacer.
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
export class ServiciosComponent {
  private dbService = inject(DbService);

  // States (Signals for full reactivity)
  q = signal('');
  fE = signal('');
  fT = signal('');
  
  modal: 'f' | null = null;
  form: Partial<Servicio> = {};
  confId: string | null = null;

  // Constants
  VEND = ["Carlos Ruiz", "Ana Martínez", "Pedro Gómez"];

  tecnicos = computed(() => this.dbService.tecnicos());
  clientesList = computed(() => this.dbService.clientes().map(c => c.nombre));

  // Filtered rows (Tracks changes in q(), fE(), and fT())
  rows = computed(() => {
    const query = this.q().toLowerCase();
    const estado = this.fE();
    const tipo = this.fT();
    
    return this.dbService.servicios().filter(x => {
      const matchesSearch = !query || 
        [x.id, x.cliente, x.desc, x.ot, x.lugar].join(' ').toLowerCase().includes(query);
      const matchesEstado = !estado || x.estado === estado;
      const matchesTipo = !tipo || x.tipo === tipo;
      
      return matchesSearch && (!estado || x.estado === estado) && (!tipo || x.tipo === tipo);
    });
  });

  openNew() {
    this.form = {
      id: this.nid(this.dbService.servicios(), 'OV'),
      oc: '',
      cliente: this.clientesList().length > 0 ? this.clientesList()[0] : '',
      vendedor: this.VEND[0],
      tipo: 'Preventivo',
      estado: 'En progreso',
      desc: '',
      ot: '',
      unidad: '',
      cc: '',
      lugar: '',
      fp: '',
      ff: '',
      tecnico: '',
      hhp: 0,
      hhe: 0,
      valor: 0,
      costo: 0,
      ubr: null
    };
    this.modal = 'f';
  }

  openEdit(s: Servicio) {
    this.form = { ...s };
    this.modal = 'f';
  }

  closeModal() {
    this.modal = null;
  }

  closeOnOverlay(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      this.closeModal();
    }
  }

  isFormValid(): boolean {
    return !!(this.form.id && this.form.cliente && this.form.desc);
  }

  async save() {
    if (!this.isFormValid()) return;
    
    const finalItem: Servicio = {
      id: this.form.id!,
      oc: this.form.oc || '',
      cliente: this.form.cliente!,
      vendedor: this.form.vendedor || '',
      tipo: (this.form.tipo as any) || 'Preventivo',
      estado: (this.form.estado as any) || 'En progreso',
      desc: this.form.desc!,
      ot: this.form.ot || '',
      unidad: this.form.unidad || '',
      cc: this.form.cc || '',
      lugar: this.form.lugar || '',
      fp: this.form.fp || '',
      ff: this.form.ff || '',
      tecnico: this.form.tecnico || '',
      hhp: Number(this.form.hhp) || 0,
      hhe: Number(this.form.hhe) || 0,
      valor: Number(this.form.valor) || 0,
      costo: Number(this.form.costo) || 0,
      ubp: this.calculateUB(Number(this.form.valor) || 0, Number(this.form.costo) || 0),
      ubr: this.form.ubr !== null && this.form.ubr !== undefined && String(this.form.ubr) !== '' ? Number(this.form.ubr) : null,
      creado: this.form.creado || new Date().toISOString().slice(0, 10)
    };

    await this.dbService.upsert('servicios', finalItem);
    this.closeModal();
  }

  confirmDelete(id: string) {
    this.confId = id;
  }

  deleteConfirmed() {
    if (this.confId) {
      this.dbService.remove('servicios', this.confId);
      this.confId = null;
    }
  }

  // Calculation helpers
  calculateUB(valor: number, costo: number): number | null {
    if (valor && costo && valor > 0) {
      return Math.round(((valor - costo) / valor) * 1000) / 10;
    }
    return null;
  }

  getProjectedUB(): string {
    const val = Number(this.form.valor) || 0;
    const cost = Number(this.form.costo) || 0;
    const ub = this.calculateUB(val, cost);
    return ub !== null ? `${ub}%` : '—';
  }

  getProjectedUBColorBg(): string {
    const val = Number(this.form.valor) || 0;
    const cost = Number(this.form.costo) || 0;
    const ub = this.calculateUB(val, cost);
    if (ub === null) return 'var(--surf)';
    return ub >= 36 ? 'var(--green-l)' : 'var(--red-l)';
  }

  getProjectedUBColorText(): string {
    const val = Number(this.form.valor) || 0;
    const cost = Number(this.form.costo) || 0;
    const ub = this.calculateUB(val, cost);
    if (ub === null) return 'var(--txt-m)';
    return ub >= 36 ? 'var(--green-d)' : 'var(--red-d)';
  }

  // Utilities
  cop(n: number | null): string {
    return n == null ? '—' : 'S/ ' + Math.round(n).toLocaleString('es-PE');
  }

  dd(a: string | undefined, b: string | undefined): number | null {
    if (!a || !b) return null;
    return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
  }

  nid(list: any[], pfx: string): string {
    const nextNum = list.reduce((m, x) => {
      const match = x.id?.replace(pfx + '-', '');
      const val = parseInt(match || '0') || 0;
      return Math.max(m, val);
    }, 0) + 1;
    return `${pfx}-${String(nextNum).padStart(4, '0')}`;
  }

  getTipoColor(tipo: string): string {
    if (tipo === 'Preventivo') return 'var(--blue)';
    if (tipo === 'Correctivo') return 'var(--amber)';
    return 'var(--red)';
  }

  getEstadoStyle(estado: string): { bg: string, fg: string } {
    const styles: Record<string, { bg: string, fg: string }> = {
      'Finalizado': { bg: 'var(--green-l)', fg: 'var(--green-d)' },
      'En progreso': { bg: 'var(--blue-l)', fg: 'var(--blue-d)' },
      'En riesgo': { bg: 'var(--red-l)', fg: 'var(--red-d)' },
      'Programado': { bg: 'var(--gray-l)', fg: 'var(--gray-d)' }
    };
    return styles[estado] || { bg: 'var(--gray-l)', fg: 'var(--gray-d)' };
  }

  mathMin(a: number, b: number): number { return Math.min(a, b); }
  mathRound(n: number): number { return Math.round(n); }
}
