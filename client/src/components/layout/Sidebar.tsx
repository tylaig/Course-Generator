import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useCourse } from '@/context/CourseContext';

// Organizing the menu in categories
const courseMenuItems = [
  { label: 'My Courses', icon: 'dashboard', path: '/courses' },
  { label: 'Create New Course', icon: 'add_circle', path: '/new-course' },
  { label: 'LMS View', icon: 'school', path: '/lms-view' },
];

const phasesMenuItems = [
  { label: 'Phase 1: Strategy', icon: 'lightbulb', path: '/phase1', phaseNumber: 1 },
  { label: 'Phase 2: Structure', icon: 'architecture', path: '/phase2', phaseNumber: 2 },
  { label: 'Phase 3: Content', icon: 'article', path: '/phase3', phaseNumber: 3 },
  { label: 'Phase 4: Evaluation', icon: 'quiz', path: '/phase4', phaseNumber: 4 },
  { label: 'Phase 5: Review', icon: 'rate_review', path: '/phase5', phaseNumber: 5 },
];

export default function Sidebar() {
  const [location] = useLocation();
  const { course } = useCourse();
  const [expandedSections, setExpandedSections] = useState({
    courses: true,
    phases: true
  });

  // Function to toggle section expansion
  const toggleSection = (section: 'courses' | 'phases') => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Determine which phase is active
  const currentPhase = course?.currentPhase || 1;

  return (
    <div className="w-64 bg-slate-50 border-r border-slate-200 h-screen fixed left-0 top-0 pt-16 overflow-y-auto">
      <div className="flex flex-col p-4 space-y-4">
        {/* Courses Section */}
        <div className="flex flex-col">
          <button 
            onClick={() => toggleSection('courses')}
            className="flex items-center justify-between w-full p-2 mb-2 bg-slate-100 rounded text-slate-800 font-medium"
          >
            <span className="flex items-center">
              <span className="material-icons text-sm mr-2">library_books</span>
              Courses
            </span>
            <span className="material-icons text-sm">
              {expandedSections.courses ? 'expand_less' : 'expand_more'}
            </span>
          </button>
          
          {expandedSections.courses && (
            <div className="pl-2 mb-2 space-y-1">
              {courseMenuItems.map((item) => (
                <Link key={item.path} href={item.path}>
                  <Button
                    variant={location === item.path ? 'default' : 'ghost'}
                    className={cn(
                      'w-full justify-start text-sm',
                      location === item.path ? 'bg-primary text-white' : 'text-slate-600 hover:text-slate-900'
                    )}
                    size="sm"
                  >
                    <span className="material-icons text-sm mr-2">{item.icon}</span>
                    {item.label}
                  </Button>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Development Phases Section */}
        <div className="flex flex-col">
          <button 
            onClick={() => toggleSection('phases')}
            className="flex items-center justify-between w-full p-2 mb-2 bg-slate-100 rounded text-slate-800 font-medium"
          >
            <span className="flex items-center">
              <span className="material-icons text-sm mr-2">fact_check</span>
              Creation Phases
            </span>
            <span className="material-icons text-sm">
              {expandedSections.phases ? 'expand_less' : 'expand_more'}
            </span>
          </button>
          
          {expandedSections.phases && (
            <div className="pl-2 space-y-1">
              {phasesMenuItems.map((item) => {
                // Determinar se esta fase está disponível
                const isAvailable = course && item.phaseNumber <= currentPhase;
                const isActive = location === item.path;
                
                return (
                  <Link key={item.path} href={isAvailable ? item.path : '#'}>
                    <Button
                      variant={isActive ? 'default' : 'ghost'}
                      className={cn(
                        'w-full justify-start text-sm',
                        isActive ? 'bg-primary text-white' : 
                        isAvailable ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 cursor-not-allowed'
                      )}
                      size="sm"
                      disabled={!isAvailable}
                    >
                      <span className="material-icons text-sm mr-2">{item.icon}</span>
                      {item.label}
                      {item.phaseNumber < currentPhase && (
                        <span className="material-icons text-green-500 ml-auto" style={{ fontSize: '16px' }}>
                          check_circle
                        </span>
                      )}
                      {item.phaseNumber === currentPhase && (
                        <span className="material-icons text-blue-500 ml-auto" style={{ fontSize: '16px' }}>
                          play_circle
                        </span>
                      )}
                    </Button>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="p-4 mt-4">
        <div className="p-4 bg-slate-100 rounded-lg">
          <h4 className="font-medium text-sm text-slate-700 mb-2">Estrutura Pedagógica</h4>
          <p className="text-xs text-slate-500">
            Baseado no framework de design educacional com 5 fases de desenvolvimento sequencial.
          </p>
          {course && (
            <div className="mt-2 pt-2 border-t border-slate-200">
              <p className="text-xs font-medium text-slate-700">Curso Atual:</p>
              <p className="text-xs text-slate-600 truncate">{course.title}</p>
              <div className="mt-1 w-full bg-slate-200 h-1 rounded-full overflow-hidden">
                <div 
                  className="bg-primary h-full rounded-full" 
                  style={{ width: `${course.progress?.overall || 0}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}