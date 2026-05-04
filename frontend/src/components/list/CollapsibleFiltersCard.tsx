import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';

type Props = {
  title?: string;
  description?: string;
  /** Aantal ingestelde filters (badge op de kaartkop) */
  activeCount?: number;
  /** Standaard ingeklapt — ook op desktop — zodat de lijst eerst rustig blijft */
  defaultOpen?: boolean;
  /** Wis-knop onderaan de inhoud wordt door de ouder geleverd als child; dit is een snelle wis in de kop */
  onQuickClear?: () => void;
  /** Onder lg: geen kaartkop/tekst — alleen de filters-knop (lijst blijft rustig op telefoon). */
  minimalMobileChrome?: boolean;
  children: React.ReactNode;
};

/**
 * Dezelfde filter-workflow voor Incidenten + Acties: filters niet vol in beeld bij openen,
 * wel één tik om uit te klappen.
 */
export const CollapsibleFiltersCard: React.FC<Props> = ({
  title = 'Filters',
  description = 'Verfijn wat je wilt zien (optioneel)',
  activeCount = 0,
  defaultOpen = false,
  onQuickClear,
  minimalMobileChrome = false,
  children
}) => {
  const [open, setOpen] = useState(defaultOpen);

  const cardMobile =
    minimalMobileChrome &&
    'max-lg:border-0 max-lg:bg-transparent max-lg:p-0 max-lg:shadow-none max-lg:ring-0';

  return (
    <Card className={`border-slate-200/85 shadow-card ring-slate-950/[0.03] lg:shadow-none ${cardMobile || ''}`}>
      <CardHeader className={`space-y-0 pb-2 ${minimalMobileChrome ? 'max-lg:p-0 max-lg:pb-0' : ''}`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className={`min-w-0 ${minimalMobileChrome ? 'hidden lg:block' : ''}`}>
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-base sm:text-lg">{title}</CardTitle>
              {!open && activeCount > 0 && (
                <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[11px] font-semibold leading-none text-white">
                  {activeCount} actief
                </span>
              )}
            </div>
            <CardDescription className="mt-1 text-xs sm:text-sm">{description}</CardDescription>
          </div>
          <div
            className={`flex shrink-0 flex-wrap items-center gap-2 sm:ml-auto ${minimalMobileChrome ? 'max-lg:w-full' : ''}`}
          >
            {minimalMobileChrome && !open && activeCount > 0 && (
              <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[11px] font-semibold leading-none text-white lg:hidden">
                {activeCount} actief
              </span>
            )}
            {activeCount > 0 && open && onQuickClear && (
              <Button variant="ghost" size="sm" type="button" className="h-9 touch-manipulation" onClick={onQuickClear}>
                Alles wissen
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={`h-10 touch-manipulation ${minimalMobileChrome ? 'max-lg:min-w-0 max-lg:flex-1 sm:min-w-[8.5rem]' : 'min-w-[8.5rem]'}`}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
            >
              <svg
                className="mr-2 h-4 w-4 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                />
              </svg>
              {open ? 'Verberg filters' : 'Filters tonen'}
            </Button>
          </div>
        </div>
      </CardHeader>
      {open && (
        <CardContent
          className={`border-t border-slate-100 pt-4 ${minimalMobileChrome ? 'max-lg:mt-3 max-lg:rounded-xl max-lg:border max-lg:border-border/80 max-lg:bg-card max-lg:p-4 max-lg:pt-4' : ''}`}
        >
          {children}
        </CardContent>
      )}
    </Card>
  );
};
