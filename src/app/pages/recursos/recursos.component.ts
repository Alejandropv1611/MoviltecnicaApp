import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DbService, SolicEpp, EppItem, Viatico, Insumo, Repuesto } from '../../services/db.service';

@Component({
  selector: 'app-recursos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div>
      <!-- Page Header -->
      <div class="m-page-header">
        <div>
          <h1 class="m-page-title">Control de recursos</h1>
          <p class="m-page-subtitle">EPPs, viáticos, insumos y repuestos por servicio</p>
        </div>
        <button class="m-btn m-btn-pri" (click)="openNew()">
          {{ activeTab() === 'solicEpp' ? '+ Nueva solicitud EPP' : '+ Nuevo registro' }}
        </button>
      </div>

      <!-- Tab Selection -->
      <div style="display: flex; gap: 0; border-bottom: 0.5px solid var(--border); margin-bottom: 14px;">
        <div *ngFor="let t of TABS" 
             (click)="setTab(t.id)" 
             style="padding: 9px 16px; font-size: 13px; cursor: pointer; margin-bottom: -1px; transition: var(--transition);"
             [style.font-weight]="activeTab() === t.id ? '700' : '400'"
             [style.border-bottom]="activeTab() === t.id ? '2.5px solid var(--blue)' : '2.5px solid transparent'"
             [style.color]="activeTab() === t.id ? 'var(--blue)' : 'var(--txt-m)'">
          {{ t.lb }} 
          <span style="font-size: 11px; background: var(--surf); border-radius: 10px; padding: 1px 6px; margin-left: 3px;">
            {{ getCount(t.id) }}
          </span>
        </div>
      </div>

      <!-- Top Filters & Summary -->
      <div style="display: flex; gap: 10px; margin-bottom: 12px; align-items: center;">
        <select class="m-input" [ngModel]="fOV()" (ngModelChange)="fOV.set($event)" style="width: 175px;">
          <option value="">Todas las OV</option>
          <option *ngFor="let ov of ovOpts()" [value]="ov">{{ ov }}</option>
        </select>
        <span style="margin-left: auto; font-size: 12px; color: var(--txt-m);">
          Total: <strong style="color: var(--txt);">{{ cop(totalSum()) }}</strong>
        </span>
      </div>

      <!-- ── TAB: EPP REQUESTS (SOLICITUDES AGRUPADAS) ── -->
      <div *ngIf="activeTab() === 'solicEpp'">
        <div *ngFor="let s of eppRows()" class="m-card" style="margin-bottom: 10px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <!-- Avatar -->
              <div style="width: 36px; height: 36px; border-radius: 50%; background: var(--blue-l); color: var(--blue-d); display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; flex-shrink: 0;">
                {{ getInitials(s.tecnico) }}
              </div>
              <div>
                <div style="font-size: 14px; font-weight: 700;">{{ s.tecnico }}</div>
                <div style="font-size: 11px; color: var(--txt-m);">
                  {{ s.ov }} &middot; {{ s.fecha }} &middot; {{ s.id }}
                </div>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="m-pill" [style.background]="getEppStatusStyle(s.estado).bg" [style.color]="getEppStatusStyle(s.estado).fg">
                {{ s.estado }}
              </span>
              <span style="font-size: 14px; font-weight: 700; color: var(--blue);">{{ cop(solTotal(s)) }}</span>
              <button class="m-btn m-btn-sm" (click)="openEditEpp(s)">✎</button>
              <button class="m-btn m-btn-sm m-btn-dan" (click)="confirmDelete(s.id)">✕</button>
            </div>
          </div>
          
          <!-- Items Subtable -->
          <div style="background: var(--surf); border-radius: var(--radius-sm); overflow: hidden;">
            <div style="display: grid; grid-template-columns: 2fr 60px 110px 90px; gap: 8px; padding: 7px 12px; border-bottom: 0.5px solid var(--border);">
              <span *ngFor="let h of ['EPP', 'Cant.', 'Costo Unit.', 'Subtotal']" 
                    style="font-size: 10px; font-weight: 700; color: var(--txt-m); text-transform: uppercase;">
                {{ h }}
              </span>
            </div>
            <div *ngFor="let it of s.items" 
                 style="display: grid; grid-template-columns: 2fr 60px 110px 90px; gap: 8px; padding: 7px 12px; border-bottom: 0.5px solid var(--border); background: var(--card);">
              <span style="font-size: 12px;">{{ it.desc }}</span>
              <span style="font-size: 12px;">{{ it.qty }}</span>
              <span style="font-size: 12px;">{{ cop(it.cu) }}</span>
              <span style="font-size: 12px; font-weight: 600;">{{ cop(it.cu * it.qty) }}</span>
            </div>
          </div>
          <div *ngIf="s.obs" style="font-size: 11px; color: var(--txt-m); margin-top: 7px;">
            Obs: {{ s.obs }}
          </div>
        </div>
        
        <div *ngIf="eppRows().length === 0" class="m-card" style="text-align: center; padding: 40px; color: var(--txt-m);">
          No hay solicitudes de EPP registradas
        </div>
      </div>

      <!-- ── TABS: VIATICOS, INSUMOS, REPUESTOS ── -->
      <div *ngIf="activeTab() !== 'solicEpp'" class="m-card-flat">
        <div class="m-table-container">
          <table class="m-table">
            <thead>
              <tr *ngIf="activeTab() === 'viaticos'">
                <th class="m-th">ID</th>
                <th class="m-th">OV</th>
                <th class="m-th">Técnico</th>
                <th class="m-th">Concepto</th>
                <th class="m-th">Días</th>
                <th class="m-th">Valor/día</th>
                <th class="m-th">Total</th>
                <th class="m-th">Fecha</th>
                <th class="m-th">Estado</th>
                <th class="m-th"></th>
              </tr>
              <tr *ngIf="activeTab() === 'insumos'">
                <th class="m-th">ID</th>
                <th class="m-th">OV</th>
                <th class="m-th">Insumo</th>
                <th class="m-th">Unidad</th>
                <th class="m-th">Cant</th>
                <th class="m-th">Costo Unit</th>
                <th class="m-th">Total</th>
                <th class="m-th">Proveedor</th>
                <th class="m-th">Estado</th>
                <th class="m-th"></th>
              </tr>
              <tr *ngIf="activeTab() === 'repuestos'">
                <th class="m-th">ID</th>
                <th class="m-th">OV</th>
                <th class="m-th">Referencia</th>
                <th class="m-th">Descripción</th>
                <th class="m-th">Cant</th>
                <th class="m-th">Costo Unit</th>
                <th class="m-th">Total</th>
                <th class="m-th">Proveedor</th>
                <th class="m-th">Garantía</th>
                <th class="m-th">Estado</th>
                <th class="m-th"></th>
              </tr>
            </thead>
            <tbody>
              <!-- Viáticos Rows -->
              <ng-container *ngIf="activeTab() === 'viaticos'">
                <tr *ngFor="let x of viaticosRows()" class="m-tr">
                  <td class="m-td" style="font-size: 11px; color: var(--txt-m);">{{ x.id }}</td>
                  <td class="m-td"><strong style="color: var(--blue);">{{ x.ov }}</strong></td>
                  <td class="m-td">{{ x.tecnico }}</td>
                  <td class="m-td">{{ x.concepto }}</td>
                  <td class="m-td">{{ x.dias }}</td>
                  <td class="m-td">{{ cop(x.vpd) }}</td>
                  <td class="m-td" style="font-weight: 600;">{{ cop(x.vpd * x.dias) }}</td>
                  <td class="m-td" style="font-size: 11px;">{{ x.fecha }}</td>
                  <td class="m-td">
                    <span class="m-pill" [style.background]="getGenericStatusStyle(x.estado).bg" [style.color]="getGenericStatusStyle(x.estado).fg">
                      {{ x.estado }}
                    </span>
                  </td>
                  <td class="m-td">
                    <div style="display: flex; gap: 4px;">
                      <button class="m-btn m-btn-sm" (click)="openEditGeneric(x)">✎</button>
                      <button class="m-btn m-btn-sm m-btn-dan" (click)="confirmDelete(x.id)">✕</button>
                    </div>
                  </td>
                </tr>
              </ng-container>

              <!-- Insumos Rows -->
              <ng-container *ngIf="activeTab() === 'insumos'">
                <tr *ngFor="let x of insumosRows()" class="m-tr">
                  <td class="m-td" style="font-size: 11px; color: var(--txt-m);">{{ x.id }}</td>
                  <td class="m-td"><strong style="color: var(--blue);">{{ x.ov }}</strong></td>
                  <td class="m-td">{{ x.insumo }}</td>
                  <td class="m-td">{{ x.unidad }}</td>
                  <td class="m-td">{{ x.qty }}</td>
                  <td class="m-td">{{ cop(x.cu) }}</td>
                  <td class="m-td" style="font-weight: 600;">{{ cop(x.cu * x.qty) }}</td>
                  <td class="m-td" style="font-size: 11px;">{{ x.proveedor }}</td>
                  <td class="m-td">
                    <span class="m-pill" [style.background]="getGenericStatusStyle(x.estado).bg" [style.color]="getGenericStatusStyle(x.estado).fg">
                      {{ x.estado }}
                    </span>
                  </td>
                  <td class="m-td">
                    <div style="display: flex; gap: 4px;">
                      <button class="m-btn m-btn-sm" (click)="openEditGeneric(x)">✎</button>
                      <button class="m-btn m-btn-sm m-btn-dan" (click)="confirmDelete(x.id)">✕</button>
                    </div>
                  </td>
                </tr>
              </ng-container>

              <!-- Repuestos Rows -->
              <ng-container *ngIf="activeTab() === 'repuestos'">
                <tr *ngFor="let x of repuestosRows()" class="m-tr">
                  <td class="m-td" style="font-size: 11px; color: var(--txt-m);">{{ x.id }}</td>
                  <td class="m-td"><strong style="color: var(--blue);">{{ x.ov }}</strong></td>
                  <td class="m-td" style="font-size: 11px;">{{ x.ref }}</td>
                  <td class="m-td" style="max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" [title]="x.desc">
                    {{ x.desc }}
                  </td>
                  <td class="m-td">{{ x.qty }}</td>
                  <td class="m-td">{{ cop(x.cu) }}</td>
                  <td class="m-td" style="font-weight: 600;">{{ cop(x.cu * x.qty) }}</td>
                  <td class="m-td" style="font-size: 11px;">{{ x.proveedor }}</td>
                  <td class="m-td" style="font-size: 11px;">{{ x.garantia }}</td>
                  <td class="m-td">
                    <span class="m-pill" [style.background]="getGenericStatusStyle(x.estado).bg" [style.color]="getGenericStatusStyle(x.estado).fg">
                      {{ x.estado }}
                    </span>
                  </td>
                  <td class="m-td">
                    <div style="display: flex; gap: 4px;">
                      <button class="m-btn m-btn-sm" (click)="openEditGeneric(x)">✎</button>
                      <button class="m-btn m-btn-sm m-btn-dan" (click)="confirmDelete(x.id)">✕</button>
                    </div>
                  </td>
                </tr>
              </ng-container>

              <tr *ngIf="activeTab() === 'viaticos' && viaticosRows().length === 0">
                <td colspan="12" style="text-align: center; padding: 36px; color: var(--txt-m);">No hay viáticos registrados</td>
              </tr>
              <tr *ngIf="activeTab() === 'insumos' && insumosRows().length === 0">
                <td colspan="12" style="text-align: center; padding: 36px; color: var(--txt-m);">No hay insumos registrados</td>
              </tr>
              <tr *ngIf="activeTab() === 'repuestos' && repuestosRows().length === 0">
                <td colspan="12" style="text-align: center; padding: 36px; color: var(--txt-m);">No hay repuestos registrados</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ── MODAL: SOLICITUD EPP (COMPLEX DYNAMIC FORM) ── -->
      <div *ngIf="eppModal === 'f'" class="m-modal-overlay" (click)="closeOnOverlay($event, 'epp')">
        <div class="m-modal-container" style="max-width: 760px;">
          <div class="m-modal-header">
            <span class="m-modal-title">
              {{ eppForm.id && isEdit ? 'Editar solicitud EPP' : 'Nueva solicitud de EPPs' }}
            </span>
            <button class="m-modal-close" (click)="eppModal = null">×</button>
          </div>
          <div class="m-modal-body">
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0 18px;">
              <div class="m-field">
                <label class="m-label">OV / Servicio *</label>
                <select class="m-input" [(ngModel)]="eppForm.ov">
                  <option *ngFor="let ov of ovOptsNoBlank()" [value]="ov">{{ ov }}</option>
                </select>
              </div>
              <div class="m-field">
                <label class="m-label">Técnico *</label>
                <select class="m-input" [(ngModel)]="eppForm.tecnico">
                  <option *ngFor="let t of tOptsNoBlank()" [value]="t">{{ t }}</option>
                </select>
              </div>
              <div class="m-field">
                <label class="m-label">Fecha solicitud</label>
                <input class="m-input" type="date" [(ngModel)]="eppForm.fecha"/>
              </div>
              <div class="m-field">
                <label class="m-label">Estado</label>
                <select class="m-input" [(ngModel)]="eppForm.estado">
                  <option value="Pendiente">Pendiente</option>
                  <option value="En tránsito">En tránsito</option>
                  <option value="Entregado">Entregado</option>
                </select>
              </div>
              <div class="m-field" style="grid-column: span 2;">
                <label class="m-label">Observaciones</label>
                <input class="m-input" [(ngModel)]="eppForm.obs"/>
              </div>
            </div>

            <!-- Dynamic Items Editor -->
            <div style="margin-top: 10px; margin-bottom: 20px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <span style="font-size: 11px; font-weight: 700; color: var(--txt-m); text-transform: uppercase;">
                  Artículos solicitados *
                </span>
                <button class="m-btn m-btn-sm" (click)="addEppItem()">+ Agregar ítem</button>
              </div>

              <div style="background: var(--surf); border-radius: var(--radius-sm); overflow: hidden;">
                <!-- Header -->
                <div style="display: grid; grid-template-columns: 2fr 70px 120px 100px 40px; gap: 8px; padding: 7px 12px; border-bottom: 0.5px solid var(--border);">
                  <span *ngFor="let h of ['Descripción', 'Cant.', 'Costo Unit.', 'Subtotal', '']" 
                        style="font-size: 10px; font-weight: 700; color: var(--txt-m); text-transform: uppercase;">
                    {{ h }}
                  </span>
                </div>
                <!-- Rows -->
                <div *ngFor="let it of eppItems; let idx = index" 
                     style="display: grid; grid-template-columns: 2fr 70px 120px 100px 40px; gap: 8px; padding: 6px 12px; align-items: center; border-bottom: 0.5px solid var(--border); background: var(--card);">
                  <input class="m-input" [(ngModel)]="it.desc" placeholder="Arnés, botas, etc."/>
                  <input class="m-input" type="number" [(ngModel)]="it.qty" min="1"/>
                  <input class="m-input" type="number" [(ngModel)]="it.cu"/>
                  <span style="font-size: 12px; font-weight: 600; padding-left: 4px;">{{ cop((it.qty || 0) * (it.cu || 0)) }}</span>
                  <button class="m-btn m-btn-sm m-btn-dan" (click)="removeEppItem(idx)" style="padding: 4px 6px;">✕</button>
                </div>
              </div>
            </div>

            <!-- Modal Footer -->
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 14px; font-weight: 700;">
                Total Solicitud: <strong style="color: var(--blue);">{{ cop(getEppItemsTotal()) }}</strong>
              </span>
              <div style="display: flex; gap: 8px;">
                <button class="m-btn" (click)="eppModal = null">Cancelar</button>
                <button class="m-btn m-btn-pri" [disabled]="!isEppFormValid()" (click)="saveEpp()">
                  {{ isEdit ? 'Guardar cambios' : 'Registrar solicitud' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ── MODAL: VIATICOS, INSUMOS, REPUESTOS ── -->
      <div *ngIf="genericModal === 'f'" class="m-modal-overlay" (click)="closeOnOverlay($event, 'generic')">
        <div class="m-modal-container" style="max-width: 600px;">
          <div class="m-modal-header">
            <span class="m-modal-title">
              {{ isEdit ? 'Editar Registro' : 'Nuevo Registro de ' + getActiveTabLabel() }}
            </span>
            <button class="m-modal-close" (click)="genericModal = null">×</button>
          </div>
          <div class="m-modal-body">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0 18px;">
              <div class="m-field">
                <label class="m-label">Registro ID *</label>
                <input class="m-input" [(ngModel)]="genericForm.id" readonly style="background: var(--surf);"/>
              </div>
              <div class="m-field">
                <label class="m-label">OV / Servicio *</label>
                <select class="m-input" [(ngModel)]="genericForm.ov">
                  <option *ngFor="let ov of ovOptsNoBlank()" [value]="ov">{{ ov }}</option>
                </select>
              </div>

              <!-- ── VIATICOS FIELDS ── -->
              <ng-container *ngIf="activeTab() === 'viaticos'">
                <div class="m-field">
                  <label class="m-label">Técnico *</label>
                  <select class="m-input" [(ngModel)]="genericForm.tecnico">
                    <option *ngFor="let t of tOptsNoBlank()" [value]="t">{{ t }}</option>
                  </select>
                </div>
                <div class="m-field">
                  <label class="m-label">Fecha</label>
                  <input class="m-input" type="date" [(ngModel)]="genericForm.fecha"/>
                </div>
                <div class="m-field" style="grid-column: span 2;">
                  <label class="m-label">Concepto *</label>
                  <input class="m-input" [(ngModel)]="genericForm.concepto" placeholder="Hospedaje, alimentación, peajes..."/>
                </div>
                <div class="m-field">
                  <label class="m-label">Días *</label>
                  <input class="m-input" type="number" [(ngModel)]="genericForm.dias"/>
                </div>
                <div class="m-field">
                  <label class="m-label">Valor por día (S/) *</label>
                  <input class="m-input" type="number" [(ngModel)]="genericForm.vpd"/>
                </div>
                <div class="m-field">
                  <label class="m-label">Estado</label>
                  <select class="m-input" [(ngModel)]="genericForm.estado">
                    <option value="En curso">En curso</option>
                    <option value="Liquidado">Liquidado</option>
                  </select>
                </div>
                <div class="m-field" style="display: flex; align-items: flex-end; justify-content: flex-end;">
                  <div style="font-size: 13px; font-weight: 700; text-align: right; width: 100%; padding-bottom: 8px;">
                    Total: {{ cop((genericForm.dias || 0) * (genericForm.vpd || 0)) }}
                  </div>
                </div>
              </ng-container>

              <!-- ── INSUMOS FIELDS ── -->
              <ng-container *ngIf="activeTab() === 'insumos'">
                <div class="m-field" style="grid-column: span 2;">
                  <label class="m-label">Insumo / Artículo *</label>
                  <input class="m-input" [(ngModel)]="genericForm.insumo"/>
                </div>
                <div class="m-field">
                  <label class="m-label">Unidad de medida</label>
                  <input class="m-input" [(ngModel)]="genericForm.unidad" placeholder="Kg, Gal, Unid, Rollo..."/>
                </div>
                <div class="m-field">
                  <label class="m-label">Proveedor</label>
                  <input class="m-input" [(ngModel)]="genericForm.proveedor"/>
                </div>
                <div class="m-field">
                  <label class="m-label">Cantidad *</label>
                  <input class="m-input" type="number" [(ngModel)]="genericForm.qty"/>
                </div>
                <div class="m-field">
                  <label class="m-label">Costo unitario (S/) *</label>
                  <input class="m-input" type="number" [(ngModel)]="genericForm.cu"/>
                </div>
                <div class="m-field">
                  <label class="m-label">Estado</label>
                  <select class="m-input" [(ngModel)]="genericForm.estado">
                    <option value="Utilizado">Utilizado</option>
                    <option value="Parcial">Parcial</option>
                  </select>
                </div>
                <div class="m-field" style="display: flex; align-items: flex-end; justify-content: flex-end;">
                  <div style="font-size: 13px; font-weight: 700; text-align: right; width: 100%; padding-bottom: 8px;">
                    Total: {{ cop((genericForm.qty || 0) * (genericForm.cu || 0)) }}
                  </div>
                </div>
              </ng-container>

              <!-- ── REPUESTOS FIELDS ── -->
              <ng-container *ngIf="activeTab() === 'repuestos'">
                <div class="m-field">
                  <label class="m-label">Referencia / Código *</label>
                  <input class="m-input" [(ngModel)]="genericForm.ref" placeholder="SKF 6308-2RS..."/>
                </div>
                <div class="m-field">
                  <label class="m-label">Garantía</label>
                  <input class="m-input" [(ngModel)]="genericForm.garantia" placeholder="12 meses, 6 meses..."/>
                </div>
                <div class="m-field" style="grid-column: span 2;">
                  <label class="m-label">Descripción *</label>
                  <input class="m-input" [(ngModel)]="genericForm.desc"/>
                </div>
                <div class="m-field">
                  <label class="m-label">Cantidad *</label>
                  <input class="m-input" type="number" [(ngModel)]="genericForm.qty"/>
                </div>
                <div class="m-field">
                  <label class="m-label">Costo unitario (S/) *</label>
                  <input class="m-input" type="number" [(ngModel)]="genericForm.cu"/>
                </div>
                <div class="m-field">
                  <label class="m-label">Proveedor</label>
                  <input class="m-input" [(ngModel)]="genericForm.proveedor"/>
                </div>
                <div class="m-field">
                  <label class="m-label">Estado</label>
                  <select class="m-input" [(ngModel)]="genericForm.estado">
                    <option value="Instalado">Instalado</option>
                    <option value="En pedido">En pedido</option>
                  </select>
                </div>
              </ng-container>
            </div>

            <!-- Footer -->
            <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 14px;">
              <button class="m-btn" (click)="genericModal = null">Cancelar</button>
              <button class="m-btn m-btn-pri" [disabled]="!isGenericFormValid()" (click)="saveGeneric()">
                {{ isEdit ? 'Guardar cambios' : 'Registrar' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Delete Confirmation -->
      <div *ngIf="confId" class="m-modal-overlay" style="z-index: 1100;">
        <div class="m-card" style="max-width: 360px; width: 100%; padding: 24px;">
          <div style="font-size: 14px; margin-bottom: 20px; line-height: 1.6;">
            ¿Eliminar el registro <strong>{{ confId }}</strong>? Esta acción no se puede deshacer.
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
export class RecursosComponent {
  private dbService = inject(DbService);

  // Constants
  TABS = [
    { id: 'solicEpp', lb: 'EPPs', px: 'SOL' },
    { id: 'viaticos', lb: 'Viáticos', px: 'VIA' },
    { id: 'insumos', lb: 'Insumos', px: 'INS' },
    { id: 'repuestos', lb: 'Repuestos', px: 'REP' }
  ];

  // Active tab state
  activeTab = signal<string>('solicEpp');
  fOV = signal('');
  isEdit = false;

  // Modals
  eppModal: 'f' | null = null;
  genericModal: 'f' | null = null;
  confId: string | null = null;

  // EPP Dynamic Form State
  eppForm: Partial<SolicEpp> = {};
  eppItems: EppItem[] = [];

  // Generic Form State (for Viaticos, Insumos, Repuestos)
  genericForm: any = {};

  // Setup Options
  ovOpts = computed(() => ['', ...this.dbService.servicios().map(x => x.id)]);
  ovOptsNoBlank = computed(() => this.dbService.servicios().map(x => x.id));
  tOptsNoBlank = computed(() => this.dbService.tecnicos().map(x => x.nombre));

  // Rows and totals computations
  eppRows = computed(() => {
    const ov = this.fOV();
    return this.dbService.solicEpp().filter(x => !ov || x.ov === ov);
  });

  viaticosRows = computed(() => {
    const ov = this.fOV();
    return this.dbService.viaticos().filter(x => !ov || x.ov === ov);
  });

  insumosRows = computed(() => {
    const ov = this.fOV();
    return this.dbService.insumos().filter(x => !ov || x.ov === ov);
  });

  repuestosRows = computed(() => {
    const ov = this.fOV();
    return this.dbService.repuestos().filter(x => !ov || x.ov === ov);
  });

  totalSum = computed(() => {
    const tab = this.activeTab();
    if (tab === 'solicEpp') {
      return this.eppRows().reduce((s, x) => s + this.solTotal(x), 0);
    }
    if (tab === 'viaticos') {
      return this.viaticosRows().reduce((s, x) => s + ((x.vpd || 0) * (x.dias || 0)), 0);
    }
    if (tab === 'insumos') {
      return this.insumosRows().reduce((s, x) => s + ((x.cu || 0) * (x.qty || 0)), 0);
    }
    if (tab === 'repuestos') {
      return this.repuestosRows().reduce((s, x) => s + ((x.cu || 0) * (x.qty || 0)), 0);
    }
    return 0;
  });

  setTab(tabId: string) {
    this.activeTab.set(tabId);
    this.fOV.set(''); // reset filter on tab change
  }

  getCount(tabId: string): number {
    if (tabId === 'solicEpp') return this.dbService.solicEpp().length;
    if (tabId === 'viaticos') return this.dbService.viaticos().length;
    if (tabId === 'insumos') return this.dbService.insumos().length;
    if (tabId === 'repuestos') return this.dbService.repuestos().length;
    return 0;
  }

  getActiveTabLabel(): string {
    return this.TABS.find(t => t.id === this.activeTab())?.lb || '';
  }

  // --- CRUD OPENS ---
  openNew() {
    this.isEdit = false;
    const tab = this.activeTab();
    const prefix = this.TABS.find(t => t.id === tab)?.px || 'REG';

    if (tab === 'solicEpp') {
      this.eppForm = {
        id: this.nid(this.dbService.solicEpp(), 'SOL'),
        ov: this.ovOptsNoBlank()[0] || '',
        tecnico: this.tOptsNoBlank()[0] || '',
        fecha: new Date().toISOString().slice(0, 10),
        obs: '',
        estado: 'Pendiente'
      };
      this.eppItems = [{ desc: '', qty: 1, cu: 0 }];
      this.eppModal = 'f';
    } else {
      this.genericForm = {
        id: this.nid(this.dbService.getCollection(tab), prefix),
        ov: this.ovOptsNoBlank()[0] || '',
        estado: tab === 'viaticos' ? 'En curso' : (tab === 'insumos' ? 'Utilizado' : 'Instalado'),
        fecha: new Date().toISOString().slice(0, 10),
        qty: 1,
        cu: 0,
        dias: 1,
        vpd: 0
      };
      this.genericModal = 'f';
    }
  }

  openEditEpp(s: SolicEpp) {
    this.isEdit = true;
    this.eppForm = { ...s };
    this.eppItems = s.items.map(i => ({ ...i }));
    this.eppModal = 'f';
  }

  openEditGeneric(item: any) {
    this.isEdit = true;
    this.genericForm = { ...item };
    this.genericModal = 'f';
  }

  // --- EPP DYNAMIC ROW LOGIC ---
  addEppItem() {
    this.eppItems.push({ desc: '', qty: 1, cu: 0 });
  }

  removeEppItem(index: number) {
    this.eppItems = this.eppItems.filter((_, idx) => idx !== index);
  }

  getEppItemsTotal(): number {
    return this.eppItems.reduce((s, i) => s + (i.cu || 0) * (i.qty || 0), 0);
  }

  isEppFormValid(): boolean {
    const hasItems = this.eppItems.filter(i => i.desc?.trim()).length > 0;
    return !!(this.eppForm.ov && this.eppForm.tecnico && hasItems);
  }

  async saveEpp() {
    if (!this.isEppFormValid()) return;
    const validItems = this.eppItems.filter(i => i.desc?.trim()).map(i => ({
      desc: i.desc,
      qty: Number(i.qty) || 1,
      cu: Number(i.cu) || 0
    }));

    const finalEpp: SolicEpp = {
      id: this.eppForm.id!,
      ov: this.eppForm.ov!,
      tecnico: this.eppForm.tecnico!,
      fecha: this.eppForm.fecha || new Date().toISOString().slice(0, 10),
      obs: this.eppForm.obs || '',
      estado: (this.eppForm.estado as any) || 'Pendiente',
      items: validItems
    };

    await this.dbService.upsert('solicEpp', finalEpp);
    this.eppModal = null;
  }

  // --- GENERIC SAVE LOGIC ---
  isGenericFormValid(): boolean {
    const tab = this.activeTab();
    if (!this.genericForm.ov || !this.genericForm.id) return false;
    
    if (tab === 'viaticos') {
      return !!(this.genericForm.tecnico && this.genericForm.concepto && Number(this.genericForm.dias) > 0);
    }
    if (tab === 'insumos') {
      return !!(this.genericForm.insumo && Number(this.genericForm.qty) > 0);
    }
    if (tab === 'repuestos') {
      return !!(this.genericForm.ref && this.genericForm.desc && Number(this.genericForm.qty) > 0);
    }
    return false;
  }

  async saveGeneric() {
    if (!this.isGenericFormValid()) return;
    const tab = this.activeTab();
    
    let payload: any = {
      id: this.genericForm.id,
      ov: this.genericForm.ov,
      estado: this.genericForm.estado
    };

    if (tab === 'viaticos') {
      payload.tecnico = this.genericForm.tecnico;
      payload.concepto = this.genericForm.concepto;
      payload.fecha = this.genericForm.fecha;
      payload.dias = Number(this.genericForm.dias) || 0;
      payload.vpd = Number(this.genericForm.vpd) || 0;
    } else if (tab === 'insumos') {
      payload.insumo = this.genericForm.insumo;
      payload.unidad = this.genericForm.unidad;
      payload.proveedor = this.genericForm.proveedor;
      payload.qty = Number(this.genericForm.qty) || 0;
      payload.cu = Number(this.genericForm.cu) || 0;
    } else if (tab === 'repuestos') {
      payload.ref = this.genericForm.ref;
      payload.desc = this.genericForm.desc;
      payload.proveedor = this.genericForm.proveedor;
      payload.garantia = this.genericForm.garantia;
      payload.qty = Number(this.genericForm.qty) || 0;
      payload.cu = Number(this.genericForm.cu) || 0;
    }

    await this.dbService.upsert(tab as any, payload);
    this.genericModal = null;
  }

  // --- DELETE LOGIC ---
  confirmDelete(id: string) {
    this.confId = id;
  }

  deleteConfirmed() {
    if (this.confId) {
      this.dbService.remove(this.activeTab() as any, this.confId);
      this.confId = null;
    }
  }

  // --- STYLING & UTILITIES ---
  getInitials(name: string): string {
    if (!name) return '?';
    return name.split(' ')
               .filter(Boolean)
               .slice(0, 2)
               .map(w => w[0])
               .join('')
               .toUpperCase();
  }

  cop(n: number | null): string {
    return n == null ? '—' : 'S/ ' + Math.round(n).toLocaleString('es-PE');
  }

  solTotal(s: SolicEpp): number {
    return (s.items || []).reduce((a, i) => a + (i.cu || 0) * (i.qty || 0), 0);
  }

  nid(list: any[], pfx: string): string {
    const nextNum = list.reduce((m, x) => {
      const match = x.id?.replace(pfx + '-', '');
      const val = parseInt(match || '0') || 0;
      return Math.max(m, val);
    }, 0) + 1;
    return `${pfx}-${String(nextNum).padStart(4, '0')}`;
  }

  closeOnOverlay(event: MouseEvent, type: 'epp' | 'generic') {
    if (event.target === event.currentTarget) {
      if (type === 'epp') this.eppModal = null;
      if (type === 'generic') this.genericModal = null;
    }
  }

  getEppStatusStyle(estado: string): { bg: string, fg: string } {
    const styles: Record<string, { bg: string, fg: string }> = {
      'Entregado': { bg: 'var(--green-l)', fg: 'var(--green-d)' },
      'En tránsito': { bg: 'var(--blue-l)', fg: 'var(--blue-d)' },
      'Pendiente': { bg: 'var(--amber-l)', fg: 'var(--amber-d)' }
    };
    return styles[estado] || { bg: 'var(--gray-l)', fg: 'var(--gray-d)' };
  }

  getGenericStatusStyle(estado: string): { bg: string, fg: string } {
    const styles: Record<string, { bg: string, fg: string }> = {
      'Entregado': { bg: 'var(--green-l)', fg: 'var(--green-d)' },
      'En tránsito': { bg: 'var(--blue-l)', fg: 'var(--blue-d)' },
      'Pendiente': { bg: 'var(--amber-l)', fg: 'var(--amber-d)' },
      'Liquidado': { bg: 'var(--green-l)', fg: 'var(--green-d)' },
      'En curso': { bg: 'var(--blue-l)', fg: 'var(--blue-d)' },
      'Utilizado': { bg: 'var(--green-l)', fg: 'var(--green-d)' },
      'Parcial': { bg: 'var(--amber-l)', fg: 'var(--amber-d)' },
      'Instalado': { bg: 'var(--green-l)', fg: 'var(--green-d)' },
      'En pedido': { bg: 'var(--amber-l)', fg: 'var(--amber-d)' }
    };
    return styles[estado] || { bg: 'var(--gray-l)', fg: 'var(--gray-d)' };
  }
}
