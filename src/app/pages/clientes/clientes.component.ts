import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DbService, Cliente, ClienteNota, BaseRequirement } from '../../services/db.service';

@Component({
  selector: 'app-clientes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div>
      <!-- Header -->
      <div class="head">
        <div>
          <h1>Gestión de clientes</h1>
          <div class="sub">Requisitos obligatorios, accesos a plataforma y bitácora</div>
        </div>
        <button class="pri" (click)="openNew()">+ Nuevo cliente</button>
      </div>

      <!-- Search Bar -->
      <div class="bar">
        <input 
          type="text" 
          [ngModel]="q()" 
          (ngModelChange)="q.set($event)" 
          placeholder="Buscar cliente por nombre, sector o plataforma..." 
          style="width: 320px;"
        />
        <span class="right">{{ filteredClientes().length }} cliente(s)</span>
      </div>

      <!-- Client Cards Grid -->
      <div class="grid g2">
        <div *ngFor="let c of filteredClientes()" class="card">
          <!-- Top Row: Client Name, Sector, Enablement Pill -->
          <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 11px; margin-bottom: 11px;">
            <div>
              <div style="font-size: 15px; font-weight: 800; color: var(--blue);">{{ c.nombre }}</div>
              <div class="mut" style="font-size: 12px;">
                {{ c.sector || 'General' }} &middot; {{ c.reqs?.length || 0 }} requisito{{ (c.reqs?.length === 1 ? '' : 's') }}
              </div>
            </div>
            <span class="p" [ngClass]="getEnablementPillClass(c.nombre)">
              {{ getEnablementText(c.nombre) }}
            </span>
          </div>

          <!-- Platform Access Box -->
          <div *ngIf="c.plataformaNombre || c.plataformaUrl; else noPlatform" 
               style="background: var(--blueL); border-radius: 8px; padding: 9px 11px; margin-bottom: 10px;">
            <div style="font-size: 11px; font-weight: 700; color: var(--blueD); text-transform: uppercase; letter-spacing: .4px; margin-bottom: 5px;">
              Plataforma
            </div>
            <div style="font-size: 12px; color: var(--blueD);">
              <b>{{ c.plataformaNombre || 'Acceso web' }}</b>
            </div>
            <div style="font-size: 12px; color: var(--blueD); margin-top: 3px; word-break: break-all;">
              <a *ngIf="c.plataformaUrl" 
                 [href]="formatUrl(c.plataformaUrl)" 
                 target="_blank" 
                 style="color: var(--blueD); font-weight: 600; text-decoration: underline;">
                {{ cleanUrl(c.plataformaUrl) }}
              </a>
              <span *ngIf="c.plataformaUsuario">
                &middot; usuario <b>{{ c.plataformaUsuario }}</b>
              </span>
              <span *ngIf="c.plataformaPassword" style="margin-left: 4px;">
                &middot; clave 
                <b>{{ showPwd[c.id] ? c.plataformaPassword : '••••••' }}</b>
                <button type="button" 
                        (click)="togglePwd(c.id)" 
                        title="Ver/Ocultar clave"
                        style="border: none; background: none; cursor: pointer; font-size: 11px; padding: 0 3px; color: var(--blueD);">
                  {{ showPwd[c.id] ? '🙈' : '👁️' }}
                </button>
              </span>
            </div>
            <div *ngIf="c.contactoNombre" style="font-size: 12px; color: var(--blueD); margin-top: 3px;">
              {{ c.contactoNombre }}
            </div>
          </div>

          <ng-template #noPlatform>
            <div style="background: #F8FAFC; border-radius: 8px; padding: 9px 11px; margin-bottom: 10px; font-size: 12px; color: var(--mut2);">
              Sin plataforma registrada
            </div>
          </ng-template>

          <!-- Bitácora / Comments List -->
          <div *ngIf="c.comentarios && c.comentarios.length > 0" style="margin-bottom: 10px;">
            <div *ngFor="let n of c.comentarios; let idx = index" 
                 style="border-left: 2px solid var(--lime); padding: 2px 0 2px 10px; margin-bottom: 7px; display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
              <div style="flex: 1; min-width: 0;">
                <div style="font-size: 12px; line-height: 1.5; color: var(--txt); word-break: break-word;">{{ n.t }}</div>
                <div class="mut" style="font-size: 11px; margin-top: 2px;">{{ n.a }} &middot; {{ n.f }}</div>
              </div>
              <button type="button"
                      (click)="deleteComment(c, idx)"
                      title="Eliminar comentario"
                      style="border: none; background: transparent; color: var(--mut2); cursor: pointer; padding: 2px 5px; font-size: 12px; border-radius: 4px; line-height: 1;"
                      onmouseover="this.style.color='var(--redD)'; this.style.background='var(--redL)'"
                      onmouseout="this.style.color='var(--mut2)'; this.style.background='transparent'">
                🗑
              </button>
            </div>
          </div>

          <!-- Card Actions Footer -->
          <div style="display: flex; gap: 7px; justify-content: flex-end; align-items: center; margin-top: 8px;">
            <button class="sm" (click)="openCommentModal(c)">Comentario</button>
            <button class="sm" (click)="openEnablementModal(c)">Habilitados</button>
            <button class="sm" (click)="openEdit(c)">Editar</button>
            <button class="sm dgr" (click)="confirmDelete(c.id, c.nombre)">✕</button>
          </div>
        </div>

        <div *ngIf="filteredClientes().length === 0" class="card empty" style="grid-column: 1 / -1;">
          No se encontraron clientes con el filtro aplicado
        </div>
      </div>

      <!-- ── MODAL 1: AGREGAR COMENTARIO (BITÁCORA) ── -->
      <div *ngIf="commentModal && activeClient" class="ov" (click)="closeOnOverlay($event, 'comment')">
        <div class="mod" style="max-width: 520px;">
          <div class="mod-h">
            <div>
              <b>{{ activeClient.nombre }}</b>
              <span class="s">Bitácora de comentarios</span>
            </div>
            <button class="x" (click)="commentModal = false">×</button>
          </div>
          <div class="mod-b">
            <!-- Comentarios ya registrados -->
            <div *ngIf="activeClient.comentarios && activeClient.comentarios.length > 0" style="margin-bottom: 16px;">
              <label>Comentarios registrados ({{ activeClient.comentarios.length }})</label>
              <div style="max-height: 160px; overflow-y: auto; border: 1px solid var(--line); border-radius: 8px; padding: 8px 10px; background: #F8FAFC;">
                <div *ngFor="let n of activeClient.comentarios; let idx = index"
                     style="border-left: 2px solid var(--lime); padding: 4px 0 4px 8px; margin-bottom: 7px; display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; background:#fff; border-radius:0 6px 6px 0; border-top:1px solid var(--line2); border-bottom:1px solid var(--line2); border-right:1px solid var(--line2);">
                  <div style="flex: 1; min-width: 0;">
                    <div style="font-size: 12px; line-height: 1.4; color: var(--txt); word-break: break-word;">{{ n.t }}</div>
                    <div class="mut" style="font-size: 10px; margin-top: 2px;">{{ n.a }} &middot; {{ n.f }}</div>
                  </div>
                  <button type="button"
                          (click)="deleteComment(activeClient, idx)"
                          title="Eliminar este comentario"
                          class="sm dgr"
                          style="padding: 2px 6px; font-size: 11px;">
                    🗑
                  </button>
                </div>
              </div>
            </div>

            <div class="fld">
              <label>Nuevo Comentario u Observación *</label>
              <textarea 
                [(ngModel)]="newCommentText" 
                placeholder="Ej. El portal exige recertificar la inducción cada 12 meses. Coordinar con SSOMA..."
                style="height: 80px;">
              </textarea>
            </div>
            <div *ngIf="commentErr" style="font-size: 12px; color: var(--redD); margin-top: 4px;">
              {{ commentErr }}
            </div>
          </div>
          <div class="mod-f">
            <span></span>
            <div style="display: flex; gap: 8px;">
              <button (click)="commentModal = false">Cerrar</button>
              <button class="pri" (click)="saveComment()">Agregar comentario</button>
            </div>
          </div>
        </div>
      </div>

      <!-- ── MODAL 2: RESUMEN DE HABILITADOS Y REQUISITOS ── -->
      <div *ngIf="habModal && activeClient" class="ov" (click)="closeOnOverlay($event, 'hab')">
        <div class="mod" style="max-width: 620px;">
          <div class="mod-h">
            <div>
              <b>Habilitación: {{ activeClient.nombre }}</b>
              <span class="s">
                {{ getAssignedTechs(activeClient.nombre).length }} técnicos asignados &middot; 
                {{ getFullyEnabledCount(activeClient.nombre) }} habilitados al 100%
              </span>
            </div>
            <button class="x" (click)="habModal = false">×</button>
          </div>

          <div class="mod-b">
            <!-- Requisitos Obligatorios del Cliente -->
            <div style="background: #F8FAFC; border: 1px solid var(--line); border-radius: 8px; padding: 11px 13px; margin-bottom: 14px;">
              <div style="font-size: 11px; font-weight: 700; color: var(--mut); text-transform: uppercase; letter-spacing: .4px; margin-bottom: 6px;">
                Requisitos exigidos por el cliente ({{ activeClient.reqs?.length || 0 }})
              </div>
              <div *ngIf="activeClient.reqs && activeClient.reqs.length > 0; else noReqs" style="display: flex; flex-wrap: wrap; gap: 6px;">
                <span *ngFor="let r of activeClient.reqs" class="p p-b" style="font-size: 11px;">
                  ✓ {{ r.nombre }}
                </span>
              </div>
              <ng-template #noReqs>
                <div class="mut" style="font-size: 12px; font-style: italic;">
                  No hay requisitos registrados para este cliente.
                </div>
              </ng-template>
            </div>

            <!-- Lista de Técnicos Asignados -->
            <div style="font-size: 11px; font-weight: 700; color: var(--mut); text-transform: uppercase; letter-spacing: .4px; margin-bottom: 8px;">
              Personal Técnico
            </div>

            <div *ngIf="getAssignedTechs(activeClient.nombre).length > 0; else noTechs">
              <div *ngFor="let t of getAssignedTechs(activeClient.nombre)" 
                   style="border: 1px solid var(--line); border-radius: 9px; padding: 11px 13px; margin-bottom: 9px;">
                <div style="display: flex; align-items: center; gap: 11px;">
                  <div class="av" style="background: var(--greenL); color: var(--greenD); width: 32px; height: 32px; font-size: 11px;">
                    {{ getInitials(t.nombre) }}
                  </div>
                  <div style="flex: 1; min-width: 0;">
                    <div style="font-size: 13px; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                      {{ t.nombre }}
                    </div>
                    <div class="mut" style="font-size: 11px;">{{ t.especialidad }}</div>
                  </div>
                  <span class="p" [ngClass]="t.pct >= 100 ? 'p-g' : (t.pct >= 50 ? 'p-o' : 'p-r')">
                    {{ t.pct >= 100 ? 'Habilitado' : 'Pendiente ' + t.pct + '%' }}
                  </span>
                </div>

                <!-- Detalle de requisitos específicos del técnico para este cliente -->
                <div *ngIf="t.reqs && t.reqs.length > 0" 
                     style="margin-top: 8px; padding-top: 8px; border-top: 1px dashed var(--line); font-size: 11px;">
                  <div *ngFor="let r of t.reqs" style="display: flex; justify-content: space-between; align-items: center; padding: 2px 0;">
                    <span style="color: var(--txt);">{{ r.nombre }}</span>
                    <span class="p" [ngClass]="r.estado === 'vigente' ? 'p-g' : 'p-r'" style="font-size: 9px; padding: 1px 6px;">
                      {{ r.estado === 'vigente' ? 'Vigente' : (r.estado || 'Pendiente') }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <ng-template #noTechs>
              <div class="empty" style="padding: 20px;">
                Ningún técnico asignado a este cliente actualmente.
              </div>
            </ng-template>
          </div>

          <div class="mod-f">
            <span></span>
            <button class="pri" (click)="habModal = false">Cerrar</button>
          </div>
        </div>
      </div>

      <!-- ── MODAL 3: CREAR / EDITAR CLIENTE (CON PLATAFORMA Y CREDENCIALES) ── -->
      <div *ngIf="editModal" class="ov" (click)="closeOnOverlay($event, 'edit')">
        <div class="mod" style="max-width: 640px;">
          <div class="mod-h">
            <div>
              <b>{{ isEdit ? 'Editar Cliente: ' + form.nombre : 'Nuevo Cliente' }}</b>
              <span class="s">Configura datos generales, accesos a portal y requisitos</span>
            </div>
            <button class="x" (click)="editModal = false">×</button>
          </div>

          <div class="mod-b">
            <!-- Datos Generales -->
            <div class="row2">
              <div class="fld">
                <label>Nombre del Cliente *</label>
                <input [(ngModel)]="form.nombre" placeholder="Ej. Nestlé SA, Antamina..."/>
              </div>
              <div class="fld">
                <label>Sector Económico</label>
                <input [(ngModel)]="form.sector" placeholder="Alimentos, Minería, Energía..."/>
              </div>
            </div>

            <!-- Acceso a Plataforma / Portal del Cliente -->
            <div style="background: #F8FAFC; border: 1px solid var(--line); border-radius: 9px; padding: 13px 15px; margin-bottom: 14px;">
              <div style="font-size: 11px; font-weight: 700; color: var(--blueD); text-transform: uppercase; letter-spacing: .4px; margin-bottom: 11px;">
                🔐 Acceso a Plataforma del Cliente
              </div>

              <div class="row2">
                <div class="fld">
                  <label>Nombre de la Plataforma</label>
                  <input [(ngModel)]="form.plataformaNombre" placeholder="Ej. Nestlé Contratistas, Sites..."/>
                </div>
                <div class="fld">
                  <label>URL / Enlace web</label>
                  <input [(ngModel)]="form.plataformaUrl" placeholder="https://contratistas.ejemplo.com"/>
                </div>
              </div>

              <div class="row2">
                <div class="fld">
                  <label>Usuario de Acceso</label>
                  <input [(ngModel)]="form.plataformaUsuario" placeholder="movitecnica.usuario"/>
                </div>
                <div class="fld">
                  <label>Contraseña / Clave</label>
                  <input [(ngModel)]="form.plataformaPassword" placeholder="Contraseña de la plataforma"/>
                </div>
              </div>

              <div class="fld" style="margin-bottom: 0;">
                <label>Contacto SSOMA / Portería / Área</label>
                <input [(ngModel)]="form.contactoNombre" placeholder="Ej. Ing. Marcos Ríos · SSOMA"/>
              </div>
            </div>

            <!-- Requisitos Obligatorios por Defecto -->
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <label style="margin: 0;">Requisitos obligatorios para ingresar a planta</label>
                <button class="sm" (click)="addReq()">+ Añadir requisito</button>
              </div>

              <div *ngIf="form.reqs && form.reqs.length > 0; else noFormReqs" 
                   style="border: 1px solid var(--line); border-radius: 8px; overflow: hidden; background: #fff;">
                <div *ngFor="let r of form.reqs; let i = index" 
                     style="display: flex; gap: 8px; align-items: center; padding: 6px 10px; border-bottom: 1px solid var(--line2);">
                  <input [(ngModel)]="r.nombre" placeholder="Nombre de inducción, EMO, examen..." style="flex: 1;"/>
                  <button class="sm dgr" (click)="removeReq(i)" title="Eliminar requisito">✕</button>
                </div>
              </div>
              <ng-template #noFormReqs>
                <div style="text-align: center; padding: 14px; border: 1px dashed var(--line); border-radius: 8px; color: var(--mut); font-size: 12px;">
                  Sin requisitos definidos. Haz clic en "+ Añadir requisito".
                </div>
              </ng-template>
            </div>

            <div *ngIf="formErr" style="font-size: 12px; color: var(--redD); margin-top: 10px;">
              {{ formErr }}
            </div>
          </div>

          <div class="mod-f">
            <span></span>
            <div style="display: flex; gap: 8px;">
              <button (click)="editModal = false">Cancelar</button>
              <button class="pri" (click)="saveClient()">
                {{ isEdit ? 'Guardar cambios' : 'Registrar cliente' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ── MODAL 4: CONFIRMAR ELIMINACIÓN ── -->
      <div *ngIf="confId" class="ov" (click)="confId = null">
        <div class="mod" style="max-width: 380px;">
          <div class="mod-h">
            <b>Confirmar eliminación</b>
            <button class="x" (click)="confId = null">×</button>
          </div>
          <div class="mod-b" style="font-size: 13px;">
            ¿Deseas eliminar al cliente <b>{{ confName }}</b>? Esta acción eliminará su registro de la base de datos.
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
    .sm { font-size: 12px; padding: 5px 10px; border-radius: 6px; }
    .dgr { color: var(--redD); border-color: #F7C1C1; }
    .dgr:hover { background: var(--redL); }
    .x { border: none; background: none; font-size: 20px; color: var(--mut); padding: 0 5px; line-height: 1; cursor: pointer; }

    select, input, textarea { font-family: inherit; font-size: 13px; padding: 8px 11px; border-radius: 8px; border: 1px solid #CBD5E1; background: #fff; color: var(--txt); outline: none; width: 100%; box-sizing: border-box; }
    select:focus, input:focus, textarea:focus { border-color: var(--blue); }
    textarea { min-height: 64px; resize: vertical; }
    label { display: block; font-size: 11px; font-weight: 700; color: var(--mut); margin-bottom: 5px; text-transform: uppercase; letter-spacing: .4px; }
    .fld { margin-bottom: 13px; }

    .bar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; background: #fff; border: 1px solid var(--line); border-radius: 10px; padding: 11px 14px; margin-bottom: 14px; }
    .right { margin-left: auto; font-size: 12px; color: var(--mut); }

    .grid { display: grid; gap: 13px; margin-bottom: 16px; }
    .g2 { grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); }
    .card { background: #fff; border: 1px solid var(--line); border-radius: 12px; padding: 16px 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); display: flex; flex-direction: column; justify-content: space-between; }

    .p { display: inline-block; font-size: 11px; padding: 3px 10px; border-radius: 20px; font-weight: 700; white-space: nowrap; }
    .p-g { background: var(--greenL); color: var(--greenD); }
    .p-b { background: var(--blueL); color: var(--blueD); }
    .p-o { background: var(--orangeL); color: var(--orangeD); }
    .p-r { background: var(--redL); color: var(--redD); }
    .p-n { background: #F1EFE8; color: #444441; }

    .av { width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; flex-shrink: 0; }
    .mut { color: var(--mut); }
    .empty { text-align: center; padding: 34px; color: var(--mut); font-size: 13px; }

    .ov { position: fixed; inset: 0; background: rgba(9,26,44,.55); display: flex; align-items: flex-start; justify-content: center; padding: 34px 18px; z-index: 100; overflow-y: auto; }
    .mod { background: #fff; border-radius: 14px; width: 100%; max-width: 640px; box-shadow: 0 20px 60px rgba(0,0,0,.25); }
    .mod-h { padding: 15px 20px; border-bottom: 1px solid var(--line); display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
    .mod-h b { font-size: 15px; color: var(--txt); }
    .mod-h .s { font-size: 12px; color: var(--mut); display: block; margin-top: 2px; }
    .mod-b { padding: 18px 20px; max-height: 80vh; overflow-y: auto; }
    .mod-f { padding: 14px 20px; border-top: 1px solid var(--line); display: flex; justify-content: space-between; gap: 8px; flex-wrap: wrap; align-items: center; }
    .row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0 15px; }
  `]
})
export class ClientesComponent {
  private dbService = inject(DbService);

  q = signal<string>('');

  // Password visibility toggle per client id
  showPwd: Record<string, boolean> = {};

  // Modals state
  commentModal = false;
  habModal = false;
  editModal = false;
  isEdit = false;

  activeClient: Cliente | null = null;
  newCommentText = '';
  commentErr = '';

  // Edit / New Client Form
  form: Partial<Cliente> = {};
  formErr = '';

  // Delete
  confId: string | null = null;
  confName = '';

  filteredClientes = computed(() => {
    const query = this.q().trim().toLowerCase();
    const list = this.dbService.clientes();
    if (!query) return list;
    return list.filter(c => 
      (c.nombre && c.nombre.toLowerCase().includes(query)) ||
      (c.sector && c.sector.toLowerCase().includes(query)) ||
      (c.plataformaNombre && c.plataformaNombre.toLowerCase().includes(query)) ||
      (c.contactoNombre && c.contactoNombre.toLowerCase().includes(query))
    );
  });

  togglePwd(id: string) {
    this.showPwd[id] = !this.showPwd[id];
  }

  cleanUrl(url: string | undefined): string {
    if (!url) return '';
    return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
  }

  formatUrl(url: string | undefined): string {
    if (!url) return '';
    return url.startsWith('http') ? url : 'https://' + url;
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

  // --- ENABLEMENT STATS ---
  getAssignedTechs(clientName: string) {
    const tecnicos = this.dbService.tecnicos();
    return tecnicos.filter(t => t.clientes && t.clientes.some(tc => tc.nombre === clientName)).map(t => {
      const clientContract = t.clientes.find(tc => tc.nombre === clientName);
      const reqs = clientContract?.reqs || [];
      const total = reqs.length;
      const ok = reqs.filter(r => r.estado === 'vigente').length;
      const pct = total > 0 ? Math.round((ok / total) * 100) : 100;
      return {
        ...t,
        reqs,
        pct
      };
    });
  }

  getFullyEnabledCount(clientName: string): number {
    return this.getAssignedTechs(clientName).filter(t => t.pct >= 100).length;
  }

  getEnablementText(clientName: string): string {
    const techs = this.getAssignedTechs(clientName);
    if (techs.length === 0) return 'Sin técnicos';
    const ok = techs.filter(t => t.pct >= 100).length;
    const pct = Math.round((ok / techs.length) * 100);
    return `${ok} de ${techs.length} · ${pct}%`;
  }

  getEnablementPillClass(clientName: string): string {
    const techs = this.getAssignedTechs(clientName);
    if (techs.length === 0) return 'p-n';
    const ok = techs.filter(t => t.pct >= 100).length;
    const pct = Math.round((ok / techs.length) * 100);
    if (pct === 100) return 'p-g';
    if (pct >= 60) return 'p-o';
    return 'p-r';
  }

  // --- COMMENT MODAL LOGIC ---
  openCommentModal(c: Cliente) {
    this.activeClient = c;
    this.newCommentText = '';
    this.commentErr = '';
    this.commentModal = true;
  }

  async saveComment() {
    if (!this.activeClient) return;
    const txt = this.newCommentText.trim();
    if (!txt) {
      this.commentErr = 'Por favor escribe un comentario antes de guardar.';
      return;
    }

    const currentNotes: ClienteNota[] = this.activeClient.comentarios ? [...this.activeClient.comentarios] : [];
    
    // Format date as '14 sep 2026'
    const now = new Date();
    const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    const fechaStr = `${now.getDate()} ${meses[now.getMonth()]} ${now.getFullYear()}`;

    const newNote: ClienteNota = {
      a: 'Luis Pottozen',
      f: fechaStr,
      t: txt
    };

    currentNotes.unshift(newNote);

    const updated = {
      ...this.activeClient,
      comentarios: currentNotes
    };

    await this.dbService.upsert('clientes', updated);
    this.commentModal = false;
  }

  async deleteComment(c: Cliente, index: number) {
    if (!c || !c.comentarios || index < 0 || index >= c.comentarios.length) return;
    if (!confirm('¿Estás seguro de eliminar este comentario?')) return;

    const currentNotes = c.comentarios.filter((_, i) => i !== index);
    const updated: Cliente = {
      ...c,
      comentarios: currentNotes
    };

    await this.dbService.upsert('clientes', updated);
    if (this.activeClient && this.activeClient.id === c.id) {
      this.activeClient = { ...this.activeClient, comentarios: currentNotes };
    }
  }

  // --- ENABLEMENT MODAL LOGIC ---
  openEnablementModal(c: Cliente) {
    this.activeClient = c;
    this.habModal = true;
  }

  // --- EDIT / NEW CLIENT LOGIC ---
  openNew() {
    this.isEdit = false;
    this.form = {
      id: this.nid(this.dbService.clientes(), 'CLI'),
      nombre: '',
      sector: 'Alimentos',
      plataformaNombre: '',
      plataformaUrl: '',
      plataformaUsuario: '',
      plataformaPassword: '',
      contactoNombre: '',
      reqs: [{ nombre: 'Inducción General', vence: '', estado: 'vigente' }],
      comentarios: []
    };
    this.formErr = '';
    this.editModal = true;
  }

  openEdit(c: Cliente) {
    this.isEdit = true;
    this.form = {
      ...c,
      reqs: (c.reqs || []).map(r => ({ ...r })),
      comentarios: (c.comentarios || []).map(n => ({ ...n }))
    };
    this.formErr = '';
    this.editModal = true;
  }

  addReq() {
    if (!this.form.reqs) this.form.reqs = [];
    this.form.reqs.push({ nombre: '', vence: '', estado: 'vigente' });
  }

  removeReq(i: number) {
    if (this.form.reqs) {
      this.form.reqs.splice(i, 1);
    }
  }

  async saveClient() {
    if (!this.form.nombre || !this.form.nombre.trim()) {
      this.formErr = 'El nombre del cliente es obligatorio.';
      return;
    }

    const cleanReqs = (this.form.reqs || []).filter(r => r.nombre && r.nombre.trim() !== '');

    const itemToSave: Cliente = {
      id: this.form.id || this.nid(this.dbService.clientes(), 'CLI'),
      nombre: this.form.nombre.trim(),
      sector: this.form.sector?.trim() || '',
      plataformaNombre: this.form.plataformaNombre?.trim() || '',
      plataformaUrl: this.form.plataformaUrl?.trim() || '',
      plataformaUsuario: this.form.plataformaUsuario?.trim() || '',
      plataformaPassword: this.form.plataformaPassword?.trim() || '',
      contactoNombre: this.form.contactoNombre?.trim() || '',
      reqs: cleanReqs,
      comentarios: this.form.comentarios || []
    };

    await this.dbService.upsert('clientes', itemToSave);
    this.editModal = false;
  }

  // --- DELETE LOGIC ---
  confirmDelete(id: string, name: string) {
    this.confId = id;
    this.confName = name;
  }

  async deleteConfirmed() {
    if (!this.confId) return;
    await this.dbService.remove('clientes', this.confId);
    this.confId = null;
  }

  nid(list: any[], pfx: string): string {
    const nextNum = list.reduce((m, x) => {
      const match = x.id?.replace(pfx + '-', '');
      const val = parseInt(match || '0') || 0;
      return Math.max(m, val);
    }, 0) + 1;
    return `${pfx}-${String(nextNum).padStart(4, '0')}`;
  }

  closeOnOverlay(event: MouseEvent, modalType: string) {
    if (event.target === event.currentTarget) {
      if (modalType === 'comment') this.commentModal = false;
      if (modalType === 'hab') this.habModal = false;
      if (modalType === 'edit') this.editModal = false;
    }
  }
}
