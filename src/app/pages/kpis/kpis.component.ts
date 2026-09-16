import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DbService, Servicio } from '../../services/db.service';

interface KpiRow extends Servicio {
  dias: number | null;
  hhOk: boolean;
  diOk: boolean;
  ubOk: boolean;
  delta: number | null;
}

@Component({
  selector: 'app-kpis',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div>
      <div class="head">
        <div>
          <h1>KPIs de gestión</h1>
          <div class="sub">Indicadores de la Unidad de Negocios de Servicios · medición mensual</div>
        </div>
        <button (click)="kFicha.set(!kFicha())">{{ kFicha() ? 'Ocultar ficha' : 'Ver ficha del indicador' }}</button>
      </div>

      <div class="bar">
        <label>Período de medición</label>
        <select [ngModel]="kPer()" (ngModelChange)="kPer.set($event)" style="width:auto; min-width:145px">
          <option value="">Todos los meses</option>
          <option *ngFor="let m of meses()" [value]="m.val">{{ m.lbl }}</option>
        </select>
        <span class="chip">{{ rows().length }} OT ejecutadas en el cálculo</span>
        <span class="right">{{ enMeta() }} de {{ medibles() }} indicadores en meta</span>
      </div>

      <div class="hint">
        El denominador son las OT ejecutadas. {{ noEjecutadas() }} orden(es) registrada(s) no está(n) finalizada(s) y queda(n) fuera del cálculo.
      </div>

      <div class="card" *ngIf="kFicha()" style="margin-bottom:16px;padding:4px 18px">
        <div *ngFor="let d of DEFS; let i = index" style="display:flex;gap:12px;padding:13px 0;" [style.border-bottom]="i < 2 ? '1px solid var(--line2)' : 'none'">
          <span style="width:25px;height:25px;border-radius:50%;background:var(--navy);color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;flex-shrink:0">{{ d.n }}</span>
          <div>
            <div style="font-size:13px;line-height:1.5">{{ d.obj }}</div>
            <div style="font-size:12px;color:var(--mut);margin-top:5px;font-family:ui-monospace,monospace;line-height:1.5">{{ d.f }}</div>
            <div style="font-size:12px;color:var(--mut2);margin-top:5px">Meta original {{ d.orig }}% · valor meta {{ d.meta }}% · mensual · responsable UNS</div>
          </div>
        </div>
      </div>

      <div class="grid g3">
        <!-- KPI 1 -->
        <div class="card">
          <div style="display:flex;gap:9px;margin-bottom:11px">
            <span style="width:21px;height:21px;border-radius:50%;background:#F1F5F9;color:var(--mut);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;flex-shrink:0">1</span>
            <span style="font-size:12px;color:var(--mut);font-weight:600;line-height:1.4">Cumplimiento de H.H programada vs ejecutada</span>
          </div>
          <ng-container *ngIf="k1() !== null; else noData">
            <div style="font-size:36px;font-weight:800;line-height:1;letter-spacing:-1px;" [style.color]="cColor(k1()!, DEFS[0])">{{ k1() }}%</div>
            <div style="font-size:12px;color:var(--mut);margin:6px 0 11px">{{ k1Ok() }} de {{ rows().length }} OT cumplen</div>
            <div class="tr" style="margin-bottom:9px">
              <div class="fi" [style.width.%]="k1()" [style.background]="cColor(k1()!, DEFS[0])"></div>
              <div class="mk" [style.left.%]="DEFS[0].meta" style="background:#475569"></div>
              <div class="mk" [style.left.%]="DEFS[0].orig" style="background:#94A3B8"></div>
            </div>
            <div style="font-size:11px;color:var(--mut2);margin-bottom:10px">Valor meta {{ DEFS[0].meta }}% · original {{ DEFS[0].orig }}%</div>
            <span class="p" [ngClass]="k1()! >= DEFS[0].meta ? 'p-g' : 'p-r'">
              {{ k1()! >= DEFS[0].meta ? 'Cumple · +' + (k1()! - DEFS[0].meta).toFixed(1) + ' pp' : 'Bajo meta · -' + (DEFS[0].meta - k1()!).toFixed(1) + ' pp' }}
            </span>
          </ng-container>
          <ng-template #noData>
            <div style="font-size:19px;color:var(--mut2);font-weight:700">Sin datos</div>
            <div style="font-size:12px;color:var(--mut2);margin:5px 0 11px">No hay datos suficientes</div>
            <span class="p p-n">Sin datos suficientes</span>
          </ng-template>
        </div>

        <!-- KPI 2 -->
        <div class="card">
          <div style="display:flex;gap:9px;margin-bottom:11px">
            <span style="width:21px;height:21px;border-radius:50%;background:#F1F5F9;color:var(--mut);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;flex-shrink:0">2</span>
            <span style="font-size:12px;color:var(--mut);font-weight:600;line-height:1.4">Cumplimiento de ejecución menor a 30 días</span>
          </div>
          <ng-container *ngIf="k2() !== null; else noData2">
            <div style="font-size:36px;font-weight:800;line-height:1;letter-spacing:-1px;" [style.color]="cColor(k2()!, DEFS[1])">{{ k2() }}%</div>
            <div style="font-size:12px;color:var(--mut);margin:6px 0 11px">{{ k2Ok() }} de {{ rows().length }} OT cumplen</div>
            <div class="tr" style="margin-bottom:9px">
              <div class="fi" [style.width.%]="k2()" [style.background]="cColor(k2()!, DEFS[1])"></div>
              <div class="mk" [style.left.%]="DEFS[1].meta" style="background:#475569"></div>
              <div class="mk" [style.left.%]="DEFS[1].orig" style="background:#94A3B8"></div>
            </div>
            <div style="font-size:11px;color:var(--mut2);margin-bottom:10px">Valor meta {{ DEFS[1].meta }}% · original {{ DEFS[1].orig }}%</div>
            <span class="p" [ngClass]="k2()! >= DEFS[1].meta ? 'p-g' : 'p-r'">
              {{ k2()! >= DEFS[1].meta ? 'Cumple · +' + (k2()! - DEFS[1].meta).toFixed(1) + ' pp' : 'Bajo meta · -' + (DEFS[1].meta - k2()!).toFixed(1) + ' pp' }}
            </span>
          </ng-container>
          <ng-template #noData2>
            <div style="font-size:19px;color:var(--mut2);font-weight:700">Sin datos</div>
            <div style="font-size:12px;color:var(--mut2);margin:5px 0 11px">No hay datos suficientes</div>
            <span class="p p-n">Sin datos suficientes</span>
          </ng-template>
        </div>

        <!-- KPI 3 -->
        <div class="card">
          <div style="display:flex;gap:9px;margin-bottom:11px">
            <span style="width:21px;height:21px;border-radius:50%;background:#F1F5F9;color:var(--mut);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;flex-shrink:0">3</span>
            <span style="font-size:12px;color:var(--mut);font-weight:600;line-height:1.4">Cumplimiento de UB proyectada vs ejecutada</span>
          </div>
          <ng-container *ngIf="k3() !== null; else noData3">
            <div style="font-size:36px;font-weight:800;line-height:1;letter-spacing:-1px;" [style.color]="cColor(k3()!, DEFS[2])">{{ k3() }}%</div>
            <div style="font-size:12px;color:var(--mut);margin:6px 0 11px">{{ k3Ok() }} de {{ k3Base() }} OT evaluables cumplen</div>
            <div class="tr" style="margin-bottom:9px">
              <div class="fi" [style.width.%]="k3()" [style.background]="cColor(k3()!, DEFS[2])"></div>
              <div class="mk" [style.left.%]="DEFS[2].meta" style="background:#475569"></div>
              <div class="mk" [style.left.%]="DEFS[2].orig" style="background:#94A3B8"></div>
            </div>
            <div style="font-size:11px;color:var(--mut2);margin-bottom:10px">Valor meta {{ DEFS[2].meta }}% · original {{ DEFS[2].orig }}%</div>
            <span class="p" [ngClass]="k3()! >= DEFS[2].meta ? 'p-g' : 'p-r'">
              {{ k3()! >= DEFS[2].meta ? 'Cumple · +' + (k3()! - DEFS[2].meta).toFixed(1) + ' pp' : 'Bajo meta · -' + (DEFS[2].meta - k3()!).toFixed(1) + ' pp' }}
            </span>
            <div *ngIf="rows().length - k3Base() > 0" style="font-size:11px;color:var(--mut2);margin-top:9px">{{ rows().length - k3Base() }} OT sin datos de UB</div>
          </ng-container>
          <ng-template #noData3>
            <div style="font-size:19px;color:var(--mut2);font-weight:700">Sin datos</div>
            <div style="font-size:12px;color:var(--mut2);margin:5px 0 11px">Falta cargar la UB proyectada</div>
            <span class="p p-n">Sin datos suficientes</span>
          </ng-template>
        </div>
      </div>

      <div class="flush">
        <div class="flush-h">
          <b>Detalle por orden de trabajo</b>
          <span class="mut" style="font-size:12px">{{ kPer() ? getMesTxt(kPer()) : 'todos los meses' }}</span>
        </div>
        <div class="scroll">
          <table>
            <thead>
              <tr>
                <th>OT</th>
                <th>Cliente</th>
                <th>Cierre</th>
                <th class="c">Días</th>
                <th class="c">KPI 2</th>
                <th class="c">H.H prog</th>
                <th class="c">H.H ejec</th>
                <th class="c">KPI 1</th>
                <th class="c">UB proy</th>
                <th class="c">UB real</th>
                <th class="c">Δ</th>
                <th class="c">KPI 3</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let x of rows()">
                <td class="id">{{ x.id }}</td>
                <td>{{ x.cliente }}</td>
                <td class="mut">{{ x.ff }}</td>
                <td class="c">{{ x.dias !== null ? x.dias + 'd' : '—' }}</td>
                <td class="c"><span class="dot" [ngClass]="x.dias === null ? 'd-n' : (x.diOk ? 'd-g' : 'd-r')">{{ x.dias === null ? '—' : (x.diOk ? '✓' : '✗') }}</span></td>
                <td class="c">{{ x.hhp !== null ? x.hhp + 'h' : '—' }}</td>
                <td class="c">{{ x.hhe !== null ? x.hhe + 'h' : '—' }}</td>
                <td class="c"><span class="dot" [ngClass]="(x.hhp === null || x.hhe === null) ? 'd-n' : (x.hhOk ? 'd-g' : 'd-r')">{{ (x.hhp === null || x.hhe === null) ? '—' : (x.hhOk ? '✓' : '✗') }}</span></td>
                <td class="c mut">{{ x.ubp === null ? '—' : x.ubp + '%' }}</td>
                <td class="c">{{ x.ubr === null ? '—' : x.ubr + '%' }}</td>
                <td class="c" [style.color]="x.delta === null ? 'var(--mut2)' : (x.delta >= 0 ? 'var(--green-d)' : 'var(--red-d)')" style="font-weight:700">
                  {{ x.delta === null ? '—' : (x.delta > 0 ? '+' : '') + x.delta + ' pp' }}
                </td>
                <td class="c"><span class="dot" [ngClass]="x.delta === null ? 'd-n' : (x.ubOk ? 'd-g' : 'd-r')">{{ x.delta === null ? '—' : (x.ubOk ? '✓' : '✗') }}</span></td>
              </tr>
              <tr *ngIf="rows().length === 0">
                <td colspan="12" class="empty">No hay OT ejecutadas en el período</td>
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

  kFicha = signal<boolean>(false);
  kPer = signal<string>('');

  DEFS = [
    {n:1, k:'hh', orig:95, meta:85, obj:'Garantizar que las horas hombre ejecutadas se ajusten a las horas hombre programadas en cada orden de trabajo.', f:'(N.° de OT ejecutadas dentro de las H.H programadas / N.° total de OT ejecutadas) x 100'},
    {n:2, k:'di', orig:95, meta:85, obj:'Ejecutar las órdenes de trabajo dentro de los 30 días posteriores a la recepción de la OV.', f:'(N.° de OT ejecutadas dentro de los 30 días / N.° total de OT ejecutadas) x 100'},
    {n:3, k:'ub', orig:90, meta:80, obj:'Ejecutar las órdenes de trabajo manteniendo la utilidad bruta real dentro o por encima de la UB proyectada.', f:'(N.° de OT ejecutadas dentro de la UB proyectada / N.° total de OT evaluadas) x 100'}
  ];

  meses = computed(() => {
    const s = new Set<string>();
    this.dbService.servicios().forEach(x => {
      if (x.estado === 'Finalizado' && x.ff) {
        s.add(x.ff.substring(0, 7));
      }
    });
    return Array.from(s).sort().reverse().map(m => ({ val: m, lbl: this.getMesTxt(m) }));
  });

  allEjecutadas = computed(() => this.dbService.servicios().filter(s => s.estado === 'Finalizado'));
  noEjecutadas = computed(() => this.dbService.servicios().length - this.allEjecutadas().length);

  rows = computed<KpiRow[]>(() => {
    let base = this.allEjecutadas();
    if (this.kPer()) {
      base = base.filter(s => s.ff && s.ff.startsWith(this.kPer()));
    }
    return base.map(s => {
      const d = this.dd(s.fp, s.ff);
      const hhOk = (s.hhp !== null && s.hhe !== null) ? s.hhe <= s.hhp : false;
      const diOk = d !== null && d <= 30;
      const ubOk = (s.ubp !== null && s.ubr !== null) ? s.ubr >= s.ubp : false;
      const delta = (s.ubp !== null && s.ubr !== null) ? Math.round((s.ubr - s.ubp) * 10) / 10 : null;

      return {
        ...s,
        dias: d,
        hhOk,
        diOk,
        ubOk,
        delta
      };
    });
  });

  // KPI 1 calculations
  k1Ok = computed(() => this.rows().filter(r => r.hhOk && r.hhp !== null && r.hhe !== null).length);
  k1 = computed(() => this.rows().length ? Math.round((this.k1Ok() / this.rows().length) * 1000) / 10 : null);

  // KPI 2 calculations
  k2Ok = computed(() => this.rows().filter(r => r.diOk && r.dias !== null).length);
  k2 = computed(() => this.rows().length ? Math.round((this.k2Ok() / this.rows().length) * 1000) / 10 : null);

  // KPI 3 calculations
  k3Base = computed(() => this.rows().filter(r => r.ubp !== null && r.ubr !== null).length);
  k3Ok = computed(() => this.rows().filter(r => r.ubOk && r.ubp !== null && r.ubr !== null).length);
  k3 = computed(() => this.k3Base() > 0 ? Math.round((this.k3Ok() / this.k3Base()) * 1000) / 10 : null);

  // Meta count
  medibles = computed(() => {
    let c = 0;
    if (this.k1() !== null) c++;
    if (this.k2() !== null) c++;
    if (this.k3() !== null) c++;
    return c;
  });
  
  enMeta = computed(() => {
    let c = 0;
    if (this.k1() !== null && this.k1()! >= this.DEFS[0].meta) c++;
    if (this.k2() !== null && this.k2()! >= this.DEFS[1].meta) c++;
    if (this.k3() !== null && this.k3()! >= this.DEFS[2].meta) c++;
    return c;
  });

  dd(a: string | undefined, b: string | undefined): number | null {
    if (!a || !b) return null;
    return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
  }

  getMesTxt(m: string): string {
    const M = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    const p = m.split('-');
    return M[+p[1] - 1] + ' ' + p[0];
  }

  cColor(pct: number, def: any): string {
    return pct >= def.orig ? '#008300' : pct >= def.meta ? '#639922' : pct >= def.meta - 10 ? '#eda100' : '#d03b3b';
  }
}
