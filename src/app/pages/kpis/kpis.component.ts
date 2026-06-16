import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DbService, Servicio } from '../../services/db.service';

interface KpiRow extends Servicio {
  dias: number | null;
  hhP: number | null;
  dOk: boolean;
  uOk: boolean;
  hOk: boolean;
}

@Component({
  selector: 'app-kpis',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div>
      <!-- Page Header -->
      <div class="m-page-header">
        <div>
          <h1 class="m-page-title">KPIs de gestión</h1>
          <p class="m-page-subtitle">Indicadores clave de desempeño operacional</p>
        </div>
      </div>

      <!-- Filters Row -->
      <div style="display: flex; gap: 10px; margin-bottom: 18px; flex-wrap: wrap; align-items: center;">
        <label style="font-size: 13px; font-weight: 600; color: var(--txt-m);">Filtrar por mes de finalización:</label>
        <select class="m-input" [ngModel]="selectedMonth()" (ngModelChange)="selectedMonth.set($event)" style="width: 200px;">
          <option value="">Todos los meses</option>
          <option *ngFor="let m of availableMonths()" [value]="m.value">{{ m.label }}</option>
        </select>
        <span style="margin-left: auto; font-size: 12px; color: var(--txt-m);">
          {{ rows().length }} {{ rows().length === 1 ? 'servicio' : 'servicios' }}
        </span>
      </div>

      <!-- KPI Widgets Grid -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 14px; margin-bottom: 18px;">
        <!-- KPI 1: Tiempo de ejecución -->
        <div class="m-card" style="text-align: center; display: flex; flex-direction: column; justify-content: space-between; align-items: center; padding: 20px;">
          <div style="font-size: 11px; font-weight: 700; color: var(--txt-m); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px;">
            Tiempo de ejecución ≤30 días
          </div>
          <div style="font-size: 38px; font-weight: 800; line-height: 1; margin-bottom: 4px;" 
               [style.color]="ptD() >= 95 ? 'var(--green)' : (ptD() >= 95 * 0.9 ? 'var(--amber)' : 'var(--red)')">
            {{ ptD() }}%
          </div>
          <div style="font-size: 11px; color: var(--txt-m); margin-bottom: 8px;">Meta: &ge;95%</div>
          <div style="width: 100%; height: 7px; border-radius: 7px; background: var(--border); overflow: hidden; margin-bottom: 7px;">
            <div style="height: 100%;" [style.width.%]="ptD()" [style.background]="ptD() >= 95 ? 'var(--green)' : (ptD() >= 85 ? 'var(--amber)' : 'var(--red)')"></div>
          </div>
          <div style="font-size: 11px; color: var(--txt-m); margin-top: 7px; margin-bottom: 6px;">
            {{ timeDOkCount() }} de {{ rows().length }} servicios cumplen
          </div>
          <span class="m-pill" 
                [style.background]="ptD() >= 95 ? 'var(--green-l)' : 'var(--red-l)'"
                [style.color]="ptD() >= 95 ? 'var(--green-d)' : 'var(--red-d)'">
            {{ ptD() >= 95 ? '✓ Cumpliendo meta' : '⚠ ' + (95 - ptD()) + 'pp bajo meta' }}
          </span>
        </div>

        <!-- KPI 2: Margen de Utilidad (UB Real) -->
        <div class="m-card" style="text-align: center; display: flex; flex-direction: column; justify-content: space-between; align-items: center; padding: 20px;">
          <div style="font-size: 11px; font-weight: 700; color: var(--txt-m); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px;">
            UB Real ≥36%
          </div>
          <div style="font-size: 38px; font-weight: 800; line-height: 1; margin-bottom: 4px;" 
               [style.color]="ubAvg() >= 36 ? 'var(--green)' : (ubAvg() >= 36 * 0.9 ? 'var(--amber)' : 'var(--red)')">
            {{ ubAvg() }}%
          </div>
          <div style="font-size: 11px; color: var(--txt-m); margin-bottom: 8px;">Meta: &ge;36%</div>
          <div style="width: 100%; height: 7px; border-radius: 7px; background: var(--border); overflow: hidden; margin-bottom: 7px;">
            <div style="height: 100%;" [style.width.%]="ubAvg()" [style.background]="ubAvg() >= 36 ? 'var(--green)' : (ubAvg() >= 32 ? 'var(--amber)' : 'var(--red)')"></div>
          </div>
          <div style="font-size: 11px; color: var(--txt-m); margin-top: 7px; margin-bottom: 6px;">
            Promedio actual: {{ ubAvg() }}%
          </div>
          <span class="m-pill" 
                [style.background]="ubAvg() >= 36 ? 'var(--green-l)' : 'var(--red-l)'"
                [style.color]="ubAvg() >= 36 ? 'var(--green-d)' : 'var(--red-d)'">
            {{ ubAvg() >= 36 ? '✓ Cumpliendo meta' : '⚠ ' + diffUB() + 'pp bajo meta' }}
          </span>
        </div>

        <!-- KPI 3: Horas Hombre Ejecutadas -->
        <div class="m-card" style="text-align: center; display: flex; flex-direction: column; justify-content: space-between; align-items: center; padding: 20px;">
          <div style="font-size: 11px; font-weight: 700; color: var(--txt-m); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px;">
            H.H ejecutadas ≥95%
          </div>
          <div style="font-size: 38px; font-weight: 800; line-height: 1; margin-bottom: 4px;" 
               [style.color]="hhT() >= 95 ? 'var(--green)' : (hhT() >= 95 * 0.9 ? 'var(--amber)' : 'var(--red)')">
            {{ hhT() }}%
          </div>
          <div style="font-size: 11px; color: var(--txt-m); margin-bottom: 8px;">Meta: &ge;95%</div>
          <div style="width: 100%; height: 7px; border-radius: 7px; background: var(--border); overflow: hidden; margin-bottom: 7px;">
            <div style="height: 100%;" [style.width.%]="hhT()" [style.background]="hhT() >= 95 ? 'var(--green)' : (hhT() >= 85 ? 'var(--amber)' : 'var(--red)')"></div>
          </div>
          <div style="font-size: 11px; color: var(--txt-m); margin-top: 7px; margin-bottom: 6px;">
            {{ hhEx() }}h de {{ hhPg() }}h
          </div>
          <span class="m-pill" 
                [style.background]="hhT() >= 95 ? 'var(--green-l)' : 'var(--red-l)'"
                [style.color]="hhT() >= 95 ? 'var(--green-d)' : 'var(--red-d)'">
            {{ hhT() >= 95 ? '✓ Cumpliendo meta' : '⚠ ' + (95 - hhT()) + 'pp bajo meta' }}
          </span>
        </div>
      </div>

      <!-- Detail Table -->
      <div class="m-card-flat">
        <div style="padding: 11px 14px; border-bottom: 0.5px solid var(--border);">
          <span style="font-size: 13px; font-weight: 700;">Detalle por servicio</span>
        </div>
        <div class="m-table-container">
          <table class="m-table">
            <thead>
              <tr>
                <th class="m-th">OV</th>
                <th class="m-th">Cliente</th>
                <th class="m-th">Tipo</th>
                <th class="m-th">Estado</th>
                <th class="m-th">Días</th>
                <th class="m-th">≤30d</th>
                <th class="m-th">UB Real</th>
                <th class="m-th">≥36%UB</th>
                <th class="m-th">HH Prog</th>
                <th class="m-th">HH Ejec</th>
                <th class="m-th">%HH</th>
                <th class="m-th">≥95%HH</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let x of rows()" class="m-tr">
                <td class="m-td"><strong style="color: var(--blue);">{{ x.id }}</strong></td>
                <td class="m-td">{{ x.cliente }}</td>
                <td class="m-td">
                  <span class="m-pill" [style.background]="getTipoColor(x.tipo) + '22'" [style.color]="getTipoColor(x.tipo)">
                    {{ x.tipo }}
                  </span>
                </td>
                <td class="m-td">
                  <span class="m-pill" [style.background]="getEstadoStyle(x.estado).bg" [style.color]="getEstadoStyle(x.estado).fg">
                    {{ x.estado }}
                  </span>
                </td>
                <td class="m-td">{{ x.dias !== null ? x.dias + 'd' : '—' }}</td>
                <td class="m-td">
                  <span *ngIf="x.dias !== null" class="m-pill" 
                        [style.background]="x.dOk ? 'var(--green-l)' : 'var(--red-l)'" 
                        [style.color]="x.dOk ? 'var(--green-d)' : 'var(--red-d)'">
                    {{ x.dOk ? '✓' : '✗' }}
                  </span>
                  <span *ngIf="x.dias === null">—</span>
                </td>
                <td class="m-td">
                  <span *ngIf="x.ubr !== null">{{ x.ubr }}%</span>
                  <span *ngIf="x.ubr === null" style="color: var(--txt-m);">Pdte.</span>
                </td>
                <td class="m-td">
                  <span *ngIf="x.ubr !== null" class="m-pill" 
                        [style.background]="x.uOk ? 'var(--green-l)' : 'var(--red-l)'" 
                        [style.color]="x.uOk ? 'var(--green-d)' : 'var(--red-d)'">
                    {{ x.uOk ? '✓' : '✗' }}
                  </span>
                  <span *ngIf="x.ubr === null">—</span>
                </td>
                <td class="m-td">{{ x.hhp }}h</td>
                <td class="m-td">{{ x.hhe }}h</td>
                <td class="m-td">
                  <span *ngIf="x.hhP !== null" style="font-weight: 600;" 
                        [style.color]="x.hOk ? 'var(--green)' : 'var(--amber)'">
                    {{ x.hhP }}%
                  </span>
                  <span *ngIf="x.hhP === null">—</span>
                </td>
                <td class="m-td">
                  <span *ngIf="x.hhP !== null" class="m-pill" 
                        [style.background]="x.hOk ? 'var(--green-l)' : 'var(--red-l)'" 
                        [style.color]="x.hOk ? 'var(--green-d)' : 'var(--red-d)'">
                    {{ x.hOk ? '✓' : '✗' }}
                  </span>
                  <span *ngIf="x.hhP === null">—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `
})
export class KPIsComponent {
  private dbService = inject(DbService);

  selectedMonth = signal<string>('');

  // Get readable month label (e.g. "Mayo 2026")
  getMonthLabel(monthKey: string): string {
    const [year, month] = monthKey.split('-');
    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    const idx = parseInt(month, 10) - 1;
    return `${monthNames[idx]} ${year}`;
  }

  // Get unique months from completed services
  availableMonths = computed(() => {
    const months = new Set<string>();
    this.dbService.servicios().forEach(x => {
      if (x.estado === 'Finalizado' && x.ff) {
        const ym = x.ff.substring(0, 7);
        if (ym && ym.length === 7) {
          months.add(ym);
        }
      }
    });
    return Array.from(months)
      .sort()
      .reverse()
      .map(ym => ({
        value: ym,
        label: this.getMonthLabel(ym)
      }));
  });

  // Compute calculated fields for all rows
  rows = computed<KpiRow[]>(() => {
    const all = this.dbService.servicios().map(x => {
      const d = this.dd(x.fp, x.ff);
      const hp = x.hhp > 0 ? Math.round((x.hhe / x.hhp) * 100) : null;
      return {
        ...x,
        dias: d,
        hhP: hp,
        dOk: d !== null && d <= 30,
        uOk: x.ubr !== null && x.ubr !== undefined && x.ubr >= 36,
        hOk: hp !== null && hp >= 95
      };
    });

    const monthFilter = this.selectedMonth();
    if (!monthFilter) {
      return all;
    }

    return all.filter(x => x.estado === 'Finalizado' && x.ff && x.ff.startsWith(monthFilter));
  });

  // Aggregated KPI Stats
  hhPg = computed(() => this.rows().reduce((s, x) => s + (x.hhp || 0), 0));
  hhEx = computed(() => this.rows().reduce((s, x) => s + (x.hhe || 0), 0));
  hhT = computed(() => this.hhPg() ? Math.round((this.hhEx() / this.hhPg()) * 100) : 0);

  ubAvg = computed(() => {
    const list = this.rows().filter(x => x.ubr !== null);
    if (!list.length) return 0;
    const sum = list.reduce((s, x) => s + (x.ubr || 0), 0);
    return Math.round((sum / list.length) * 10) / 10;
  });

  diffUB = computed(() => Math.round((36 - this.ubAvg()) * 10) / 10);

  timeDOkCount = computed(() => this.rows().filter(r => r.dOk).length);
  ptD = computed(() => {
    const total = this.rows().length;
    return total ? Math.round((this.timeDOkCount() / total) * 100) : 0;
  });

  // Utilities
  dd(a: string | undefined, b: string | undefined): number | null {
    if (!a || !b) return null;
    return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
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
}
