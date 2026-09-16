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
      <!-- Header -->
      <div class="head">
        <div>
          <h1>Control de recursos</h1>
          <div class="sub">EPPs, viáticos, insumos y repuestos por servicio</div>
        </div>
        <button class="suc" (click)="openNew()">+ Nuevo registro</button>
      </div>

      <!-- Tabs (Tabs2 from Prototype) -->
      <div class="tabs2">
        <button class="tab2" [class.on]="activeTab() === 'solicEpp'" (click)="setTab('solicEpp')">
          EPPs <span class="cnt">{{ getCount('solicEpp') }}</span>
        </button>
        <button class="tab2" [class.on]="activeTab() === 'viaticos'" (click)="setTab('viaticos')">
          Viáticos <span class="cnt">{{ getCount('viaticos') }}</span>
        </button>
        <button class="tab2" [class.on]="activeTab() === 'insumos'" (click)="setTab('insumos')">
          Insumos <span class="cnt">{{ getCount('insumos') }}</span>
        </button>
        <button class="tab2" [class.on]="activeTab() === 'repuestos'" (click)="setTab('repuestos')">
          Repuestos <span class="cnt">{{ getCount('repuestos') }}</span>
        </button>
      </div>

      <!-- Filter Bar -->
      <div class="bar">
        <div style="position: relative; display: flex; align-items: center;">
          <input 
            type="text" 
            [ngModel]="fOV()" 
            (ngModelChange)="fOV.set($event)" 
            placeholder="Escribir o seleccionar OV..." 
            list="ov-list"
            style="width: 230px; padding-right: 26px;"
          />
          <button *ngIf="fOV()" 
                  type="button"
                  (click)="fOV.set('')" 
                  title="Limpiar filtro"
                  style="position: absolute; right: 6px; background: none; border: none; padding: 0 4px; font-size: 13px; color: var(--mut); cursor: pointer; line-height: 1;">
            ✕
          </button>
        </div>
        <datalist id="ov-list">
          <option *ngFor="let ov of allAvailableOVs()" [value]="ov">{{ ov }}</option>
        </datalist>
        <span class="right">Total: <b>{{ usd(totalSum()) }}</b></span>
      </div>

      <!-- ── TAB: EPP REQUESTS (SOLICITUDES EPP) ── -->
      <div *ngIf="activeTab() === 'solicEpp'">
        <div *ngFor="let s of eppRows()" class="card" style="margin-bottom: 11px;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 11px; margin-bottom: 11px; flex-wrap: wrap;">
            <div style="display: flex; align-items: center; gap: 11px;">
              <div class="av" style="background: var(--greenL); color: var(--greenD);">
                {{ getInitials(s.tecnico) }}
              </div>
              <div>
                <div style="font-size: 14px; font-weight: 700;">{{ s.tecnico }}</div>
                <div class="mut" style="font-size: 11px;">
                  OV-{{ s.ov }} &middot; {{ s.fecha }} &middot; {{ s.id }}
                </div>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 9px;">
              <span class="p" [ngClass]="pill(s.estado)">{{ s.estado }}</span>
              <span style="font-size: 15px; font-weight: 800; color: var(--blue);">{{ usd(solTotal(s)) }}</span>
              <button class="sm" (click)="openEditEpp(s)">Editar</button>
              <button class="sm dgr" (click)="confirmDelete(s.id)">✕</button>
            </div>
          </div>

          <!-- Items Subtable -->
          <div style="background: #F8FAFC; border-radius: 8px; overflow: hidden;">
            <table>
              <thead>
                <tr>
                  <th>EPP</th>
                  <th class="c">Cant.</th>
                  <th class="c">Costo unit.</th>
                  <th class="c">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let it of s.items">
                  <td>{{ it.desc }}</td>
                  <td class="c">{{ it.qty }}</td>
                  <td class="c">{{ usd(it.cu) }}</td>
                  <td class="c" style="font-weight: 700;">{{ usd(it.cu * it.qty) }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div *ngIf="s.obs" class="mut" style="font-size: 11px; margin-top: 8px;">
            Observación: {{ s.obs }}
          </div>
        </div>

        <div *ngIf="eppRows().length === 0" class="card empty">
          No hay solicitudes de EPP registradas para esta selección
        </div>
      </div>

      <!-- ── TABS: VIATICOS, INSUMOS, REPUESTOS ── -->
      <div *ngIf="activeTab() !== 'solicEpp'" class="flush">
        <div class="scroll">
          <table>
            <thead>
              <!-- Viáticos Header -->
              <tr *ngIf="activeTab() === 'viaticos'">
                <th>ID</th>
                <th>OV</th>
                <th>Técnico</th>
                <th>Concepto</th>
                <th class="c">Días</th>
                <th class="c">Valor/día</th>
                <th class="c">Total</th>
                <th class="c">Fecha</th>
                <th class="c">Estado</th>
                <th class="c"></th>
              </tr>
              <!-- Insumos Header -->
              <tr *ngIf="activeTab() === 'insumos'">
                <th>ID</th>
                <th>OV</th>
                <th>Insumo</th>
                <th>Unidad</th>
                <th class="c">Cant</th>
                <th class="c">Costo unit</th>
                <th class="c">Total</th>
                <th>Proveedor</th>
                <th class="c">Estado</th>
                <th class="c"></th>
              </tr>
              <!-- Repuestos Header -->
              <tr *ngIf="activeTab() === 'repuestos'">
                <th>ID</th>
                <th>OV</th>
                <th>Referencia</th>
                <th>Descripción</th>
                <th class="c">Cant</th>
                <th class="c">Costo unit</th>
                <th class="c">Total</th>
                <th>Proveedor</th>
                <th>Garantía</th>
                <th class="c">Estado</th>
                <th class="c"></th>
              </tr>
            </thead>
            <tbody>
              <!-- Viáticos Rows -->
              <ng-container *ngIf="activeTab() === 'viaticos'">
                <tr *ngFor="let x of viaticosRows()">
                  <td class="mut">{{ x.id }}</td>
                  <td class="id">{{ x.ov }}</td>
                  <td>{{ x.tecnico }}</td>
                  <td>{{ x.concepto }}</td>
                  <td class="c">{{ x.dias }}</td>
                  <td class="c">{{ usd(x.vpd) }}</td>
                  <td class="c" style="font-weight: 700;">{{ usd(x.vpd * x.dias) }}</td>
                  <td class="c mut">{{ x.fecha }}</td>
                  <td class="c"><span class="p" [ngClass]="pill(x.estado)">{{ x.estado }}</span></td>
                  <td class="c">
                    <div style="display: flex; gap: 4px; justify-content: center;">
                      <button class="sm" (click)="openEditGeneric(x)">Editar</button>
                      <button class="sm dgr" (click)="confirmDelete(x.id)">✕</button>
                    </div>
                  </td>
                </tr>
              </ng-container>

              <!-- Insumos Rows -->
              <ng-container *ngIf="activeTab() === 'insumos'">
                <tr *ngFor="let x of insumosRows()">
                  <td class="mut">{{ x.id }}</td>
                  <td class="id">{{ x.ov }}</td>
                  <td style="font-weight: 600;">{{ x.insumo }}</td>
                  <td>{{ x.unidad }}</td>
                  <td class="c">{{ x.qty }}</td>
                  <td class="c">{{ usd(x.cu) }}</td>
                  <td class="c" style="font-weight: 700;">{{ usd(x.cu * x.qty) }}</td>
                  <td class="mut">{{ x.proveedor }}</td>
                  <td class="c"><span class="p" [ngClass]="pill(x.estado)">{{ x.estado }}</span></td>
                  <td class="c">
                    <div style="display: flex; gap: 4px; justify-content: center;">
                      <button class="sm" (click)="openEditGeneric(x)">Editar</button>
                      <button class="sm dgr" (click)="confirmDelete(x.id)">✕</button>
                    </div>
                  </td>
                </tr>
              </ng-container>

              <!-- Repuestos Rows -->
              <ng-container *ngIf="activeTab() === 'repuestos'">
                <tr *ngFor="let x of repuestosRows()">
                  <td class="mut">{{ x.id }}</td>
                  <td class="id">{{ x.ov }}</td>
                  <td><code style="background: #F1F5F9; padding: 2px 5px; border-radius: 4px;">{{ x.ref }}</code></td>
                  <td>{{ x.desc }}</td>
                  <td class="c">{{ x.qty }}</td>
                  <td class="c">{{ usd(x.cu) }}</td>
                  <td class="c" style="font-weight: 700;">{{ usd(x.cu * x.qty) }}</td>
                  <td class="mut">{{ x.proveedor }}</td>
                  <td class="mut">{{ x.garantia || '—' }}</td>
                  <td class="c"><span class="p" [ngClass]="pill(x.estado)">{{ x.estado }}</span></td>
                  <td class="c">
                    <div style="display: flex; gap: 4px; justify-content: center;">
                      <button class="sm" (click)="openEditGeneric(x)">Editar</button>
                      <button class="sm dgr" (click)="confirmDelete(x.id)">✕</button>
                    </div>
                  </td>
                </tr>
              </ng-container>

              <tr *ngIf="activeTab() === 'viaticos' && viaticosRows().length === 0">
                <td colspan="10" class="empty">No hay viáticos registrados para esta selección</td>
              </tr>
              <tr *ngIf="activeTab() === 'insumos' && insumosRows().length === 0">
                <td colspan="10" class="empty">No hay insumos registrados para esta selección</td>
              </tr>
              <tr *ngIf="activeTab() === 'repuestos' && repuestosRows().length === 0">
                <td colspan="11" class="empty">No hay repuestos registrados para esta selección</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ── MODAL: SOLICITUD EPP ── -->
      <div *ngIf="eppModal === 'f'" class="ov" (click)="closeOnOverlay($event, 'epp')">
        <div class="mod" style="max-width: 720px;">
          <div class="mod-h">
            <div>
              <b>{{ isEdit ? 'Editar solicitud EPP ' + eppForm.id : 'Nueva solicitud de EPPs' }}</b>
              <span class="s">Registro y asignación de implementos de seguridad</span>
            </div>
            <button class="x" (click)="eppModal = null">×</button>
          </div>
          <div class="mod-b">
            <div class="row3">
              <div class="fld">
                <label>OV / Servicio *</label>
                <select [(ngModel)]="eppForm.ov">
                  <option *ngFor="let ov of ovOptsNoBlank()" [value]="ov">{{ ov }}</option>
                </select>
              </div>
              <div class="fld">
                <label>Técnico *</label>
                <select [(ngModel)]="eppForm.tecnico">
                  <option *ngFor="let t of tOptsNoBlank()" [value]="t">{{ t }}</option>
                </select>
              </div>
              <div class="fld">
                <label>Fecha solicitud</label>
                <input type="date" [(ngModel)]="eppForm.fecha"/>
              </div>
            </div>

            <div class="row2">
              <div class="fld">
                <label>Estado</label>
                <select [(ngModel)]="eppForm.estado">
                  <option value="Pendiente">Pendiente</option>
                  <option value="En tránsito">En tránsito</option>
                  <option value="Entregado">Entregado</option>
                </select>
              </div>
              <div class="fld">
                <label>Observaciones</label>
                <input [(ngModel)]="eppForm.obs" placeholder="Detalle adicional..."/>
              </div>
            </div>

            <!-- Dynamic Items Editor -->
            <div style="margin-top: 10px; margin-bottom: 16px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <label style="margin: 0;">Artículos solicitados *</label>
                <button class="sm" (click)="addEppItem()">+ Agregar ítem</button>
              </div>

              <div style="background: #F8FAFC; border: 1px solid var(--line); border-radius: 8px; overflow: hidden;">
                <table>
                  <thead>
                    <tr>
                      <th>Descripción</th>
                      <th class="c" style="width: 80px;">Cant.</th>
                      <th class="c" style="width: 130px;">Costo unit. (US$)</th>
                      <th class="c" style="width: 120px;">Subtotal</th>
                      <th style="width: 40px;"></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let it of eppItems; let idx = index">
                      <td>
                        <input [(ngModel)]="it.desc" placeholder="Botas dieléctricas, arnés..."/>
                      </td>
                      <td class="c">
                        <input type="number" [(ngModel)]="it.qty" min="1" style="text-align: center;"/>
                      </td>
                      <td class="c">
                        <input type="number" [(ngModel)]="it.cu" style="text-align: center;"/>
                      </td>
                      <td class="c" style="font-weight: 700;">
                        {{ usd((it.qty || 0) * (it.cu || 0)) }}
                      </td>
                      <td class="c">
                        <button class="sm dgr" (click)="removeEppItem(idx)">✕</button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div class="mod-f">
            <span style="font-size: 14px; font-weight: 700;">
              Total Solicitud: <b style="color: var(--blue);">{{ usd(getEppItemsTotal()) }}</b>
            </span>
            <div style="display: flex; gap: 8px;">
              <button (click)="eppModal = null">Cancelar</button>
              <button class="pri" [disabled]="!isEppFormValid()" (click)="saveEpp()">
                {{ isEdit ? 'Guardar cambios' : 'Registrar solicitud' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ── MODAL: VIATICOS, INSUMOS, REPUESTOS ── -->
      <div *ngIf="genericModal === 'f'" class="ov" (click)="closeOnOverlay($event, 'generic')">
        <div class="mod">
          <div class="mod-h">
            <div>
              <b>{{ isEdit ? 'Editar ' + genericForm.id : 'Nuevo registro de ' + getActiveTabLabel() }}</b>
              <span class="s">Control operativo y financiero en dólares</span>
            </div>
            <button class="x" (click)="genericModal = null">×</button>
          </div>
          <div class="mod-b">
            <div class="row2">
              <div class="fld">
                <label>Registro ID *</label>
                <input [(ngModel)]="genericForm.id" readonly style="background: #F1F5F9;"/>
              </div>
              <div class="fld">
                <label>OV / Servicio *</label>
                <select [(ngModel)]="genericForm.ov">
                  <option *ngFor="let ov of ovOptsNoBlank()" [value]="ov">{{ ov }}</option>
                </select>
              </div>

              <!-- ── VIATICOS FIELDS ── -->
              <ng-container *ngIf="activeTab() === 'viaticos'">
                <div class="fld">
                  <label>Técnico *</label>
                  <select [(ngModel)]="genericForm.tecnico">
                    <option *ngFor="let t of tOptsNoBlank()" [value]="t">{{ t }}</option>
                  </select>
                </div>
                <div class="fld">
                  <label>Fecha</label>
                  <input type="date" [(ngModel)]="genericForm.fecha"/>
                </div>
                <div class="fld" style="grid-column: span 2;">
                  <label>Concepto *</label>
                  <input [(ngModel)]="genericForm.concepto" placeholder="Hospedaje y alimentación..."/>
                </div>
                <div class="fld">
                  <label>Días *</label>
                  <input type="number" [(ngModel)]="genericForm.dias"/>
                </div>
                <div class="fld">
                  <label>Valor por día (US$) *</label>
                  <input type="number" [(ngModel)]="genericForm.vpd"/>
                </div>
                <div class="fld">
                  <label>Estado</label>
                  <select [(ngModel)]="genericForm.estado">
                    <option value="En curso">En curso</option>
                    <option value="Liquidado">Liquidado</option>
                  </select>
                </div>
                <div class="fld" style="display: flex; align-items: flex-end;">
                  <div style="font-size: 13px; font-weight: 700; padding-bottom: 8px;">
                    Total: <b style="color: var(--blue);">{{ usd((genericForm.dias || 0) * (genericForm.vpd || 0)) }}</b>
                  </div>
                </div>
              </ng-container>

              <!-- ── INSUMOS FIELDS ── -->
              <ng-container *ngIf="activeTab() === 'insumos'">
                <div class="fld" style="grid-column: span 2;">
                  <label>Insumo / Artículo *</label>
                  <input [(ngModel)]="genericForm.insumo"/>
                </div>
                <div class="fld">
                  <label>Unidad de medida</label>
                  <input [(ngModel)]="genericForm.unidad" placeholder="Gal, Kg, Unid..."/>
                </div>
                <div class="fld">
                  <label>Proveedor</label>
                  <input [(ngModel)]="genericForm.proveedor"/>
                </div>
                <div class="fld">
                  <label>Cantidad *</label>
                  <input type="number" [(ngModel)]="genericForm.qty"/>
                </div>
                <div class="fld">
                  <label>Costo unitario (US$) *</label>
                  <input type="number" [(ngModel)]="genericForm.cu"/>
                </div>
                <div class="fld">
                  <label>Estado</label>
                  <select [(ngModel)]="genericForm.estado">
                    <option value="Utilizado">Utilizado</option>
                    <option value="Parcial">Parcial</option>
                  </select>
                </div>
                <div class="fld" style="display: flex; align-items: flex-end;">
                  <div style="font-size: 13px; font-weight: 700; padding-bottom: 8px;">
                    Total: <b style="color: var(--blue);">{{ usd((genericForm.qty || 0) * (genericForm.cu || 0)) }}</b>
                  </div>
                </div>
              </ng-container>

              <!-- ── REPUESTOS FIELDS ── -->
              <ng-container *ngIf="activeTab() === 'repuestos'">
                <div class="fld">
                  <label>Referencia / Código *</label>
                  <input [(ngModel)]="genericForm.ref" placeholder="SKF 6308-2RS..."/>
                </div>
                <div class="fld">
                  <label>Garantía</label>
                  <input [(ngModel)]="genericForm.garantia" placeholder="12 meses, 6 meses..."/>
                </div>
                <div class="fld" style="grid-column: span 2;">
                  <label>Descripción *</label>
                  <input [(ngModel)]="genericForm.desc"/>
                </div>
                <div class="fld">
                  <label>Cantidad *</label>
                  <input type="number" [(ngModel)]="genericForm.qty"/>
                </div>
                <div class="fld">
                  <label>Costo unitario (US$) *</label>
                  <input type="number" [(ngModel)]="genericForm.cu"/>
                </div>
                <div class="fld">
                  <label>Proveedor</label>
                  <input [(ngModel)]="genericForm.proveedor"/>
                </div>
                <div class="fld">
                  <label>Estado</label>
                  <select [(ngModel)]="genericForm.estado">
                    <option value="Instalado">Instalado</option>
                    <option value="En pedido">En pedido</option>
                  </select>
                </div>
                <div class="fld" style="grid-column: span 2; display: flex; justify-content: flex-end;">
                  <div style="font-size: 13px; font-weight: 700;">
                    Total: <b style="color: var(--blue);">{{ usd((genericForm.qty || 0) * (genericForm.cu || 0)) }}</b>
                  </div>
                </div>
              </ng-container>
            </div>
          </div>

          <div class="mod-f">
            <span></span>
            <div style="display: flex; gap: 8px;">
              <button (click)="genericModal = null">Cancelar</button>
              <button class="pri" [disabled]="!isGenericFormValid()" (click)="saveGeneric()">
                {{ isEdit ? 'Guardar cambios' : 'Registrar' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Delete Confirmation Modal -->
      <div *ngIf="confId" class="ov" (click)="confId = null">
        <div class="mod" style="max-width: 380px;">
          <div class="mod-h">
            <b>Confirmar eliminación</b>
            <button class="x" (click)="confId = null">×</button>
          </div>
          <div class="mod-b" style="font-size: 13px;">
            ¿Estás seguro de que deseas eliminar este registro (<b>{{ confId }}</b>)? Esta acción no se puede deshacer.
          </div>
          <div class="mod-f">
            <button (click)="confId = null">Cancelar</button>
            <button class="dgr" style="background: var(--redL); font-weight: 700;" (click)="deleteConfirmed()">
              Eliminar
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      --navy: #091a2c;
      --navy2: #0f2942;
      --green: #3A7D1E;
      --greenL: #EAF3DE;
      --greenD: #27500A;
      --lime: #8BC34A;
      --orange: #F57C00;
      --orangeL: #FAEEDA;
      --orangeD: #854F0B;
      --red: #C0392B;
      --redL: #FCEBEB;
      --redD: #791F1F;
      --blue: #1A5FA8;
      --blueL: #E8F1FB;
      --blueD: #0B3D72;
      --bg: #F1F5F9;
      --card: #fff;
      --line: #E2E8F0;
      --line2: #F1F5F9;
      --txt: #1E293B;
      --mut: #64748B;
      --mut2: #94A3B8;
      font-family: 'DM Sans', system-ui, sans-serif;
      color: var(--txt);
    }
    .head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 18px; }
    .head h1 { font-size: 22px; font-weight: 800; letter-spacing: -.3px; margin: 0; color: var(--txt); }
    .sub { font-size: 13px; color: var(--mut); margin-top: 3px; }

    button { font-family: inherit; cursor: pointer; font-size: 13px; padding: 8px 14px; border-radius: 8px; border: 1px solid var(--line); background: #fff; color: var(--txt); transition: .12s; }
    button:hover { background: #F8FAFC; }
    .pri { background: var(--blue); color: #fff; border-color: var(--blue); }
    .pri:hover { background: var(--blueD); }
    .suc { background: var(--lime); color: #14290a; border-color: var(--lime); font-weight: 700; }
    .suc:hover { filter: brightness(.95); }
    .sm { font-size: 12px; padding: 5px 10px; }
    .dgr { color: var(--redD); border-color: #F7C1C1; }
    .dgr:hover { background: var(--redL); }
    .x { border: none; background: none; font-size: 20px; color: var(--mut); padding: 0 5px; line-height: 1; cursor: pointer; }

    select, input, textarea { font-family: inherit; font-size: 13px; padding: 8px 11px; border-radius: 8px; border: 1px solid #CBD5E1; background: #fff; color: var(--txt); outline: none; width: 100%; box-sizing: border-box; }
    select:focus, input:focus, textarea:focus { border-color: var(--blue); }
    label { display: block; font-size: 11px; font-weight: 700; color: var(--mut); margin-bottom: 5px; text-transform: uppercase; letter-spacing: .4px; }
    .fld { margin-bottom: 13px; }

    .tabs2 { display: flex; border-bottom: 1px solid var(--line); margin-bottom: 14px; gap: 2px; flex-wrap: wrap; }
    .tab2 { padding: 10px 16px; font-size: 13px; cursor: pointer; border-bottom: 2px solid transparent; color: var(--mut); background: none; border-radius: 0; border-top: none; border-left: none; border-right: none; font-family: inherit; transition: .12s; }
    .tab2:hover { color: var(--txt); }
    .tab2.on { color: var(--green); border-bottom-color: var(--lime); font-weight: 700; }
    .cnt { font-size: 11px; background: #F1F5F9; border-radius: 10px; padding: 1px 7px; margin-left: 5px; color: var(--mut); }

    .bar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; background: #fff; border: 1px solid var(--line); border-radius: 10px; padding: 11px 14px; margin-bottom: 14px; }
    .bar select { width: auto; min-width: 145px; }
    .right { margin-left: auto; font-size: 12px; color: var(--mut); }

    .card { background: #fff; border: 1px solid var(--line); border-radius: 12px; padding: 16px 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); }
    .flush { background: #fff; border: 1px solid var(--line); border-radius: 12px; overflow: hidden; }
    .scroll { overflow-x: auto; }

    table { width: 100%; border-collapse: collapse; }
    th { padding: 9px 12px; text-align: left; font-size: 11px; font-weight: 700; color: var(--mut); background: #F8FAFC; border-bottom: 1px solid var(--line); white-space: nowrap; }
    td { padding: 9px 12px; border-bottom: 1px solid var(--line2); font-size: 12px; white-space: nowrap; }
    tr:last-child td { border-bottom: none; }
    tbody tr:hover td { background: #F8FAFC; }
    th.c, td.c { text-align: center; }
    .id { font-weight: 800; color: var(--blue); }
    .mut { color: var(--mut); }
    .empty { text-align: center; padding: 34px; color: var(--mut); font-size: 13px; }

    .av { width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; flex-shrink: 0; }

    .p { display: inline-block; font-size: 11px; padding: 3px 10px; border-radius: 20px; font-weight: 700; white-space: nowrap; }
    .p-g { background: var(--greenL); color: var(--greenD); }
    .p-b { background: var(--blueL); color: var(--blueD); }
    .p-o { background: var(--orangeL); color: var(--orangeD); }
    .p-r { background: var(--redL); color: var(--redD); }
    .p-n { background: #F1EFE8; color: #444441; }

    .ov { position: fixed; inset: 0; background: rgba(9,26,44,.55); display: flex; align-items: flex-start; justify-content: center; padding: 34px 18px; z-index: 100; overflow-y: auto; }
    .mod { background: #fff; border-radius: 14px; width: 100%; max-width: 640px; box-shadow: 0 20px 60px rgba(0,0,0,.25); }
    .mod-h { padding: 15px 20px; border-bottom: 1px solid var(--line); display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
    .mod-h b { font-size: 15px; }
    .mod-h .s { font-size: 12px; color: var(--mut); display: block; margin-top: 2px; }
    .mod-b { padding: 18px 20px; max-height: 80vh; overflow-y: auto; }
    .mod-f { padding: 14px 20px; border-top: 1px solid var(--line); display: flex; justify-content: space-between; gap: 8px; flex-wrap: wrap; align-items: center; }
    .row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0 15px; }
    .row3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0 15px; }
  `]
})
export class RecursosComponent {
  private dbService = inject(DbService);

  // Active Tab State
  activeTab = signal<string>('solicEpp');

  // Filter State
  fOV = signal<string>('');

  // Modals & UI State
  eppModal: 'f' | null = null;
  genericModal: 'f' | null = null;
  isEdit = false;
  confId: string | null = null;

  // EPP Dynamic Form State
  eppForm: Partial<SolicEpp> = {};
  eppItems: EppItem[] = [];

  // Generic Form State (for Viaticos, Insumos, Repuestos)
  genericForm: any = {};

  // Setup Options
  allAvailableOVs = computed(() => {
    const set = new Set<string>();
    this.dbService.servicios().forEach(x => {
      const val = (x.ov || (x.id.includes('_') ? x.id.split('_')[0] : x.id) || '').trim();
      if (val) set.add(val);
    });
    this.dbService.solicEpp().forEach(x => { if (x.ov && x.ov.trim()) set.add(x.ov.trim()); });
    this.dbService.viaticos().forEach(x => { if (x.ov && x.ov.trim()) set.add(x.ov.trim()); });
    this.dbService.insumos().forEach(x => { if (x.ov && x.ov.trim()) set.add(x.ov.trim()); });
    this.dbService.repuestos().forEach(x => { if (x.ov && x.ov.trim()) set.add(rClean(x.ov)); });
    function rClean(v: string) { return v ? v.trim() : ''; }
    return Array.from(set).filter(Boolean).sort();
  });

  ovOpts = computed(() => ['', ...this.allAvailableOVs()]);
  ovOptsNoBlank = computed(() => this.allAvailableOVs());
  tOptsNoBlank = computed(() => this.dbService.tecnicos().map(x => x.nombre));

  // Rows and totals computations
  eppRows = computed(() => {
    const q = this.fOV().trim().toLowerCase();
    if (!q) return this.dbService.solicEpp();
    return this.dbService.solicEpp().filter(x => 
      (x.ov && x.ov.toLowerCase().includes(q)) ||
      (x.id && x.id.toLowerCase().includes(q)) ||
      (x.tecnico && x.tecnico.toLowerCase().includes(q))
    );
  });

  viaticosRows = computed(() => {
    const q = this.fOV().trim().toLowerCase();
    if (!q) return this.dbService.viaticos();
    return this.dbService.viaticos().filter(x => 
      (x.ov && x.ov.toLowerCase().includes(q)) ||
      (x.id && x.id.toLowerCase().includes(q)) ||
      (x.tecnico && x.tecnico.toLowerCase().includes(q)) ||
      (x.concepto && x.concepto.toLowerCase().includes(q))
    );
  });

  insumosRows = computed(() => {
    const q = this.fOV().trim().toLowerCase();
    if (!q) return this.dbService.insumos();
    return this.dbService.insumos().filter(x => 
      (x.ov && x.ov.toLowerCase().includes(q)) ||
      (x.id && x.id.toLowerCase().includes(q)) ||
      (x.insumo && x.insumo.toLowerCase().includes(q)) ||
      (x.proveedor && x.proveedor.toLowerCase().includes(q))
    );
  });

  repuestosRows = computed(() => {
    const q = this.fOV().trim().toLowerCase();
    if (!q) return this.dbService.repuestos();
    return this.dbService.repuestos().filter(x => 
      (x.ov && x.ov.toLowerCase().includes(q)) ||
      (x.id && x.id.toLowerCase().includes(q)) ||
      (x.ref && x.ref.toLowerCase().includes(q)) ||
      (x.desc && x.desc.toLowerCase().includes(q)) ||
      (x.proveedor && x.proveedor.toLowerCase().includes(q))
    );
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
    this.fOV.set('');
  }

  getCount(tabId: string): number {
    if (tabId === 'solicEpp') return this.dbService.solicEpp().length;
    if (tabId === 'viaticos') return this.dbService.viaticos().length;
    if (tabId === 'insumos') return this.dbService.insumos().length;
    if (tabId === 'repuestos') return this.dbService.repuestos().length;
    return 0;
  }

  getActiveTabLabel(): string {
    const map: Record<string, string> = {
      'solicEpp': 'EPPs',
      'viaticos': 'Viáticos',
      'insumos': 'Insumos',
      'repuestos': 'Repuestos'
    };
    return map[this.activeTab()] || '';
  }

  // --- CRUD OPENS ---
  openNew() {
    this.isEdit = false;
    const tab = this.activeTab();

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
      const prefixMap: Record<string, string> = {
        viaticos: 'VIA',
        insumos: 'INS',
        repuestos: 'REP'
      };
      const prefix = prefixMap[tab] || 'REG';
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
    this.eppItems = (s.items || []).map(i => ({ ...i }));
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

  // --- GENERIC FORMS (Viaticos, Insumos, Repuestos) ---
  isGenericFormValid(): boolean {
    const tab = this.activeTab();
    if (!this.genericForm.id || !this.genericForm.ov) return false;

    if (tab === 'viaticos') {
      return !!(this.genericForm.tecnico && this.genericForm.concepto && (this.genericForm.dias || 0) > 0);
    }
    if (tab === 'insumos') {
      return !!(this.genericForm.insumo && (this.genericForm.qty || 0) > 0);
    }
    if (tab === 'repuestos') {
      return !!(this.genericForm.ref && this.genericForm.desc && (this.genericForm.qty || 0) > 0);
    }
    return true;
  }

  async saveGeneric() {
    if (!this.isGenericFormValid()) return;
    const tab = this.activeTab();
    const finalItem: any = { ...this.genericForm };

    if (tab === 'viaticos') {
      finalItem.dias = Number(finalItem.dias) || 0;
      finalItem.vpd = Number(finalItem.vpd) || 0;
    } else {
      finalItem.qty = Number(finalItem.qty) || 0;
      finalItem.cu = Number(finalItem.cu) || 0;
    }

    await this.dbService.upsert(tab, finalItem);
    this.genericModal = null;
  }

  // --- DELETE LOGIC ---
  confirmDelete(id: string) {
    this.confId = id;
  }

  async deleteConfirmed() {
    if (!this.confId) return;
    const id = this.confId;
    const tab = this.activeTab();

    await this.dbService.remove(tab, id);
    this.confId = null;
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

  usd(n: number | null | undefined): string {
    if (n == null) return '—';
    return 'US$ ' + Math.round(Number(n)).toLocaleString('es-PE');
  }

  pill(e: string): string {
    const m: Record<string, string> = {
      'Finalizado': 'p-g',
      'En progreso': 'p-b',
      'En riesgo': 'p-r',
      'Programado': 'p-n',
      'Pendiente': 'p-o',
      'En curso': 'p-b',
      'Entregado': 'p-g',
      'Utilizado': 'p-g',
      'Instalado': 'p-g',
      'En pedido': 'p-o',
      'Liquidado': 'p-g',
      'Parcial': 'p-o',
      'En tránsito': 'p-b'
    };
    return m[e] || 'p-n';
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
}
