import { useCourse } from "@/context/CourseContext";
import { Phase } from "@/types";

const PHASE_NAMES = ["Strategy", "Structure", "Content", "Evaluation", "Review"];

export default function WorkflowProgress() {
  const { course } = useCourse();

  if (!course) return null;

  const currentPhase = course.currentPhase;
  const progress = (currentPhase / 5) * 100;

  return (
    <div className="mb-8 bg-white p-4 rounded-lg shadow-sm border border-neutral-200">
      <h2 className="text-lg font-heading font-medium mb-4 text-neutral-800">Course Creation Progress</h2>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4">
        <div className="flex items-center space-x-2 mb-2 sm:mb-0">
          <span className="text-primary material-icons">tune</span>
          <span className="text-sm font-medium">Current Project: <span className="text-primary">{course.title || "New Course"}</span></span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-neutral-600">Overall Progress:</span>
          <div className="w-40 h-2 bg-neutral-200 rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full" style={{ width: `${progress}%` }}></div>
          </div>
          <span className="text-xs font-medium text-neutral-500">{currentPhase}/5 Phases</span>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
        {[1, 2, 3, 4, 5].map((phase) => (
          <PhaseStep 
            key={phase} 
            phase={phase as Phase} 
            currentPhase={currentPhase}
            name={PHASE_NAMES[phase - 1]}
          />
        ))}
      </div>
    </div>
  );
}

interface PhaseStepProps {
  phase: Phase;
  currentPhase: Phase;
  name: string;
}

function PhaseStep({ phase, currentPhase, name }: PhaseStepProps) {
  const isActive = phase <= currentPhase;
  const status = phase < currentPhase ? "Completed" : phase === currentPhase ? "In Progress" : "Pending";

  return (
    <div 
      className={`flex flex-col items-center p-3 rounded-md ${
        isActive 
          ? "bg-primary-50 border-2 border-primary" 
          : "bg-neutral-100 border border-neutral-300"
      }`}
    >
      <div 
        className={`flex items-center justify-center w-8 h-8 rounded-full mb-2 ${
          isActive 
            ? "bg-primary text-white" 
            : "bg-neutral-300 text-neutral-600"
        }`}
      >
        <span className="text-sm font-bold">{phase}</span>
      </div>
      <h3 className="text-sm font-medium text-center">{name}</h3>
      <span className={`text-xs ${
        isActive ? "text-primary-700" : "text-neutral-500"
      }`}>
        {status}
      </span>
    </div>
  );
}
