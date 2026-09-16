import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DbService, Servicio } from '../../services/db.service';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-servicios',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div>
      <div class="head">
        <div>
          <h1>Control de servicios</h1>
          <div class="sub">Registro y seguimiento de órdenes de venta</div>
        </div>
        <div style="display:flex;gap:7px;flex-wrap:wrap">
          <button id="s-plan" (click)="downloadTemplate()">Plantilla</button>
          
          <button id="s-imp" (click)="triggerImport()">Importar Excel</button>
          <input type="file" id="import-file" style="display:none;" accept=".xlsx, .xls" (change)="importExcel($event)">
          
          <button id="s-exp" (click)="exportExcel()">Exportar Excel</button>
          <button class="suc" id="s-new" (click)="openNew()">+ Nueva OV</button>
        </div>
      </div>

      <div class="bar">
        <input id="s-q" placeholder="Buscar OV, cliente, OT..." style="width:230px" [ngModel]="q()" (ngModelChange)="q.set($event)">
        <select id="s-e" [ngModel]="fE()" (ngModelChange)="fE.set($event)">
          <option value="">Todos los estados</option>
          <option *ngFor="let e of estadosServicio()" [value]="e">{{ e }}</option>
        </select>
        <select id="s-t" [ngModel]="fT()" (ngModelChange)="fT.set($event)">
          <option value="">Todos los tipos</option>
          <option *ngFor="let t of tiposServicio()" [value]="t">{{ t }}</option>
        </select>
        <span class="right">{{ rows().length }} registros · {{ totalRowsVal() }}</span>
      </div>

      <div class="flush">
        <div class="scroll">
          <table>
            <thead>
              <tr>
                <th>OV</th>
                <th>OT</th>
                <th>Cliente</th>
                <th>OC</th>
                <th class="c">Tipo</th>
                <th class="c">Valor OV</th>
                <th class="c">Vendedor</th>
                <th class="c">Lugar</th>
                <th class="c">F.Prog</th>
                <th class="c">F.Fin</th>
                <th class="c">Días</th>
                <th class="c">H.H P/E</th>
                <th class="c">UB P/R</th>
                <th class="c">Estado</th>
                <th class="c"></th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let s of rows()">
                <td class="id">{{ s.ov || s.id }}</td>
                <td class="mut">{{ s.ot || '—' }}</td>
                <td>{{ s.cliente }}</td>
                <td class="mut">{{ s.oc || '—' }}</td>
                <td class="c"><span class="p" [ngClass]="tipoP(s.tipo)">{{ s.tipo }}</span></td>
                <td class="c">{{ cop(s.valor) }}</td>
                <td class="c">{{ s.vendedor }}</td>
                <td class="c">{{ s.lugar || '—' }}</td>
                <td class="c mut">{{ s.fp || '—' }}</td>
                <td class="c mut">{{ s.ff || '—' }}</td>
                <td class="c">
                  <span *ngIf="dd(s.fp, s.ff) !== null" class="p" [ngClass]="dd(s.fp, s.ff)! <= 30 ? 'p-g' : 'p-r'">
                    {{ dd(s.fp, s.ff) }}d
                  </span>
                  <span *ngIf="dd(s.fp, s.ff) === null" class="mut">—</span>
                </td>
                <td class="c">
                  <span class="p" [ngClass]="(s.hhe <= s.hhp) ? 'p-g' : 'p-r'">
                    {{ s.hhp }}/{{ s.hhe }}
                  </span>
                </td>
                <td class="c">
                  <span *ngIf="s.ubp == null" class="mut">—</span>
                  <span *ngIf="s.ubp != null" class="p" [ngClass]="s.ubr != null && s.ubr >= s.ubp ? 'p-g' : 'p-r'">
                    {{ s.ubp }}/{{ s.ubr != null ? s.ubr : '—' }}%
                  </span>
                </td>
                <td class="c">
                  <span class="p" [ngClass]="pill(s.estado)">{{ s.estado }}</span>
                </td>
                <td class="c">
                  <button class="sm" (click)="openEdit(s)">Editar</button>
                  <button class="sm dgr" style="margin-left: 4px;" (click)="confirmDelete(s.id)">✕</button>
                </td>
              </tr>
              <tr *ngIf="rows().length === 0">
                <td colspan="15" class="empty">No hay servicios con ese filtro</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Overlays (Modal, etc.) -->
      <!-- Add/Edit Modal -->
      <div *ngIf="modal === 'f'" class="ov" (click)="closeOnOverlay($event)">
        <div class="mod">
          <div class="mod-h">
            <div>
              <b>{{ form.creado ? 'Editar OV ' + (form.ov || form.id) : 'Nueva orden de servicio' }}</b>
              <span class="s">Los desplegables salen de Catálogos</span>
            </div>
            <button class="x" (click)="closeModal()">×</button>
          </div>
          <div class="mod-b">
            <div class="row2">
              <div class="fld"><label>OV *</label><input [(ngModel)]="form.ov"/></div>
              <div class="fld"><label>OC *</label><input [(ngModel)]="form.oc"/></div>
              <div class="fld">
                <label>Cliente *</label>
                <select [(ngModel)]="form.cliente">
                  <option value="">Selecciona</option>
                  <option *ngFor="let c of clientesList()" [value]="c">{{ c }}</option>
                </select>
              </div>
              <div class="fld">
                <label>Vendedor</label>
                <select [(ngModel)]="form.vendedor">
                  <option *ngFor="let v of vendedores()" [value]="v">{{ v }}</option>
                </select>
              </div>
              <div class="fld">
                <label>Tipo</label>
                <select [(ngModel)]="form.tipo">
                  <option *ngFor="let t of tiposServicio()" [value]="t">{{ t }}</option>
                </select>
              </div>
              <div class="fld">
                <label>Estado</label>
                <select [(ngModel)]="form.estado">
                  <option *ngFor="let e of estadosServicio()" [value]="e">{{ e }}</option>
                </select>
              </div>
            </div>

            <div class="fld">
              <label>Descripción *</label>
              <textarea [(ngModel)]="form.desc"></textarea>
            </div>

            <div class="row3">
              <div class="fld"><label>OT</label><input [(ngModel)]="form.ot"/></div>
              <div class="fld">
                <label>Lugar</label>
                <select [(ngModel)]="form.lugar">
                  <option *ngFor="let l of lugares()" [value]="l">{{ l }}</option>
                </select>
              </div>
              <div class="fld">
                <label>Técnico</label>
                <select [(ngModel)]="form.tecnico">
                  <option value="">Sin asignar</option>
                  <option *ngFor="let t of tecnicos()" [value]="t.nombre">{{ t.nombre }}</option>
                </select>
              </div>
              <div class="fld"><label>F. programación</label><input type="date" [(ngModel)]="form.fp"/></div>
              <div class="fld"><label>F. finalización</label><input type="date" [(ngModel)]="form.ff"/></div>
              <div class="fld"><label>H.H programadas</label><input type="number" [(ngModel)]="form.hhp"/></div>
              <div class="fld"><label>H.H ejecutadas</label><input type="number" [(ngModel)]="form.hhe"/></div>
            </div>

            <div style="background:#F8FAFC;border-radius:9px;padding:13px 15px;margin-bottom:13px">
              <div style="font-size:11px;font-weight:700;color:var(--mut);text-transform:uppercase;margin-bottom:11px">Financiero (Ingresa en PEN)</div>
              <div class="row2">
                <div class="fld"><label>Valor OV (S/)</label><input type="number" [(ngModel)]="form.valor"/></div>
                <div class="fld"><label>Costo estimado</label><input type="number" [(ngModel)]="form.costo"/></div>
                <div class="fld"><label>UB proyectada % *</label><input type="number" [(ngModel)]="form.ubp"/></div>
                <div class="fld"><label>UB real %</label><input type="number" [(ngModel)]="form.ubr"/></div>
              </div>
              <div style="font-size:12px;color:var(--orangeD);background:var(--orangeL);padding:8px 11px;border-radius:7px">La UB proyectada es obligatoria: sin ella el KPI 3 no puede medir esta orden.</div>
            </div>

            <div *ngIf="err" style="font-size:13px;color:var(--redD);margin-bottom:10px">{{ err }}</div>
          </div>
          <div class="mod-f">
            <span></span>
            <div style="display:flex;gap:8px">
              <button (click)="closeModal()">Cancelar</button>
              <button class="pri" (click)="save()">{{ form.creado ? 'Guardar cambios' : 'Registrar OV' }}</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Delete Confirmation -->
      <div *ngIf="confId" class="ov" style="z-index: 1100;" (click)="closeOnOverlay($event)">
        <div class="mod" style="max-width: 360px;">
          <div class="mod-b" style="font-size: 14px; line-height: 1.6;">
            ¿Eliminar el servicio <strong>{{ confId }}</strong>? Esta acción no se puede deshacer.
          </div>
          <div class="mod-f">
            <span></span>
            <div style="display: flex; gap: 8px;">
              <button (click)="confId = null">Cancelar</button>
              <button class="pri dgr" (click)="deleteConfirmed()">Eliminar</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Import Preview Modal -->
      <div *ngIf="modal === 'import'" class="ov" (click)="closeOnOverlay($event)">
        <div class="mod">
          <div class="mod-h">
            <div>
              <b>Importar servicios</b>
              <span class="s">Revisión antes de escribir</span>
            </div>
            <button class="x" (click)="closeModal()">×</button>
          </div>
          <div class="mod-b">
            <div style="background:#F8FAFC;border-radius:9px;padding:11px 13px;margin-bottom:14px;font-size:13px">
              <b>Archivo subido</b>
              <div class="mut" style="font-size:12px;margin-top:2px">{{ importRows.length }} filas leídas</div>
            </div>
            
            <div class="grid g3" style="margin-bottom:14px">
              <div style="background:var(--greenL);border-radius:9px;padding:11px 13px">
                <div style="font-size:22px;font-weight:800;color:var(--greenD)">{{ getImportStats().ok }}</div>
                <div style="font-size:12px;color:var(--greenD);font-weight:600">listas para importar</div>
              </div>
              <div style="background:var(--orangeL);border-radius:9px;padding:11px 13px">
                <div style="font-size:22px;font-weight:800;color:var(--orangeD)">{{ getImportStats().warn }}</div>
                <div style="font-size:12px;color:var(--orangeD);font-weight:600">con advertencias</div>
              </div>
              <div style="background:var(--redL);border-radius:9px;padding:11px 13px">
                <div style="font-size:22px;font-weight:800;color:var(--redD)">{{ getImportStats().err }}</div>
                <div style="font-size:12px;color:var(--redD);font-weight:600">con errores</div>
              </div>
            </div>

            <div style="border:1px solid var(--line);border-radius:9px;overflow:hidden;margin-bottom:14px;max-height:200px;overflow-y:auto">
              <div *ngFor="let row of importRows; let i = index" style="padding:9px 12px; border-bottom:1px solid var(--line2)">
                <div style="display:flex;align-items:center;gap:9px">
                  <span class="dot" [style.background]="getImportRowColor(row).bg" [style.color]="getImportRowColor(row).fg" style="width:19px;height:19px;font-size:10px">{{ getImportRowColor(row).icon }}</span>
                  <span class="mut" style="font-size:11px;width:32px">F{{i+2}}</span>
                  <span style="font-size:13px;min-width:70px;font-weight:600">{{ row.ov || row.id || '—' }}</span>
                  <span *ngIf="row.ot" class="mut" style="font-size:11px;padding:1px 6px;background:var(--line2);border-radius:4px;">OT: {{ row.ot }}</span>
                  <span class="mut" style="font-size:12px;flex:1">{{ row.cliente || '—' }}</span>
                  <span style="font-size:12px">{{ row.valor ? cop(row.valor) : 'US$ 0' }}</span>
                </div>
                <div *ngIf="row.err" style="font-size:11px; margin:4px 0 0 44px" [style.color]="getImportRowColor(row).fg">{{ row.err }}</div>
              </div>
            </div>

            <div style="background:#F8FAFC;border-radius:9px;padding:12px 14px;margin-bottom:8px">
              <div style="font-size:11px;font-weight:700;color:var(--mut);text-transform:uppercase;margin-bottom:9px">Si la OV ya existe</div>
              <label style="display:flex;gap:8px;align-items:center;text-transform:none;letter-spacing:0;font-weight:400;font-size:13px;margin-bottom:7px;color:var(--txt)">
                <input type="radio" name="dp" [value]="false" [(ngModel)]="importOverwrite" style="width:auto"> Omitir y conservar lo registrado
              </label>
              <label style="display:flex;gap:8px;align-items:center;text-transform:none;letter-spacing:0;font-weight:400;font-size:13px;color:var(--txt)">
                <input type="radio" name="dp" [value]="true" [(ngModel)]="importOverwrite" style="width:auto"> Actualizar con lo que venga del Excel
              </label>
            </div>
          </div>
          <div class="mod-f">
            <span></span>
            <div style="display:flex;gap:8px">
              <button (click)="closeModal()">Cancelar</button>
              <button class="pri" [disabled]="getImportStats().ok + getImportStats().warn === 0" (click)="commitImport()">Importar {{ getImportStats().ok + getImportStats().warn }} filas</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class ServiciosComponent {
  private dbService = inject(DbService);

  TC = 3.37;
  
  q = signal('');
  fE = signal('');
  fT = signal('');
  
  modal: 'f' | 'import' | null = null;
  form: Partial<Servicio> = {};
  confId: string | null = null;
  err: string = '';

  importRows: any[] = [];
  importOverwrite: boolean = true;

  vendedores = computed(() => this.dbService.getCatalogValues('vendedor'));
  tiposServicio = computed(() => this.dbService.getCatalogValues('tipo_servicio'));
  estadosServicio = computed(() => this.dbService.getCatalogValues('estado_servicio'));
  lugares = computed(() => this.dbService.getCatalogValues('lugar'));
  VEND = ["Carlos Ruiz", "Ana Martínez", "Pedro Gómez"];

  tecnicos = computed(() => this.dbService.tecnicos());
  clientesList = computed(() => this.dbService.clientes().map(c => c.nombre));

  rows = computed(() => {
    const query = this.q().toLowerCase();
    const estado = this.fE();
    const tipo = this.fT();
    
    return this.dbService.servicios().filter(x => {
      const matchesSearch = !query || 
        [(x.ov || x.id), x.id, x.cliente, x.desc, x.ot, x.lugar].join(' ').toLowerCase().includes(query);
      const matchesEstado = !estado || x.estado === estado;
      const matchesTipo = !tipo || x.tipo === tipo;
      
      return matchesSearch && matchesEstado && matchesTipo;
    });
  });

  totalRowsVal() {
    const sum = this.rows().reduce((a, b) => a + (Number(b.valor) || 0), 0);
    return this.cop(sum);
  }

  cop(n: number | null | undefined): string {
    if (n == null || isNaN(n)) return '—';
    const usd = n / this.TC;
    return 'US$ ' + usd.toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  dd(a: string | undefined, b: string | undefined): number | null {
    if (!a || !b) return null;
    return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
  }

  tipoP(t: string): string {
    const m: any = { 'Preventivo': 'p-b', 'Correctivo': 'p-o', 'Emergencia': 'p-r' };
    return m[t] || 'p-n';
  }

  pill(e: string): string {
    const m: any = {
      'Finalizado': 'p-g', 'En progreso': 'p-b', 'En riesgo': 'p-r', 'Programado': 'p-n',
      'Pendiente': 'p-o', 'En curso': 'p-b', 'Entregado': 'p-g', 'Utilizado': 'p-g',
      'Instalado': 'p-g', 'En pedido': 'p-o'
    };
    return m[e] || 'p-n';
  }

  openNew() {
    this.err = '';
    this.form = {
      id: '',
      ov: '',
      oc: '',
      cliente: '',
      vendedor: '',
      tipo: 'Preventivo',
      estado: 'Programado',
      desc: '',
      ot: '',
      unidad: '',
      cc: '',
      lugar: 'Industria',
      fp: '',
      ff: '',
      tecnico: '',
      hhp: 0,
      hhe: 0,
      valor: 0,
      costo: 0,
      ubp: null,
      ubr: null
    };
    this.modal = 'f';
  }

  openEdit(s: Servicio) {
    this.err = '';
    this.form = { ...s, ov: s.ov || s.id };
    this.modal = 'f';
  }

  closeModal() {
    this.modal = null;
    this.err = '';
  }

  closeOnOverlay(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('ov')) {
      this.closeModal();
      if (this.confId) {
        this.confId = null;
      }
    }
  }

  async save() {
    this.err = '';
    const ovVal = (this.form.ov || this.form.id || '').trim();
    const otVal = (this.form.ot || '').trim();
    if (!ovVal) { this.err = 'El número de OV es obligatorio'; return; }
    if (!this.form.cliente) { this.err = 'Selecciona el cliente'; return; }
    if (this.form.ubp == null || String(this.form.ubp).trim() === '') { this.err = 'Ingresa la UB proyectada'; return; }
    
    // Mantener el id existente si estamos editando, o generar un id determinístico si es nuevo
    const idVal = this.form.id?.trim() || (otVal ? `${ovVal}_${otVal}` : ovVal);

    const finalItem: Servicio = {
      id: idVal,
      ov: ovVal,
      oc: this.form.oc || '',
      cliente: this.form.cliente!,
      vendedor: this.form.vendedor || '',
      tipo: (this.form.tipo as any) || 'Preventivo',
      estado: (this.form.estado as any) || 'En progreso',
      desc: this.form.desc || '',
      ot: otVal,
      unidad: this.form.unidad || '',
      cc: this.form.cc || '',
      lugar: this.form.lugar || '',
      fp: this.form.fp || '',
      ff: this.form.ff || '',
      tecnico: this.form.tecnico || '',
      hhp: Number(this.form.hhp) || 0,
      hhe: Number(this.form.hhe) || 0,
      valor: Number(this.form.valor) || 0,
      costo: Number(this.form.costo) || 0,
      ubp: Number(this.form.ubp),
      ubr: this.form.ubr !== null && this.form.ubr !== undefined && String(this.form.ubr) !== '' ? Number(this.form.ubr) : null,
      creado: this.form.creado || new Date().toISOString().slice(0, 10)
    };

    await this.dbService.upsert('servicios', finalItem);
    this.closeModal();
  }

  confirmDelete(id: string) {
    this.confId = id;
  }

  deleteConfirmed() {
    if (this.confId) {
      this.dbService.remove('servicios', this.confId);
      this.confId = null;
    }
  }

  // --- EXCEL LOGIC ---
  exportExcel() {
    const data = this.rows().map(s => ({
      'OV': s.ov || s.id,
      'OT': s.ot,
      'Cliente': s.cliente,
      'OC': s.oc,
      'Descripción': s.desc,
      'Tipo': s.tipo,
      'Valor OV (PEN)': s.valor,
      'Vendedor': s.vendedor,
      'Lugar': s.lugar,
      'F.Prog': s.fp,
      'F.Fin': s.ff,
      'Días': this.dd(s.fp, s.ff),
      'H.H Prog': s.hhp,
      'H.H Ejec': s.hhe,
      'UB Proy %': s.ubp,
      'UB Real %': s.ubr,
      'Estado': s.estado,
      'Técnico': s.tecnico
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Servicios');
    
    // Add KPIs sheet
    const kpiData = [{ KPI: 'Exportado el', Valor: new Date().toLocaleDateString() }];
    const wsKpi = XLSX.utils.json_to_sheet(kpiData);
    XLSX.utils.book_append_sheet(wb, wsKpi, 'Resumen KPI');

    XLSX.writeFile(wb, 'Servicios_' + new Date().toISOString().slice(0, 10) + '.xlsx');
  }

  downloadTemplate() {
    const data = [{
      'OV': 'OV-EXAMPLE',
      'Cliente': 'Nestlé SA',
      'OC': '12345',
      'Descripción': 'Ejemplo de servicio',
      'Tipo': 'Preventivo',
      'Valor OV (PEN)': 5000,
      'Vendedor': 'Carlos Ruiz',
      'OT': 'OT-001',
      'Lugar': 'Industria',
      'F.Prog': '2026-06-01',
      'F.Fin': '2026-06-05',
      'H.H Prog': 40,
      'H.H Ejec': 40,
      'UB Proy %': 45,
      'UB Real %': 48,
      'Estado': 'Finalizado',
      'Técnico': 'Edwin Zarate Escobar'
    }];
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Plantilla');
    XLSX.writeFile(wb, 'Plantilla_Servicios.xlsx');
  }

  triggerImport() {
    document.getElementById('import-file')?.click();
  }

  importExcel(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e: any) => {
      const bstr = e.target.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);
      
      const existing = this.dbService.servicios();
      const usedIdsInBatch = new Set<string>();

      this.importRows = data.map((row: any) => {
        const ov = String(row['OV'] || '').trim();
        const ot = String(row['OT'] || '').trim();
        let err = '';
        let level = 'ok';
        
        if (!ov) {
          err = 'Falta el número de OV. Columna obligatoria.';
          level = 'err';
        } else if (!row['Cliente']) {
          err = 'Falta el Cliente.';
          level = 'err';
        } else if (isNaN(Number(row['Valor OV (PEN)']))) {
          err = 'Valor OV no es numérico.';
          level = 'err';
        } else if (!row['Valor OV (PEN)']) {
          err = 'Valor OV en cero o vacío.';
          level = 'warn';
        }

        // Determinar ID único:
        // Si tiene OT, la clave primaria es OV_OT. Si no tiene OT, es OV.
        let baseId = ot ? `${ov}_${ot}` : ov;
        if (baseId.length > 45) {
          baseId = baseId.slice(0, 45);
        }

        // Verificar si este servicio específico (misma OV y misma OT) ya existe en base de datos
        const existingMatch = existing.find(s => 
          s.id === baseId || 
          ((s.ov === ov || s.id === ov) && (s.ot || '') === ot)
        );

        let finalId = baseId;
        if (existingMatch) {
          finalId = existingMatch.id;
          if (!err) {
            err = `El servicio (OV: ${ov}${ot ? ' · OT: ' + ot : ''}) ya existe en el sistema.`;
            level = 'warn';
          }
        } else {
          // Si no existe en DB, pero hay filas duplicadas con misma OV y misma OT en el mismo Excel:
          let counter = 1;
          while (usedIdsInBatch.has(finalId) || existing.some(s => s.id === finalId)) {
            finalId = `${baseId}_${counter++}`;
          }
        }
        usedIdsInBatch.add(finalId);

        return {
          id: finalId,
          ov: ov,
          ot: ot,
          cliente: row['Cliente'],
          valor: row['Valor OV (PEN)'],
          raw: row,
          err: err,
          level: level
        };
      });

      this.modal = 'import';
      event.target.value = ''; // Reset
    };
    reader.readAsBinaryString(file);
  }

  getImportStats() {
    return {
      ok: this.importRows.filter(r => r.level === 'ok').length,
      warn: this.importRows.filter(r => r.level === 'warn').length,
      err: this.importRows.filter(r => r.level === 'err').length
    };
  }

  getImportRowColor(row: any) {
    if (row.level === 'err') return { bg: 'var(--red-l)', fg: 'var(--red-d)', icon: '✗' };
    if (row.level === 'warn') return { bg: 'var(--amber-l)', fg: 'var(--amber-d)', icon: '!' };
    return { bg: 'var(--green-l)', fg: 'var(--green-d)', icon: '✓' };
  }

  async commitImport() {
    const toImport = this.importRows.filter(r => r.level !== 'err');
    for (let r of toImport) {
      if (r.level === 'warn' && r.err && r.err.includes('ya existe en el sistema') && !this.importOverwrite) {
        continue;
      }
      const raw = r.raw;
      const s: Servicio = {
        id: r.id,
        ov: r.ov,
        cliente: raw['Cliente'],
        oc: raw['OC'] || '',
        desc: raw['Descripción'] || '',
        tipo: raw['Tipo'] || 'Preventivo',
        valor: Number(raw['Valor OV (PEN)']) || 0,
        costo: 0, // A ser llenado luego o usar formula
        vendedor: raw['Vendedor'] || '',
        ot: r.ot || raw['OT'] || '',
        unidad: '',
        cc: '',
        lugar: raw['Lugar'] || 'Industria',
        fp: this.formatExcelDate(raw['F.Prog']),
        ff: this.formatExcelDate(raw['F.Fin']),
        tecnico: raw['Técnico'] || '',
        hhp: Number(raw['H.H Prog']) || 0,
        hhe: Number(raw['H.H Ejec']) || 0,
        ubp: Number(raw['UB Proy %']) || 0,
        ubr: raw['UB Real %'] ? Number(raw['UB Real %']) : null,
        estado: raw['Estado'] || 'Programado',
        creado: new Date().toISOString().slice(0, 10)
      };
      await this.dbService.upsert('servicios', s);
    }
    this.closeModal();
  }
  
  formatExcelDate(v: any): string {
    if (!v) return '';
    if (typeof v === 'string') return v;
    if (typeof v === 'number') {
      const d = new Date((v - (25567 + 2)) * 86400 * 1000);
      return d.toISOString().slice(0, 10);
    }
    return '';
  }
}

