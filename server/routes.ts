import { Express } from "express";
import { createServer, Server } from "http";
import { z } from "zod";
import { storage } from "./storage";
import { generateStrategy, generateStructure, generateCompetencyMapping } from "./openai";
import { getAuthUrl, getTokenFromCode, generateAndUploadCourse } from "./googleDrive";

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

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // ---- Course CRUD Routes ----
  app.get("/api/courses", async (req, res) => {
    try {
      const courses = await storage.listCourses();
      res.json(courses);
    } catch (error) {
      console.error("Erro ao listar cursos:", error);
      res.status(500).json({ error: "Falha ao listar cursos" });
    }
  });

  app.post("/api/courses", async (req, res) => {
    try {
      const courseData = {
        title: req.body.title || "Novo Curso",
        theme: req.body.theme || "Tema Geral",
        estimatedHours: req.body.estimatedHours || 10,
        format: req.body.format || "Online",
        platform: req.body.platform || "Web",
        deliveryFormat: req.body.deliveryFormat || "PDF",
        currentPhase: 1
      };
      
      const course = await storage.createCourse(courseData);
      res.json(course);
    } catch (error) {
      console.error("Erro ao criar curso:", error);
      res.status(500).json({ error: "Falha ao criar curso" });
    }
  });

  app.get("/api/courses/:id", async (req, res) => {
    try {
      const course = await storage.getCourse(req.params.id);
      if (!course) {
        return res.status(404).json({ error: "Curso não encontrado" });
      }
      res.json(course);
    } catch (error) {
      console.error("Erro ao buscar curso:", error);
      res.status(500).json({ error: "Falha ao buscar curso" });
    }
  });

  app.put("/api/courses/:id", async (req, res) => {
    try {
      const course = await storage.updateCourse(req.params.id, req.body);
      if (!course) {
        return res.status(404).json({ error: "Curso não encontrado" });
      }
      res.json(course);
    } catch (error) {
      console.error("Erro ao atualizar curso:", error);
      res.status(500).json({ error: "Falha ao atualizar curso" });
    }
  });

  // ---- Phase Data Routes ----
  app.get("/api/courses/:courseId/phase/:phaseNumber", async (req, res) => {
    try {
      const phaseData = await storage.getPhaseData(req.params.courseId, parseInt(req.params.phaseNumber));
      res.json(phaseData || {});
    } catch (error) {
      console.error("Erro ao buscar dados da fase:", error);
      res.status(500).json({ error: "Falha ao buscar dados da fase" });
    }
  });

  app.post("/api/courses/:courseId/phase/:phaseNumber", async (req, res) => {
    try {
      console.log("Parâmetros recebidos:", req.params);
      console.log("Body recebido:", req.body);
      
      // O courseId vem como "course_timestamp", mas precisamos usar o ID real do banco
      const courseIdStr = req.params.courseId;
      
      // Buscar o curso real no banco para pegar o ID correto
      const courses = await storage.listCourses();
      const course = courses.find(c => c.title === "Novo Curso Educacional"); // Usar uma busca mais específica
      
      if (!course) {
        console.log("Curso não encontrado para:", courseIdStr);
        return res.status(404).json({ error: "Curso não encontrado" });
      }
      
      const courseId = course.id; // Usar o ID real do banco (1, 2, 3, etc.)
      console.log("Course ID original:", courseIdStr);
      console.log("Course ID do banco:", courseId);
      
      const phaseNumber = parseInt(req.params.phaseNumber);
      console.log("Phase number:", phaseNumber);
      
      const data = {
        courseId: courseId, // Agora usando o ID real do banco (1, 2, 3...)
        phaseNumber: phaseNumber,
        content: req.body
      };
      
      console.log("Dados para salvar:", data);
      
      const phaseData = await storage.createPhaseData(data);
      res.json(phaseData);
    } catch (error) {
      console.error("Erro detalhado ao salvar dados da fase:", error);
      res.status(500).json({ error: "Falha ao salvar dados da fase" });
    }
  });

  // ---- Strategy Generation (Phase 1) ----
  app.post("/api/courses/strategy", async (req, res) => {
    try {
      if (!req.body.title || !req.body.theme) {
        return res.status(400).json({ 
          success: false,
          message: "Campos obrigatórios faltando. Título e tema são necessários." 
        });
      }
      
      const courseDetails = {
        title: req.body.title,
        theme: req.body.theme,
        estimatedHours: req.body.estimatedHours || 10,
        format: req.body.format || "Online",
        platform: req.body.platform || "Web",
        deliveryFormat: req.body.deliveryFormat || "PDF",
        publicTarget: req.body.publicTarget,
        educationalLevel: req.body.educationalLevel,
        familiarityLevel: req.body.familiarityLevel,
        motivation: req.body.motivation,
        cognitiveSkills: req.body.cognitiveSkills,
        behavioralSkills: req.body.behavioralSkills,
        technicalSkills: req.body.technicalSkills
      };
      
      const strategyData = await generateStrategy(courseDetails);
      
      res.json({
        success: true,
        strategy: strategyData
      });
    } catch (error) {
      console.error("Erro ao gerar estratégia:", error);
      res.status(500).json({ 
        success: false,
        message: "Falha ao gerar estratégia de curso",
        error: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });

  // ---- Structure Generation (Phase 2) ----
  app.post("/api/courses/structure", async (req, res) => {
    try {
      console.log("=== GERAÇÃO DE ESTRUTURA INICIADA ===");
      const { courseDetails, phaseData, moduleCount = 6, lessonsPerModule = 5 } = req.body;
      
      console.log("Configurações recebidas:", { moduleCount, lessonsPerModule });
      
      const formattedDetails = {
        title: courseDetails.title || "Curso de JavaScript",
        theme: courseDetails.theme || "Programação",
        estimatedHours: courseDetails.estimatedHours || 40,
        format: courseDetails.format || "Online",
        platform: courseDetails.platform || "Web",
        deliveryFormat: courseDetails.deliveryFormat || "Assíncrono",
        moduleCount: moduleCount,
        lessonsPerModule: lessonsPerModule,
        publicTarget: courseDetails.publicTarget,
        educationalLevel: courseDetails.educationalLevel,
        familiarityLevel: courseDetails.familiarityLevel,
        motivation: courseDetails.motivation,
        cognitiveSkills: courseDetails.cognitiveSkills,
        behavioralSkills: courseDetails.behavioralSkills,
        technicalSkills: courseDetails.technicalSkills,
        courseLanguage: courseDetails.courseLanguage || "pt-BR"
      };
      
      console.log("🚀 CHAMANDO generateStructure com:", JSON.stringify(formattedDetails, null, 2));
      const structureData = await generateStructure(formattedDetails, phaseData || {});
      console.log("🚀 generateStructure RETORNOU:", structureData);
      
      console.log(`✅ Estrutura gerada: ${structureData.modules?.length || 0} módulos`);
      
      res.json({
        success: true,
        modules: structureData.modules || []
      });
      
    } catch (error) {
      console.error("Erro na geração de estrutura:", error);
      res.status(500).json({ 
        message: "Falha ao gerar estrutura do curso", 
        error: error instanceof Error ? error.message : "Erro desconhecido" 
      });
    }
  });

  // ---- Competency Mapping Generation (Phase 2) ----
  app.post("/api/courses/competency-mapping", async (req, res) => {
    try {
      console.log("=== GERAÇÃO DE MAPEAMENTO DE COMPETÊNCIAS INICIADA ===");
      const { courseDetails, modules } = req.body;
      
      if (!modules || !Array.isArray(modules) || modules.length === 0) {
        return res.status(400).json({ error: "Módulos são obrigatórios" });
      }
      
      console.log(`Mapeando competências para ${modules.length} módulos`);
      
      const mappingData = await generateCompetencyMapping(modules, courseDetails);
      console.log("🎯 Mapeamento gerado:", mappingData);
      
      res.json(mappingData);
      
    } catch (error) {
      console.error("Erro na geração de mapeamento:", error);
      res.status(500).json({ 
        message: "Falha ao gerar mapeamento de competências", 
        error: error instanceof Error ? error.message : "Erro desconhecido" 
      });
    }
  });

  return httpServer;
}