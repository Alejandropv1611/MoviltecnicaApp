import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DbService, Servicio } from '../../services/db.service';

interface KpiRow {
  s: Servicio;
  d: number | null;
  hh: 'ok' | 'no' | 'nd';
  di: 'ok' | 'no' | 'nd';
  ub: 'ok' | 'no' | 'nd';
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
        <select [ngModel]="kPer()" (ngModelChange)="kPer.set($event)">
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
        <div class="card" *ngFor="let c of cards()">
          <div style="display:flex;gap:9px;margin-bottom:11px">
            <span style="width:21px;height:21px;border-radius:50%;background:#F1F5F9;color:var(--mut);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;flex-shrink:0">{{ c.n }}</span>
            <span style="font-size:12px;color:var(--mut);font-weight:600;line-height:1.4">{{ c.ind }}</span>
          </div>

          <ng-container *ngIf="c.pct !== null; else noData">
            <div style="font-size:36px;font-weight:800;line-height:1;letter-spacing:-1px;" [style.color]="c.color">{{ c.pct }}%</div>
            <div style="font-size:12px;color:var(--mut);margin:6px 0 11px">{{ c.ok }} de {{ c.b }} OT cumplen</div>
            <div class="tr" style="margin-bottom:9px">
              <div class="fi" [style.width.%]="c.pct" [style.background]="c.color"></div>
              <div class="mk" [style.left.%]="c.meta" style="background:#475569"></div>
              <div class="mk" [style.left.%]="c.orig" style="background:#94A3B8"></div>
            </div>
            <div style="font-size:11px;color:var(--mut2);margin-bottom:10px">Valor meta {{ c.meta }}% · original {{ c.orig }}%</div>
            <span class="p" [ngClass]="c.cum ? 'p-g' : 'p-r'">
              {{ c.cum ? 'Cumple · +' + c.br + ' pp' : 'Bajo meta · ' + c.br + ' pp' }}
            </span>
            <div *ngIf="c.nd > 0" style="font-size:11px;color:var(--mut2);margin-top:9px">{{ c.nd }} OT sin datos</div>
          </ng-container>

          <ng-template #noData>
            <div style="font-size:19px;color:var(--mut2);font-weight:700">Sin datos</div>
            <div style="font-size:12px;color:var(--mut2);margin:5px 0 11px">Falta cargar la UB proyectada</div>
            <div class="tr" style="margin-bottom:9px">
              <div class="fi" style="width:0%;background:#888780"></div>
              <div class="mk" [style.left.%]="c.meta" style="background:#475569"></div>
              <div class="mk" [style.left.%]="c.orig" style="background:#94A3B8"></div>
            </div>
            <div style="font-size:11px;color:var(--mut2);margin-bottom:10px">Valor meta {{ c.meta }}% · original {{ c.orig }}%</div>
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
                <td class="id">{{ x.s.id }}</td>
                <td>{{ x.s.cliente }}</td>
                <td class="mut">{{ x.s.ff }}</td>
                <td class="c">{{ x.d !== null ? x.d + 'd' : '—' }}</td>
                <td class="c">
                  <span class="dot" [ngClass]="x.di === 'ok' ? 'd-g' : (x.di === 'no' ? 'd-r' : 'd-n')">
                    {{ x.di === 'ok' ? '✓' : (x.di === 'no' ? '✗' : '—') }}
                  </span>
                </td>
                <td class="c">{{ x.s.hhp != null ? x.s.hhp + 'h' : '—' }}</td>
                <td class="c">{{ x.s.hhe != null ? x.s.hhe + 'h' : '—' }}</td>
                <td class="c">
                  <span class="dot" [ngClass]="x.hh === 'ok' ? 'd-g' : (x.hh === 'no' ? 'd-r' : 'd-n')">
                    {{ x.hh === 'ok' ? '✓' : (x.hh === 'no' ? '✗' : '—') }}
                  </span>
                </td>
                <td class="c mut">{{ x.s.ubp != null ? x.s.ubp + '%' : '—' }}</td>
                <td class="c">{{ x.s.ubr != null ? x.s.ubr + '%' : '—' }}</td>
                <td class="c" [style.color]="x.delta === null ? 'var(--mut2)' : (x.delta >= 0 ? 'var(--greenD)' : 'var(--redD)')" style="font-weight:700">
                  {{ x.delta === null ? '—' : (x.delta > 0 ? '+' : '') + x.delta + ' pp' }}
                </td>
                <td class="c">
                  <span class="dot" [ngClass]="x.ub === 'ok' ? 'd-g' : (x.ub === 'no' ? 'd-r' : 'd-n')">
                    {{ x.ub === 'ok' ? '✓' : (x.ub === 'no' ? '✗' : '—') }}
                  </span>
                </td>
              </tr>
              <tr *ngIf="rows().length === 0">
                <td colspan="12" class="empty">No hay OT ejecutadas en el período</td>
              </tr>
            </tbody>
          </table>
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
    .bar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; background: #fff; border: 1px solid var(--line); border-radius: 10px; padding: 11px 14px; margin-bottom: 14px; }
    .bar label { margin: 0; text-transform: none; letter-spacing: 0; font-size: 12px; font-weight: 600; color: var(--txt); }
    .bar select { width: auto; min-width: 145px; font-family: inherit; font-size: 13px; padding: 8px 11px; border-radius: 8px; border: 1px solid #CBD5E1; background: #fff; color: var(--txt); outline: none; }
    .chip { font-size: 12px; background: var(--blueL); color: var(--blueD); padding: 4px 11px; border-radius: 20px; font-weight: 600; }
    .right { margin-left: auto; font-size: 12px; color: var(--mut); }
    .hint { font-size: 12px; color: var(--mut); line-height: 1.6; margin-bottom: 16px; }
    .grid { display: grid; gap: 13px; margin-bottom: 16px; }
    .g3 { grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); }
    .card { background: #fff; border: 1px solid var(--line); border-radius: 12px; padding: 16px 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); }
    .tr { height: 7px; border-radius: 7px; background: var(--line); overflow: hidden; position: relative; }
    .fi { height: 100%; border-radius: 7px; transition: width .35s; }
    .mk { position: absolute; top: -3px; width: 2px; height: 13px; border-radius: 2px; }
    .dot { display: inline-flex; align-items: center; justify-content: center; width: 21px; height: 21px; border-radius: 50%; font-size: 11px; font-weight: 800; }
    .d-g { background: var(--greenL); color: var(--greenD); }
    .d-r { background: var(--redL); color: var(--redD); }
    .d-n { background: #F1EFE8; color: #888780; }
    .p { display: inline-block; font-size: 11px; padding: 3px 10px; border-radius: 20px; font-weight: 700; white-space: nowrap; }
    .p-g { background: var(--greenL); color: var(--greenD); }
    .p-r { background: var(--redL); color: var(--redD); }
    .p-n { background: #F1EFE8; color: #444441; }
    .flush { background: #fff; border: 1px solid var(--line); border-radius: 12px; overflow: hidden; }
    .flush-h { padding: 13px 16px; border-bottom: 1px solid var(--line); display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
    .flush-h b { font-size: 14px; color: var(--txt); }
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
  `]
})
export class KPIsComponent {
  private dbService = inject(DbService);

  kFicha = signal<boolean>(false);
  kPer = signal<string>('');

  DEFS = [
    {n: 1, ind: 'Cumplimiento de H.H programada vs ejecutada', k: 'hh', orig: 95, meta: 85, obj: 'Garantizar que las horas hombre ejecutadas se ajusten a las horas hombre programadas en cada orden de trabajo.', f: '(N.° de OT ejecutadas dentro de las H.H programadas / N.° total de OT ejecutadas) x 100'},
    {n: 2, ind: 'Cumplimiento de ejecución menor a 30 días', k: 'di', orig: 95, meta: 85, obj: 'Ejecutar las órdenes de trabajo dentro de los 30 días posteriores a la recepción de la OV.', f: '(N.° de OT ejecutadas dentro de los 30 días / N.° total de OT ejecutadas) x 100'},
    {n: 3, ind: 'Cumplimiento de UB proyectada vs ejecutada', k: 'ub', orig: 90, meta: 80, obj: 'Ejecutar las órdenes de trabajo manteniendo la utilidad bruta real dentro o por encima de la UB proyectada.', f: '(N.° de OT ejecutadas dentro de la UB proyectada / N.° total de OT ejecutadas) x 100'}
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

      // KPI 1: H.H programada vs ejecutada (hhe <= hhp)
      const hasHh = s.hhp != null && s.hhe != null && String(s.hhp).trim() !== '' && String(s.hhe).trim() !== '';
      const hhOk = hasHh ? (Number(s.hhe) <= Number(s.hhp) ? 'ok' : 'no') : 'nd';

      // KPI 2: Ejecución <= 30 días
      const diOk = d != null ? (d <= 30 ? 'ok' : 'no') : 'nd';

      // KPI 3: UB real >= UB proyectada
      const hasUb = s.ubp != null && s.ubr != null && String(s.ubp).trim() !== '' && String(s.ubr).trim() !== '';
      const ubOk = hasUb ? (Number(s.ubr) >= Number(s.ubp) ? 'ok' : 'no') : 'nd';

      const delta = hasUb ? Math.round((Number(s.ubr) - Number(s.ubp)) * 10) / 10 : null;

      return {
        s,
        d,
        hh: hhOk as 'ok' | 'no' | 'nd',
        di: diOk as 'ok' | 'no' | 'nd',
        ub: ubOk as 'ok' | 'no' | 'nd',
        delta
      };
    });
  });

  cards = computed(() => {
    const f = this.rows();
    return this.DEFS.map(d => {
      const ok = f.filter(x => x[d.k as 'hh' | 'di' | 'ub'] === 'ok').length;
      const no = f.filter(x => x[d.k as 'hh' | 'di' | 'ub'] === 'no').length;
      const nd = f.filter(x => x[d.k as 'hh' | 'di' | 'ub'] === 'nd').length;
      const b = ok + no;
      const pct = b > 0 ? Math.round((ok / b) * 1000) / 10 : null;
      const color = pct == null ? '#888780' : pct >= d.orig ? '#008300' : pct >= d.meta ? '#639922' : pct >= d.meta - 10 ? '#eda100' : '#d03b3b';
      const cum = pct != null && pct >= d.meta;
      const br = pct != null ? Math.round((pct - d.meta) * 10) / 10 : null;

      return {
        n: d.n,
        ind: d.ind,
        pct,
        ok,
        b,
        color,
        meta: d.meta,
        orig: d.orig,
        cum,
        br,
        nd
      };
    });
  });

  medibles = computed(() => this.cards().filter(c => c.pct !== null).length);
  enMeta = computed(() => this.cards().filter(c => c.cum).length);

  dd(a: string | undefined, b: string | undefined): number | null {
    if (!a || !b) return null;
    return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
  }

  getMesTxt(m: string): string {
    const M = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    const p = m.split('-');
    return M[+p[1] - 1] + ' ' + p[0];
  }
}
