import { Injectable, signal, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';

export interface BaseRequirement {
  nombre: string;
  vence: string;
  estado: 'vigente' | 'vencido' | 'en-tramite' | 'pendiente';
}

export interface ClientRequirement {
  nombre: string;
  reqs: BaseRequirement[];
}

export interface Tecnico {
  id: string;
  nombre: string;
  doc: string;
  especialidad: string;
  nivel: string;
  contrato: string;
  ingreso: string;
  tel: string;
  email: string;
  arl: string;
  eps: string;
  obs: string;
  baseReqs: BaseRequirement[];
  clientes: ClientRequirement[];
}

export interface Servicio {
  id: string;
  oc: string;
  cliente: string;
  desc: string;
  tipo: 'Preventivo' | 'Correctivo' | 'Emergencia';
  valor: number;
  costo: number;
  unidad: string;
  cc: string;
  vendedor: string;
  ot: string;
  lugar: string;
  fp: string;
  ff: string;
  hhp: number;
  hhe: number;
  ubp?: number | null;
  ubr?: number | null;
  estado: 'Finalizado' | 'En progreso' | 'En riesgo' | 'Programado';
  creado: string;
  tecnico?: string;
}

export interface EppItem {
  desc: string;
  qty: number;
  cu: number;
}

export interface SolicEpp {
  id: string;
  ov: string;
  tecnico: string;
  fecha: string;
  obs: string;
  estado: 'Entregado' | 'En tránsito' | 'Pendiente';
  items: EppItem[];
}

export interface Viatico {
  id: string;
  ov: string;
  tecnico: string;
  concepto: string;
  dias: number;
  vpd: number;
  fecha: string;
  estado: 'Liquidado' | 'En curso';
}

export interface Insumo {
  id: string;
  ov: string;
  insumo: string;
  unidad: string;
  qty: number;
  cu: number;
  proveedor: string;
  estado: 'Utilizado' | 'Parcial';
}

export interface Repuesto {
  id: string;
  ov: string;
  ref: string;
  desc: string;
  qty: number;
  cu: number;
  proveedor: string;
  garantia: string;
  estado: 'Instalado' | 'En pedido';
}

const REQ_BASE_DEFAULT: BaseRequirement[] = [
  { nombre:"Contrato firmado",  vence:"2026-12-31", estado:"vigente" },
  { nombre:"EMO",               vence:"2027-03-15", estado:"vigente" },
  { nombre:"Trabajo en alturas",vence:"2026-11-20", estado:"vigente" },
  { nombre:"Riesgo eléctrico BT",vence:"2026-09-01",estado:"vigente" },
];

const REQ_CLIENTE_DEFAULT: { [key: string]: BaseRequirement[] } = {
  Drummond:           [{ nombre:"Inducción Drummond",   vence:"2026-09-01", estado:"vigente"  },
                       { nombre:"Espacios confinados",  vence:"2026-03-10", estado:"vencido"  },
                       { nombre:"Izaje de cargas",      vence:"2026-10-01", estado:"vigente"  }],
  Cerrejón:           [{ nombre:"Inducción Cerrejón",   vence:"2025-12-01", estado:"vencido"  },
                       { nombre:"Izaje de cargas",      vence:"2026-02-28", estado:"vencido"  },
                       { nombre:"COPASST cliente",      vence:"2026-11-01", estado:"vigente"  }],
  Ecopetrol:          [{ nombre:"Inducción Ecopetrol",  vence:"2026-09-15", estado:"vigente"  },
                       { nombre:"H2S Alive",            vence:"2027-02-20", estado:"vigente"  },
                       { nombre:"SART",                 vence:"2026-08-10", estado:"vigente"  }],
  Promigas:           [{ nombre:"Inducción Promigas",   vence:"2026-11-01", estado:"vigente"  },
                       { nombre:"Manejo seguro de gas", vence:"2026-10-15", estado:"vigente"  }],
  Glencore:           [{ nombre:"Inducción Glencore",   vence:"2026-10-20", estado:"vigente"  },
                       { nombre:"Izaje de cargas",      vence:"2026-10-01", estado:"vigente"  }],
  "Carbones del Caribe":[{nombre:"Inducción CBC",       vence:"2026-08-01", estado:"vigente"  },
                       { nombre:"Espacios confinados",  vence:"2026-06-01", estado:"vigente"  }],
};

const SEED = {
  servicios: [
    { id:"OV-2601",oc:"OC-4501",cliente:"Drummond",desc:"Mtto preventivo puente grúa birrail 10T",tipo:"Preventivo",valor:48500000,costo:23500000,unidad:"Puente grúa birrail",cc:"CC-2400",vendedor:"Carlos Ruiz",ot:"OT-1201",lugar:"Puerto Drummond",fp:"2026-05-10",ff:"2026-05-28",hhp:120,hhe:118,ubp:51.5,ubr:51.5,estado:"Finalizado",creado:"2026-05-01"},
    { id:"OV-2602",oc:"OC-3812",cliente:"Cerrejón",desc:"Correctivo polipasto 5T — falla motor",tipo:"Correctivo",valor:32100000,costo:15800000,unidad:"Polipasto eléctrico 5T",cc:"CC-2401",vendedor:"Ana Martínez",ot:"OT-1202",lugar:"La Guajira",fp:"2026-05-20",ff:"2026-06-15",hhp:80,hhe:64,ubp:50.8,ubr:null,estado:"En progreso",creado:"2026-05-15"},
    { id:"OV-2603",oc:"OC-7203",cliente:"Ecopetrol",desc:"Emergencia tecle eléctrico 2T",tipo:"Emergencia",valor:18200000,costo:8750000,unidad:"Tecle eléctrico 2T",cc:"CC-2402",vendedor:"Pedro Gómez",ot:"OT-1203",lugar:"Barrancabermeja",fp:"2026-06-01",ff:"2026-06-25",hhp:40,hhe:28,ubp:51.9,ubr:null,estado:"En progreso",creado:"2026-05-28"},
    { id:"OV-2604",oc:"OC-2201",cliente:"Carbones del Caribe",desc:"Correctivo grúa pórtico 25T",tipo:"Correctivo",valor:75800000,costo:36500000,unidad:"Grúa pórtico 25T",cc:"CC-2403",vendedor:"Carlos Ruiz",ot:"OT-1204",lugar:"Santa Marta",fp:"2026-04-15",ff:"2026-05-20",hhp:200,hhe:195,ubp:51.8,ubr:51.8,estado:"En riesgo",creado:"2026-04-10"},
    { id:"OV-2605",oc:"OC-5540",cliente:"Promigas",desc:"Mtto preventivo 3 puentes grúa",tipo:"Preventivo",valor:92400000,costo:44800000,unidad:"Puentes grúa (x3)",cc:"CC-2400",vendedor:"Ana Martínez",ot:"OT-1205",lugar:"Barranquilla",fp:"2026-05-05",ff:"2026-05-30",hhp:280,hhe:280,ubp:51.5,ubr:51.5,estado:"Finalizado",creado:"2026-04-28"},
    { id:"OV-2606",oc:"OC-8810",cliente:"Glencore",desc:"Inspección y cambio cables puente grúa",tipo:"Preventivo",valor:22600000,costo:10900000,unidad:"Puente grúa monorriel",cc:"CC-2404",vendedor:"Pedro Gómez",ot:"OT-1206",lugar:"Bogotá",fp:"2026-06-03",ff:"2026-06-20",hhp:60,hhe:20,ubp:51.8,ubr:null,estado:"En progreso",creado:"2026-06-01"},
  ],
  tecnicos: [
    { id:"TEC-001",nombre:"Juan Torres",doc:"1090456789",especialidad:"Técnico electromecánico",
      nivel:"Senior (5–10 años)",contrato:"Indefinido",ingreso:"2023-03-01",
      tel:"310 234 5678",email:"j.torres@movitecnica.com",arl:"Positiva",eps:"Sura",obs:"",
      baseReqs: REQ_BASE_DEFAULT.map(r=>({...r})),
      clientes: [
        { nombre:"Drummond", reqs: REQ_CLIENTE_DEFAULT['Drummond'].map(r=>({...r})) },
        { nombre:"Cerrejón", reqs: REQ_CLIENTE_DEFAULT['Cerrejón'].map(r=>({...r})) },
      ],
    },
    { id:"TEC-002",nombre:"Mario López",doc:"79654321",especialidad:"Electricista industrial",
      nivel:"Técnico (2–5 años)",contrato:"Término fijo",ingreso:"2024-01-15",
      tel:"315 876 5432",email:"m.lopez@movitecnica.com",arl:"Sura",eps:"Compensar",obs:"",
      baseReqs: REQ_BASE_DEFAULT.map((r,i)=>({...r,estado:i===2?"vencido":r.estado})),
      clientes: [
        { nombre:"Cerrejón", reqs: REQ_CLIENTE_DEFAULT['Cerrejón'].map(r=>({...r})) },
        { nombre:"Ecopetrol",reqs: REQ_CLIENTE_DEFAULT['Ecopetrol'].map(r=>({...r})) },
      ],
    },
    { id:"TEC-003",nombre:"Andrés Díaz",doc:"1020304050",especialidad:"Mecánico de mantenimiento",
      nivel:"Técnico (2–5 años)",contrato:"Obra o labor",ingreso:"2024-06-01",
      tel:"301 654 3210",email:"a.diaz@movitecnica.com",arl:"Colmena",eps:"Nueva EPS",obs:"",
      baseReqs: REQ_BASE_DEFAULT.map(r=>({...r})),
      clientes: [
        { nombre:"Ecopetrol",reqs: REQ_CLIENTE_DEFAULT['Ecopetrol'].map(r=>({...r})) },
        { nombre:"Promigas", reqs: REQ_CLIENTE_DEFAULT['Promigas'].map(r=>({...r})) },
      ],
    },
    { id:"TEC-004",nombre:"Luis Peña",doc:"1045678901",especialidad:"Operador de grúas",
      nivel:"Experto (+10 años)",contrato:"Indefinido",ingreso:"2022-08-15",
      tel:"316 111 2233",email:"l.pena@movitecnica.com",arl:"Positiva",eps:"Sura",obs:"Certificado ASME B30",
      baseReqs: REQ_BASE_DEFAULT.map(r=>({...r})),
      clientes: [
        { nombre:"Drummond",reqs: REQ_CLIENTE_DEFAULT['Drummond'].map(r=>({...r,estado:"vigente"})) },
        { nombre:"Glencore", reqs: REQ_CLIENTE_DEFAULT['Glencore'].map(r=>({...r})) },
      ],
    },
  ],
  solicEpp: [
    { id:"SOL-001",ov:"OV-2601",tecnico:"Juan Torres",fecha:"2026-05-08",obs:"",estado:"Entregado",
      items:[{desc:"Arnés de seguridad tipo X",qty:3,cu:85000},{desc:"Casco dieléctrico clase E",qty:3,cu:45000},{desc:"Guantes de nitrilo",qty:6,cu:8000}] },
    { id:"SOL-002",ov:"OV-2602",tecnico:"Mario López",fecha:"2026-05-19",obs:"Verificar talla de botas",estado:"En tránsito",
      items:[{desc:"Botas dieléctricas T42",qty:2,cu:180000},{desc:"Protector facial",qty:2,cu:35000}] },
    { id:"SOL-003",ov:"OV-2603",tecnico:"Andrés Díaz",fecha:"2026-05-31",obs:"",estado:"Pendiente",
      items:[{desc:"Protector auditivo 3M 1100",qty:4,cu:8500},{desc:"Lentes de seguridad",qty:4,cu:18000}] },
  ],
  viaticos: [
    { id:"VIA-001",ov:"OV-2601",tecnico:"Juan Torres",concepto:"Alimentación + hospedaje",dias:18,vpd:120000,fecha:"2026-05-10",estado:"Liquidado"},
    { id:"VIA-002",ov:"OV-2602",tecnico:"Mario López",concepto:"Alimentación + hospedaje",dias:26,vpd:120000,fecha:"2026-05-20",estado:"En curso"},
    { id:"VIA-003",ov:"OV-2603",tecnico:"Andrés Díaz",concepto:"Transporte + alimentación",dias:24,vpd:95000,fecha:"2026-06-01",estado:"En curso"},
  ],
  insumos: [
    { id:"INS-001",ov:"OV-2601",insumo:"Grasa SKF LGEP 2",unidad:"Kg",qty:5,cu:28500,proveedor:"Distribuidora SKF",estado:"Utilizado"},
    { id:"INS-002",ov:"OV-2601",insumo:"Aceite hidráulico ISO 46",unidad:"Gal",qty:10,cu:55000,proveedor:"Mobil Colombia",estado:"Utilizado"},
    { id:"INS-003",ov:"OV-2602",insumo:"Limpiador eléctrico WD-40",unidad:"Unid",qty:6,cu:18000,proveedor:"Ferretería Industrial",estado:"Parcial"},
    { id:"INS-004",ov:"OV-2605",insumo:"Cinta aislante 3M 88",unidad:"Rollo",qty:12,cu:9500,proveedor:"3M Colombia",estado:"Utilizado"},
  ],
  repuestos: [
    { id:"REP-001",ov:"OV-2602",ref:"SKF 6308-2RS",desc:"Rodamiento motor principal 40mm",qty:2,cu:145000,proveedor:"SKF Colombia",garantia:"12 meses",estado:"Instalado"},
    { id:"REP-002",ov:"OV-2602",ref:"LEESON C145T17FB10A",desc:"Motor eléctrico 5HP 1800rpm TEFC",qty:1,cu:1850000,proveedor:"Motores & Cía",garantia:"12 meses",estado:"En pedido"},
    { id:"REP-003",ov:"OV-2604",ref:"DEMAG KBH 8/1",desc:"Contactor principal grúa 63A",qty:1,cu:320000,proveedor:"Demag Colombia",garantia:"6 meses",estado:"Instalado"},
    { id:"REP-004",ov:"OV-2605",ref:"SKF 6206-2Z",desc:"Rodamiento carro viajero",qty:4,cu:62000,proveedor:"SKF Colombia",garantia:"12 meses",estado:"Instalado"},
  ],
};

@Injectable({
  providedIn: 'root'
})
export class DbService {
  private supabaseSvc = inject(SupabaseService);
  private supabase = this.supabaseSvc.supabase;

  // Reactive Signals for all 6 collections
  public servicios = signal<Servicio[]>([]);
  public tecnicos = signal<Tecnico[]>([]);
  public solicEpp = signal<SolicEpp[]>([]);
  public viaticos = signal<Viatico[]>([]);
  public insumos = signal<Insumo[]>([]);
  public repuestos = signal<Repuesto[]>([]);

  constructor() {
    this.init();
  }

  private async init() {
    console.log("[DbService] Initializing - Fetching from Supabase...");
    try {
      const [sRes, tRes, eRes, vRes, iRes, rRes] = await Promise.all([
        this.supabase.from('servicios').select('*'),
        this.supabase.from('tecnicos').select('*'),
        this.supabase.from('solic_epp').select('*'),
        this.supabase.from('viaticos').select('*'),
        this.supabase.from('insumos').select('*'),
        this.supabase.from('repuestos').select('*'),
      ]);

      console.log("[DbService] Fetch results:", {
        servicios: sRes.data?.length || 0,
        tecnicos: tRes.data?.length || 0,
        solicEpp: eRes.data?.length || 0,
        viaticos: vRes.data?.length || 0,
        insumos: iRes.data?.length || 0,
        repuestos: rRes.data?.length || 0,
        servicios_error: sRes.error?.message,
        tecnicos_error: tRes.error?.message,
      });

      // Check for RLS issues
      if (tRes.error?.message?.includes('RLS')) {
        console.error("[DbService] RLS Policy Issue Detected on tecnicos table!");
        console.error("[DbService] You may need to disable RLS or create public policies in Supabase");
      }

      // Auto-seed if database is completely empty
      if (sRes.data && sRes.data.length === 0 && tRes.data && tRes.data.length === 0) {
        console.log("[DbService] Database is empty. Starting auto-seed...");
        await this.seedDatabase();
        return; // Will call init() again
      }

      if (sRes.data) this.servicios.set(sRes.data as Servicio[]);

      // Parse JSONB fields that Supabase may return as strings
      if (tRes.data) {
        const parsedTecs = tRes.data.map((t: any) => ({
          ...t,
          baseReqs: this.parseJsonField(t.baseReqs, []),
          clientes:  this.parseJsonField(t.clientes,  []),
        }));
        this.tecnicos.set(parsedTecs as Tecnico[]);
      }

      if (eRes.data) {
        const parsedEpp = eRes.data.map((e: any) => ({
          ...e,
          items: this.parseJsonField(e.items, []),
        }));
        this.solicEpp.set(parsedEpp as SolicEpp[]);
      }

      if (vRes.data) this.viaticos.set(vRes.data as Viatico[]);
      if (iRes.data) this.insumos.set(iRes.data as Insumo[]);
      if (rRes.data) this.repuestos.set(rRes.data as Repuesto[]);
      
      console.log("[DbService] Initialization complete. Signals set.");
    } catch (err) {
      console.error("[DbService] Unexpected error during init:", err);
    }
  }

  /** Safely parse a value that might be a JSON string or already an object/array */
  private parseJsonField<T>(value: any, fallback: T): T {
    if (value === null || value === undefined) return fallback;
    if (typeof value === 'string') {
      try { return JSON.parse(value) as T; } catch { return fallback; }
    }
    if (Array.isArray(value) || typeof value === 'object') return value as T;
    return fallback;
  }

  private async seedDatabase() {
    console.log("[DbService] Starting auto-seed with initial data...");
    try {
      const results = await Promise.all([
        this.supabase.from('servicios').insert(SEED.servicios),
        this.supabase.from('tecnicos').insert(SEED.tecnicos),
        this.supabase.from('solic_epp').insert(SEED.solicEpp),
        this.supabase.from('viaticos').insert(SEED.viaticos),
        this.supabase.from('insumos').insert(SEED.insumos),
        this.supabase.from('repuestos').insert(SEED.repuestos),
      ]);
      
      results.forEach((res, idx) => {
        const tables = ['servicios', 'tecnicos', 'solic_epp', 'viaticos', 'insumos', 'repuestos'];
        if (res.error) {
          console.error(`[DbService] Seed error for ${tables[idx]}:`, res.error);
        } else {
          console.log(`[DbService] Successfully seeded ${tables[idx]}`);
        }
      });
      
      console.log("[DbService] Seed complete. Re-initializing...");
      await this.init();
    } catch (err) {
      console.error("[DbService] Unexpected error during seeding:", err);
    }
  }

  private setSignal(key: string, data: any[]) {
    switch(key) {
      case 'servicios': this.servicios.set(data); break;
      case 'tecnicos': this.tecnicos.set(data); break;
      case 'solicEpp': this.solicEpp.set(data); break;
      case 'viaticos': this.viaticos.set(data); break;
      case 'insumos': this.insumos.set(data); break;
      case 'repuestos': this.repuestos.set(data); break;
    }
  }

  public getCollection(colName: string): any[] {
    switch(colName) {
      case 'servicios': return this.servicios();
      case 'tecnicos': return this.tecnicos();
      case 'solicEpp': return this.solicEpp();
      case 'viaticos': return this.viaticos();
      case 'insumos': return this.insumos();
      case 'repuestos': return this.repuestos();
      default: return [];
    }
  }

  public async upsert(colName: string, item: any) {
    const sbTable = colName === 'solicEpp' ? 'solic_epp' : colName;
    
    console.log(`[DbService] Upserting to ${sbTable}:`, item);
    
    // Para tablas con columnas JSONB, serializar correctamente
    let dataToSave = { ...item };
    
    if (sbTable === 'tecnicos') {
      // Serializar columnas JSONB como strings
      if (dataToSave.baseReqs && typeof dataToSave.baseReqs === 'object') {
        dataToSave.baseReqs = JSON.stringify(dataToSave.baseReqs);
        console.log(`[DbService] Serialized baseReqs as JSON string`);
      }
      if (dataToSave.clientes && typeof dataToSave.clientes === 'object') {
        dataToSave.clientes = JSON.stringify(dataToSave.clientes);
        console.log(`[DbService] Serialized clientes as JSON string`);
      }
    }
    
    if (sbTable === 'solic_epp') {
      if (dataToSave.items && typeof dataToSave.items === 'object') {
        dataToSave.items = JSON.stringify(dataToSave.items);
        console.log(`[DbService] Serialized items as JSON string`);
      }
    }
    
    console.log(`[DbService] Data to save (after serialization):`, JSON.stringify(dataToSave));
    
    // Save to cloud first
    const { data, error } = await this.supabase.from(sbTable).upsert(dataToSave);
    if (error) {
      console.error(`[DbService] Error upserting to ${sbTable}:`, error);
      console.error(`[DbService] Error code:`, error.code);
      console.error(`[DbService] Error message:`, error.message);
      console.error(`[DbService] Full error object:`, JSON.stringify(error));
      return false;
    }
    
    console.log(`[DbService] Successfully upserted to ${sbTable}:`, data);
    
    // Optimistic UI update — use original item (not serialized) for signal
    const list = this.getCollection(colName);
    const exIdx = list.findIndex(x => x.id === item.id);
    let updatedList: any[];
    // For tecnicos, ensure JSONB fields are objects in the signal (not strings)
    let signalItem = { ...item };
    if (colName === 'tecnicos') {
      signalItem.baseReqs = this.parseJsonField(item.baseReqs, []);
      signalItem.clientes  = this.parseJsonField(item.clientes,  []);
    }
    if (colName === 'solicEpp') {
      signalItem.items = this.parseJsonField(item.items, []);
    }
    if (exIdx >= 0) {
      updatedList = list.map((x, i) => i === exIdx ? { ...x, ...signalItem } : x);
      console.log(`[DbService] Updated existing item at index ${exIdx}`);
    } else {
      updatedList = [...list, signalItem];
      console.log(`[DbService] Added new item. New list length: ${updatedList.length}`);
    }
    this.setSignal(colName, updatedList);
    return true;
  }

  public async remove(colName: string, id: string) {
    const sbTable = colName === 'solicEpp' ? 'solic_epp' : colName;
    
    const { error } = await this.supabase.from(sbTable).delete().eq('id', id);
    if (error) {
      console.error('Error deleting from', sbTable, error);
      return;
    }

    const list = this.getCollection(colName);
    const updatedList = list.filter(x => x.id !== id);
    this.setSignal(colName, updatedList);
  }

  // Helper values
  public getClientesList(): string[] {
    return Object.keys(REQ_CLIENTE_DEFAULT);
  }

  public getClienteDefaultReqs(cliente: string): BaseRequirement[] {
    return (REQ_CLIENTE_DEFAULT[cliente] || []).map((r: any) => ({ ...r }));
  }

  public getBaseDefaultReqs(): BaseRequirement[] {
    return REQ_BASE_DEFAULT.map(r => ({ ...r }));
  }
}
