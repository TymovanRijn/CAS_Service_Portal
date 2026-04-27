import React from 'react';

/**
 * Nieuwe schermen aan de app hangen (zijbalk + mobiele tabs + titel blijven synchroon):
 *
 * 1. Hier: in `getNavigationItems()` een `NavItem` toevoegen met uniek `id` (koppel aan rollen).
 * 2. `pageRegistry.tsx`: dezelfde `id` als key in `PAGE_COMPONENTS`, wijs naar je component
 *    (of pas `renderPage` aan als één route per rol een andere component nodig heeft).
 * 3. Nieuwe component: `src/components/…` — geen extra navigatielaag nodig.
 */

export interface NavItem {
  id: string;
  /** Volledige naam (zijbalk) */
  name: string;
  /** Kort label voor mobiele tabbalk; default = name */
  shortLabel?: string;
  icon: React.ReactNode;
  description: string;
  roles: string[];
}

/** Eén bron van waarheid voor zijbalk, mobiele tabbalk, paginatitels. */
export function getNavigationItems(user: { role_name: string }): NavItem[] {
  const baseItems: NavItem[] = [
    {
      id: 'dashboard',
      name: 'Dashboard',
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2 2z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" />
        </svg>
      ),
      description: 'Overzicht van vandaag',
      roles: ['SAC', 'Admin', 'Stakeholder']
    }
  ];

  if (user.role_name === 'SAC' || user.role_name === 'Admin') {
    baseItems.push(
      {
        id: 'incidents',
        name: 'Incidenten',
        icon: (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        ),
        description: 'Beheer alle incidenten',
        roles: ['SAC', 'Admin']
      },
      {
        id: 'actions',
        name: 'Acties',
        icon: (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        ),
        description: 'Beheer acties',
        roles: ['SAC', 'Admin']
      },
      {
        id: 'schedule',
        name: user.role_name === 'Admin' ? 'Roosterbeheer' : 'Mijn Rooster',
        shortLabel: 'Rooster',
        icon: (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        ),
        description: user.role_name === 'Admin' ? 'Beheer alle roosters' : 'Bekijk en beheer je rooster',
        roles: ['SAC', 'Admin']
      }
    );
  }

  if (user.role_name === 'Admin') {
    baseItems.push({
      id: 'admin',
      name: 'Admin Management',
      shortLabel: 'Admin',
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      description: 'Gebruikers, categorieën en locaties',
      roles: ['Admin']
    });
  }

  if (user.role_name === 'Stakeholder' || user.role_name === 'Admin') {
    baseItems.push(
      {
        id: 'kpi-dashboard',
        name: 'KPI Dashboard',
        shortLabel: 'KPI',
        icon: (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
          </svg>
        ),
        description: 'Prestatie-indicatoren en analytics',
        roles: ['Stakeholder', 'Admin']
      },
      {
        id: 'reports',
        name: 'Rapporten',
        icon: (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        ),
        description: 'Analyses en rapporten',
        roles: ['Stakeholder', 'Admin']
      }
    );
  }

  baseItems.push(
    {
      id: 'ai-insights',
      name: 'AI Insights',
      shortLabel: 'AI',
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
      description: 'AI-gegenereerde inzichten',
      roles: ['SAC', 'Admin', 'Stakeholder']
    },
    {
      id: 'ai-kennisbank',
      name: 'AI Kennisbank',
      shortLabel: 'Kennis',
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
      description: 'Kennisbank en AI Orakel',
      roles: ['SAC', 'Admin', 'Stakeholder']
    }
  );

  return baseItems.filter((item) => item.roles.includes(user.role_name));
}

export function getPageTitle(
  currentPage: string,
  user: { role_name: string }
): string {
  const items = getNavigationItems(user);
  const found = items.find((i) => i.id === currentPage);
  return found?.name ?? 'CAS Portal';
}
