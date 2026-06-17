import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DbService, Tecnico, Planificacion } from '../../services/db.service';

type ViewMode = 'month' | 'week';

interface PlanForm {
  id?: string;
  tecnico_id?: string;
  fecha?: string;
  tipo?: string;
  descripcion?: string;
  creado?: string;
}

@Component({
  selector: 'app-planificador',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div style="min-height: 100vh;">

      <!-- ══════════ PAGE HEADER ══════════ -->
      <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px; margin-bottom:18px;">
        <div>
          <h1 style="font-size:22px; font-weight:800; color:#0D1B2A; margin:0 0 2px;">Planificador Operacional</h1>
          <p style="font-size:12px; color:#6B7280; margin:0;">Asignación de actividades para el personal técnico</p>
        </div>

        <!-- Controls Row -->
        <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">

          <!-- View Toggle -->
          <div style="display:flex; background:#F1F5F9; border-radius:8px; padding:3px; gap:2px;">
            <button (click)="setView('month')"
              [style.background]="viewMode() === 'month' ? '#1A5FA8' : 'transparent'"
              [style.color]="viewMode() === 'month' ? '#fff' : '#6B7280'"
              style="border:none; border-radius:6px; padding:5px 14px; font-size:12px; font-weight:600; cursor:pointer; transition:all 0.2s;">
              📅 Mensual
            </button>
            <button (click)="setView('week')"
              [style.background]="viewMode() === 'week' ? '#1A5FA8' : 'transparent'"
              [style.color]="viewMode() === 'week' ? '#fff' : '#6B7280'"
              style="border:none; border-radius:6px; padding:5px 14px; font-size:12px; font-weight:600; cursor:pointer; transition:all 0.2s;">
              📆 Semanal
            </button>
          </div>

          <!-- Range Toggle -->
          <button (click)="toggleRangeMode()"
            [style.background]="rangeMode() ? '#059669' : '#fff'"
            [style.color]="rangeMode() ? '#fff' : '#374151'"
            [style.border]="rangeMode() ? '1px solid #059669' : '1px solid #D1D5DB'"
            style="border-radius:8px; padding:6px 14px; font-size:12px; font-weight:600; cursor:pointer; transition:all 0.2s; display:flex; align-items:center; gap:6px;">
            <span>{{ rangeMode() ? '✓ Rango activo' : '⬛ Seleccionar rango' }}</span>
          </button>

          <!-- Period Navigation -->
          <div style="display:flex; gap:4px; align-items:center; background:#fff; padding:4px 10px; border-radius:8px; border:1px solid #E5E7EB;">
            <button (click)="prev()" style="background:none; border:none; cursor:pointer; font-size:14px; color:#374151; padding:2px 6px; border-radius:4px; transition:background 0.15s;" onmouseover="this.style.background='#F3F4F6'" onmouseout="this.style.background='none'">◀</button>
            <span style="font-size:13px; font-weight:700; min-width:160px; text-align:center; color:#1A5FA8;">
              {{ periodLabel() }}
            </span>
            <button (click)="next()" style="background:none; border:none; cursor:pointer; font-size:14px; color:#374151; padding:2px 6px; border-radius:4px; transition:background 0.15s;" onmouseover="this.style.background='#F3F4F6'" onmouseout="this.style.background='none'">▶</button>
          </div>

          <!-- Today -->
          <button (click)="goToToday()" style="background:#fff; border:1px solid #E5E7EB; color:#374151; border-radius:8px; padding:6px 12px; font-size:12px; font-weight:600; cursor:pointer; transition:all 0.2s;" onmouseover="this.style.background='#F3F4F6'" onmouseout="this.style.background='#fff'">Hoy</button>
        </div>
      </div>

      <!-- Range Info Banner -->
      <div *ngIf="rangeMode()" style="background:linear-gradient(135deg,#ECFDF5,#D1FAE5); border:1px solid #6EE7B7; border-radius:10px; padding:10px 18px; margin-bottom:14px; display:flex; align-items:center; gap:12px; font-size:12px; flex-wrap:wrap;">
        <span style="font-size:16px;">📌</span>
        <span style="color:#065F46; font-weight:600;">
          Modo Rango: Haz click en la primera celda y luego en la última para seleccionar un rango de días por técnico.
        </span>
        <span *ngIf="rangeStart()" style="background:#fff; border:1px solid #6EE7B7; border-radius:6px; padding:3px 10px; color:#059669; font-weight:700;">
          Inicio: {{ rangeStart() }}
        </span>
        <button *ngIf="rangeStart()" (click)="clearRange()" style="background:transparent; border:none; color:#6B7280; cursor:pointer; font-size:11px; margin-left:auto;">✕ Cancelar</button>
      </div>

      <!-- ══════════ LEGEND ══════════ -->
      <div style="display:flex; gap:14px; flex-wrap:wrap; margin-bottom:14px; background:#fff; padding:10px 16px; border-radius:10px; border:1px solid #E5E7EB; font-size:11px; align-items:center;">
        <span style="font-weight:700; color:#9CA3AF; text-transform:uppercase; letter-spacing:0.5px; font-size:10px;">Leyenda:</span>
        <span *ngFor="let leg of legendItems" style="display:flex; align-items:center; gap:5px;">
          <span [style.background]="leg.bg" [style.border]="'1.5px solid ' + leg.border" style="width:12px; height:12px; border-radius:3px; display:inline-block;"></span>
          <span style="color:#374151; font-weight:500;">{{ leg.label }}</span>
        </span>
        <span style="margin-left:auto; font-size:10px; color:#9CA3AF;">{{ dbService.planificaciones().length }} evento(s) este periodo</span>
      </div>

      <!-- ══════════ CALENDAR GRID ══════════ -->
      <div class="pl-scroll-container">
        <table class="pl-table">
          <thead>
            <tr>
              <!-- Sticky left: Personnel header -->
              <th class="pl-th-person">
                <div style="font-size:11px; font-weight:700; color:#6B7280; text-transform:uppercase; letter-spacing:0.5px;">Personal</div>
                <div style="font-size:10px; color:#9CA3AF; margin-top:2px;">{{ dbService.tecnicos().length }} técnico(s)</div>
              </th>
              <!-- Day headers -->
              <th *ngFor="let d of visibleDays()"
                  class="pl-th-day"
                  [class.pl-weekend]="isWeekend(d)"
                  [class.pl-today]="isToday(d)">
                <div style="font-weight:700; font-size:12px;" [style.color]="isToday(d) ? '#1A5FA8' : '#1F2937'">{{ d.getDate() }}</div>
                <div style="font-size:9px; font-weight:600; margin-top:1px;" [style.color]="isToday(d) ? '#3B82F6' : '#9CA3AF'">{{ getDayLabel(d) }}</div>
                <div *ngIf="isToday(d)" style="width:6px; height:6px; background:#1A5FA8; border-radius:50%; margin:3px auto 0;"></div>
              </th>
            </tr>
          </thead>
          <tbody>
            <ng-container *ngFor="let t of dbService.tecnicos()">
              <tr class="pl-tr">
                <!-- Person cell -->
                <td class="pl-td-person">
                  <div style="display:flex; align-items:center; gap:8px;">
                    <div [style.background]="getPersonColor(t.id)"
                         style="width:30px; height:30px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:800; color:#fff; flex-shrink:0;">
                      {{ getInitials(t.nombre) }}
                    </div>
                    <div style="min-width:0;">
                      <div style="font-weight:700; font-size:12px; color:#1F2937; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">{{ t.nombre }}</div>
                      <div style="font-size:9px; color:#9CA3AF; margin-top:1px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">{{ t.especialidad }}</div>
                    </div>
                  </div>
                  <!-- mini summary bar -->
                  <div style="margin-top:6px; display:flex; gap:3px;">
                    <span *ngFor="let tipo of tiposList"
                          [title]="tipo + ': ' + countEventsByType(t.id, tipo)"
                          [style.background]="getBg(tipo)"
                          [style.opacity]="countEventsByType(t.id, tipo) > 0 ? '1' : '0.2'"
                          style="width:8px; height:8px; border-radius:2px; display:inline-block; cursor:default;">
                    </span>
                    <span style="font-size:9px; color:#9CA3AF; margin-left:2px;">{{ getTotalEventsForTecnico(t.id) }} eventos</span>
                  </div>
                </td>

                <!-- Day cells -->
                <td *ngFor="let d of visibleDays()"
                    class="pl-td-cell"
                    [class.pl-weekend]="isWeekend(d)"
                    [class.pl-today-col]="isToday(d)"
                    [class.pl-range-selected]="isInRangePreview(t.id, d)"
                    (click)="onCellClick(t, d)"
                    [title]="'Clic para programar: ' + t.nombre + ' - ' + formatDate(d)">
                  <div *ngFor="let ev of getEventsForDay(t.id, d)"
                       [style.background]="getBg(ev.tipo)"
                       [style.color]="getTxt(ev.tipo)"
                       [style.border-left]="'3px solid ' + getBorder(ev.tipo)"
                       style="font-size:9px; font-weight:700; border-radius:0 4px 4px 0; padding:2px 5px; margin:2px 0; text-overflow:ellipsis; overflow:hidden; white-space:nowrap; line-height:1.4; cursor:pointer; transition:opacity 0.15s;"
                       [title]="ev.tipo + ': ' + ev.descripcion"
                       (click)="onEventClick($event, t, d, ev)">
                    <span style="display:block; max-width:60px; overflow:hidden; text-overflow:ellipsis;">{{ ev.tipo.slice(0,3).toUpperCase() }}</span>
                  </div>
                  <!-- empty cell indicator -->
                  <div *ngIf="getEventsForDay(t.id, d).length === 0"
                       style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; opacity:0;">
                    <span style="font-size:14px; color:#D1D5DB;">+</span>
                  </div>
                </td>
              </tr>
            </ng-container>

            <!-- Empty state -->
            <tr *ngIf="dbService.tecnicos().length === 0">
              <td [attr.colspan]="visibleDays().length + 1"
                  style="text-align:center; padding:48px; color:#9CA3AF; font-size:13px;">
                <div style="font-size:32px; margin-bottom:8px;">👷</div>
                No hay personal técnico registrado en el sistema.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- ══════════ ACTIVITY FORM MODAL ══════════ -->
      <div *ngIf="showFormModal"
           style="position:fixed; inset:0; background:rgba(0,0,0,0.45); z-index:1000; display:flex; align-items:center; justify-content:center; padding:16px;"
           (click)="onOverlayClick($event)">
        <div style="background:#fff; border-radius:14px; width:100%; max-width:500px; box-shadow:0 20px 60px rgba(0,0,0,0.2); overflow:hidden;"
             (click)="$event.stopPropagation()">

          <!-- Modal Header -->
          <div style="background:linear-gradient(135deg,#1A5FA8,#2563EB); padding:18px 22px; display:flex; align-items:center; justify-content:space-between;">
            <div>
              <div style="color:#fff; font-size:15px; font-weight:800;">{{ isEdit ? '✏️ Modificar Actividad' : '➕ Programar Actividad' }}</div>
              <div style="color:rgba(255,255,255,0.75); font-size:11px; margin-top:3px;">
                {{ selectedTecnico?.nombre }} &nbsp;·&nbsp;
                <span *ngIf="!isRangeEdit">{{ form.fecha }}</span>
                <span *ngIf="isRangeEdit">{{ form.fecha }} → {{ rangeEndStr }}</span>
              </div>
            </div>
            <button (click)="showFormModal = false"
                    style="background:rgba(255,255,255,0.15); border:none; color:#fff; width:28px; height:28px; border-radius:50%; font-size:16px; cursor:pointer; display:flex; align-items:center; justify-content:center; line-height:1;">×</button>
          </div>

          <!-- Modal Body -->
          <div style="padding:20px; display:flex; flex-direction:column; gap:14px;">

            <!-- Range Date Summary -->
            <div *ngIf="isRangeEdit" style="background:#EFF6FF; border:1px solid #BFDBFE; border-radius:8px; padding:10px 14px; font-size:12px; color:#1D4ED8;">
              <strong>📅 Rango seleccionado:</strong> {{ form.fecha }} → {{ rangeEndStr }}
              <br><span style="color:#6B7280;">Se crearán eventos en cada día del rango para {{ selectedTecnico?.nombre }}.</span>
            </div>

            <!-- Tipo -->
            <div>
              <label style="font-size:11px; font-weight:700; color:#374151; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px; display:block;">Tipo de Actividad *</label>
              <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:6px;">
                <button *ngFor="let tipo of tiposList"
                        (click)="setTipo(tipo)"
                        [style.background]="form.tipo === tipo ? getBg(tipo) : '#F9FAFB'"
                        [style.border]="form.tipo === tipo ? '2px solid ' + getBorder(tipo) : '2px solid #E5E7EB'"
                        [style.color]="form.tipo === tipo ? getTxt(tipo) : '#6B7280'"
                        style="border-radius:8px; padding:8px 4px; font-size:11px; font-weight:700; cursor:pointer; transition:all 0.15s; text-align:center;">
                  {{ getTipoIcon(tipo) }} {{ tipo }}
                </button>
              </div>
            </div>

            <!-- Descripción -->
            <div>
              <label style="font-size:11px; font-weight:700; color:#374151; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px; display:block;">Descripción / Detalles</label>
              <textarea [(ngModel)]="form.descripcion"
                        placeholder="Ej: Mantenimiento preventivo puente grúa, OT-1210, cliente Drummond..."
                        style="width:100%; box-sizing:border-box; border:1.5px solid #E5E7EB; border-radius:8px; padding:10px 12px; font-size:12px; min-height:80px; resize:vertical; outline:none; font-family:inherit; transition:border-color 0.15s;"
                        onfocus="this.style.borderColor='#3B82F6'"
                        onblur="this.style.borderColor='#E5E7EB'">
              </textarea>
            </div>
          </div>

          <!-- Modal Footer -->
          <div style="padding:14px 22px; border-top:1px solid #F3F4F6; display:flex; justify-content:space-between; align-items:center; background:#FAFAFA;">
            <div>
              <button *ngIf="isEdit && !isRangeEdit" (click)="deleteEvent()"
                      style="background:#FEF2F2; border:1px solid #FECACA; color:#DC2626; border-radius:8px; padding:7px 14px; font-size:12px; font-weight:700; cursor:pointer; transition:all 0.15s;"
                      onmouseover="this.style.background='#DC2626';this.style.color='#fff'"
                      onmouseout="this.style.background='#FEF2F2';this.style.color='#DC2626'">
                🗑 Eliminar
              </button>
            </div>
            <div style="display:flex; gap:8px;">
              <button (click)="showFormModal = false"
                      style="background:#fff; border:1px solid #E5E7EB; color:#374151; border-radius:8px; padding:7px 16px; font-size:12px; font-weight:600; cursor:pointer;">
                Cancelar
              </button>
              <button (click)="save()"
                      style="background:linear-gradient(135deg,#1A5FA8,#2563EB); border:none; color:#fff; border-radius:8px; padding:7px 18px; font-size:12px; font-weight:700; cursor:pointer; box-shadow:0 2px 8px rgba(37,99,235,0.35);">
                {{ isEdit ? 'Guardar Cambios' : (isRangeEdit ? 'Programar Rango' : 'Programar') }}
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .pl-scroll-container {
      overflow-x: auto;
      border-radius: 12px;
      border: 1px solid #E5E7EB;
      box-shadow: 0 4px 20px rgba(0,0,0,0.05);
      background: #fff;
      margin-bottom: 24px;
    }
    .pl-table {
      border-collapse: collapse;
      width: 100%;
      table-layout: fixed;
    }

    /* Header */
    .pl-th-person {
      position: sticky;
      left: 0;
      z-index: 20;
      background: #F8FAFC;
      border-bottom: 2px solid #E5E7EB;
      border-right: 2px solid #E5E7EB;
      width: 200px;
      min-width: 200px;
      padding: 12px 14px;
      text-align: left;
    }
    .pl-th-day {
      width: 74px;
      min-width: 74px;
      text-align: center;
      padding: 8px 4px;
      border-bottom: 2px solid #E5E7EB;
      border-left: 1px solid #F3F4F6;
      background: #F8FAFC;
    }
    .pl-th-day.pl-weekend {
      background: #FFF7ED;
    }
    .pl-th-day.pl-today {
      background: #EFF6FF;
    }

    /* Body */
    .pl-td-person {
      position: sticky;
      left: 0;
      z-index: 10;
      background: #fff;
      border-bottom: 1px solid #F3F4F6;
      border-right: 2px solid #E5E7EB;
      width: 200px;
      min-width: 200px;
      padding: 10px 14px;
      vertical-align: top;
    }
    .pl-tr:hover .pl-td-person {
      background: #FAFAFA;
    }

    .pl-td-cell {
      height: 68px;
      vertical-align: top;
      padding: 4px;
      cursor: pointer;
      border-bottom: 1px solid #F3F4F6;
      border-left: 1px solid #F3F4F6;
      transition: background 0.12s;
      position: relative;
    }
    .pl-td-cell:hover {
      background: #EFF6FF !important;
    }
    .pl-td-cell:hover .pl-td-cell > div:last-child {
      opacity: 1 !important;
    }
    .pl-td-cell.pl-weekend {
      background: #FFFBF5;
    }
    .pl-td-cell.pl-today-col {
      background: #EFF6FF;
    }
    .pl-td-cell.pl-range-selected {
      background: #D1FAE5 !important;
      outline: 2px solid #34D399;
      outline-offset: -2px;
    }

    .pl-tr:hover .pl-td-cell {
      background: #FAFAFA;
    }
  `]
})
export class PlanificadorComponent {
  public dbService = inject(DbService);

  // ── View ──────────────────────────────────────────
  viewMode = signal<ViewMode>('month');
  currentYear = signal<number>(new Date().getFullYear());
  currentMonth = signal<number>(new Date().getMonth());   // 0-11
  currentWeekStart = signal<Date>(this.getWeekStart(new Date()));

  // ── Range selection ───────────────────────────────
  rangeMode = signal<boolean>(false);
  rangeStart = signal<string | null>(null);
  rangeTecnicoId = signal<string | null>(null);
  rangePreviewEnd = signal<string | null>(null);

  // ── Modal ─────────────────────────────────────────
  showFormModal = false;
  isEdit = false;
  isRangeEdit = false;
  rangeEndStr = '';
  selectedTecnico: Tecnico | null = null;
  form: PlanForm = {};

  setTipo(tipo: string) { this.form = { ...this.form, tipo }; }

  // ── Static Data ───────────────────────────────────
  readonly tiposList = ['Actividad', 'Servicio', 'Compensación', 'Vacaciones', 'Otro'];

  readonly legendItems = [
    { label: 'Actividad',    bg: '#DBEAFE', border: '#93C5FD' },
    { label: 'Servicio',     bg: '#DCFCE7', border: '#86EFAC' },
    { label: 'Compensación', bg: '#FEF3C7', border: '#FCD34D' },
    { label: 'Vacaciones',   bg: '#F3E8FF', border: '#D8B4FE' },
    { label: 'Otro',         bg: '#F1F5F9', border: '#CBD5E1' },
  ];

  private readonly personColors = [
    '#1A5FA8', '#059669', '#D97706', '#7C3AED', '#DC2626',
    '#0891B2', '#65A30D', '#DB2777', '#EA580C', '#4338CA'
  ];

  // ── Computed ──────────────────────────────────────
  visibleDays = computed(() => {
    if (this.viewMode() === 'week') {
      return this.getWeekDays(this.currentWeekStart());
    } else {
      return this.getMonthDays(this.currentYear(), this.currentMonth());
    }
  });

  periodLabel = computed(() => {
    if (this.viewMode() === 'week') {
      const days = this.getWeekDays(this.currentWeekStart());
      const first = days[0];
      const last = days[days.length - 1];
      const fmt = (d: Date) => `${d.getDate()} ${this.monthShort(d.getMonth())}`;
      return `${fmt(first)} – ${fmt(last)}, ${first.getFullYear()}`;
    }
    return `${this.monthName(this.currentMonth())} ${this.currentYear()}`;
  });

  // ── View Controls ─────────────────────────────────
  setView(v: ViewMode) {
    this.viewMode.set(v);
    if (v === 'week') {
      const d = new Date(this.currentYear(), this.currentMonth(), 1);
      this.currentWeekStart.set(this.getWeekStart(d));
    }
  }

  prev() {
    if (this.viewMode() === 'week') {
      const d = new Date(this.currentWeekStart());
      d.setDate(d.getDate() - 7);
      this.currentWeekStart.set(d);
      this.currentYear.set(d.getFullYear());
      this.currentMonth.set(d.getMonth());
    } else {
      if (this.currentMonth() === 0) {
        this.currentMonth.set(11);
        this.currentYear.update(y => y - 1);
      } else {
        this.currentMonth.update(m => m - 1);
      }
    }
  }

  next() {
    if (this.viewMode() === 'week') {
      const d = new Date(this.currentWeekStart());
      d.setDate(d.getDate() + 7);
      this.currentWeekStart.set(d);
      this.currentYear.set(d.getFullYear());
      this.currentMonth.set(d.getMonth());
    } else {
      if (this.currentMonth() === 11) {
        this.currentMonth.set(0);
        this.currentYear.update(y => y + 1);
      } else {
        this.currentMonth.update(m => m + 1);
      }
    }
  }

  goToToday() {
    const now = new Date();
    this.currentYear.set(now.getFullYear());
    this.currentMonth.set(now.getMonth());
    this.currentWeekStart.set(this.getWeekStart(now));
  }

  // ── Range Mode ────────────────────────────────────
  toggleRangeMode() {
    this.rangeMode.update(v => !v);
    this.clearRange();
  }

  clearRange() {
    this.rangeStart.set(null);
    this.rangeTecnicoId.set(null);
    this.rangePreviewEnd.set(null);
  }

  isInRangePreview(tecnicoId: string, d: Date): boolean {
    const start = this.rangeStart();
    const end = this.rangePreviewEnd();
    if (!start || !end || this.rangeTecnicoId() !== tecnicoId) return false;
    const ds = this.formatDate(d);
    const [s, e] = start < end ? [start, end] : [end, start];
    return ds >= s && ds <= e;
  }

  // ── Cell Click Logic ──────────────────────────────
  onCellClick(t: Tecnico, d: Date) {
    const dateStr = this.formatDate(d);

    if (this.rangeMode()) {
      const start = this.rangeStart();
      if (!start || this.rangeTecnicoId() !== t.id) {
        // First click or different technician → set start
        this.rangeStart.set(dateStr);
        this.rangeTecnicoId.set(t.id);
        this.rangePreviewEnd.set(dateStr);
        return;
      }
      // Second click → open range modal
      const [s, e] = dateStr < start ? [dateStr, start] : [start, dateStr];
      this.isRangeEdit = true;
      this.rangeEndStr = e;
      this.selectedTecnico = t;
      this.isEdit = false;
      this.form = {
        tecnico_id: t.id,
        fecha: s,
        tipo: 'Actividad',
        descripcion: '',
      };
      this.showFormModal = true;
      this.clearRange();
      return;
    }

    // Normal click
    const events = this.getEventsForDay(t.id, d);
    this.selectedTecnico = t;
    this.isRangeEdit = false;

    if (events.length > 0) {
      this.form = { ...events[0] };
      this.isEdit = true;
    } else {
      this.form = {
        id: this.genId(this.dbService.planificaciones(), 'PLAN'),
        tecnico_id: t.id,
        fecha: dateStr,
        tipo: 'Actividad',
        descripcion: '',
        creado: new Date().toISOString().slice(0, 10),
      };
      this.isEdit = false;
    }
    this.showFormModal = true;
  }

  onEventClick(e: MouseEvent, t: Tecnico, d: Date, ev: Planificacion) {
    e.stopPropagation();
    this.selectedTecnico = t;
    this.isRangeEdit = false;
    this.form = { ...ev };
    this.isEdit = true;
    this.showFormModal = true;
  }

  onOverlayClick(e: MouseEvent) {
    if (e.target === e.currentTarget) this.showFormModal = false;
  }

  // ── CRUD ──────────────────────────────────────────
  async save() {
    if (!this.form.tecnico_id || !this.form.fecha || !this.form.tipo) return;

    if (this.isRangeEdit) {
      // Generate one event per day in range
      const days = this.getDaysBetween(this.form.fecha!, this.rangeEndStr);
      for (const dateStr of days) {
        const item: Planificacion = {
          id: this.genId(this.dbService.planificaciones(), 'PLAN'),
          tecnico_id: this.form.tecnico_id,
          fecha: dateStr,
          tipo: this.form.tipo as any,
          descripcion: this.form.descripcion || '',
          creado: new Date().toISOString().slice(0, 10),
        };
        await this.dbService.upsert('planificaciones', item);
      }
    } else {
      const item: Planificacion = {
        id: this.form.id || this.genId(this.dbService.planificaciones(), 'PLAN'),
        tecnico_id: this.form.tecnico_id,
        fecha: this.form.fecha,
        tipo: this.form.tipo as any,
        descripcion: this.form.descripcion || '',
        creado: this.form.creado || new Date().toISOString().slice(0, 10),
      };
      await this.dbService.upsert('planificaciones', item);
    }
    this.showFormModal = false;
  }

  async deleteEvent() {
    if (this.form.id) {
      await this.dbService.remove('planificaciones', this.form.id);
      this.showFormModal = false;
    }
  }

  // ── Helpers ───────────────────────────────────────
  getEventsForDay(tecnicoId: string, d: Date): Planificacion[] {
    const ds = this.formatDate(d);
    return this.dbService.planificaciones().filter(p => p.tecnico_id === tecnicoId && p.fecha === ds);
  }

  countEventsByType(tecnicoId: string, tipo: string): number {
    return this.dbService.planificaciones().filter(p => p.tecnico_id === tecnicoId && p.tipo === tipo).length;
  }

  getTotalEventsForTecnico(tecnicoId: string): number {
    return this.dbService.planificaciones().filter(p => p.tecnico_id === tecnicoId).length;
  }

  // ── Date Utilities ────────────────────────────────
  formatDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  getMonthDays(year: number, month: number): Date[] {
    const days: Date[] = [];
    const d = new Date(year, month, 1);
    while (d.getMonth() === month) {
      days.push(new Date(d));
      d.setDate(d.getDate() + 1);
    }
    return days;
  }

  getWeekDays(start: Date): Date[] {
    const days: Date[] = [];
    const d = new Date(start);
    for (let i = 0; i < 7; i++) {
      days.push(new Date(d));
      d.setDate(d.getDate() + 1);
    }
    return days;
  }

  getWeekStart(d: Date): Date {
    const day = d.getDay(); // 0=Sun
    const diff = day === 0 ? -6 : 1 - day; // start on Monday
    const monday = new Date(d);
    monday.setDate(d.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    return monday;
  }

  getDaysBetween(startStr: string, endStr: string): string[] {
    const result: string[] = [];
    const [s, e] = startStr < endStr ? [startStr, endStr] : [endStr, startStr];
    const cur = new Date(s + 'T00:00:00');
    const end = new Date(e + 'T00:00:00');
    while (cur <= end) {
      result.push(this.formatDate(cur));
      cur.setDate(cur.getDate() + 1);
    }
    return result;
  }

  isWeekend(d: Date): boolean {
    const day = d.getDay();
    return day === 0 || day === 6;
  }

  isToday(d: Date): boolean {
    const now = new Date();
    return d.getDate() === now.getDate() &&
           d.getMonth() === now.getMonth() &&
           d.getFullYear() === now.getFullYear();
  }

  getDayLabel(d: Date): string {
    return ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][d.getDay()];
  }

  monthName(m: number): string {
    return ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
            'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'][m];
  }

  monthShort(m: number): string {
    return ['Ene','Feb','Mar','Abr','May','Jun',
            'Jul','Ago','Sep','Oct','Nov','Dic'][m];
  }

  // ── UI Helpers ────────────────────────────────────
  getInitials(name: string): string {
    return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  }

  getPersonColor(id: string): string {
    const idx = parseInt(id.replace(/\D/g, '')) % this.personColors.length;
    return this.personColors[idx];
  }

  getBg(tipo: string): string {
    const m: Record<string, string> = {
      'Actividad': '#DBEAFE', 'Servicio': '#DCFCE7',
      'Compensación': '#FEF3C7', 'Vacaciones': '#F3E8FF', 'Otro': '#F1F5F9'
    };
    return m[tipo] || '#F1F5F9';
  }

  getTxt(tipo: string): string {
    const m: Record<string, string> = {
      'Actividad': '#1E40AF', 'Servicio': '#166534',
      'Compensación': '#92400E', 'Vacaciones': '#6B21A8', 'Otro': '#475569'
    };
    return m[tipo] || '#475569';
  }

  getBorder(tipo: string): string {
    const m: Record<string, string> = {
      'Actividad': '#3B82F6', 'Servicio': '#22C55E',
      'Compensación': '#F59E0B', 'Vacaciones': '#A855F7', 'Otro': '#94A3B8'
    };
    return m[tipo] || '#94A3B8';
  }

  getTipoIcon(tipo: string): string {
    const m: Record<string, string> = {
      'Actividad': '🔧', 'Servicio': '⚙️',
      'Compensación': '💰', 'Vacaciones': '🏖️', 'Otro': '📋'
    };
    return m[tipo] || '📋';
  }

  genId(list: any[], pfx: string): string {
    const next = list.reduce((max, x) => {
      const n = parseInt((x.id || '').replace(pfx + '-', '')) || 0;
      return Math.max(max, n);
    }, 0) + 1;
    return `${pfx}-${String(next).padStart(4, '0')}`;
  }
}
