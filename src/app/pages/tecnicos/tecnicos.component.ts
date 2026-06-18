import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DbService, Tecnico, BaseRequirement, ClientRequirement } from '../../services/db.service';

@Component({
  selector: 'app-tecnicos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div>
      <!-- Page Header -->
      <div class="m-page-header" style="margin-bottom: 20px;">
        <div>
          <h1 class="m-page-title" style="font-size: 24px; font-weight: 800;">Habilitación de personal</h1>
          <p class="m-page-subtitle" style="font-size: 13px;">Ficha técnica con requisitos base y por cliente</p>
        </div>
        <button class="m-btn m-btn-pri" style="background: #1A5FA8; border-color: #1A5FA8; font-weight: 600;" (click)="openNew()">
          + Nuevo técnico
        </button>
      </div>

      <!-- Top Summary Metrics Grid -->
      <div class="m-metric-grid" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px; margin-bottom: 24px;">
        <div class="m-card" style="padding: 15px 18px; background: #FFF; border-radius: 12px; border: 0.5px solid rgba(0,0,0,0.09); box-shadow: 0 2px 8px rgba(0,0,0,0.03);">
          <div style="font-size: 11px; font-weight: 700; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 5px;">
            Técnicos
          </div>
          <div style="font-size: 24px; font-weight: 800; color: #1A1A1A; line-height: 1;">
            {{ dbService.tecnicos().length }}
          </div>
        </div>

        <div class="m-card" style="padding: 15px 18px; background: #FFF; border-radius: 12px; border: 0.5px solid rgba(0,0,0,0.09); box-shadow: 0 2px 8px rgba(0,0,0,0.03);">
          <div style="font-size: 11px; font-weight: 700; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 5px;">
            Clientes distintos
          </div>
          <div style="font-size: 24px; font-weight: 800; color: #1A1A1A; line-height: 1; display: flex; align-items: baseline; gap: 4px;">
            {{ uniqueClientsCount() }}
            <span style="font-size: 11px; color: #6B7280; font-weight: 400;">en total</span>
          </div>
        </div>

        <div class="m-card" style="padding: 15px 18px; background: #FFF; border-radius: 12px; border: 0.5px solid rgba(0,0,0,0.09); box-shadow: 0 2px 8px rgba(0,0,0,0.03);">
          <div style="font-size: 11px; font-weight: 700; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 5px;">
            Req. vencidos
          </div>
          <div style="font-size: 24px; font-weight: 800; color: #C0392B; line-height: 1; display: flex; align-items: baseline; gap: 4px;">
            {{ getExpiredTotal() }}
            <span style="font-size: 11px; color: #6B7280; font-weight: 400;">todos los técnicos</span>
          </div>
        </div>

        <div class="m-card" style="padding: 15px 18px; background: #FFF; border-radius: 12px; border: 0.5px solid rgba(0,0,0,0.09); box-shadow: 0 2px 8px rgba(0,0,0,0.03);">
          <div style="font-size: 11px; font-weight: 700; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 5px;">
            Vence en 30 días
          </div>
          <div style="font-size: 24px; font-weight: 800; color: #C47A0A; line-height: 1; display: flex; align-items: baseline; gap: 4px;">
            {{ getExpiringSoonTotal() }}
            <span style="font-size: 11px; color: #6B7280; font-weight: 400;">próximos</span>
          </div>
        </div>
      </div>

      <!-- Filters Row -->
      <div style="display: flex; gap: 14px; margin-bottom: 20px; align-items: center;">
        <div style="position: relative; width: 280px;">
          <input class="m-input" [ngModel]="q()" (ngModelChange)="q.set($event)" placeholder="🔍 Buscar técnico..." style="padding-left: 28px; border-radius: 8px;"/>
        </div>
        <select class="m-input" [ngModel]="fC()" (ngModelChange)="fC.set($event)" style="width: 220px; border-radius: 8px;">
          <option value="">Todos los clientes</option>
          <option *ngFor="let c of clientsList" [value]="c">{{ c }}</option>
        </select>
        <span style="margin-left: auto; font-size: 12px; color: var(--txt-m);">
          {{ filteredTecnicos().length }} técnicos filtrados
        </span>
      </div>

      <!-- Technicians Grid -->
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(440px, 1fr)); gap: 20px; margin-bottom: 30px;">
        <div *ngFor="let t of filteredTecnicos()" class="m-card" style="background: #FFF; border-radius: 12px; border: 0.5px solid rgba(0,0,0,0.09); padding: 18px; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 2px 10px rgba(0,0,0,0.02); transition: var(--transition); cursor: pointer;" (click)="openView(t)">
          
          <div>
            <!-- Card Header -->
            <div style="display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 14px;">
              <div style="display: flex; gap: 12px; align-items: center;">
                <!-- Avatar -->
                <div style="width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; flex-shrink: 0;"
                     [style.background]="getComplianceBg(habPct(t.baseReqs))"
                     [style.color]="getComplianceColor(habPct(t.baseReqs))">
                  {{ getInitials(t.nombre) }}
                </div>
                <div>
                  <h3 style="font-size: 15px; font-weight: 700; margin: 0; color: #1A1A1A;">{{ t.nombre }}</h3>
                  <p style="font-size: 12px; color: #6B7280; margin: 2px 0 0 0;">{{ t.especialidad }}</p>
                </div>
              </div>
              
              <!-- Warning badge for expired certifications -->
              <div *ngIf="getVencidosCount(t) > 0" 
                   style="background: #FDEBEA; color: #C0392B; border: 0.5px solid #C0392B; border-radius: 6px; padding: 2px 8px; font-size: 10px; font-weight: 700; display: flex; align-items: center; gap: 3px;">
                ⚠️ {{ getVencidosCount(t) }} venc.
              </div>
            </div>

            <!-- Base progress bar -->
            <div style="margin-bottom: 14px;">
              <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px; font-weight: 600;">
                <span style="color: #6B7280;">Base: <strong [style.color]="getComplianceColor(habPct(t.baseReqs))">{{ habPct(t.baseReqs) }}%</strong></span>
              </div>
              <div style="height: 6px; border-radius: 6px; background: rgba(0,0,0,0.06); overflow: hidden;">
                <div style="height: 100%; transition: width 0.3s;"
                     [style.width.%]="habPct(t.baseReqs)"
                     [style.background]="getComplianceColor(habPct(t.baseReqs))">
                </div>
              </div>
            </div>

            <!-- Divider -->
            <div style="height: 0.5px; background: rgba(0,0,0,0.06); margin: 10px 0;"></div>

            <!-- Client Progress Rows -->
            <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 14px;">
              <div *ngFor="let c of t.clientes" style="display: grid; grid-template-columns: 90px 1fr 40px; align-items: center; gap: 12px;">
                <!-- Client Name -->
                <span style="font-size: 12px; color: #4B5563; font-weight: 500; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">
                  {{ c.nombre }}
                </span>
                <!-- Client compliance progress bar -->
                <div style="height: 4px; border-radius: 4px; background: rgba(0,0,0,0.06); overflow: hidden;">
                  <div style="height: 100%; transition: width 0.3s;"
                       [style.width.%]="habPct(c.reqs)"
                       [style.background]="getComplianceColor(habPct(c.reqs))">
                  </div>
                </div>
                <!-- Client percentage -->
                <span style="font-size: 12px; font-weight: 700; text-align: right;" [style.color]="getComplianceColor(habPct(c.reqs))">
                  {{ habPct(c.reqs) }}%
                </span>
              </div>
              <div *ngIf="t.clientes.length === 0" style="font-size: 11px; color: #9CA3AF; font-style: italic; padding: 4px 0;">
                Sin clientes registrados
              </div>
            </div>
          </div>

          <!-- Card Actions -->
          <div style="display: flex; justify-content: flex-end; gap: 6px; margin-top: auto; border-top: 0.5px solid rgba(0,0,0,0.06); padding-top: 12px;">
            <button class="m-btn m-btn-sm" style="border-radius: 6px; font-weight: 600; padding: 4px 10px; display: inline-flex; align-items: center; gap: 4px;" (click)="$event.stopPropagation(); openEdit(t)">
              ✎ Editar
            </button>
            <button class="m-btn m-btn-sm m-btn-dan" style="border-radius: 6px; font-weight: 600; padding: 4px 8px;" (click)="$event.stopPropagation(); confirmDelete(t.id)">
              ✕
            </button>
          </div>

        </div>
      </div>

      <!-- --- VIEW MODAL (READ-ONLY) --- -->
      <div *ngIf="modal === 'v'" class="m-modal-overlay" (click)="closeOnOverlay($event)">
        <div class="m-modal-container" style="max-width: 600px; max-height: 90vh; display: flex; flex-direction: column;">
          <div class="m-modal-header" style="padding-bottom: 15px;">
            <div style="display: flex; gap: 14px; align-items: center;">
              <div style="width: 50px; height: 50px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 700; flex-shrink: 0;"
                   [style.background]="getComplianceBg(habPct(form.baseReqs || []))"
                   [style.color]="getComplianceColor(habPct(form.baseReqs || []))">
                {{ getInitials(form.nombre || '') }}
              </div>
              <div>
                <h2 style="font-size: 18px; font-weight: 800; margin: 0; color: #1A1A1A;">{{ form.nombre }}</h2>
                <p style="font-size: 13px; color: #6B7280; margin: 2px 0 0 0;">{{ form.especialidad }} · {{ form.nivel }}</p>
              </div>
            </div>
            <button class="m-modal-close" (click)="modal = null">×</button>
          </div>
          
          <div class="m-modal-body" style="padding: 20px; overflow-y: auto;">
            <!-- Datos Personales -->
            <div style="margin-bottom: 24px;">
              <h3 style="font-size: 14px; font-weight: 700; margin-bottom: 10px; border-bottom: 0.5px solid var(--border); padding-bottom: 4px;">Datos Personales</h3>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 13px;">
                <div><span style="color: var(--txt-m);">ID:</span> <strong>{{ form.id }}</strong></div>
                <div><span style="color: var(--txt-m);">Documento:</span> <strong>{{ form.doc }}</strong></div>
                <div><span style="color: var(--txt-m);">Teléfono:</span> <strong>{{ form.tel || '—' }}</strong></div>
                <div><span style="color: var(--txt-m);">Email:</span> <strong>{{ form.email || '—' }}</strong></div>
                <div><span style="color: var(--txt-m);">Ingreso:</span> <strong>{{ form.ingreso || '—' }}</strong></div>
                <div><span style="color: var(--txt-m);">Contrato:</span> <strong>{{ form.contrato || '—' }}</strong></div>
                <div><span style="color: var(--txt-m);">EPS:</span> <strong>{{ form.eps || '—' }}</strong></div>
                <div><span style="color: var(--txt-m);">ARL:</span> <strong>{{ form.arl || '—' }}</strong></div>
              </div>
              <div *ngIf="form.obs" style="margin-top: 10px; font-size: 13px; background: var(--surf); padding: 8px; border-radius: 6px;">
                <span style="color: var(--txt-m);">Observaciones:</span> {{ form.obs }}
              </div>
            </div>

            <!-- Requisitos Base -->
            <div style="margin-bottom: 24px;">
              <div style="display: flex; justify-content: space-between; align-items: baseline; border-bottom: 0.5px solid var(--border); padding-bottom: 4px; margin-bottom: 10px;">
                <h3 style="font-size: 14px; font-weight: 700; margin: 0;">Requisitos Base Movitécnica</h3>
                <span style="font-size: 13px; font-weight: 700;" [style.color]="getComplianceColor(habPct(form.baseReqs || []))">{{ habPct(form.baseReqs || []) }}% Cumplimiento</span>
              </div>
              <div *ngIf="!form.baseReqs || form.baseReqs.length === 0" style="font-size: 12px; color: var(--txt-m);">Sin requisitos base registrados.</div>
              <div style="display: grid; gap: 6px;">
                <div *ngFor="let r of form.baseReqs" style="display: flex; justify-content: space-between; align-items: center; background: #FAFAFA; padding: 6px 10px; border-radius: 6px; border: 0.5px solid rgba(0,0,0,0.05);">
                  <span style="font-size: 12px; font-weight: 600;">{{ r.nombre }}</span>
                  <div style="display: flex; gap: 10px; align-items: center;">
                    <span style="font-size: 11px; color: var(--txt-m);">{{ r.vence || 'Sin fecha' }}</span>
                    <span class="m-pill" [style.background]="getReqStatusStyle(r.estado).bg" [style.color]="getReqStatusStyle(r.estado).fg" style="font-size: 10px; padding: 2px 6px;">
                      {{ getReqStatusStyle(r.estado).lb }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Requisitos Clientes -->
            <div>
              <h3 style="font-size: 14px; font-weight: 700; margin-bottom: 10px; border-bottom: 0.5px solid var(--border); padding-bottom: 4px;">Certificaciones por Cliente</h3>
              <div *ngIf="!form.clientes || form.clientes.length === 0" style="font-size: 12px; color: var(--txt-m);">Este técnico no tiene certificaciones específicas asignadas.</div>
              
              <div *ngFor="let c of form.clientes" style="margin-bottom: 14px; background: #FFF; border: 0.5px solid var(--border); border-radius: 8px; overflow: hidden;">
                <div style="background: var(--surf); padding: 8px 12px; display: flex; justify-content: space-between; border-bottom: 0.5px solid var(--border);">
                  <span style="font-size: 12px; font-weight: 700;">{{ c.nombre }}</span>
                  <span style="font-size: 12px; font-weight: 700;" [style.color]="getComplianceColor(habPct(c.reqs))">{{ habPct(c.reqs) }}% OK</span>
                </div>
                <div style="padding: 8px 12px; display: grid; gap: 6px;">
                  <div *ngFor="let cr of c.reqs" style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 11px;">{{ cr.nombre }}</span>
                    <div style="display: flex; gap: 8px; align-items: center;">
                      <span style="font-size: 10px; color: var(--txt-m);">{{ cr.vence || '—' }}</span>
                      <span class="m-pill" [style.background]="getReqStatusStyle(cr.estado).bg" [style.color]="getReqStatusStyle(cr.estado).fg" style="font-size: 9px; padding: 1px 5px;">
                        {{ getReqStatusStyle(cr.estado).lb }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="m-modal-header" style="border-top: 0.5px solid var(--border); border-bottom: none; display: flex; justify-content: flex-end; padding-top: 15px;">
            <button class="m-btn m-btn-pri" (click)="openEditFromView()">✎ Editar Técnico</button>
          </div>
        </div>
      </div>

      <!-- --- EDIT MODAL (WITH PERFIL / REQS BASE / REQS CLIENTES TABS) --- -->
      <div *ngIf="modal === 'f'" class="m-modal-overlay" (click)="closeOnOverlay($event)">
        <div class="m-modal-container" style="max-width: 760px; height: 90vh;">
          <div class="m-modal-header">
            <span class="m-modal-title" style="font-size: 16px; font-weight: 700;">
              {{ form.nombre ? 'Ficha Técnica: ' + form.nombre : 'Registrar Técnico' }}
            </span>
            <button class="m-modal-close" (click)="modal = null">×</button>
          </div>

          <!-- Tab Selection within Modal -->
          <div style="display: flex; gap: 0; border-bottom: 0.5px solid var(--border); background: var(--surf); padding: 0 10px;">
            <div (click)="modalTab = 'perfil'" 
                 style="padding: 10px 16px; font-size: 12px; cursor: pointer; transition: var(--transition);"
                 [style.font-weight]="modalTab === 'perfil' ? '700' : '400'"
                 [style.border-bottom]="modalTab === 'perfil' ? '2.5px solid var(--blue)' : '2.5px solid transparent'"
                 [style.color]="modalTab === 'perfil' ? 'var(--blue)' : 'var(--txt-m)'">
              Perfil y Datos
            </div>
            <div (click)="modalTab = 'base'" 
                 style="padding: 10px 16px; font-size: 12px; cursor: pointer; transition: var(--transition);"
                 [style.font-weight]="modalTab === 'base' ? '700' : '400'"
                 [style.border-bottom]="modalTab === 'base' ? '2.5px solid var(--blue)' : '2.5px solid transparent'"
                 [style.color]="modalTab === 'base' ? 'var(--blue)' : 'var(--txt-m)'">
              Requisitos Base
            </div>
            <div (click)="modalTab = 'clientes'" 
                 style="padding: 10px 16px; font-size: 12px; cursor: pointer; transition: var(--transition);"
                 [style.font-weight]="modalTab === 'clientes' ? '700' : '400'"
                 [style.border-bottom]="modalTab === 'clientes' ? '2.5px solid var(--blue)' : '2.5px solid transparent'"
                 [style.color]="modalTab === 'clientes' ? 'var(--blue)' : 'var(--txt-m)'">
              Requisitos Clientes ({{ form.clientes?.length || 0 }})
            </div>
          </div>

          <div class="m-modal-body" style="padding: 20px; overflow-y: auto; flex: 1;">
            
            <!-- TAB 1: BASIC PROFILE -->
            <div *ngIf="modalTab === 'perfil'">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0 16px;">
                <div class="m-field">
                  <label class="m-label">ID Técnico *</label>
                  <input class="m-input" [(ngModel)]="form.id" readonly style="background: var(--surf);"/>
                </div>
                <div class="m-field">
                  <label class="m-label">Nombre Completo *</label>
                  <input class="m-input" [(ngModel)]="form.nombre" placeholder="Juan Pérez"/>
                </div>
                <div class="m-field">
                  <label class="m-label">Documento Cédula *</label>
                  <input class="m-input" [(ngModel)]="form.doc" placeholder="1098..."/>
                </div>
                <div class="m-field">
                  <label class="m-label">Especialidad</label>
                  <input class="m-input" [(ngModel)]="form.especialidad" placeholder="Técnico electromecánico..."/>
                </div>
                <div class="m-field">
                  <label class="m-label">Nivel de Experiencia</label>
                  <select class="m-input" [(ngModel)]="form.nivel">
                    <option value="Junior (0-2 años)">Junior (0–2 años)</option>
                    <option value="Técnico (2–5 años)">Técnico (2–5 años)</option>
                    <option value="Senior (5–10 años)">Senior (5–10 años)</option>
                    <option value="Experto (+10 años)">Experto (+10 años)</option>
                  </select>
                </div>
                <div class="m-field">
                  <label class="m-label">Tipo de Contrato</label>
                  <select class="m-input" [(ngModel)]="form.contrato">
                    <option value="Indefinido">Indefinido</option>
                    <option value="Término fijo">Término fijo</option>
                    <option value="Obra o labor">Obra o labor</option>
                  </select>
                </div>
                <div class="m-field">
                  <label class="m-label">Fecha de Ingreso</label>
                  <input class="m-input" type="date" [(ngModel)]="form.ingreso"/>
                </div>
                <div class="m-field">
                  <label class="m-label">Teléfono Celular</label>
                  <input class="m-input" [(ngModel)]="form.tel" placeholder="300..."/>
                </div>
                <div class="m-field" style="grid-column: span 2;">
                  <label class="m-label">Email de Contacto</label>
                  <input class="m-input" type="email" [(ngModel)]="form.email" placeholder="email&#64;movitecnica.com"/>
                </div>
                <div class="m-field">
                  <label class="m-label">EPS</label>
                  <input class="m-input" [(ngModel)]="form.eps" placeholder="Sura, Compensar..."/>
                </div>
                <div class="m-field">
                  <label class="m-label">ARL</label>
                  <input class="m-input" [(ngModel)]="form.arl" placeholder="Positiva, Sura..."/>
                </div>
                <div class="m-field" style="grid-column: span 2;">
                  <label class="m-label">Observaciones</label>
                  <input class="m-input" [(ngModel)]="form.obs"/>
                </div>
              </div>
            </div>

            <!-- TAB 2: BASE REQUIREMENTS -->
            <div *ngIf="modalTab === 'base'">
              <div style="margin-bottom: 12px; font-size: 12px; color: var(--txt-m);">
                Edita la fecha de vencimiento y el estado de habilitación para los requisitos base de Movitécnica.
              </div>
              <table class="m-table" style="width: 100%;">
                <thead>
                  <tr>
                    <th class="m-th">Requisito</th>
                    <th class="m-th" style="width: 190px;">Fecha Vence</th>
                    <th class="m-th" style="width: 140px;">Estado</th>
                    <th class="m-th" style="width: 110px; text-align: center;">Indicador</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let r of form.baseReqs" class="m-tr">
                    <td class="m-td" style="font-weight: 600;">{{ r.nombre }}</td>
                    <td class="m-td">
                      <input type="date" class="m-input" style="padding: 4px 8px; font-size: 11px;" [(ngModel)]="r.vence"/>
                    </td>
                    <td class="m-td">
                      <select class="m-input" style="padding: 4px 8px; font-size: 11px;" [(ngModel)]="r.estado">
                        <option value="vigente">Vigente</option>
                        <option value="vencido">Vencido</option>
                        <option value="en-tramite">En trámite</option>
                        <option value="pendiente">Pendiente</option>
                      </select>
                    </td>
                    <td class="m-td" style="text-align: center;">
                      <span class="m-pill" [style.background]="getReqStatusStyle(r.estado).bg" [style.color]="getReqStatusStyle(r.estado).fg">
                        {{ getReqStatusStyle(r.estado).lb }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- TAB 3: CLIENT REQUIREMENTS -->
            <div *ngIf="modalTab === 'clientes'">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <span style="font-size: 12px; color: var(--txt-m);">Habilita y controla certificaciones para los clientes mineros e industriales.</span>
                
                <div style="display: flex; gap: 8px; align-items: center;">
                  <select class="m-input" #newCli style="width: 150px; padding: 4px 8px; font-size: 12px;">
                    <option *ngFor="let c of getUnassignedClientsForForm()" [value]="c">{{ c }}</option>
                  </select>
                  <button class="m-btn m-btn-sm m-btn-pri" 
                          [disabled]="getUnassignedClientsForForm().length === 0"
                          (click)="addClientToForm(newCli.value)">
                    + Registrar Cliente
                  </button>
                </div>
              </div>

              <!-- Accordions/Blocks of assigned clients -->
              <div *ngFor="let c of form.clientes; let cliIdx = index" class="m-card" style="margin-bottom: 16px; padding: 15px; border: 0.5px solid rgba(0,0,0,0.15);">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; border-bottom: 0.5px solid var(--border); padding-bottom: 6px;">
                  <span style="font-size: 13px; font-weight: 700; color: var(--blue); display: flex; align-items: center; gap: 8px;">
                    {{ c.nombre }}
                    <span class="m-pill" [style.background]="getComplianceBg(habPct(c.reqs))" [style.color]="getComplianceColor(habPct(c.reqs))">
                      {{ habPct(c.reqs) }}% OK
                    </span>
                  </span>
                  <button class="m-btn m-btn-sm m-btn-dan" style="padding: 2px 8px; font-size: 10px;" (click)="removeClientFromForm(cliIdx)">
                    ✕ Desvincular Cliente
                  </button>
                </div>

                <table class="m-table">
                  <thead>
                    <tr>
                      <th class="m-th" style="padding: 5px 8px; font-size: 10px;">Certificación</th>
                      <th class="m-th" style="width: 180px; padding: 5px 8px; font-size: 10px;">Fecha Vence</th>
                      <th class="m-th" style="width: 130px; padding: 5px 8px; font-size: 10px;">Estado</th>
                      <th class="m-th" style="width: 100px; padding: 5px 8px; font-size: 10px; text-align: center;">Indicador</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let cr of c.reqs" class="m-tr">
                      <td class="m-td" style="font-size: 11px; padding: 6px 8px;">{{ cr.nombre }}</td>
                      <td class="m-td" style="padding: 6px 8px;">
                        <input type="date" class="m-input" style="padding: 3px 6px; font-size: 10px;" [(ngModel)]="cr.vence"/>
                      </td>
                      <td class="m-td" style="padding: 6px 8px;">
                        <select class="m-input" style="padding: 3px 6px; font-size: 10px;" [(ngModel)]="cr.estado">
                          <option value="vigente">Vigente</option>
                          <option value="vencido">Vencido</option>
                          <option value="en-tramite">En trámite</option>
                          <option value="pendiente">Pendiente</option>
                        </select>
                      </td>
                      <td class="m-td" style="padding: 6px 8px; text-align: center;">
                        <span class="m-pill" style="font-size: 9px; padding: 1px 6px;" [style.background]="getReqStatusStyle(cr.estado).bg" [style.color]="getReqStatusStyle(cr.estado).fg">
                          {{ getReqStatusStyle(cr.estado).lb }}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div *ngIf="form.clientes?.length === 0" style="text-align: center; padding: 30px; color: var(--txt-m); font-size: 12px; border: 1px dashed var(--border); border-radius: 8px;">
                Este técnico no tiene ningún cliente registrado. Registra uno arriba para habilitar sus inducciones.
              </div>
            </div>

          </div>

          <!-- Modal Footer -->
          <div class="m-modal-header" style="border-top: 0.5px solid var(--border); border-bottom: none; display: flex; justify-content: flex-end; gap: 8px;">
            <button class="m-btn" (click)="modal = null">Cancelar</button>
            <button class="m-btn m-btn-pri" [disabled]="!isFormValid()" (click)="save()">
              {{ isEdit ? 'Guardar Cambios' : 'Registrar Técnico' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Delete Confirmation -->
      <div *ngIf="confId" class="m-modal-overlay" style="z-index: 1100;">
        <div class="m-card" style="max-width: 360px; width: 100%; padding: 24px; background: var(--card);">
          <div style="font-size: 14px; margin-bottom: 20px; line-height: 1.6;">
            ¿Eliminar al técnico <strong>{{ confName }}</strong>? Esta acción borrará todas sus certificaciones del sistema.
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
export class TecnicosComponent {
  public dbService = inject(DbService);

  // States
  q = signal('');
  fC = signal(''); // Client filter
  modal: 'f' | 'v' | null = null;
  modalTab: 'perfil' | 'base' | 'clientes' = 'perfil';
  form: Partial<Tecnico> = {};
  isEdit = false;

  // Confirmations
  confId: string | null = null;
  confName = '';

  clientsList = this.dbService.getClientesList();

  // Filtered technicians list based on Search text and Client dropdown
  filteredTecnicos = computed(() => {
    const qVal = this.q();
    const fCVal = this.fC();
    return this.dbService.tecnicos().filter(t => {
      const qLower = qVal.toLowerCase();
      const matchesSearch = !qVal || 
             t.nombre.toLowerCase().includes(qLower) || 
             t.doc.toLowerCase().includes(qLower) ||
             t.especialidad.toLowerCase().includes(qLower);
      
      const matchesClient = !fCVal || t.clientes.some(c => c.nombre === fCVal);
      
      return matchesSearch && matchesClient;
    });
  });

  // Calculate distinct clients assigned to any technician
  uniqueClientsCount = computed(() => {
    const allAssigned = this.dbService.tecnicos().flatMap(t => t.clientes.map(c => c.nombre));
    return new Set(allAssigned).size;
  });

  // Expired requirements total (base + client requirements) across all technicians
  getExpiredTotal(): number {
    let count = 0;
    this.dbService.tecnicos().forEach(t => {
      t.baseReqs.forEach(r => { if (r.estado === 'vencido') count++; });
      t.clientes.forEach(c => {
        c.reqs.forEach(cr => { if (cr.estado === 'vencido') count++; });
      });
    });
    return count;
  }

  // Count requirements expiring soon (within 30 days)
  getExpiringSoonTotal(): number {
    let count = 0;
    const today = new Date();
    // Set time to midnight for simple date comparison
    today.setHours(0,0,0,0);
    
    const targetDate = new Date();
    targetDate.setDate(today.getDate() + 30);
    
    this.dbService.tecnicos().forEach(t => {
      t.baseReqs.forEach(r => {
        if (r.vence) {
          const vDate = new Date(r.vence);
          const diff = (vDate.getTime() - today.getTime()) / 86400000;
          if (diff >= 0 && diff <= 30 && r.estado === 'vigente') {
            count++;
          }
        }
      });
      t.clientes.forEach(c => {
        c.reqs.forEach(cr => {
          if (cr.vence) {
            const vDate = new Date(cr.vence);
            const diff = (vDate.getTime() - today.getTime()) / 86400000;
            if (diff >= 0 && diff <= 30 && cr.estado === 'vigente') {
              count++;
            }
          }
        });
      });
    });
    return count;
  }

  // Expired count for a single technician card
  getVencidosCount(t: Tecnico): number {
    let count = 0;
    t.baseReqs.forEach(r => { if (r.estado === 'vencido') count++; });
    t.clientes.forEach(c => {
      c.reqs.forEach(cr => { if (cr.estado === 'vencido') count++; });
    });
    return count;
  }

  // --- CRUD OPENS ---
  openNew() {
    this.isEdit = false;
    this.modalTab = 'perfil';
    this.form = {
      id: this.nid(this.dbService.tecnicos(), 'TEC'),
      nombre: '',
      doc: '',
      especialidad: '',
      nivel: 'Técnico (2–5 años)',
      contrato: 'Indefinido',
      ingreso: new Date().toISOString().slice(0, 10),
      tel: '',
      email: '',
      arl: 'Positiva',
      eps: 'Sura',
      obs: '',
      baseReqs: this.dbService.getBaseDefaultReqs(),
      clientes: []
    };
    this.modal = 'f';
  }

  openEdit(t: Tecnico) {
    this.isEdit = true;
    this.modalTab = 'perfil';
    // Deep clone arrays to avoid editing directly in memory before clicking Save
    this.form = {
      ...t,
      baseReqs: t.baseReqs.map(r => ({ ...r })),
      clientes: t.clientes.map(c => ({
        nombre: c.nombre,
        reqs: c.reqs.map(cr => ({ ...cr }))
      }))
    };
    this.modal = 'f';
  }

  openView(t: Tecnico) {
    // Deep clone to safely view
    this.form = {
      ...t,
      baseReqs: t.baseReqs.map(r => ({ ...r })),
      clientes: t.clientes.map(c => ({
        nombre: c.nombre,
        reqs: c.reqs.map(cr => ({ ...cr }))
      }))
    };
    this.modal = 'v';
  }

  openEditFromView() {
    this.isEdit = true;
    this.modalTab = 'perfil';
    this.modal = 'f';
  }

  isFormValid(): boolean {
    return !!(this.form.id && this.form.nombre && this.form.doc);
  }

  async save() {
    if (!this.isFormValid()) return;
    
    // Crear objeto sin las columnas JSONB problemáticas
    const itemToSave = {
      id: this.form.id!,
      nombre: this.form.nombre!,
      doc: this.form.doc!,
      especialidad: this.form.especialidad || 'Técnico',
      nivel: this.form.nivel || 'Técnico (2–5 años)',
      contrato: this.form.contrato || 'Indefinido',
      ingreso: this.form.ingreso || '',
      tel: this.form.tel || '',
      email: this.form.email || '',
      arl: this.form.arl || 'Positiva',
      eps: this.form.eps || 'Sura',
      obs: this.form.obs || ''
      // NOTA: baseReqs y clientes no se guardan en esta versión
      // para evitar problemas de caché de Supabase con columnas JSONB
    };

    console.log('[TecnicosComponent] Saving technician:', itemToSave);
    const success = await this.dbService.upsert('tecnicos', itemToSave);
    if (success) {
      console.log('[TecnicosComponent] Technician saved successfully!');
      this.modal = null;
    } else {
      console.error('[TecnicosComponent] Failed to save technician. Check console for details.');
      alert('Error al guardar técnico. Revisa la consola del navegador para más detalles.');
    }
  }

  confirmDelete(id: string) {
    const t = this.dbService.tecnicos().find(x => x.id === id);
    if (t) {
      this.confId = id;
      this.confName = t.nombre;
    }
  }

  deleteConfirmed() {
    if (this.confId) {
      this.dbService.remove('tecnicos', this.confId);
      this.confId = null;
    }
  }

  // --- REQUIREMENTS FORM TABS LOGIC ---
  getUnassignedClientsForForm(): string[] {
    const assigned = (this.form.clientes || []).map(c => c.nombre);
    return this.clientsList.filter(c => !assigned.includes(c));
  }

  addClientToForm(clientName: string) {
    if (!clientName) return;
    const defaultReqs = this.dbService.getClienteDefaultReqs(clientName);
    const newContract: ClientRequirement = {
      nombre: clientName,
      reqs: defaultReqs
    };
    if (!this.form.clientes) {
      this.form.clientes = [];
    }
    this.form.clientes.push(newContract);
  }

  removeClientFromForm(index: number) {
    if (this.form.clientes) {
      this.form.clientes.splice(index, 1);
    }
  }

  // --- COMPLIANCE SCORE ---
  habPct(reqs: BaseRequirement[]): number {
    return reqs?.length ? Math.round(reqs.filter(r => r.estado === 'vigente').length / reqs.length * 100) : 0;
  }

  getComplianceBg(p: number): string {
    if (p === 100) return '#EBF5E1'; // light green
    if (p >= 70) return '#FDF2DC';  // light amber
    return '#FDEBEA';              // light red
  }

  getComplianceColor(p: number): string {
    if (p === 100) return '#3A7D1E';
    if (p >= 70) return '#C47A0A';
    return '#C0392B';
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

  getInitials(name: string): string {
    if (!name) return '?';
    return name.split(' ')
               .filter(Boolean)
               .slice(0, 2)
               .map(w => w[0])
               .join('')
               .toUpperCase();
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
