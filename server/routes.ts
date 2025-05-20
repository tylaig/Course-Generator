import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  generateStrategy,
  generateStructure,
  generateModuleContent,
  generateEvaluation,
  generateCourseEvaluation,
  generateCourseReview,
  generateModuleImage,
  generateAllModuleImages,
  generateAllContent,
  generateAllEvaluations
} from "./openai";
import {
  getAuthUrl,
  getTokenFromCode,
  generateCoursePDF,
  uploadFileToDrive,
  generateAndUploadCourse
} from "./googleDrive";
import { z } from "zod";

// Helper function to convert JSON data to CSV format
async function convertToCSV(data: any): Promise<string> {
  try {
    // CSV header
    let csv = "Data Type,ID,Title,Description,Content\n";
    
    // Course basic info
    csv += `Course,${data.id || ""},${data.title || ""},"${data.theme || ""} (${data.format || ""})","${JSON.stringify({
      estimatedHours: data.estimatedHours,
      platform: data.platform,
      deliveryFormat: data.deliveryFormat,
      currentPhase: data.currentPhase,
      progress: data.progress || {},
      aiConfig: data.aiConfig || {}
    }).replace(/"/g, '""')}"\n`;
    
    // Phase data (if exists)
    if (data.phaseData) {
      Object.entries(data.phaseData).forEach(([phase, phaseData]) => {
        if (phaseData) {
          csv += `PhaseData,${phase},"Phase ${phase.replace('phase', '')} Data","","${JSON.stringify(phaseData).replace(/"/g, '""')}"\n`;
        }
      });
    }
    
    // Modules
    if (data.modules && Array.isArray(data.modules)) {
      data.modules.forEach((module: any) => {
        // Basic module info
        csv += `Module,${module.id || ""},${module.title || ""},"${module.description || ""}","${JSON.stringify({
          order: module.order,
          estimatedHours: module.estimatedHours,
          status: module.status,
          imageUrl: module.imageUrl || ""
        }).replace(/"/g, '""')}"\n`;
        
        // Module content (if exists)
        if (module.content) {
          // Text content
          if (module.content.text) {
            const textContent = module.content.text.replace(/"/g, '""').substring(0, 1000) + (module.content.text.length > 1000 ? "..." : "");
            csv += `Content,${module.id}_text,"Text Content for ${module.title}","","${textContent}"\n`;
          }
          
          // Video script
          if (module.content.videoScript) {
            const videoScript = module.content.videoScript.replace(/"/g, '""').substring(0, 1000) + (module.content.videoScript.length > 1000 ? "..." : "");
            csv += `Content,${module.id}_video,"Video Script for ${module.title}","","${videoScript}"\n`;
          }
          
          // Activities
          if (module.content.activities && module.content.activities.length > 0) {
            module.content.activities.forEach((activity: any, activityIndex: number) => {
              csv += `Activity,${module.id}_activity_${activityIndex},${activity.title || ""},"${activity.description || ""}","${JSON.stringify(activity).replace(/"/g, '""')}"\n`;
              
              // Questions
              if (activity.questions && activity.questions.length > 0) {
                activity.questions.forEach((question: any, questionIndex: number) => {
                  csv += `Question,${module.id}_q_${activityIndex}_${questionIndex},${question.question?.replace(/"/g, '""') || ""},"${question.explanation?.replace(/"/g, '""') || ""}","${JSON.stringify(question.options || []).replace(/"/g, '""')}"\n`;
                });
              }
            });
          }
        }
      });
    }
    
    return csv;
  } catch (error) {
    console.error("Error converting to CSV:", error);
    return "Error generating CSV data";
  }
}

// Validation schemas
const courseDetailsSchema = z.object({
  title: z.string().min(3),
  theme: z.string().min(3),
  estimatedHours: z.number().min(1),
  format: z.string().min(1),
  platform: z.string().min(1),
  deliveryFormat: z.string().min(1),
  publicTarget: z.string().optional(),
  educationalLevel: z.string().optional(),
  familiarityLevel: z.string().optional(),
  motivation: z.string().optional(),
  cognitiveSkills: z.string().optional(),
  behavioralSkills: z.string().optional(),
  technicalSkills: z.string().optional()
});

const moduleSchema = z.object({
  id: z.string(),
  title: z.string().min(3),
  description: z.string(),
  order: z.number().min(1),
  estimatedHours: z.number().min(0.5),
  status: z.string()
});

const aiConfigSchema = z.object({
  model: z.string(),
  optimization: z.string(),
  languageStyle: z.string(),
  difficultyLevel: z.string(),
  contentDensity: z.number().min(1).max(5),
  teachingApproach: z.string(),
  contentTypes: z.array(z.string())
});

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // ============ API ROUTES ============
  
  // ---- Course Progress Tracking API ----
  app.get("/api/course/:courseId/progress", async (req, res) => {
    try {
      const { courseId } = req.params;
      
      if (!courseId) {
        return res.status(400).json({ message: "Course ID is required" });
      }
      
      // In a real implementation, we would fetch from the database
      // Here we're just returning the data from the request
      const { course, modules, phaseData } = req.body;
      
      // Calculate progress statistics
      const totalPhases = 5;
      const completedPhases = course?.currentPhase ? course.currentPhase - 1 : 0;
      const phaseProgress = (completedPhases / totalPhases) * 100;
      
      const totalModules = modules?.length || 0;
      const completedModules = modules?.filter(
        (m: any) => m.status === "generated" || m.status === "approved"
      ).length || 0;
      const moduleProgress = totalModules > 0 ? (completedModules / totalModules) * 100 : 0;
      
      res.json({
        courseId,
        courseTitle: course?.title || "Untitled Course",
        currentPhase: course?.currentPhase || 1,
        phaseProgress: Math.round(phaseProgress),
        moduleProgress: Math.round(moduleProgress),
        completedModules,
        totalModules,
        lastUpdated: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error getting course progress:", error);
      res.status(500).json({ 
        message: "Failed to get course progress", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // ---- Strategy Generation (Phase 1) ----
  app.post("/api/generate/strategy", async (req, res) => {
    try {
      const courseDetails = courseDetailsSchema.parse(req.body);
      const strategyData = await generateStrategy(courseDetails);
      
      res.json(strategyData);
    } catch (error) {
      console.error("Error in strategy generation:", error);
      res.status(500).json({ 
        message: "Failed to generate strategy", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // ---- Structure Generation (Phase 2) ----
  app.post("/api/generate/structure", async (req, res) => {
    try {
      const { courseId, title, theme, estimatedHours, moduleCount, phaseData } = req.body;
      
      // Log para debug
      console.log("Recebendo dados para geração de estrutura:", req.body);
      
      if (!title || !theme) {
        return res.status(400).json({ message: "Informações básicas do curso são necessárias (título e tema)" });
      }
      
      // Criar um objeto de detalhes do curso com todos os dados disponíveis
      const courseDetails = {
        title: title || "Curso sem título",
        theme: theme || "Tema não definido",
        estimatedHours: estimatedHours || 10,
        moduleCount: moduleCount || 6, // Adiciona o número de módulos solicitado pelo usuário
        format: req.body.format || "Online",
        platform: req.body.platform || "Web",
        deliveryFormat: req.body.deliveryFormat || "HTML5",
        ...phaseData
      };
      
      console.log("Enviando dados para geração:", courseDetails);
      
      const structureData = await generateStructure(courseDetails, phaseData);
      
      res.json(structureData);
    } catch (error) {
      console.error("Error in structure generation:", error);
      res.status(500).json({ 
        message: "Failed to generate structure", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // ---- Module Content Generation (Phase 3) ----
  app.post("/api/generate/module-content", async (req, res) => {
    try {
      const { moduleId, courseId, aiConfig } = req.body;
      
      if (!moduleId || !courseId) {
        return res.status(400).json({ message: "Module ID and Course ID are required" });
      }
      
      // For in-memory storage, we get these from the request
      // In a real database implementation, we would fetch from storage
      const { module, courseDetails } = req.body;
      
      const moduleContent = await generateModuleContent(module, courseDetails, aiConfig);
      
      res.json(moduleContent);
    } catch (error) {
      console.error("Error in module content generation:", error);
      res.status(500).json({ 
        message: "Failed to generate module content", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // ---- Regenerate Module Content (Phase 3) ----
  app.post("/api/regenerate/module-content", async (req, res) => {
    try {
      const { moduleId, courseId, aiConfig } = req.body;
      
      if (!moduleId || !courseId) {
        return res.status(400).json({ message: "Module ID and Course ID are required" });
      }
      
      // For in-memory storage, we get these from the request
      // In a real database implementation, we would fetch from storage
      const { module, courseDetails } = req.body;
      
      const moduleContent = await generateModuleContent(module, courseDetails, aiConfig);
      
      res.json(moduleContent);
    } catch (error) {
      console.error("Error in module content regeneration:", error);
      res.status(500).json({ 
        message: "Failed to regenerate module content", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // ---- Generate All Content (Phase 3) ----
  app.post("/api/generate/all-content", async (req, res) => {
    try {
      const { courseId, aiConfig, modules, courseDetails } = req.body;
      
      // Logs para facilitar depuração
      console.log("Recebendo solicitação para gerar todo o conteúdo:");
      console.log("- CourseId:", courseId);
      console.log("- Número de módulos:", modules?.length || 0);
      
      if (!courseId) {
        return res.status(400).json({ message: "Course ID is required" });
      }
      
      if (!modules || !Array.isArray(modules) || modules.length === 0) {
        return res.status(400).json({ message: "Modules are required and must be an array" });
      }
      
      if (!courseDetails) {
        return res.status(400).json({ message: "Course details are required" });
      }
      
      const allContent = await generateAllContent(modules, courseDetails, aiConfig);
      
      res.json(allContent);
    } catch (error) {
      console.error("Error in generating all content:", error);
      res.status(500).json({ 
        message: "Failed to generate all content", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // ---- Generate Evaluation (Phase 4) ----
  app.post("/api/generate/evaluation", async (req, res) => {
    try {
      const { courseId, moduleId, evaluationType } = req.body;
      
      if (!courseId || !moduleId) {
        return res.status(400).json({ message: "Course ID and Module ID are required" });
      }
      
      // For in-memory storage, we get these from the request
      // In a real database implementation, we would fetch from storage
      const { module, courseDetails } = req.body;
      
      let evaluation;
      if (moduleId === "course") {
        // Generate course-level evaluation
        evaluation = await generateCourseEvaluation(module, courseDetails, evaluationType);
      } else {
        // Generate module-level evaluation
        evaluation = await generateEvaluation(moduleId, module, courseDetails, evaluationType);
      }
      
      res.json(evaluation);
    } catch (error) {
      console.error("Error in evaluation generation:", error);
      res.status(500).json({ 
        message: "Failed to generate evaluation", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // ---- Generate All Evaluations (Phase 4) ----
  app.post("/api/generate/all-evaluations", async (req, res) => {
    try {
      const { courseId, evaluationType } = req.body;
      
      if (!courseId) {
        return res.status(400).json({ message: "Course ID is required" });
      }
      
      // For in-memory storage, we get these from the request
      // In a real database implementation, we would fetch from storage
      const { modules, courseDetails } = req.body;
      
      const allEvaluations = await generateAllEvaluations(modules, courseDetails, evaluationType);
      
      res.json(allEvaluations);
    } catch (error) {
      console.error("Error in generating all evaluations:", error);
      res.status(500).json({ 
        message: "Failed to generate all evaluations", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // ---- Generate Course Review (Phase 5) ----
  app.post("/api/generate/review", async (req, res) => {
    try {
      const { courseId, reviewNotes } = req.body;
      
      if (!courseId) {
        return res.status(400).json({ message: "Course ID is required" });
      }
      
      // For in-memory storage, we get these from the request
      // In a real database implementation, we would fetch from storage
      const { courseDetails, modules, phaseData } = req.body;
      
      const review = await generateCourseReview(courseDetails, modules, phaseData, reviewNotes || "");
      
      res.json({ review });
    } catch (error) {
      console.error("Error in course review generation:", error);
      res.status(500).json({ 
        message: "Failed to generate course review", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // ---- Export Phase Data ----
  app.get("/api/export/phase/:courseId/:phaseNumber", async (req, res) => {
    try {
      const { courseId, phaseNumber } = req.params;
      const { format = 'json' } = req.query;
      
      if (!courseId || !phaseNumber) {
        return res.status(400).json({ message: "Course ID and Phase Number are required" });
      }
      
      // For in-memory storage, we get these from the request
      // In a real database implementation, we would fetch from storage
      const { courseDetails, modules, phaseData } = req.body;
      
      const phaseNumber_int = parseInt(phaseNumber as string);
      if (isNaN(phaseNumber_int) || phaseNumber_int < 1 || phaseNumber_int > 5) {
        return res.status(400).json({ message: "Phase Number must be between 1 and 5" });
      }
      
      const phase_key = `phase${phaseNumber}`;
      const phaseExportData = {
        course: courseDetails,
        phaseNumber: phaseNumber_int,
        phaseData: phaseData?.[phase_key] || {},
        modules: phaseNumber_int >= 2 ? modules : []
      };
      
      if (format === 'csv') {
        // Convert phase data to CSV format
        const csvData = await convertToCSV(phaseExportData);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="course_${courseId}_phase${phaseNumber}.csv"`);
        return res.send(csvData);
      }
      
      // Default to JSON format
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="course_${courseId}_phase${phaseNumber}.json"`);
      return res.json(phaseExportData);
    } catch (error) {
      console.error("Error in phase data export:", error);
      res.status(500).json({ 
        message: "Failed to export phase data", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // ---- Export Course (Phase 5) ----
  app.get("/api/export/course/:courseId", async (req, res) => {
    try {
      const { courseId } = req.params;
      const { format = 'json' } = req.query;
      
      if (!courseId) {
        return res.status(400).json({ message: "Course ID is required" });
      }
      
      // For in-memory storage, we get these from the request
      // In a real database implementation, we would fetch from storage
      const { courseDetails, modules, phaseData } = req.body;
      
      const exportData = {
        course: courseDetails,
        modules,
        phaseData,
        exportedAt: new Date().toISOString(),
        exportVersion: "1.0"
      };
      
      if (format === 'csv') {
        // Convert course data to CSV format
        const csvData = await convertToCSV(exportData);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="course_${courseId}.csv"`);
        return res.send(csvData);
      }
      
      // Default to JSON format
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="course_${courseId}.json"`);
      return res.json(exportData);
    } catch (error) {
      console.error("Error in course export:", error);
      res.status(500).json({ 
        message: "Failed to export course", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // ---- Module Image Generation ----
  app.post("/api/generate/module-image", async (req, res) => {
    try {
      const { moduleId, courseId } = req.body;
      
      if (!moduleId || !courseId) {
        return res.status(400).json({ message: "Module ID and Course ID are required" });
      }
      
      // Retrieve course and module
      const course = await storage.getCourse(courseId);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      
      const moduleIndex = course.modules.findIndex(m => m.id === moduleId);
      if (moduleIndex === -1) {
        return res.status(404).json({ message: "Module not found" });
      }
      
      const module = course.modules[moduleIndex];
      
      // Generate image for the module
      const imageResult = await generateModuleImage({
        id: module.id,
        title: module.title,
        description: module.description,
        order: module.order,
        estimatedHours: module.estimatedHours
      }, {
        title: course.title,
        theme: course.theme,
        estimatedHours: course.estimatedHours,
        format: course.format,
        platform: course.platform,
        deliveryFormat: course.deliveryFormat
      });
      
      // Update the module with the image URL
      const updatedModule = {
        ...module,
        imageUrl: imageResult.url
      };
      
      course.modules[moduleIndex] = updatedModule;
      
      // Update the course in storage
      await storage.updateCourse(courseId, course);
      
      res.json({
        url: imageResult.url,
        prompt: imageResult.prompt,
        moduleId: module.id
      });
    } catch (error) {
      console.error("Error in module image generation:", error);
      res.status(500).json({ 
        message: "Failed to generate module image", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });
  
  // ---- Generate All Module Images ----
  app.post("/api/generate/all-module-images", async (req, res) => {
    try {
      const { courseId } = req.body;
      
      if (!courseId) {
        return res.status(400).json({ message: "Course ID is required" });
      }
      
      const course = await storage.getCourse(courseId);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      
      if (!course.modules || course.modules.length === 0) {
        return res.status(400).json({ message: "Course has no modules" });
      }
      
      // Get course details for image generation
      const courseDetails = {
        title: course.title,
        theme: course.theme,
        estimatedHours: course.estimatedHours,
        format: course.format,
        platform: course.platform,
        deliveryFormat: course.deliveryFormat
      };
      
      // Generate images for all modules
      const modules = course.modules.map(m => ({
        id: m.id,
        title: m.title,
        description: m.description,
        order: m.order,
        estimatedHours: m.estimatedHours
      }));
      
      const imageResults = await generateAllModuleImages(modules, courseDetails);
      
      // Update all modules with their respective image URLs
      const updatedModules = course.modules.map(module => {
        const imageResult = imageResults.find(ir => ir.moduleId === module.id);
        if (imageResult) {
          return {
            ...module,
            imageUrl: imageResult.url
          };
        }
        return module;
      });
      
      course.modules = updatedModules;
      
      // Update the course in storage
      await storage.updateCourse(courseId, course);
      
      // Return the image results
      res.json({
        generatedCount: imageResults.length,
        images: imageResults
      });
    } catch (error) {
      console.error("Error in generating all module images:", error);
      res.status(500).json({ 
        message: "Failed to generate module images", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // ---- Get Course by ID ----
  app.get("/api/courses/:courseId", async (req, res) => {
    try {
      const { courseId } = req.params;
      
      if (!courseId) {
        return res.status(400).json({ message: "Course ID is required" });
      }
      
      // Obtenha o curso do storage
      const course = await storage.getCourse(courseId);
      
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      
      // Obtenha os módulos do curso
      const modules = await storage.listModulesByCourse(courseId);
      
      // Retorne o curso com seus módulos
      const fullCourse = {
        ...course,
        modules: modules
      };
      
      res.json(fullCourse);
    } catch (error) {
      console.error("Error getting course:", error);
      res.status(500).json({ 
        message: "Failed to get course", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  return httpServer;
}
