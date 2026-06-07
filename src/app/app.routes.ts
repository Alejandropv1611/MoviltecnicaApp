import { Routes } from '@angular/router';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { ServiciosComponent } from './pages/servicios/servicios.component';
import { KPIsComponent } from './pages/kpis/kpis.component';
import { RecursosComponent } from './pages/recursos/recursos.component';
import { TecnicosComponent } from './pages/tecnicos/tecnicos.component';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'servicios', component: ServiciosComponent },
  { path: 'kpis', component: KPIsComponent },
  { path: 'recursos', component: RecursosComponent },
  { path: 'tecnicos', component: TecnicosComponent },
  { path: '**', redirectTo: 'dashboard' }
];
