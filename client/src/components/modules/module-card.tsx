import React from "react";
import { CourseModule } from "@/types";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface ModuleCardProps {
  module: CourseModule;
  onEdit: () => void;
  onDelete: () => void;
  onConfigureLessons: () => void;
}

export function ModuleCard({ module, onEdit, onDelete, onConfigureLessons }: ModuleCardProps) {
  // Determinar a cor do status
  const getStatusColor = (status: string) => {
    switch (status) {
      case "not_started":
        return "bg-gray-100 text-gray-800";
      case "in_progress":
        return "bg-blue-100 text-blue-800";
      case "generated":
        return "bg-green-100 text-green-800";
      case "approved":
        return "bg-emerald-100 text-emerald-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Formatar o status para exibição
  const formatStatus = (status: string) => {
    switch (status) {
      case "not_started":
        return "Não iniciado";
      case "in_progress":
        return "Em andamento";
      case "generated":
        return "Gerado";
      case "approved":
        return "Aprovado";
      default:
        return status;
    }
  };

  return (
    <Card className="w-full transition-all duration-200 hover:shadow-md">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <Badge variant="outline" className="mb-1">
              Módulo {module.order}
            </Badge>
            <CardTitle className="text-xl">{module.title}</CardTitle>
          </div>
          <Badge className={getStatusColor(module.status)}>
            {formatStatus(module.status)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pb-2">
        <p className="text-sm text-gray-500 mb-2">{module.description}</p>
        
        <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
          <span>Carga horária: {module.estimatedHours}h</span>
        </div>
        
        {module.objective && (
          <div className="mt-2">
            <p className="text-sm font-medium">Objetivo:</p>
            <p className="text-sm text-gray-600">{module.objective}</p>
          </div>
        )}
        
        {module.topics && (
          <div className="mt-2">
            <p className="text-sm font-medium">Tópicos:</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {module.topics.split(",").map((topic, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {topic.trim()}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
      <Separator />
      <CardFooter className="pt-3 flex justify-between">
        <div>
          <Button variant="outline" size="sm" onClick={onEdit} className="mr-2">
            Editar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onDelete}
            className="text-red-500 hover:text-red-700 hover:bg-red-50"
          >
            Excluir
          </Button>
        </div>
        <Button
          onClick={onConfigureLessons}
          size="sm"
          className="bg-gradient-to-r from-blue-500 to-indigo-500"
        >
          Configurar Aulas
        </Button>
      </CardFooter>
    </Card>
  );
}