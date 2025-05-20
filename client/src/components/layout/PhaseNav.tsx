import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useCourse } from "@/context/CourseContext";
import { Phase } from "@/types";

interface PhaseNavProps {
  currentPhase: Phase;
  title: string;
  description: string;
  onPrevious?: () => void;
  onNext?: () => Promise<void> | void;
}

export default function PhaseNav({ 
  currentPhase, 
  title, 
  description, 
  onPrevious,
  onNext 
}: PhaseNavProps) {
  const { course, moveToNextPhase } = useCourse();
  const [location, navigate] = useLocation();

  const handlePrevious = () => {
    if (onPrevious) {
      onPrevious();
    } else if (currentPhase > 1) {
      navigate(`/phase${currentPhase - 1}`);
    }
  };

  const handleNext = async () => {
    if (onNext) {
      await onNext();
    } else {
      moveToNextPhase();
      navigate(`/phase${currentPhase + 1}`);
    }
  };

  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h2 className="text-xl font-heading font-semibold text-neutral-800">{title}</h2>
        <p className="text-sm text-neutral-600 mt-1">{description}</p>
      </div>
      <div className="flex items-center space-x-3">
        {currentPhase > 1 && (
          <Button 
            variant="outline" 
            onClick={handlePrevious}
            className="flex items-center"
          >
            <span className="material-icons text-sm mr-1">arrow_back</span>
            Previous Phase
          </Button>
        )}
        {currentPhase < 5 && (
          <Button 
            onClick={handleNext}
            className="flex items-center"
          >
            Next Phase
            <span className="material-icons text-sm ml-1">arrow_forward</span>
          </Button>
        )}
      </div>
    </div>
  );
}
