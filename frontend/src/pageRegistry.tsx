import React from 'react';
import { Dashboard } from './components/Dashboard';
import { Archive } from './components/Archive';
import { ActionManagement } from './components/ActionManagement';
import { Reports } from './components/Reports';
import { AIInsights } from './components/AIInsights';
import { AIKennisbank } from './components/AIKennisbank';
import { AdminManagement } from './components/AdminManagement';
import { KPIDashboard } from './components/KPIDashboard';
import { Schedule } from './components/Schedule';
import { AdminSchedule } from './components/AdminSchedule';

/**
 * Centrale koppeling: `NavItem.id` (navigationConfig) → paginacomponent.
 *
 * Stappen voor een nieuwe pagina:
 * 1. navigationConfig.tsx — item in getNavigationItems() (uniek `id`, rollen, icoon).
 * 2. components/JouwPagina.tsx — je scherm.
 * 3. Onderstaand object — regel toevoegen: [jouw-id]: JouwPagina,
 *
 * Uitzondering: zelfde route, andere component per rol (zoals schedule) → zie renderPage().
 */
const PAGE_COMPONENTS: Record<string, React.ComponentType> = {
  dashboard: Dashboard,
  incidents: Archive,
  archive: Archive,
  actions: ActionManagement,
  admin: AdminManagement,
  reports: Reports,
  'ai-insights': AIInsights,
  'ai-kennisbank': AIKennisbank,
  'kpi-dashboard': KPIDashboard
};

type UserLike = { role_name: string } | null | undefined;

export function renderPage(currentPage: string, user: UserLike): React.ReactNode {
  if (currentPage === 'schedule') {
    return user?.role_name === 'Admin' ? <AdminSchedule /> : <Schedule />;
  }
  const Comp = PAGE_COMPONENTS[currentPage] ?? Dashboard;
  return <Comp />;
}
