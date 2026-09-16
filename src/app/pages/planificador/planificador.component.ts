import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DbService, Tecnico, Planificacion, Cliente } from '../../services/db.service';

interface TipoConfig {
  bg: string;
  fg: string;
  label: string;
}

interface CellBar {
  event: Planificacion;
  width: number;
  bg: string;
  fg: string;
  title: string;
  subtitle: string;
  tooltip: string;
}

interface GridCell {
  dt: Date;
  dateStr: string;
  isToday: boolean;
  isWeekend: boolean;
  bar?: CellBar;
}

interface GridRow {
  tecnico: Tecnico;
  eventCount: number;
  cells: GridCell[];
}

interface EnablementInfo {
  status: 'none' | 'zero' | 'rejected' | 'partial' | 'ok';
  pct: number;
  title: string;
  desc: string;
  cssClass: string;
  pendingReqs: string[];
}

@Component({
  selector: 'app-planificador',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="wrap">
      <!-- ══════════ ENCABEZADO ══════════ -->
      <div class="head">
        <div>
          <h1>Planificador operacional</h1>
          <div class="sub">Asignación de actividades para el personal técnico</div>
        </div>

        <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
          <!-- Switch Mensual / Semanal -->
          <div class="seg">
            <button type="button" [class.on]="pVista() === 'mes'" (click)="setVista('mes')">Mensual</button>
            <button type="button" [class.on]="pVista() === 'sem'" (click)="setVista('sem')">Semanal</button>
          </div>

          <!-- Navegación de Período -->
          <button type="button" (click)="prevPeriod()">◀</button>
          <b style="font-size:14px; min-width:168px; text-align:center; color:var(--blue);">{{ periodTitle() }}</b>
          <button type="button" (click)="nextPeriod()">▶</button>

          <!-- Hoy & Nuevo -->
          <button type="button" (click)="goToToday()">Hoy</button>
          <button type="button" class="suc" (click)="openModalNew()">+ Programar</button>
        </div>
      </div>

      <!-- ══════════ LEYENDA & FILTRO ══════════ -->
      <div class="lg">
        <b>Leyenda</b>
        <span *ngFor="let k of tipoKeys">
          <i [style.background]="tipoColors[k].bg"></i>
          {{ tipoColors[k].label }}
        </span>

        <select [(ngModel)]="pTec" style="width:auto; min-width:190px; margin-left:auto;">
          <option value="">Todos los técnicos</option>
          <option *ngFor="let t of dbService.tecnicos()" [value]="t.id">{{ t.nombre }}</option>
        </select>

        <span class="mut" style="font-size:12px;">
          {{ visibleEventsCount() }} evento{{ visibleEventsCount() === 1 ? '' : 's' }} en el período
        </span>
      </div>

      <!-- ══════════ GRILLA TIMELINE ══════════ -->
      <div class="pl-wrap">
        <table class="pl">
          <thead>
            <tr>
              <th class="who">
                <div style="font-size:11px; color:var(--mut); text-transform:uppercase; letter-spacing:.4px; font-weight:700;">
                  Personal
                </div>
                <div class="mut" style="font-size:11px; font-weight:400; margin-top:2px;">
                  {{ filteredTecnicos().length }} técnicos
                </div>
              </th>

              <th *ngFor="let dt of visibleDays()"
                  class="d"
                  [class.hoy]="isToday(dt)"
                  [class.wknd]="isWeekend(dt)">
                <b>{{ dt.getDate() }}</b>
                <span>{{ getDOW(dt) }}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let row of gridRows(); trackBy: trackByTecId">
              <!-- Columna Personal -->
              <td class="who">
                <div class="wrow">
                  <div class="av" style="width:32px; height:32px; font-size:11px; background:var(--greenL); color:var(--greenD);">
                    {{ getInitials(row.tecnico.nombre) }}
                  </div>
                  <div style="min-width:0; flex:1;">
                    <div class="nm" [title]="row.tecnico.nombre">{{ row.tecnico.nombre }}</div>
                    <div class="sp" [title]="row.tecnico.especialidad">{{ row.tecnico.especialidad }}</div>
                    <div class="ct">{{ row.eventCount }} evento{{ row.eventCount === 1 ? '' : 's' }}</div>
                  </div>
                </div>
              </td>

              <!-- Celdas de días -->
              <td *ngFor="let cell of row.cells; trackBy: trackByDateStr"
                  class="cel"
                  [class.hoy]="cell.isToday"
                  [class.wknd]="cell.isWeekend"
                  (click)="onCellClick(row.tecnico, cell.dateStr)">
                <!-- Barra horizontal de evento si inicia o se extiende en este día -->
                <div *ngIf="cell.bar"
                     class="bar"
                     [style.left.px]="3"
                     [style.width.px]="cell.bar.width"
                     [style.background]="cell.bar.bg"
                     [style.color]="cell.bar.fg"
                     [title]="cell.bar.tooltip"
                     (click)="onBarClick($event, cell.bar.event)">
                  <span>{{ cell.bar.title }}</span>
                  <small *ngIf="cell.bar.subtitle">{{ cell.bar.subtitle }}</small>
                </div>
              </td>
            </tr>

            <!-- Estado Vacío -->
            <tr *ngIf="gridRows().length === 0">
              <td [attr.colspan]="visibleDays().length + 1" style="text-align:center; padding:36px; color:var(--mut); font-size:13px;">
                No hay técnicos registrados o ninguno coincide con el filtro.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- ══════════ MODAL DE PROGRAMACIÓN ══════════ -->
      <div class="ov" *ngIf="showModal" (click)="onBackdropClick($event)">
        <div class="mod" (click)="$event.stopPropagation()">
          <div class="mod-h">
            <div>
              <b>{{ isEdit ? 'Editar actividad' : 'Programar actividad' }}</b>
              <span class="s">
                {{ modalSubtitle() }}
              </span>
            </div>
            <button type="button" class="x" (click)="closeModal()">×</button>
          </div>

          <div class="mod-b">
            <!-- Técnico -->
            <div class="fld">
              <label>Técnico *</label>
              <select [(ngModel)]="formTecnicoId" (change)="onTecnicoOrClientChange()">
                <option value="">Selecciona un técnico</option>
                <option *ngFor="let t of dbService.tecnicos()" [value]="t.id">{{ t.nombre }}</option>
              </select>
            </div>

            <!-- Tipo de actividad -->
            <div class="fld">
              <label>Tipo de actividad</label>
              <div style="display:flex; gap:7px; flex-wrap:wrap;">
                <button *ngFor="let k of tipoKeys"
                        type="button"
                        class="sm"
                        [class.pri]="formTipo.toLowerCase() === k"
                        (click)="setTipo(tipoColors[k].label)">
                  {{ tipoColors[k].label }}
                </button>
              </div>
            </div>

            <!-- Cliente (visible para Servicio y Actividad) -->
            <div *ngIf="isClientApplicable" class="fld">
              <label>Cliente *</label>
              <select [(ngModel)]="formCliente" (change)="onTecnicoOrClientChange()">
                <option value="">Selecciona un cliente</option>
                <option *ngFor="let c of sortedClientes()" [value]="c.nombre">{{ c.nombre }}</option>
              </select>

              <!-- ALERTA DINÁMICA DE HABILITACIÓN -->
              <div *ngIf="enablementInfo.status !== 'none'" [class]="enablementInfo.cssClass" style="margin: 8px 0 0 0;">
                <b>{{ enablementInfo.title }}</b>
                <div *ngIf="enablementInfo.desc" style="margin-top:2px;">{{ enablementInfo.desc }}</div>

                <!-- Detalle de requisitos pendientes si aplica -->
                <div *ngIf="enablementInfo.pendingReqs.length > 0" style="margin-top:6px; font-size:11px; opacity:0.9;">
                  <span>Pendiente(s): </span>
                  <b>{{ enablementInfo.pendingReqs.join(', ') }}</b>
                </div>
              </div>
            </div>

            <!-- Fechas Desde / Hasta -->
            <div class="row2">
              <div class="fld">
                <label>Desde *</label>
                <input type="date" [(ngModel)]="formFecha">
              </div>
              <div class="fld">
                <label>Hasta *</label>
                <input type="date" [(ngModel)]="formFechaFin">
              </div>
            </div>

            <!-- OV (opcional) -->
            <div class="fld">
              <label>Orden de Venta (OV opcional)</label>
              <input [(ngModel)]="formOv" placeholder="Ej: 2601117">
            </div>

            <!-- Descripción -->
            <div class="fld">
              <label>Descripción</label>
              <textarea [(ngModel)]="formDescripcion" placeholder="Mantenimiento preventivo puente grúa 10t"></textarea>
            </div>

            <!-- Error de validación -->
            <div *ngIf="formError" style="font-size:13px; color:var(--redD); margin-top:4px;">
              {{ formError }}
            </div>
          </div>

          <!-- Footer del modal -->
          <div class="mod-f">
            <div>
              <button *ngIf="isEdit" type="button" class="sm dgr" (click)="deleteCurrent()">
                🗑 Eliminar
              </button>
            </div>
            <div style="display:flex; gap:8px;">
              <button type="button" (click)="closeModal()">Cancelar</button>
              <button type="button" class="pri" (click)="save()">
                {{ isEdit ? 'Guardar cambios' : 'Programar' }}
              </button>
            </div>
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

    .wrap {
      padding: 26px 30px;
      max-width: 1420px;
      margin: 0 auto;
    }

    .head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
      margin-bottom: 18px;
    }
    .head h1 {
      font-size: 22px;
      font-weight: 800;
      letter-spacing: -.3px;
      margin: 0;
      color: var(--txt);
    }
    .sub {
      font-size: 13px;
      color: var(--mut);
      margin-top: 3px;
    }

    button {
      font-family: inherit;
      cursor: pointer;
      font-size: 13px;
      padding: 8px 14px;
      border-radius: 8px;
      border: 1px solid var(--line);
      background: #fff;
      color: var(--txt);
      transition: .12s;
    }
    button:hover { background: #F8FAFC; }
    .pri { background: var(--blue); color: #fff; border-color: var(--blue); }
    .pri:hover { background: var(--blueD); }
    .suc { background: var(--lime); color: #14290a; border-color: var(--lime); font-weight: 700; }
    .suc:hover { filter: brightness(.95); }
    .sm { font-size: 12px; padding: 5px 10px; border-radius: 6px; }
    .dgr { color: var(--redD); border-color: #F7C1C1; }
    .dgr:hover { background: var(--redL); }
    .x { border: none; background: none; font-size: 20px; color: var(--mut); padding: 0 5px; line-height: 1; cursor: pointer; }

    select, input, textarea {
      font-family: inherit;
      font-size: 13px;
      padding: 8px 11px;
      border-radius: 8px;
      border: 1px solid #CBD5E1;
      background: #fff;
      color: var(--txt);
      outline: none;
      width: 100%;
      box-sizing: border-box;
    }
    select:focus, input:focus, textarea:focus { border-color: var(--blue); }
    textarea { min-height: 64px; resize: vertical; }
    label {
      display: block;
      font-size: 11px;
      font-weight: 700;
      color: var(--mut);
      margin-bottom: 5px;
      text-transform: uppercase;
      letter-spacing: .4px;
    }
    .fld { margin-bottom: 13px; }

    .av {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 800;
      flex-shrink: 0;
    }
    .mut { color: var(--mut); }

    /* Segment toggle */
    .seg {
      display: flex;
      gap: 0;
      border: 1px solid var(--line);
      border-radius: 8px;
      overflow: hidden;
      background: #fff;
    }
    .seg button {
      border: none;
      border-radius: 0;
      font-size: 13px;
      padding: 7px 15px;
      background: transparent;
      color: var(--txt);
    }
    .seg button.on {
      background: var(--blue);
      color: #fff;
      font-weight: 700;
    }

    /* Leyenda */
    .lg {
      display: flex;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
      background: #fff;
      border: 1px solid var(--line);
      border-radius: 10px;
      padding: 10px 14px;
      margin-bottom: 13px;
    }
    .lg b {
      font-size: 11px;
      color: var(--mut);
      text-transform: uppercase;
      letter-spacing: .4px;
    }
    .lg span {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: var(--mut);
    }
    .lg i {
      width: 13px;
      height: 13px;
      border-radius: 4px;
      display: inline-block;
    }

    /* Planificador Grid */
    .pl-wrap {
      overflow: auto;
      border: 1px solid var(--line);
      border-radius: 12px;
      background: #fff;
      max-height: 66vh;
      box-shadow: 0 1px 3px rgba(0,0,0,0.02);
    }
    .pl {
      border-collapse: separate;
      border-spacing: 0;
      width: max-content;
      min-width: 100%;
    }
    .pl th, .pl td {
      border-right: 1px solid var(--line2);
      border-bottom: 1px solid var(--line2);
      padding: 0;
    }
    .pl .who {
      position: sticky;
      left: 0;
      background: #fff;
      z-index: 2;
      width: 216px;
      min-width: 216px;
      border-right: 1px solid var(--line);
      padding: 9px 12px;
    }
    .pl thead th {
      position: sticky;
      top: 0;
      background: #F8FAFC;
      z-index: 3;
    }
    .pl thead th.who {
      z-index: 4;
      background: #F8FAFC;
    }
    .pl .d {
      width: 48px;
      min-width: 48px;
      text-align: center;
      padding: 7px 2px;
      font-size: 11px;
      line-height: 1.35;
    }
    .pl .d b {
      display: block;
      font-size: 13px;
      font-weight: 800;
    }
    .pl .d span {
      color: var(--mut2);
      font-weight: 600;
      text-transform: uppercase;
      font-size: 10px;
    }
    .pl td.cel {
      height: 52px;
      position: relative;
      cursor: pointer;
      vertical-align: middle;
    }
    .pl td.cel:hover {
      background: #F1F5F9;
    }
    .wknd { background: #FFFBF2; }
    .hoy { background: #EAF2FB; }
    .pl thead th.hoy { background: #DCEAFA; }
    .pl thead th.hoy b { color: var(--blue); }

    .wrow {
      display: flex;
      align-items: center;
      gap: 9px;
    }
    .wrow .nm {
      font-size: 12px;
      font-weight: 700;
      line-height: 1.3;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .wrow .sp {
      font-size: 11px;
      color: var(--mut2);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .wrow .ct {
      font-size: 10px;
      color: var(--mut2);
      margin-top: 2px;
    }

    .bar {
      position: absolute;
      top: 9px;
      height: 34px;
      border-radius: 6px;
      padding: 4px 8px;
      font-size: 11px;
      font-weight: 700;
      line-height: 1.25;
      overflow: hidden;
      z-index: 10;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      justify-content: center;
      white-space: nowrap;
      text-overflow: ellipsis;
      box-shadow: 0 1px 2px rgba(0,0,0,0.05);
      transition: filter 0.15s, transform 0.1s;
    }
    .bar:hover {
      filter: brightness(0.96);
      transform: translateY(-1px);
    }
    .bar small {
      font-weight: 500;
      opacity: .85;
      font-size: 10px;
      display: block;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* Modal */
    .ov {
      position: fixed;
      inset: 0;
      background: rgba(9, 26, 44, .55);
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding: 34px 18px;
      z-index: 1000;
      overflow-y: auto;
    }
    .mod {
      background: #fff;
      border-radius: 14px;
      width: 100%;
      max-width: 640px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, .25);
      overflow: hidden;
      animation: fadeIn 0.15s ease-out;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .mod-h {
      padding: 15px 20px;
      border-bottom: 1px solid var(--line);
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
    }
    .mod-h b {
      font-size: 15px;
      color: var(--txt);
    }
    .mod-h .s {
      font-size: 12px;
      color: var(--mut);
      display: block;
      margin-top: 2px;
    }
    .mod-b {
      padding: 18px 20px;
      max-height: 80vh;
      overflow-y: auto;
    }
    .mod-f {
      padding: 14px 20px;
      border-top: 1px solid var(--line);
      display: flex;
      justify-content: space-between;
      gap: 8px;
      flex-wrap: wrap;
      align-items: center;
      background: #FAFAFA;
    }
    .row2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0 15px;
    }

    /* Notes / Alerts */
    .note {
      padding: 11px 14px;
      border-radius: 9px;
      font-size: 13px;
      line-height: 1.6;
      margin-bottom: 14px;
    }
    .n-g { background: var(--greenL); color: var(--greenD); }
    .n-o { background: var(--orangeL); color: var(--orangeD); }
    .n-r { background: var(--redL); color: var(--redD); }
    .n-b { background: var(--blueL); color: var(--blueD); }
  `]
})
export class PlanificadorComponent {
  public dbService = inject(DbService);

  // ── State ──────────────────────────────────────────
  pVista = signal<'mes' | 'sem'>('mes');
  pY = signal<number>(2026);
  pM = signal<number>(8);      // 0-indexed (8 = September)
  pSem = signal<number>(1);     // Week index within month (0 to 4)
  pTec = signal<string>('');    // Filter by technician ID

  // ── Modals State ───────────────────────────────────
  showModal = false;
  isEdit = false;
  currentEventId: string | null = null;

  // Form Fields
  formTecnicoId = '';
  formTipo = 'Servicio';
  formCliente = '';
  formFecha = '';
  formFechaFin = '';
  formOv = '';
  formDescripcion = '';
  formError = '';

  // ── Constants ──────────────────────────────────────
  readonly meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  readonly dowList = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  readonly tipoKeys = ['actividad', 'servicio', 'compensacion', 'vacaciones', 'otro'];

  readonly tipoColors: Record<string, TipoConfig> = {
    actividad:    { bg: '#DCEAFA', fg: '#0B3D72', label: 'Actividad' },
    servicio:     { bg: '#DDEFC8', fg: '#27500A', label: 'Servicio' },
    compensacion: { bg: '#FCE5B8', fg: '#854F0B', label: 'Compensación' },
    vacaciones:   { bg: '#F0DCF5', fg: '#6B21A8', label: 'Vacaciones' },
    otro:         { bg: '#E2E8F0', fg: '#475569', label: 'Otro' }
  };

  // ── Computed: Clientes ordenados ───────────────────
  sortedClientes = computed(() => {
    return [...this.dbService.clientes()].sort((a, b) => a.nombre.localeCompare(b.nombre));
  });

  // ── Computed: Técnicos filtrados ───────────────────
  filteredTecnicos = computed(() => {
    const filterId = this.pTec();
    const list = this.dbService.tecnicos();
    if (!filterId) return list;
    return list.filter(t => t.id === filterId);
  });

  // ── Computed: Rango de Días Visibles ───────────────
  visibleDays = computed(() => {
    const out: Date[] = [];
    const y = this.pY();
    const m = this.pM();
    if (this.pVista() === 'mes') {
      const last = new Date(y, m + 1, 0).getDate();
      for (let d = 1; d <= last; d++) {
        out.push(new Date(y, m, d));
      }
    } else {
      const base = new Date(y, m, 1);
      let off = base.getDay();
      off = off === 0 ? 6 : off - 1; // Start on Monday
      const lun = new Date(y, m, 1 - off + this.pSem() * 7);
      for (let i = 0; i < 7; i++) {
        out.push(new Date(lun.getFullYear(), lun.getMonth(), lun.getDate() + i));
      }
    }
    return out;
  });

  // ── Computed: Título del Período ───────────────────
  periodTitle = computed(() => {
    const days = this.visibleDays();
    if (days.length === 0) return '';
    if (this.pVista() === 'mes') {
      return `${this.meses[this.pM()]} ${this.pY()}`;
    }
    const dFirst = days[0];
    const dLast = days[days.length - 1];
    return `${dFirst.getDate()} al ${dLast.getDate()} de ${this.meses[dLast.getMonth()]} ${dLast.getFullYear()}`;
  });

  // ── Computed: Eventos visibles en el período ───────
  visibleEvents = computed(() => {
    const days = this.visibleDays();
    if (days.length === 0) return [];
    const startStr = this.iso(days[0]);
    const endStr = this.iso(days[days.length - 1]);
    const all = this.dbService.planificaciones();

    return all.filter(p => {
      const pStart = p.fecha;
      const pEnd = p.fecha_fin || p.fecha;
      return pEnd >= startStr && pStart <= endStr;
    });
  });

  visibleEventsCount = computed(() => {
    const filterId = this.pTec();
    const evs = this.visibleEvents();
    if (!filterId) return evs.length;
    const tech = this.dbService.tecnicos().find(t => t.id === filterId);
    if (!tech) return 0;
    return evs.filter(e => this.isEventForTecnico(e, tech)).length;
  });

  // ── Computed: Grid Rows & Cells ───────────────────
  gridRows = computed<GridRow[]>(() => {
    const tecnicos = this.filteredTecnicos();
    const days = this.visibleDays();
    const hoyStr = this.getTodayIso();
    const allEvents = this.dbService.planificaciones();
    const periodEvs = this.visibleEvents();
    const cellWidth = 48;

    return tecnicos.map(t => {
      const tEvents = periodEvs
        .filter(p => this.isEventForTecnico(p, t))
        .sort((a, b) => a.fecha.localeCompare(b.fecha));

      const occupied: Record<number, boolean> = {};
      const cells: GridCell[] = [];

      days.forEach((dt, idx) => {
        const ds = this.iso(dt);
        const isTod = ds === hoyStr;
        const isWk = this.isWeekend(dt);

        if (!occupied[idx]) {
          const ev = tEvents.find(p => {
            const end = p.fecha_fin || p.fecha;
            return p.fecha <= ds && end >= ds;
          });

          if (ev) {
            let spanCount = 0;
            const evEnd = ev.fecha_fin || ev.fecha;
            for (let k = idx; k < days.length; k++) {
              const kd = this.iso(days[k]);
              if (ev.fecha <= kd && evEnd >= kd) {
                occupied[k] = true;
                spanCount++;
              } else {
                break;
              }
            }

            const cfg = this.getTipoConfig(ev.tipo);
            const w = spanCount * cellWidth - 6;
            const mainTxt = ev.cliente || cfg.label;
            const subtitle = (spanCount > 1 && ev.ov) ? `OV ${ev.ov}` : '';
            const tooltip = `${mainTxt} · ${ev.fecha} a ${evEnd}${ev.ov ? ' · OV ' + ev.ov : ''}${ev.descripcion ? ' · ' + ev.descripcion : ''}`;

            cells.push({
              dt,
              dateStr: ds,
              isToday: isTod,
              isWeekend: isWk,
              bar: {
                event: ev,
                width: w,
                bg: cfg.bg,
                fg: cfg.fg,
                title: spanCount > 1 ? mainTxt : (mainTxt.length > 6 ? mainTxt.slice(0, 5) + '…' : mainTxt),
                subtitle,
                tooltip
              }
            });
          } else {
            cells.push({ dt, dateStr: ds, isToday: isTod, isWeekend: isWk });
          }
        } else {
          cells.push({ dt, dateStr: ds, isToday: isTod, isWeekend: isWk });
        }
      });

      const totalTecEvents = allEvents.filter(p => this.isEventForTecnico(p, t)).length;

      return {
        tecnico: t,
        eventCount: totalTecEvents,
        cells
      };
    });
  });

  // ── Navigation Controls ───────────────────────────
  setVista(v: 'mes' | 'sem') {
    this.pVista.set(v);
    if (v === 'sem') {
      this.pSem.set(1);
    }
  }

  prevPeriod() {
    if (this.pVista() === 'mes') {
      let m = this.pM() - 1;
      if (m < 0) {
        this.pM.set(11);
        this.pY.update(y => y - 1);
      } else {
        this.pM.set(m);
      }
    } else {
      let s = this.pSem() - 1;
      if (s < 0) {
        let m = this.pM() - 1;
        if (m < 0) {
          this.pM.set(11);
          this.pY.update(y => y - 1);
        } else {
          this.pM.set(m);
        }
        this.pSem.set(3);
      } else {
        this.pSem.set(s);
      }
    }
  }

  nextPeriod() {
    if (this.pVista() === 'mes') {
      let m = this.pM() + 1;
      if (m > 11) {
        this.pM.set(0);
        this.pY.update(y => y + 1);
      } else {
        this.pM.set(m);
      }
    } else {
      let s = this.pSem() + 1;
      if (s > 4) {
        let m = this.pM() + 1;
        if (m > 11) {
          this.pM.set(0);
          this.pY.update(y => y + 1);
        } else {
          this.pM.set(m);
        }
        this.pSem.set(0);
      } else {
        this.pSem.set(s);
      }
    }
  }

  goToToday() {
    const now = new Date();
    // Default to September 2026 or current date
    this.pY.set(now.getFullYear());
    this.pM.set(now.getMonth());
    this.pSem.set(1);
  }

  // ── Enablement Status Evaluation ──────────────────
  get isClientApplicable(): boolean {
    const t = (this.formTipo || '').toLowerCase();
    return t.includes('serv') || t.includes('act');
  }

  get enablementInfo(): EnablementInfo {
    if (!this.formTecnicoId || !this.formCliente || !this.isClientApplicable) {
      return { status: 'none', pct: 0, title: '', desc: '', cssClass: '', pendingReqs: [] };
    }

    const tech = this.dbService.tecnicos().find(t => t.id === this.formTecnicoId || t.nombre === this.formTecnicoId);
    if (!tech) {
      return { status: 'none', pct: 0, title: '', desc: '', cssClass: '', pendingReqs: [] };
    }

    const firstName = tech.nombre ? tech.nombre.split(' ')[0] : 'El técnico';
    const contract = tech.clientes?.find(
      c => c.nombre.trim().toLowerCase() === this.formCliente.trim().toLowerCase()
    );

    if (!contract || !contract.reqs || contract.reqs.length === 0) {
      return {
        status: 'zero',
        pct: 0,
        title: `${firstName} no tiene requisitos registrados para ${this.formCliente}.`,
        desc: 'Hay que darlo de alta en el cliente antes de programarlo.',
        cssClass: 'note n-o',
        pendingReqs: []
      };
    }

    const total = contract.reqs.length;
    const vigentes = contract.reqs.filter(r => r.estado === 'vigente').length;
    const pct = total > 0 ? Math.round((vigentes / total) * 100) : 0;
    const pendingReqs = contract.reqs.filter(r => r.estado !== 'vigente').map(r => r.nombre);

    if (pct >= 100) {
      return {
        status: 'ok',
        pct: 100,
        title: `Habilitado al 100% para ${this.formCliente}. Puede ingresar a planta.`,
        desc: '',
        cssClass: 'note n-g',
        pendingReqs: []
      };
    }

    if (pct < 60) {
      return {
        status: 'rejected',
        pct,
        title: `No habilitado (${pct}%). Será rechazado en portería.`,
        desc: 'Revisa las certificaciones pendientes en el módulo de Habilitación.',
        cssClass: 'note n-r',
        pendingReqs
      };
    }

    return {
      status: 'partial',
      pct,
      title: `Habilitación parcial (${pct}%). Revisar antes de la fecha.`,
      desc: 'Revisa las certificaciones pendientes en el módulo de Habilitación.',
      cssClass: 'note n-o',
      pendingReqs
    };
  }

  onTecnicoOrClientChange() {
    this.formError = '';
  }

  setTipo(tipoLabel: string) {
    this.formTipo = tipoLabel;
    this.formError = '';
  }

  // ── Modal Handlers ────────────────────────────────
  modalSubtitle(): string {
    const tech = this.dbService.tecnicos().find(t => t.id === this.formTecnicoId);
    const techName = tech ? tech.nombre : '';
    if (techName && this.formFecha) {
      return `${techName} · ${this.formFecha}${this.formFechaFin && this.formFechaFin !== this.formFecha ? ' al ' + this.formFechaFin : ''}`;
    }
    return this.formFecha || 'Selecciona las fechas';
  }

  openModalNew(prefillTechId?: string, prefillDate?: string) {
    this.isEdit = false;
    this.currentEventId = null;
    this.formTecnicoId = prefillTechId || this.pTec() || (this.dbService.tecnicos()[0]?.id || '');
    this.formTipo = 'Servicio';
    this.formCliente = '';
    this.formFecha = prefillDate || this.getTodayIso();
    this.formFechaFin = prefillDate || this.getTodayIso();
    this.formOv = '';
    this.formDescripcion = '';
    this.formError = '';
    this.showModal = true;
  }

  onCellClick(t: Tecnico, ds: string) {
    this.openModalNew(t.id, ds);
  }

  onBarClick(e: MouseEvent, ev: Planificacion) {
    e.stopPropagation();
    this.isEdit = true;
    this.currentEventId = ev.id;
    this.formTecnicoId = ev.tecnico_id;
    this.formTipo = ev.tipo || 'Servicio';
    this.formCliente = ev.cliente || '';
    this.formFecha = ev.fecha;
    this.formFechaFin = ev.fecha_fin || ev.fecha;
    this.formOv = ev.ov || '';
    this.formDescripcion = ev.descripcion || '';
    this.formError = '';
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
  }

  onBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      this.closeModal();
    }
  }

  // ── CRUD Operations ───────────────────────────────
  async save() {
    this.formError = '';
    if (!this.formTecnicoId) {
      this.formError = 'Selecciona el personal técnico.';
      return;
    }
    if (this.isClientApplicable && !this.formCliente.trim()) {
      this.formError = 'Selecciona el cliente para esta actividad.';
      return;
    }
    if (!this.formFecha || !this.formFechaFin) {
      this.formError = 'Indica las fechas de inicio (desde) y fin (hasta).';
      return;
    }
    if (new Date(this.formFechaFin) < new Date(this.formFecha)) {
      this.formError = 'La fecha final no puede ser anterior a la inicial.';
      return;
    }

    const nextId = this.currentEventId || this.genId(this.dbService.planificaciones(), 'PLAN');
    const item: Planificacion = {
      id: nextId,
      tecnico_id: this.formTecnicoId,
      fecha: this.formFecha,
      fecha_fin: this.formFechaFin,
      cliente: this.isClientApplicable ? this.formCliente.trim() : '',
      tipo: this.formTipo,
      ov: this.formOv.trim(),
      descripcion: this.formDescripcion.trim(),
      creado: new Date().toISOString().slice(0, 10),
    };

    await this.dbService.upsert('planificaciones', item);
    this.closeModal();
  }

  async deleteCurrent() {
    if (this.currentEventId) {
      if (confirm('¿Estás seguro de eliminar esta programación?')) {
        await this.dbService.remove('planificaciones', this.currentEventId);
        this.closeModal();
      }
    }
  }

  // ── Helpers ───────────────────────────────────────
  isEventForTecnico(p: Planificacion, t: Tecnico): boolean {
    if (!p.tecnico_id || !t) return false;
    return (
      p.tecnico_id === t.id ||
      p.tecnico_id.trim().toLowerCase() === t.id.trim().toLowerCase() ||
      p.tecnico_id.trim().toLowerCase() === t.nombre.trim().toLowerCase()
    );
  }

  getTipoConfig(tipoStr: string): TipoConfig {
    const t = (tipoStr || '').toLowerCase();
    if (t.includes('serv')) return this.tipoColors['servicio'];
    if (t.includes('act')) return this.tipoColors['actividad'];
    if (t.includes('comp')) return this.tipoColors['compensacion'];
    if (t.includes('vac')) return this.tipoColors['vacaciones'];
    return this.tipoColors['otro'];
  }

  iso(dt: Date): string {
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const d = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  getTodayIso(): string {
    const now = new Date();
    return this.iso(now);
  }

  isWeekend(d: Date): boolean {
    const day = d.getDay();
    return day === 0 || day === 6; // Sun or Sat
  }

  isToday(d: Date): boolean {
    return this.iso(d) === this.getTodayIso();
  }

  getDOW(d: Date): string {
    const day = d.getDay(); // 0 = Sun
    return this.dowList[day === 0 ? 6 : day - 1];
  }

  getInitials(name: string): string {
    if (!name) return '?';
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(w => w[0])
      .join('')
      .toUpperCase();
  }

  genId(list: any[], pfx: string): string {
    const next = list.reduce((max, x) => {
      const n = parseInt((x.id || '').replace(pfx + '-', '')) || 0;
      return Math.max(max, n);
    }, 0) + 1;
    return `${pfx}-${String(next).padStart(4, '0')}`;
  }

  trackByTecId(index: number, item: GridRow): string {
    return item.tecnico.id;
  }

  trackByDateStr(index: number, item: GridCell): string {
    return item.dateStr;
  }
}
