import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DbService, CatalogoItem } from '../../services/db.service';

interface CatMeta {
  label: string;
  desc: string;
}

@Component({
  selector: 'app-catalogos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="wrap">
      <!-- ══════════ ENCABEZADO ══════════ -->
      <div class="head">
        <div>
          <h1>Catálogos</h1>
          <div class="sub">Listas que alimentan los desplegables del sistema</div>
        </div>
      </div>

      <!-- ══════════ TABS DE CATÁLOGOS ══════════ -->
      <div class="tabs">
        <button *ngFor="let k of catalogKeys"
                type="button"
                class="tab"
                [class.on]="activeTab() === k"
                (click)="setTab(k)">
          {{ catalogMeta[k].label }}
          <span *ngIf="hasDemo(k)" style="color:var(--orange); font-weight:bold;"> •</span>
        </button>
      </div>

      <!-- ══════════ AVISOS INFORMATIVOS SEGÚN TAB ══════════ -->
      <div *ngIf="activeTab() === 'vendedor'" class="note n-o">
        Estos tres nombres vinieron de los datos de ejemplo. Al renombrarlos, las órdenes que los usan se reasignan automáticamente.
      </div>

      <div *ngIf="activeTab() === 'eps' || activeTab() === 'sctr'" class="note n-b">
        Ya corregido a instituciones peruanas. Antes decía ARL Positiva y EPS Compensar, que son de Colombia.
      </div>

      <!-- ══════════ CARD PRINCIPAL ══════════ -->
      <div class="flush">
        <div class="flush-h">
          <div>
            <b>{{ currentMeta().label }}</b>
            <div class="mut" style="font-size:12px; margin-top:2px;">
              {{ currentItems().length }} registros · {{ currentMeta().desc.toLowerCase() }}
            </div>
          </div>
          <button type="button" class="pri" (click)="toggleAddForm()">
            {{ showAddForm ? '✕ Cerrar' : 'Agregar' }}
          </button>
        </div>

        <!-- Formulario para agregar -->
        <div *ngIf="showAddForm" class="add-form">
          <input [(ngModel)]="newValor"
                 placeholder="Nombre del nuevo elemento"
                 (keyup.enter)="saveNew()"
                 #newInput>
          <div *ngIf="addError" style="font-size:12px; color:var(--redD); margin-top:6px;">
            {{ addError }}
          </div>
          <div style="display:flex; gap:7px; margin-top:9px;">
            <button type="button" class="pri" (click)="saveNew()">Guardar</button>
            <button type="button" (click)="cancelAdd()">Cancelar</button>
          </div>
        </div>

        <!-- Lista de elementos del catálogo -->
        <div *ngFor="let it of currentItems(); let i = index" class="cat-row">
          <div style="flex:1; min-width:180px;">
            <div style="font-size:13px; display:flex; align-items:center; gap:8px; flex-wrap:wrap; font-weight:600;">
              <span>{{ it.valor }}</span>
              <span *ngIf="isDemo(it)" class="p p-o">dato de ejemplo</span>
            </div>
            <div class="mut" style="font-size:11px; margin-top:2px;">
              {{ getUsosText(it) }}
            </div>
          </div>

          <button type="button" class="sm" (click)="startRename(it)">Renombrar</button>
          <button type="button" class="sm dgr" (click)="deleteItem(it)">Eliminar</button>
        </div>

        <!-- Estado vacío -->
        <div *ngIf="currentItems().length === 0 && !showAddForm" class="empty">
          No hay elementos registrados en este catálogo. Haz clic en "Agregar" para crear uno.
        </div>
      </div>

      <!-- ══════════ AVISO DE ACCIÓN (FEEDBACK) ══════════ -->
      <div *ngIf="feedbackMsg"
           class="note"
           [class.n-g]="feedbackType === 'ok'"
           [class.n-r]="feedbackType === 'err'"
           style="margin-top:14px;">
        {{ feedbackMsg }}
      </div>

      <!-- ══════════ MODAL DE RENOMBRAR ══════════ -->
      <div class="ov" *ngIf="showRenameModal" (click)="closeRenameModal()">
        <div class="mod" (click)="$event.stopPropagation()">
          <div class="mod-h">
            <div>
              <b>Renombrar en catálogo</b>
              <span class="s">Se actualizará el catálogo y todos los registros asociados</span>
            </div>
            <button type="button" class="x" (click)="closeRenameModal()">×</button>
          </div>

          <div class="mod-b">
            <div class="fld">
              <label>Nuevo nombre para "{{ renamingItem?.valor }}"</label>
              <input [(ngModel)]="renameValor"
                     (keyup.enter)="saveRename()"
                     placeholder="Ingresa el nuevo nombre">
            </div>
            <div *ngIf="renameError" style="font-size:12px; color:var(--redD); margin-top:4px;">
              {{ renameError }}
            </div>
          </div>

          <div class="mod-f">
            <span></span>
            <div style="display:flex; gap:8px;">
              <button type="button" (click)="closeRenameModal()">Cancelar</button>
              <button type="button" class="pri" (click)="saveRename()">Guardar cambios</button>
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

    input {
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
    input:focus { border-color: var(--blue); }
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

    /* Tabs */
    .tabs {
      display: flex;
      gap: 7px;
      flex-wrap: wrap;
      margin-bottom: 14px;
    }
    .tab {
      padding: 7px 13px;
      font-size: 13px;
      border-radius: 8px;
      border: 1px solid var(--line);
      background: #fff;
      color: var(--mut);
      cursor: pointer;
      transition: .12s;
    }
    .tab:hover { background: #F8FAFC; }
    .tab.on {
      background: var(--blueL);
      color: var(--blueD);
      border-color: #B5D4F4;
      font-weight: 700;
    }

    /* Notes */
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

    /* Flush Card */
    .flush {
      background: #fff;
      border: 1px solid var(--line);
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.02);
    }
    .flush-h {
      padding: 13px 16px;
      border-bottom: 1px solid var(--line);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      flex-wrap: wrap;
    }
    .flush-h b { font-size: 14px; }
    .mut { color: var(--mut); }

    .add-form {
      padding: 13px 16px;
      background: #F8FAFC;
      border-bottom: 1px solid var(--line);
    }

    .cat-row {
      padding: 11px 16px;
      border-bottom: 1px solid var(--line2);
      display: flex;
      align-items: center;
      gap: 9px;
      flex-wrap: wrap;
      transition: background 0.1s;
    }
    .cat-row:hover {
      background: #F8FAFC;
    }
    .cat-row:last-child {
      border-bottom: none;
    }

    /* Pills */
    .p {
      display: inline-block;
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 20px;
      font-weight: 700;
      white-space: nowrap;
    }
    .p-o { background: var(--orangeL); color: var(--orangeD); }

    .empty {
      text-align: center;
      padding: 34px;
      color: var(--mut);
      font-size: 13px;
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
      max-width: 520px;
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
    .mod-h b { font-size: 15px; color: var(--txt); }
    .mod-h .s { font-size: 12px; color: var(--mut); display: block; margin-top: 2px; }
    .mod-b { padding: 18px 20px; }
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
  `]
})
export class CatalogosComponent {
  public dbService = inject(DbService);

  activeTab = signal<string>('vendedor');

  // Metadatos por categoría
  readonly catalogMeta: Record<string, CatMeta> = {
    vendedor:        { label: 'Vendedores',         desc: 'Responsables comerciales de cada orden' },
    especialidad:    { label: 'Especialidades',     desc: 'Perfiles técnicos del personal' },
    eps:             { label: 'EPS',                desc: 'Cobertura de salud del personal' },
    sctr:            { label: 'SCTR',               desc: 'Seguro complementario de trabajo de riesgo' },
    lugar:           { label: 'Lugares',            desc: 'Dónde se ejecuta el servicio' },
    tipo_servicio:   { label: 'Tipos de servicio',  desc: 'Clasificación de la orden' },
    estado_servicio: { label: 'Estados',            desc: 'Situación de la orden de venta' },
    contrato:        { label: 'Contratos',          desc: 'Modalidad contractual' },
    nivel:           { label: 'Niveles',            desc: 'Años de experiencia' }
  };

  readonly catalogKeys = [
    'vendedor', 'especialidad', 'eps', 'sctr', 'lugar',
    'tipo_servicio', 'estado_servicio', 'contrato', 'nivel'
  ];

  // Identificadores o valores de demostración
  readonly demoValues: Record<string, string[]> = {
    vendedor: ['Carlos Ruiz', 'Ana Martínez', 'Pedro Gómez']
  };

  // Prefijos para IDs
  readonly prefixMap: Record<string, string> = {
    vendedor: 'CAT-VEN',
    especialidad: 'CAT-ESP',
    eps: 'CAT-EPS',
    sctr: 'CAT-SCT',
    lugar: 'CAT-LUG',
    tipo_servicio: 'CAT-TIP',
    estado_servicio: 'CAT-EST',
    contrato: 'CAT-CON',
    nivel: 'CAT-NIV'
  };

  // Formulario agregar
  showAddForm = false;
  newValor = '';
  addError = '';

  // Modal renombrar
  showRenameModal = false;
  renamingItem: CatalogoItem | null = null;
  renameValor = '';
  renameError = '';

  // Notificación / Aviso de resultado
  feedbackMsg = '';
  feedbackType: 'ok' | 'err' = 'ok';

  currentMeta = computed(() => {
    return this.catalogMeta[this.activeTab()] || { label: 'Catálogo', desc: '' };
  });

  currentItems = computed<CatalogoItem[]>(() => {
    const tipo = this.activeTab();
    return this.dbService.catalogos()
      .filter(c => c.tipo === tipo && c.activo !== false)
      .sort((a, b) => (a.orden ?? 99) - (b.orden ?? 99));
  });

  setTab(tab: string) {
    this.activeTab.set(tab);
    this.showAddForm = false;
    this.addError = '';
    this.feedbackMsg = '';
  }

  hasDemo(key: string): boolean {
    const demos = this.demoValues[key];
    if (!demos) return false;
    const items = this.dbService.catalogos().filter(c => c.tipo === key);
    return items.some(it => demos.includes(it.valor));
  }

  isDemo(it: CatalogoItem): boolean {
    const demos = this.demoValues[it.tipo];
    return !!(demos && demos.includes(it.valor));
  }

  // ── Cálculo de usos en registros ──────────────────
  countUsages(it: CatalogoItem): number {
    const val = it.valor.trim().toLowerCase();
    const tipo = it.tipo;

    switch (tipo) {
      case 'vendedor':
        return this.dbService.servicios().filter(s => (s.vendedor || '').trim().toLowerCase() === val).length;
      case 'especialidad':
        return this.dbService.tecnicos().filter(t => (t.especialidad || '').trim().toLowerCase() === val).length;
      case 'tipo_servicio':
        return this.dbService.servicios().filter(s => (s.tipo || '').trim().toLowerCase() === val).length;
      case 'estado_servicio':
        return this.dbService.servicios().filter(s => (s.estado || '').trim().toLowerCase() === val).length;
      case 'lugar':
        return this.dbService.servicios().filter(s => (s.lugar || '').trim().toLowerCase() === val).length;
      case 'eps':
        return this.dbService.tecnicos().filter(t => (t.eps || '').trim().toLowerCase() === val).length;
      case 'sctr':
        return this.dbService.tecnicos().filter(t => (t.arl || '').trim().toLowerCase() === val).length;
      case 'contrato':
        return this.dbService.tecnicos().filter(t => (t.contrato || '').trim().toLowerCase() === val).length;
      case 'nivel':
        return this.dbService.tecnicos().filter(t => (t.nivel || '').trim().toLowerCase() === val).length;
      default:
        return 0;
    }
  }

  getUsosText(it: CatalogoItem): string {
    const u = this.countUsages(it);
    return u > 0 ? `en uso en ${u} registro${u === 1 ? '' : 's'}` : 'sin uso';
  }

  // ── Agregar Nuevo ─────────────────────────────────
  toggleAddForm() {
    this.showAddForm = !this.showAddForm;
    this.newValor = '';
    this.addError = '';
  }

  cancelAdd() {
    this.showAddForm = false;
    this.newValor = '';
    this.addError = '';
  }

  async saveNew() {
    this.addError = '';
    const v = this.newValor.trim();
    if (!v) {
      this.addError = 'Escribe un nombre para el elemento.';
      return;
    }

    const tipo = this.activeTab();
    const existing = this.dbService.catalogos().some(
      c => c.tipo === tipo && c.valor.trim().toLowerCase() === v.toLowerCase() && c.activo !== false
    );
    if (existing) {
      this.addError = 'Ya existe un registro con ese nombre en este catálogo.';
      return;
    }

    const pfx = this.prefixMap[tipo] || 'CAT';
    const all = this.dbService.catalogos().filter(c => c.tipo === tipo);
    const nextNum = all.length + 1;
    const nextId = `${pfx}-${String(nextNum).padStart(3, '0')}`;

    const newItem: CatalogoItem = {
      id: nextId,
      tipo,
      valor: v,
      orden: nextNum,
      activo: true,
      creado: new Date().toISOString()
    };

    await this.dbService.upsert('catalogos', newItem);

    this.showAddForm = false;
    this.newValor = '';
    this.feedbackType = 'ok';
    this.feedbackMsg = `"${v}" agregado. Ya aparece en los desplegables del sistema.`;
  }

  // ── Renombrar ─────────────────────────────────────
  startRename(it: CatalogoItem) {
    this.renamingItem = it;
    this.renameValor = it.valor;
    this.renameError = '';
    this.showRenameModal = true;
  }

  closeRenameModal() {
    this.showRenameModal = false;
    this.renamingItem = null;
    this.renameValor = '';
    this.renameError = '';
  }

  async saveRename() {
    this.renameError = '';
    if (!this.renamingItem) return;

    const nv = this.renameValor.trim();
    if (!nv) {
      this.renameError = 'El nombre no puede estar vacío.';
      return;
    }

    const oldVal = this.renamingItem.valor;
    if (nv.toLowerCase() === oldVal.toLowerCase()) {
      this.closeRenameModal();
      return;
    }

    const tipo = this.renamingItem.tipo;
    const exists = this.dbService.catalogos().some(
      c => c.tipo === tipo && c.id !== this.renamingItem!.id && c.valor.trim().toLowerCase() === nv.toLowerCase() && c.activo !== false
    );
    if (exists) {
      this.renameError = 'Ya existe otro elemento con ese nombre en este catálogo.';
      return;
    }

    // 1. Actualizar catálogo
    const updatedCat: CatalogoItem = {
      ...this.renamingItem,
      valor: nv
    };
    await this.dbService.upsert('catalogos', updatedCat);

    // 2. Cascada en registros asociados si aplica
    let affectedCount = 0;
    if (tipo === 'vendedor') {
      const servicios = this.dbService.servicios().filter(s => s.vendedor === oldVal);
      for (const s of servicios) {
        await this.dbService.upsert('servicios', { ...s, vendedor: nv });
        affectedCount++;
      }
    } else if (tipo === 'especialidad') {
      const tecnicos = this.dbService.tecnicos().filter(t => t.especialidad === oldVal);
      for (const t of tecnicos) {
        await this.dbService.upsert('tecnicos', { ...t, especialidad: nv });
        affectedCount++;
      }
    } else if (tipo === 'lugar') {
      const servicios = this.dbService.servicios().filter(s => s.lugar === oldVal);
      for (const s of servicios) {
        await this.dbService.upsert('servicios', { ...s, lugar: nv });
        affectedCount++;
      }
    } else if (tipo === 'tipo_servicio') {
      const servicios = this.dbService.servicios().filter(s => s.tipo === oldVal);
      for (const s of servicios) {
        await this.dbService.upsert('servicios', { ...s, tipo: nv });
        affectedCount++;
      }
    } else if (tipo === 'estado_servicio') {
      const servicios = this.dbService.servicios().filter(s => s.estado === oldVal);
      for (const s of servicios) {
        await this.dbService.upsert('servicios', { ...s, estado: nv });
        affectedCount++;
      }
    } else if (tipo === 'eps') {
      const tecnicos = this.dbService.tecnicos().filter(t => t.eps === oldVal);
      for (const t of tecnicos) {
        await this.dbService.upsert('tecnicos', { ...t, eps: nv });
        affectedCount++;
      }
    } else if (tipo === 'sctr') {
      const tecnicos = this.dbService.tecnicos().filter(t => t.arl === oldVal);
      for (const t of tecnicos) {
        await this.dbService.upsert('tecnicos', { ...t, arl: nv });
        affectedCount++;
      }
    } else if (tipo === 'contrato') {
      const tecnicos = this.dbService.tecnicos().filter(t => t.contrato === oldVal);
      for (const t of tecnicos) {
        await this.dbService.upsert('tecnicos', { ...t, contrato: nv });
        affectedCount++;
      }
    } else if (tipo === 'nivel') {
      const tecnicos = this.dbService.tecnicos().filter(t => t.nivel === oldVal);
      for (const t of tecnicos) {
        await this.dbService.upsert('tecnicos', { ...t, nivel: nv });
        affectedCount++;
      }
    }

    this.closeRenameModal();
    this.feedbackType = 'ok';
    this.feedbackMsg = affectedCount > 0
      ? `Renombrado. Los ${affectedCount} registros que tenían "${oldVal}" quedaron reasignados a "${nv}".`
      : `Renombrado a "${nv}".`;
  }

  // ── Eliminar ──────────────────────────────────────
  async deleteItem(it: CatalogoItem) {
    const usos = this.countUsages(it);
    if (usos > 0) {
      this.feedbackType = 'err';
      this.feedbackMsg = `No se puede eliminar "${it.valor}": está en uso en ${usos} registro${usos === 1 ? '' : 's'}. Renómbralo o reasigna esos registros primero.`;
      return;
    }

    if (confirm(`¿Estás seguro de eliminar "${it.valor}" del catálogo?`)) {
      await this.dbService.remove('catalogos', it.id);
      this.feedbackType = 'ok';
      this.feedbackMsg = `"${it.valor}" eliminado del catálogo.`;
    }
  }
}
