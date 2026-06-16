import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DbService } from '../../services/db.service';
import { AuthService } from '../../services/auth.service';
import { CircularRingComponent, SvgPieComponent, SvgBarGroupComponent, SvgBarSingleComponent } from '../../components/svg-charts';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CircularRingComponent,
    SvgPieComponent,
    SvgBarGroupComponent,
    SvgBarSingleComponent
  ],
  template: `
    <div>
      <!-- Page Header -->
      <div class="m-page-header">
        <div>
          <h1 class="m-page-title">Resumen ejecutivo</h1>
          <p class="m-page-subtitle">{{ svcs().length }} servicios · {{ tecs().length }} técnicos</p>
        </div>
        <button class="dash-logout-btn" (click)="authService.logout()">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
          Salir del sistema
        </button>
      </div>

      <!-- Filters Row -->
      <div style="display: flex; gap: 14px; margin-bottom: 20px; align-items: center; background: #FFF; padding: 12px 18px; border-radius: 12px; border: 0.5px solid rgba(0,0,0,0.09);">
        <div style="display: flex; gap: 8px; align-items: center;">
          <label style="font-size: 13px; font-weight: 700; color: #4B5563;">Periodo:</label>
          <input type="month" class="m-input" [ngModel]="fDate()" (ngModelChange)="fDate.set($event)" style="width: 160px; padding: 6px 12px;"/>
        </div>
        <button class="m-btn m-btn-sm" style="background: var(--surf); border-color: var(--border);" *ngIf="fDate()" (click)="fDate.set('')">✕ Ver Histórico Global</button>
      </div>

      <!-- Metric Cards Grid -->
      <div class="m-metric-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; margin-bottom: 18px;">
        <div class="m-card" style="padding: 13px 15px;">
          <div style="font-size:11px; font-weight:600; color:var(--txt-m); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:5px;">OV activas</div>
          <div style="font-size:22px; font-weight:700; color:var(--txt); line-height:1;">{{ svcs().length }}</div>
          <div style="font-size:11px; color:var(--txt-m); margin-top:4px;">{{ finalizadasCount() }} finalizadas</div>
        </div>

        <div class="m-card" style="padding: 13px 15px;">
          <div style="font-size:11px; font-weight:600; color:var(--txt-m); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:5px;">Valor total</div>
          <div style="font-size:22px; font-weight:700; color:var(--txt); line-height:1;">{{ formatMillions(tv()) }}</div>
          <div style="font-size:11px; color:var(--txt-m); margin-top:4px;">Soles</div>
        </div>

        <div class="m-card" style="padding: 13px 15px;">
          <div style="font-size:11px; font-weight:600; color:var(--txt-m); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:5px;">UB promedio</div>
          <div style="font-size:22px; font-weight:700; line-height:1;" [style.color]="ubP() >= 95 ? 'var(--green)' : 'var(--amber)'">{{ ubP() }}%</div>
          <div style="font-size:11px; color:var(--txt-m); margin-top:4px;">Meta: &ge;95%</div>
        </div>

        <div class="m-card" style="padding: 13px 15px;">
          <div style="font-size:11px; font-weight:600; color:var(--txt-m); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:5px;">En riesgo</div>
          <div style="font-size:22px; font-weight:700; line-height:1;" [style.color]="risk() > 0 ? 'var(--red)' : 'var(--green)'">{{ risk() }}</div>
          <div style="font-size:11px; color:var(--txt-m); margin-top:4px;">OVs en riesgo</div>
        </div>

        <div class="m-card" style="padding: 13px 15px;">
          <div style="font-size:11px; font-weight:600; color:var(--txt-m); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:5px;">Técnicos</div>
          <div style="font-size:22px; font-weight:700; color:var(--txt); line-height:1;">{{ tecs().length }}</div>
          <div style="font-size:11px; color:var(--txt-m); margin-top:4px;">{{ tecsBaseOk() }} base OK</div>
        </div>

        <div class="m-card" style="padding: 13px 15px;">
          <div style="font-size:11px; font-weight:600; color:var(--txt-m); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:5px;">Req. vencidos</div>
          <div style="font-size:22px; font-weight:700; line-height:1;" [style.color]="vencTotal() > 0 ? 'var(--red)' : 'var(--green)'">{{ vencTotal() }}</div>
          <div style="font-size:11px; color:var(--txt-m); margin-top:4px;">Todos los clientes</div>
        </div>
      </div>

      <!-- KPIs circular rings section -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 14px; margin-bottom: 14px;">
        <div class="m-card" style="display: flex; flex-direction: column; justify-content: space-between;">
          <div style="font-size: 13px; font-weight: 700; margin-bottom: 12px;">KPIs operacionales</div>
          <div style="display: flex; justify-content: space-around; flex-wrap: wrap; gap: 8px;">
            <app-circular-ring [val]="pTime()" label="Tiempo ≤30d" [meta]="95"></app-circular-ring>
            <app-circular-ring [val]="ubP()" label="UB ≥95%" [meta]="95"></app-circular-ring>
            <app-circular-ring [val]="pHH()" label="H.H ≥95%" [meta]="95"></app-circular-ring>
          </div>
        </div>

        <!-- Pie Charts -->
        <div class="m-card">
          <div style="font-size: 13px; font-weight: 700; margin-bottom: 8px;">Servicios por tipo</div>
          <app-svg-pie [data]="tipoD()"></app-svg-pie>
          <div style="display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; margin-top: 10px;">
            <span *ngFor="let t of tipoD()" style="font-size: 11px; color: var(--txt-m); display: flex; align-items: center; gap: 4px;">
              <span [style.background]="t.color" style="width: 8px; height: 8px; border-radius: 2px; display: inline-block;"></span>
              {{ t.name }} ({{ t.value }})
            </span>
          </div>
        </div>

        <div class="m-card">
          <div style="font-size: 13px; font-weight: 700; margin-bottom: 8px;">Estado de servicios</div>
          <app-svg-pie [data]="stD()"></app-svg-pie>
          <div style="display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; margin-top: 10px;">
            <span *ngFor="let t of stD()" style="font-size: 11px; color: var(--txt-m); display: flex; align-items: center; gap: 4px;">
              <span [style.background]="t.color" style="width: 8px; height: 8px; border-radius: 2px; display: inline-block;"></span>
              {{ t.name }} ({{ t.value }})
            </span>
          </div>
        </div>
      </div>

      <!-- Bar Charts section -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 14px; margin-bottom: 14px;">
        <div class="m-card">
          <div style="font-size: 13px; font-weight: 700; margin-bottom: 3px;">H.H Programada vs Ejecutada</div>
          <div style="font-size: 11px; color: var(--txt-m); margin-bottom: 10px;">Por orden de servicio (últimas 6)</div>
          <app-svg-bar-group [data]="hhD()"></app-svg-bar-group>
          <div style="display: flex; gap: 12px; justify-content: center; font-size: 11px; color: var(--txt-m); margin-top: 8px;">
            <span style="display: flex; align-items: center; gap: 4px;"><span style="width: 10px; height: 10px; background: #DCEDC8; display: inline-block; border-radius: 2px;"></span> Programada</span>
            <span style="display: flex; align-items: center; gap: 4px;"><span style="width: 10px; height: 10px; background: #8BC34A; display: inline-block; border-radius: 2px;"></span> Ejecutada</span>
          </div>
        </div>

        <div class="m-card">
          <div style="font-size: 13px; font-weight: 700; margin-bottom: 3px;">Días de ejecución por OV</div>
          <div style="font-size: 11px; color: var(--txt-m); margin-bottom: 10px;">Meta ≤30 días</div>
          <app-svg-bar-single [data]="diasD()" unit=" días" [customColorScale]="true" [barWidth]="18"></app-svg-bar-single>
          <div style="display: flex; gap: 12px; justify-content: center; font-size: 11px; color: var(--txt-m); margin-top: 8px;">
            <span style="display: flex; align-items: center; gap: 4px;"><span style="width: 10px; height: 10px; background: #8BC34A; display: inline-block; border-radius: 2px;"></span> Cumple (&le;30d)</span>
            <span style="display: flex; align-items: center; gap: 4px;"><span style="width: 10px; height: 10px; background: #C0392B; display: inline-block; border-radius: 2px;"></span> Fuera de meta (>30d)</span>
          </div>
        </div>
      </div>

      <!-- UB Real Chart -->
      <div *ngIf="ubD().length > 0" class="m-card" style="margin-bottom: 14px;">
        <div style="font-size: 13px; font-weight: 700; margin-bottom: 3px;">
          UB Real por servicio <span style="font-weight: 400; color: var(--txt-m); font-size: 12px;">— Meta &gt;95%</span>
        </div>
        <app-svg-bar-single [data]="ubD()" unit="%" [domain]="[85, 100]" [customColorScale]="true" [barWidth]="22"></app-svg-bar-single>
        <div style="display: flex; gap: 12px; justify-content: center; font-size: 11px; color: var(--txt-m); margin-top: 8px;">
          <span style="display: flex; align-items: center; gap: 4px;"><span style="width: 10px; height: 10px; background: #8BC34A; display: inline-block; border-radius: 2px;"></span> Cumple (&ge;95%)</span>
          <span style="display: flex; align-items: center; gap: 4px;"><span style="width: 10px; height: 10px; background: #C0392B; display: inline-block; border-radius: 2px;"></span> Bajo meta (<95%)</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dash-logout-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      background: linear-gradient(90deg, #F57C00 0%, #E65100 100%);
      color: white;
      border: none;
      padding: 10px 18px;
      font-size: 13px;
      font-weight: 700;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(245, 124, 0, 0.25);
      cursor: pointer;
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .dash-logout-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(245, 124, 0, 0.35);
    }
    .dash-logout-btn:active {
      transform: scale(0.96);
    }
  `]
})
export class DashboardComponent {
  private dbService = inject(DbService);
  public authService = inject(AuthService);

  fDate = signal('');

  svcs = computed(() => {
    const d = this.fDate();
    let list = this.dbService.servicios();
    if (d) {
      list = list.filter(x => x.creado && x.creado.startsWith(d));
    }
    return list;
  });
  
  tecs = computed(() => this.dbService.tecnicos());

  tv = computed(() => this.svcs().reduce((s, x) => s + (x.valor || 0), 0));
  tc = computed(() => this.svcs().reduce((s, x) => s + (x.costo || 0), 0));

  ubP = computed(() => this.tv() > 0 ? Math.round(((this.tv() - this.tc()) / this.tv()) * 1000) / 10 : 0);
  risk = computed(() => this.svcs().filter(x => x.estado === 'En riesgo').length);
  hhP = computed(() => this.svcs().reduce((s, x) => s + (x.hhp || 0), 0));
  hhE = computed(() => this.svcs().reduce((s, x) => s + (x.hhe || 0), 0));
  pHH = computed(() => this.hhP() ? Math.round((this.hhE() / this.hhP()) * 100) : 0);

  finalizadasCount = computed(() => this.svcs().filter(x => x.estado === 'Finalizado').length);

  pTime = computed(() => {
    const list = this.svcs();
    if (!list.length) return 0;
    const matching = list.filter(x => {
      const d = this.dd(x.fp, x.ff);
      return d != null && d <= 30;
    });
    return Math.round((matching.length / list.length) * 100);
  });

  vencTotal = computed(() => {
    let count = 0;
    this.tecs().forEach(t => {
      (t.baseReqs || []).forEach(r => { if (r.estado === 'vencido') count++; });
      (t.clientes || []).forEach(c => {
        (c.reqs || []).forEach(r => { if (r.estado === 'vencido') count++; });
      });
    });
    return count;
  });

  tecsBaseOk = computed(() => {
    return this.tecs().filter(t => this.habPct(t.baseReqs) === 100).length;
  });

  tipoD = computed(() => {
    const list = this.svcs();
    const types = ['Preventivo', 'Correctivo', 'Emergencia'] as const;
    const colors = { Preventivo: '#8BC34A', Correctivo: '#F57C00', Emergencia: '#C0392B' };
    return types.map(t => ({
      name: t,
      value: list.filter(x => x.tipo === t).length,
      color: colors[t]
    }));
  });

  hhD = computed(() => {
    return this.svcs().slice(-6).map(x => ({
      name: x.id.replace('OV-', ''),
      prog: x.hhp || 0,
      ejec: x.hhe || 0
    }));
  });

  ubD = computed(() => {
    return this.svcs().filter(x => x.ubr != null).map(x => ({
      name: x.id.replace('OV-', ''),
      value: x.ubr || 0,
      ok: (x.ubr || 0) >= 95
    }));
  });

  diasD = computed(() => {
    return this.svcs().map(x => {
      const d = this.dd(x.fp, x.ff);
      return {
        name: x.id.replace('OV-', ''),
        value: d || 0,
        ok: d != null && d <= 30
      };
    });
  });

  stD = computed(() => {
    const list = this.svcs();
    const states = ['Finalizado', 'En progreso', 'En riesgo', 'Programado'] as const;
    const colors = ['#8BC34A', '#F57C00', '#C0392B', '#6B7280'];
    return states.map((s, idx) => ({
      name: s,
      value: list.filter(x => x.estado === s).length,
      color: colors[idx]
    }));
  });

  // Utilities
  formatMillions(n: number | null): string {
    return n == null ? '—' : 'S/ ' + (n / 1e6).toFixed(1) + 'M';
  }

  dd(a: string, b: string): number | null {
    if (!a || !b) return null;
    return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
  }

  habPct(reqs: any[]): number {
    return reqs?.length ? Math.round(reqs.filter(r => r.estado === 'vigente').length / reqs.length * 100) : 0;
  }
}
