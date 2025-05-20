import React from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const menuItems = [
  { label: 'Dashboard', icon: 'dashboard', path: '/' },
  { label: 'Fase 1: Estratégia', icon: 'lightbulb', path: '/phase1' },
  { label: 'Fase 2: Estrutura', icon: 'architecture', path: '/phase2' },
  { label: 'Fase 3: Conteúdo', icon: 'article', path: '/phase3' },
  { label: 'Fase 4: Avaliação', icon: 'quiz', path: '/phase4' },
  { label: 'Fase 5: Revisão', icon: 'rate_review', path: '/phase5' },
  { label: 'Visualização LMS', icon: 'school', path: '/lms-view' },
];

export default function Sidebar() {
  const [location] = useLocation();

  return (
    <div className="w-60 bg-slate-50 border-r border-slate-200 h-screen fixed left-0 top-0 pt-16">
      <div className="flex flex-col p-4 space-y-2">
        {menuItems.map((item) => (
          <Link key={item.path} href={item.path}>
            <Button
              variant={location === item.path ? 'default' : 'ghost'}
              className={cn(
                'w-full justify-start',
                location === item.path ? 'bg-primary text-white' : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <span className="material-icons text-sm mr-2">{item.icon}</span>
              {item.label}
            </Button>
          </Link>
        ))}
      </div>

      <div className="absolute bottom-4 left-0 right-0 p-4">
        <div className="p-4 bg-slate-100 rounded-lg">
          <h4 className="font-medium text-sm text-slate-700 mb-2">Estrutura Pedagógica</h4>
          <p className="text-xs text-slate-500">
            Baseado no framework de design educacional com 5 fases de desenvolvimento.
          </p>
        </div>
      </div>
    </div>
  );
}