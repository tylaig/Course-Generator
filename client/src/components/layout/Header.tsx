import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { useState, useEffect } from "react";
import { Database, AlertCircle, CheckCircle } from "lucide-react";

export default function Header() {
  const [dbStatus, setDbStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');

  // Verificar status do PostgreSQL
  useEffect(() => {
    const checkDatabaseStatus = async () => {
      try {
        const response = await fetch('/api/database-status');
        if (response.ok) {
          const data = await response.json();
          setDbStatus(data.connected ? 'connected' : 'disconnected');
        } else {
          setDbStatus('disconnected');
        }
      } catch (error) {
        setDbStatus('disconnected');
      }
    };

    checkDatabaseStatus();
    // Verificar a cada 30 segundos
    const interval = setInterval(checkDatabaseStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = () => {
    switch (dbStatus) {
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'disconnected':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Database className="h-4 w-4 text-yellow-600 animate-pulse" />;
    }
  };

  const getStatusBadge = () => {
    switch (dbStatus) {
      case 'connected':
        return (
          <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50">
            {getStatusIcon()}
            <span className="ml-1">PostgreSQL Conectado</span>
          </Badge>
        );
      case 'disconnected':
        return (
          <Badge variant="outline" className="text-red-700 border-red-300 bg-red-50">
            {getStatusIcon()}
            <span className="ml-1">PostgreSQL Desconectado</span>
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-yellow-700 border-yellow-300 bg-yellow-50">
            {getStatusIcon()}
            <span className="ml-1">Verificando...</span>
          </Badge>
        );
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 py-3 px-6 fixed top-0 left-0 right-0 z-10 h-16">
      <div className="flex justify-between items-center h-full">
        <Link href="/">
          <div className="flex items-center cursor-pointer">
            <span className="material-icons text-primary text-2xl mr-2">school</span>
            <h1 className="text-xl font-semibold text-slate-800">Gerador de Cursos com IA</h1>
          </div>
        </Link>
        
        <div className="flex items-center">
          <div className="flex items-center space-x-3">
            {/* Status do PostgreSQL */}
            {getStatusBadge()}
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