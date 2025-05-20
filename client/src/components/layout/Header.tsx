import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function Header() {
  return (
    <header className="bg-white border-b border-gray-200 py-3 px-6 fixed top-0 left-0 right-0 z-10 h-16">
      <div className="flex justify-between items-center h-full">
        <Link href="/">
          <div className="flex items-center cursor-pointer">
            <span className="material-icons text-primary text-2xl mr-2">school</span>
            <h1 className="text-xl font-semibold text-slate-800">AI Course Generator</h1>
          </div>
        </Link>
        
        <div className="flex items-center">
          <div className="flex items-center space-x-3">
            <Link href="/lms-view">
              <Button variant="outline" size="sm">
                <span className="material-icons text-sm mr-1">visibility</span>
                Visualizar LMS
              </Button>
            </Link>
            
            <Button variant="outline" size="sm">
              <span className="material-icons text-sm mr-1">help</span>
              Ajuda
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}