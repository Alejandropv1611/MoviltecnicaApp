import { Component, computed, signal, inject, ElementRef, ViewChild, effect, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DbService } from '../../services/db.service';
import { AuthService } from '../../services/auth.service';
import { Chart } from 'chart.js/auto';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="wrap">
      <div class="head">
        <div>
          <h1>Resumen ejecutivo</h1>
          <div class="sub">{{ servs().length }} órdenes · {{ dbTe().length }} técnicos · {{ dbCl().length }} clientes</div>
        </div>
        <div style="display:flex;gap:7px">
          <button (click)="togHist()" [class.pri]="verHist()">{{ verHist() ? 'Histórico demo activo' : 'Ver histórico demo' }}</button>
          <button (click)="cur.set('PEN')" [class.pri]="cur() === 'PEN'">S/ soles</button>
          <button (click)="cur.set('USD')" [class.pri]="cur() === 'USD'">US$ dólares</button>
        </div>
      </div>

      <div *ngIf="verHist()" class="note n-o">Estás viendo <b>enero a mayo de 2026 con datos de ejemplo</b>, generados para mostrar cómo se ven los evolutivos. Solo junio es data real de Movitécnica. Apaga el interruptor antes de presentar cifras.</div>

      <div class="note n-b">En el período se registraron {{ servs().length }} órdenes por {{ S(val()) }}, con un margen bruto de {{ S(mar()) }} ({{ ub() }}%). {{ riesgo() ? riesgo() + ' en riesgo.' : 'Ninguna orden en riesgo.' }} La atención está en habilitación: 1 requisito vencido y 8 por vencer en 30 días comprometen la cobertura.</div>

      <div class="grid g3">
        <div class="met"><div class="l">Facturación del período</div><div class="v">{{ S(val()) }}</div><div class="s">{{ cur() === 'PEN' ? 'Equivale a US$ ' + num((val()/TC)) : 'Equivale a S/ ' + num(val()*TC) }}</div></div>
        <div class="met"><div class="l">Margen bruto generado</div><div class="v" style="color:var(--green)">{{ S(mar()) }}</div><div class="s">{{ ub() }}% sobre venta</div></div>
        <div class="met"><div class="l">Ticket promedio por OV</div><div class="v">{{ S(val() / (servs().length || 1)) }}</div><div class="s">{{ servs().length }} órdenes registradas</div></div>
      </div>

      <div class="grid g3">
        <ng-container *ngFor="let k of kpis()">
          <div class="card">
            <div style="font-size:11px;font-weight:700;color:var(--mut);text-transform:uppercase;letter-spacing:.4px;margin-bottom:9px">{{ k.name }}</div>
            <div *ngIf="k.pct == null" style="font-size:19px;color:var(--mut2);font-weight:700">Sin datos</div>
            <div *ngIf="k.pct != null" style="font-size:31px;font-weight:800;line-height:1;" [style.color]="k.color">{{ k.pct }}%</div>
            <div class="tr" style="margin:11px 0 8px">
              <div class="fi" [style.width]="(k.pct || 0) + '%'" [style.background]="k.color"></div>
              <div class="mk" [style.left]="k.meta + '%'" style="background:#475569"></div>
              <div class="mk" [style.left]="k.orig + '%'" style="background:#94A3B8"></div>
            </div>
            <div style="font-size:11px;color:var(--mut2)">Valor meta {{ k.meta }}% · original {{ k.orig }}%</div>
          </div>
        </ng-container>
      </div>

      <div class="grid g2">
        <div class="card">
          <div style="font-size:14px;font-weight:700;margin-bottom:2px">Facturación y margen por mes</div>
          <div class="mut" style="font-size:12px;margin-bottom:12px">Barras = facturación · línea = % de utilidad bruta</div>
          <div style="position:relative;height:255px"><canvas #chFac></canvas></div>
        </div>
        <div class="card">
          <div style="font-size:14px;font-weight:700;margin-bottom:2px">Evolución de los tres KPI</div>
          <div class="mut" style="font-size:12px;margin-bottom:12px">Línea punteada = valor meta de cada indicador</div>
          <div style="position:relative;height:255px"><canvas #chKpi></canvas></div>
        </div>
      </div>
      
      <div class="grid g2">
        <div class="card">
          <div style="font-size:14px;font-weight:700;margin-bottom:2px">H.H programadas vs ejecutadas por mes</div>
          <div class="mut" style="font-size:12px;margin-bottom:12px">Ámbar = el mes cerró por encima de lo programado</div>
          <div style="position:relative;height:240px"><canvas #chHh></canvas></div>
        </div>
        <div class="card">
          <div style="font-size:14px;font-weight:700;margin-bottom:2px">Órdenes por mes y tipo</div>
          <div class="mut" style="font-size:12px;margin-bottom:12px">Volumen y composición de la cartera</div>
          <div style="position:relative;height:240px"><canvas #chVol></canvas></div>
        </div>
      </div>

      <div class="grid g2">
        <div class="card">
          <div style="font-size:14px;font-weight:700;margin-bottom:2px">Facturación por cliente</div>
          <div class="mut" style="font-size:12px;margin-bottom:12px">Acumulado del período mostrado</div>
          <div style="position:relative;height:235px"><canvas #chCli></canvas></div>
        </div>
        <div class="flush">
          <div class="flush-h"><b>Cobertura de habilitación por cliente</b></div>
          <div style="padding:4px 16px;max-height:235px;overflow-y:auto">
            <div *ngFor="let c of cobertura()" class="cov">
              <div class="cov-t">
                <span style="font-size:13px;font-weight:600">{{ c.name }}</span>
                <span style="font-size:13px;font-weight:700;" [style.color]="c.col">{{ c.ok }} de {{ c.tot }} · {{ c.pct }}%</span>
              </div>
              <div class="cov-b">
                <div *ngIf="c.ok" [style.width]="(c.ok/c.tot*100)+'%'" style="background:#3B6D11"></div>
                <div *ngIf="c.warn" [style.width]="(c.warn/c.tot*100)+'%'" style="background:#EF9F27"></div>
                <div *ngIf="c.bad" [style.width]="(c.bad/c.tot*100)+'%'" style="background:#C0392B"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .wrap { padding:10px 0px; max-width:1420px; margin:0 auto; background: var(--bg, #F1F5F9); color: var(--txt, #1E293B); font-family: 'DM Sans', sans-serif; }
    h1 { font-size:22px; font-weight:800; letter-spacing:-.3px; margin: 0; }
    .sub { font-size:13px; color:var(--mut, #64748B); margin-top:3px; }
    .head { display:flex; align-items:flex-start; justify-content:space-between; gap:16px; flex-wrap:wrap; margin-bottom:18px; }
    button { font-family:inherit; cursor:pointer; font-size:13px; padding:8px 14px; border-radius:8px; border:1px solid var(--line, #E2E8F0); background:#fff; color:var(--txt, #1E293B); transition:.12s; }
    button:hover { background:#F8FAFC; }
    .pri { background:var(--blue, #1A5FA8); color:#fff; border-color:var(--blue, #1A5FA8); }
    .pri:hover { background:var(--blueD, #0B3D72); }
    .grid { display:grid; gap:13px; margin-bottom:16px; }
    .g2 { grid-template-columns:repeat(auto-fit,minmax(280px,1fr)); }
    .g3 { grid-template-columns:repeat(auto-fit,minmax(230px,1fr)); }
    .card { background:#fff; border:1px solid var(--line, #E2E8F0); border-radius:12px; padding:16px 18px; }
    .flush { background:#fff; border:1px solid var(--line, #E2E8F0); border-radius:12px; overflow:hidden; }
    .flush-h { padding:13px 16px; border-bottom:1px solid var(--line, #E2E8F0); display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap; }
    .flush-h b { font-size:14px; }
    .met { background:#fff; border:1px solid var(--line, #E2E8F0); border-radius:12px; padding:14px 16px; }
    .met .l { font-size:11px; font-weight:700; color:var(--mut, #64748B); text-transform:uppercase; letter-spacing:.4px; margin-bottom:6px; }
    .met .v { font-size:25px; font-weight:800; line-height:1; letter-spacing:-.6px; }
    .met .s { font-size:11px; color:var(--mut2, #94A3B8); margin-top:5px; }
    .tr { height:7px; border-radius:7px; background:var(--line, #E2E8F0); overflow:hidden; position:relative; }
    .fi { height:100%; border-radius:7px; transition:width .35s; }
    .mk { position:absolute; top:-3px; width:2px; height:13px; border-radius:2px; }
    .note { padding:11px 14px; border-radius:9px; font-size:13px; line-height:1.6; margin-bottom:14px; }
    .n-o { background:var(--orangeL, #FAEEDA); color:var(--orangeD, #854F0B); }
    .n-b { background:var(--blueL, #E8F1FB); color:var(--blueD, #0B3D72); }
    .mut { color: var(--mut, #64748B); }
    .cov { padding:11px 0; border-bottom:1px solid var(--line2, #F1F5F9); }
    .cov:last-child { border-bottom:none; }
    .cov-t { display:flex; justify-content:space-between; align-items:baseline; gap:10px; margin-bottom:7px; }
    .cov-b { display:flex; height:9px; border-radius:5px; overflow:hidden; gap:2px; background:var(--line, #E2E8F0); }
  `]
})
export class DashboardComponent implements AfterViewInit {
  private dbService = inject(DbService);
  public authService = inject(AuthService);

  @ViewChild('chFac') chFac!: ElementRef;
  @ViewChild('chKpi') chKpi!: ElementRef;
  @ViewChild('chHh') chHh!: ElementRef;
  @ViewChild('chVol') chVol!: ElementRef;
  @ViewChild('chCli') chCli!: ElementRef;

  charts: { [key: string]: Chart } = {};

  verHist = signal(false);
  cur = signal('PEN');
  TC = 3.37;

  dbTe = computed(() => this.dbService.tecnicos());
  dbCl = computed(() => this.dbService.clientes());

  // Generamos el histórico para demo
  hist = this.genHist();
  
  servs = computed(() => {
    let reales = this.dbService.servicios();
    reales = reales.map(r => ({ ...r, hhe: r.hhe || 0, hhp: r.hhp || 0, valor: r.valor || 0, costo: r.costo || 0 }));
    if (this.verHist()) {
      return [...this.hist, ...reales];
    }
    return reales;
  });

  ejecutadas = computed(() => this.servs().filter(s => s.estado === 'Finalizado' || (s as any)['est'] === 'Finalizado'));

  val = computed(() => this.servs().reduce((a, s) => a + (s.valor || (s as any)['val'] || 0), 0));
  cos = computed(() => this.servs().reduce((a, s) => a + (s.costo || (s as any)['cos'] || 0), 0));
  mar = computed(() => this.val() - this.cos());
  ub = computed(() => this.val() > 0 ? Math.round((this.mar() / this.val()) * 1000) / 10 : 0);
  riesgo = computed(() => this.servs().filter(s => s.estado === 'En riesgo' || (s as any)['est'] === 'En riesgo').length);

  kpis = computed(() => {
    let ej = this.ejecutadas();
    let n = ej.length;
    let hhOk = ej.filter(s => (s.hhe || (s as any)['hhe'] || 0) <= (s.hhp || (s as any)['hhp'] || 0)).length;
    let diOk = ej.filter(s => this.dias(s.fp || (s as any)['fp'], s.ff || (s as any)['ff']) <= 30).length;
    let ubB = ej.filter(s => (s.ubp || (s as any)['ubp']) != null && (s.ubr || (s as any)['ubr']) != null);
    let ubOk = ubB.filter(s => (s.ubr || (s as any)['ubr']) >= (s.ubp || (s as any)['ubp'])).length;

    let k1 = n ? Math.round(hhOk / n * 1000) / 10 : null;
    let k2 = n ? Math.round(diOk / n * 1000) / 10 : null;
    let k3 = ubB.length ? Math.round(ubOk / ubB.length * 1000) / 10 : null;

    let getColor = (pct: number | null, meta: number, orig: number) => {
      if (pct == null) return '#888780';
      if (pct >= orig) return '#008300';
      if (pct >= meta) return '#639922';
      if (pct >= meta - 10) return '#eda100';
      return '#d03b3b';
    };

    return [
      { name: 'H.H dentro de lo programado', pct: k1, meta: 85, orig: 95, color: getColor(k1, 85, 95) },
      { name: 'Ejecución menor a 30 días', pct: k2, meta: 85, orig: 95, color: getColor(k2, 85, 95) },
      { name: 'UB real dentro de la proyectada', pct: k3, meta: 80, orig: 90, color: getColor(k3, 80, 90) }
    ];
  });

  cobertura = computed(() => {
    let mapa: any = {};
    let tecs = this.dbTe();
    if (!tecs.length) {
      let mockT = [
        { cl: { 'Nestlé SA':100,'Antamina':100,'Machu Picchu Foods':100,'Cementos Pacasmayo':100 } },
        { cl: { 'Nestlé SA':100,'Machu Picchu Foods':100 } },
        { cl: { 'Antamina':50,'Machu Picchu Foods':100 } },
        { cl: { 'Nestlé SA':100,'UNICON':100,'Cementos Pacasmayo':100 } },
        { cl: { 'Nexa El Porvenir':100,'Owens Illinois':100 } },
        { cl: { 'Nestlé SA':0 } }
      ];
      mockT.forEach(t => {
        Object.keys(t.cl).forEach(c => {
          if (!mapa[c]) mapa[c] = { ok: 0, warn: 0, bad: 0 };
          let p = (t.cl as any)[c];
          if (p >= 100) mapa[c].ok++; else if (p >= 50) mapa[c].warn++; else mapa[c].bad++;
        });
      });
    } else {
      tecs.forEach(t => {
        (t.clientes || []).forEach(c => {
          if (!mapa[c.nombre]) mapa[c.nombre] = { ok: 0, warn: 0, bad: 0 };
          let vig = c.reqs?.filter(r => r.estado === 'vigente').length || 0;
          let tot = c.reqs?.length || 1;
          let p = Math.round((vig / tot) * 100);
          if (p >= 100) mapa[c.nombre].ok++; else if (p >= 50) mapa[c.nombre].warn++; else mapa[c.nombre].bad++;
        });
      });
    }

    return Object.keys(mapa).map(c => {
      let m = mapa[c], tot = m.ok + m.warn + m.bad, pct = Math.round(m.ok / tot * 100);
      let col = pct === 100 ? '#27500A' : pct >= 60 ? '#854F0B' : '#791F1F';
      return { name: c, ok: m.ok, warn: m.warn, bad: m.bad, tot, pct, col };
    }).sort((a,b) => a.name.localeCompare(b.name));
  });

  constructor() {
    effect(() => {
      const currentServs = this.servs();
      const currentCur = this.cur();
      if (this.chFac) {
        setTimeout(() => this.pintarGraficos(), 50);
      }
    });
  }

  ngAfterViewInit() {
    this.pintarGraficos();
  }

  togHist() {
    this.verHist.set(!this.verHist());
  }

  dias(a: string, b: string): number {
    if (!a || !b) return 0;
    return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
  }

  num(n: number) {
    return n.toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  S(val: number) {
    let v = this.cur() === 'PEN' ? val : val / this.TC;
    return (this.cur() === 'PEN' ? 'S/ ' : 'US$ ') + this.num(v);
  }

  porMes() {
    let g: any = {};
    const ej = this.ejecutadas();
    ej.forEach((s: any) => {
      let ff = s.ff || s['ff'] || '';
      let k = ff.slice(0, 7) || '2026-06';
      if (!g[k]) g[k] = { k: k, ot: [], val: 0, cos: 0, hhp: 0, hhe: 0 };
      g[k].ot.push(s); g[k].val += (s.valor || s['val'] || 0); g[k].cos += (s.costo || s['cos'] || 0); 
      g[k].hhp += (s.hhp || s['hhp'] || 0); g[k].hhe += (s.hhe || s['hhe'] || 0);
    });
    const MESES_C = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return Object.keys(g).sort().map(k => {
      let m = g[k], n = m.ot.length;
      let hhOk = m.ot.filter((s:any) => (s.hhe || s['hhe'] || 0) <= (s.hhp || s['hhp'] || 0)).length;
      let diOk = m.ot.filter((s:any) => this.dias(s.fp || s['fp'], s.ff || s['ff']) <= 30).length;
      let ubB = m.ot.filter((s:any) => (s.ubp || s['ubp']) != null && (s.ubr || s['ubr']) != null);
      let ubOk = ubB.filter((s:any) => (s.ubr || s['ubr']) >= (s.ubp || s['ubp'])).length;
      let p = k.split('-');
      let monthIndex = parseInt(p[1], 10) - 1;
      let lbl = p.length > 1 ? MESES_C[monthIndex] + ' ' + p[0].slice(2) : k;
      
      return {
        k, lbl, n, val: m.val, cos: m.cos, mar: m.val - m.cos,
        ubPct: m.val > 0 ? Math.round((m.val - m.cos) / m.val * 1000) / 10 : 0,
        hhp: Math.round(m.hhp), hhe: Math.round(m.hhe),
        k1: n ? Math.round(hhOk / n * 1000) / 10 : null,
        k2: n ? Math.round(diOk / n * 1000) / 10 : null,
        k3: ubB.length ? Math.round(ubOk / ubB.length * 1000) / 10 : null,
        prev: m.ot.filter((s:any) => (s.tipo || s['tipo']) === 'Preventivo').length,
        corr: m.ot.filter((s:any) => (s.tipo || s['tipo']) === 'Correctivo').length,
        emer: m.ot.filter((s:any) => (s.tipo || s['tipo']) === 'Emergencia').length
      };
    });
  }

  mk(id: string, ref: ElementRef, tipo: any, data: any, opts: any) {
    if (!ref || !ref.nativeElement) return;
    if (this.charts[id]) {
      this.charts[id].destroy();
    }
    this.charts[id] = new Chart(ref.nativeElement, {
      type: tipo,
      data: data,
      options: Object.assign({ responsive: true, maintainAspectRatio: false }, opts)
    });
  }

  pintarGraficos() {
    if (!this.chFac) return;

    let M = this.porMes();
    let simb = this.cur() === 'PEN' ? 'S/ ' : 'US$ ';
    let conv = (v: number) => this.cur() === 'PEN' ? v : v / this.TC;
    let lbl = M.map(m => m.lbl);

    let EJE = { grid: { color: 'rgba(0,0,0,.06)' }, ticks: { font: { size: 10 }, color: '#64748B' } };
    let EJE_X = { grid: { display: false }, ticks: { font: { size: 10 }, color: '#64748B' } };
    let LEG = { legend: { position: 'bottom' as const, labels: { boxWidth: 11, boxHeight: 11, font: { size: 11 }, color: '#64748B' } } };

    // 1. Facturación y margen
    this.mk('chFac', this.chFac, 'bar', {
      labels: lbl,
      datasets: [
        { label: 'Facturación', data: M.map(m => Math.round(conv(m.val))), backgroundColor: '#B5D4F4', borderRadius: 4, order: 2, yAxisID: 'y' },
        { label: 'Margen bruto', data: M.map(m => Math.round(conv(m.mar))), backgroundColor: '#1A5FA8', borderRadius: 4, order: 2, yAxisID: 'y' },
        { label: 'UB %', data: M.map(m => m.ubPct), type: 'line', borderColor: '#3B6D11', backgroundColor: '#3B6D11', borderWidth: 2, pointRadius: 4, pointBackgroundColor: '#3B6D11', tension: .3, order: 1, yAxisID: 'y2' }
      ]
    }, {
      plugins: Object.assign({}, LEG, { tooltip: { callbacks: { label: (c:any) => c.dataset.label === 'UB %' ? 'UB ' + c.parsed.y + '%' : c.dataset.label + ': ' + simb + c.parsed.y.toLocaleString('es-PE') } } }),
      scales: {
        x: EJE_X,
        y: Object.assign({}, EJE, { beginAtZero: true, ticks: { font: { size: 10 }, color: '#64748B', callback: (v:any) => simb + (v / 1000).toFixed(0) + 'k' } }),
        y2: { position: 'right', beginAtZero: true, max: 100, grid: { display: false }, ticks: { font: { size: 10 }, color: '#3B6D11', callback: (v:any) => v + '%' } }
      }
    });

    // 2. Evolución de los tres KPI
    const linea = (nombre: string, campo: 'k1'|'k2'|'k3', color: string) => ({
      label: nombre, data: M.map(m => m[campo]), borderColor: color, backgroundColor: color, borderWidth: 2.4, pointRadius: 4, pointHoverRadius: 6, tension: .25, spanGaps: true
    });
    const metaLinea = (nombre: string, valor: number, color: string) => ({
      label: nombre, data: M.map(() => valor), borderColor: color, borderWidth: 1.4, borderDash: [5, 4], pointRadius: 0, fill: false
    });
    this.mk('chKpi', this.chKpi, 'line', {
      labels: lbl,
      datasets: [
        linea('KPI 1 · H.H', 'k1', '#1A5FA8'),
        linea('KPI 2 · Días', 'k2', '#639922'),
        linea('KPI 3 · UB', 'k3', '#EF9F27'),
        metaLinea('Meta 85%', 85, '#94A3B8'),
        metaLinea('Meta 80%', 80, '#CBD5E1')
      ]
    }, {
      plugins: Object.assign({}, LEG, { tooltip: { callbacks: { label: (c:any) => c.dataset.label + ': ' + (c.parsed.y == null ? 'sin datos' : c.parsed.y + '%') } } }),
      scales: { x: EJE_X, y: Object.assign({}, EJE, { min: 0, max: 100, ticks: { font: { size: 10 }, color: '#64748B', callback: (v:any) => v + '%' } }) }
    });

    // 3. H.H programadas vs ejecutadas
    this.mk('chHh', this.chHh, 'bar', {
      labels: lbl,
      datasets: [
        { label: 'Programadas', data: M.map(m => m.hhp), backgroundColor: '#CBD5E1', borderRadius: 3 },
        { label: 'Ejecutadas', data: M.map(m => m.hhe), backgroundColor: M.map(m => m.hhe <= m.hhp ? '#1A5FA8' : '#EF9F27'), borderRadius: 3 }
      ]
    }, {
      plugins: LEG,
      scales: { x: EJE_X, y: Object.assign({}, EJE, { beginAtZero: true, ticks: { font: { size: 10 }, color: '#64748B', callback: (v:any) => v + 'h' } }) }
    });

    // 4. Órdenes por mes y tipo
    this.mk('chVol', this.chVol, 'bar', {
      labels: lbl,
      datasets: [
        { label: 'Preventivo', data: M.map(m => m.prev), backgroundColor: '#1A5FA8', borderRadius: 3 },
        { label: 'Correctivo', data: M.map(m => m.corr), backgroundColor: '#EF9F27', borderRadius: 3 },
        { label: 'Emergencia', data: M.map(m => m.emer), backgroundColor: '#C0392B', borderRadius: 3 }
      ]
    }, {
      plugins: LEG,
      scales: {
        x: Object.assign({}, EJE_X, { stacked: true }),
        y: Object.assign({}, EJE, { stacked: true, beginAtZero: true, ticks: { font: { size: 10 }, color: '#64748B', stepSize: 2 } })
      }
    });

    // 5. Facturación por cliente
    let porCli: any = {};
    this.servs().forEach((s: any) => { 
      let cli = s.cliente || s['cli'];
      if(cli) porCli[cli] = (porCli[cli] || 0) + (s.valor || s['val'] || 0); 
    });
    let top = Object.keys(porCli).map(k => [k, porCli[k]]).sort((a:any, b:any) => b[1] - a[1]).slice(0, 6);
    this.mk('chCli', this.chCli, 'bar', {
      labels: top.map(t => (t[0] as string).length > 20 ? (t[0] as string).slice(0, 18) + '…' : t[0]),
      datasets: [{ label: 'Facturación', data: top.map(t => Math.round(conv(t[1] as number))), backgroundColor: '#1A5FA8', borderRadius: 4, barThickness: 16 }]
    }, {
      indexAxis: 'y',
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c:any) => simb + c.parsed.x.toLocaleString('es-PE') } } },
      scales: {
        x: Object.assign({}, EJE, { ticks: { font: { size: 10 }, color: '#64748B', callback: (v:any) => simb + (v / 1000).toFixed(0) + 'k' } }),
        y: Object.assign({}, EJE_X, { ticks: { font: { size: 10 }, color: '#64748B' } })
      }
    });
  }

  genHist() {
    const CLI_POOL = ['Nestlé SA','Nexa El Porvenir','Nexa Cajamarquilla','Cementos Pacasmayo','Minera Chinalco Perú','Owens Illinois Perú','Papelera Nacional S.A','Vidrios Lirquen Perú','Linde Perú S.R.L','Backus SA','Alicorp S.A.A','Machu Picchu Foods'];
    const VEN_POOL = ['Carlos Ruiz','Ana Martínez','Pedro Gómez'];
    const LUG_POOL = ['Mina','Industria','Taller'];
    let out: any[] = [], seed = 20260101;
    let rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    const perfil = [
      {m:1,n:7,ubBase:44,cumpl:.55,dias:26},
      {m:2,n:6,ubBase:46,cumpl:.58,dias:24},
      {m:3,n:8,ubBase:48,cumpl:.62,dias:22},
      {m:4,n:7,ubBase:50,cumpl:.66,dias:20},
      {m:5,n:8,ubBase:51,cumpl:.70,dias:19}
    ];
    perfil.forEach(p => {
      for(let i=0; i<p.n; i++){
        let mm = String(p.m).padStart(2,'0');
        let d1 = 1 + Math.floor(rnd()*12);
        let dur = Math.max(1, Math.round(p.dias*(.4+rnd()*1.3)));
        let val = Math.round((1800+rnd()*52000)/10)*10;
        let ubp = Math.round(p.ubBase+(rnd()*10-5));
        let cumple = rnd()<p.cumpl;
        let ubr = cumple ? ubp+Math.round(rnd()*7) : ubp-Math.round(2+rnd()*16);
        let hhp = Math.round(16+rnd()*300);
        let hhOk = rnd()<(p.cumpl+.12);
        let hhe = hhOk ? Math.round(hhp*(.72+rnd()*.28)*10)/10 : Math.round(hhp*(1.04+rnd()*.42)*10)/10;
        out.push({
          id: 'OV-25'+mm+String(100+i),
          oc: 'HIST-'+mm+i, 
          cliente: CLI_POOL[Math.floor(rnd()*CLI_POOL.length)],
          desc: 'Servicio de mantenimiento '+(rnd()<.78?'preventivo':'correctivo'),
          tipo: rnd()<.78?'Preventivo':(rnd()<.85?'Correctivo':'Emergencia'),
          estado: 'Finalizado', est: 'Finalizado',
          valor: val, val: val,
          costo: Math.round(val*(1-ubr/100)), cos: Math.round(val*(1-ubr/100)),
          ubp, ubr, 
          vendedor: VEN_POOL[Math.floor(rnd()*3)], 
          ot: 'OT'+mm+i,
          lugar: LUG_POOL[Math.floor(rnd()*3)],
          fp: '2026-'+mm+'-'+String(d1).padStart(2,'0'), 
          ff: '2026-'+mm+'-'+String(d1+dur).padStart(2,'0'),
          hhp, hhe, demo: true
        });
      }
    });
    return out;
  }
}
