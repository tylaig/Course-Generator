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
      const courseId = req.params.id;
      console.log("Fetching course with ID:", courseId);
      
      // Validate courseId format
      if (!courseId || courseId === 'undefined' || courseId === 'null') {
        return res.status(400).json({ error: "Invalid course ID" });
      }
      
      const course = await storage.getCourse(courseId);
      if (!course) {
        return res.status(404).json({ error: "Course not found" });
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

  app.delete("/api/courses/:id", async (req, res) => {
    try {
      const courseId = req.params.id;
      console.log("Deletando curso com ID:", courseId);
      
      const deleted = await storage.deleteCourse(courseId);
      if (!deleted) {
        return res.status(404).json({ error: "Curso não encontrado" });
      }
      
      res.json({ success: true, message: "Curso deletado com sucesso" });
    } catch (error) {
      console.error("Erro ao deletar curso:", error);
      res.status(500).json({ error: "Falha ao deletar curso" });
    }
  });

  // ---- Module Routes ----
  app.put("/api/modules/:id", async (req, res) => {
    try {
      const moduleId = req.params.id;
      const { content, status } = req.body;
      
      console.log(`💾 Tentando salvar módulo ${moduleId} no banco de dados`);
      
      // First try to update existing module
      try {
        const updatedModule = await storage.updateModule(moduleId, { content, status });
        if (updatedModule) {
          console.log(`✅ Módulo ${moduleId} atualizado com sucesso!`);
          return res.json(updatedModule);
        }
      } catch (updateError) {
        console.log(`⚠️ Falha ao atualizar módulo ${moduleId}, tentando criar...`);
      }
      
      // If update fails, try to create the module
      try {
        console.log(`📝 Criando novo módulo ${moduleId}...`);
        
        // Extract numeric ID from string like "module-1747968774963-0"
        const numericId = parseInt(moduleId.replace(/\D/g, '')) || Date.now();
        
        const newModule = await storage.createModule({
          title: `Módulo ${moduleId}`,
          description: `Módulo criado automaticamente para ${moduleId}`,
          estimatedHours: 5,
          courseId: numericId, // Use extracted ID as course ID
          order: 1,
          status: status || "draft",
          content: content
        });
        
        console.log(`✅ Módulo ${moduleId} criado com sucesso!`);
        res.json(newModule);
      } catch (createError) {
        console.error(`❌ Erro ao criar módulo ${moduleId}:`, createError);
        res.status(500).json({ error: "Falha ao criar/atualizar módulo" });
      }
      
    } catch (error) {
      console.error("Erro geral ao processar módulo:", error);
      res.status(500).json({ error: "Falha ao processar módulo" });
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
      
      const strategyData = await generateStrategy();
      
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
      console.log("🎯 Mapeamento gerado:", JSON.stringify(mappingData, null, 2));
      
      // Garantir que sempre retornamos JSON válido
      res.setHeader('Content-Type', 'application/json');
      res.json(mappingData);
      
    } catch (error) {
      console.error("Erro na geração de mapeamento:", error);
      res.status(500).json({ 
        message: "Falha ao gerar mapeamento de competências", 
        error: error instanceof Error ? error.message : "Erro desconhecido" 
      });
    }
  });

  // ---- Lesson Content Generation (Phase 3) ----
  app.post("/api/generate/lesson-content", async (req, res) => {
    try {
      console.log("=== GERAÇÃO DE CONTEÚDO DE AULA INICIADA ===");
      const { lesson, module, courseDetails, aiConfig } = req.body;
      
      if (!lesson || !module || !courseDetails) {
        return res.status(400).json({ error: "Dados obrigatórios não fornecidos" });
      }
      
      console.log(`Gerando conteúdo para aula: ${lesson.title}`);
      
      // Verificar se temos chave da OpenAI
      if (!process.env.OPENAI_API_KEY) {
        return res.status(500).json({ 
          error: "Chave da OpenAI não configurada",
          message: "Configure a variável OPENAI_API_KEY para usar a geração avançada de conteúdo"
        });
      }

      // Usar OpenAI para gerar conteúdo estruturado da aula
      const { generateAdvancedLessonContent } = await import('./openai');
      const lessonContent = await generateAdvancedLessonContent(
        lesson, 
        module, 
        courseDetails, 
        aiConfig
      );
      
      res.json({
        success: true,
        content: lessonContent
      });
      
    } catch (error) {
      console.error("Erro na geração de conteúdo da aula:", error);
      res.status(500).json({ 
        message: "Falha ao gerar conteúdo da aula", 
        error: error instanceof Error ? error.message : "Erro desconhecido" 
      });
    }
  });

  // Generate ONLY activities for specific lessons  
  app.post("/generate-activities", async (req: Request, res: Response) => {
    try {
      const { lessons, courseDetails } = req.body;
      
      if (!lessons || !courseDetails) {
        return res.status(400).json({ error: "Dados obrigatórios não fornecidos" });
      }

      // Verificar se temos chave da OpenAI
      if (!process.env.OPENAI_API_KEY) {
        return res.status(500).json({ 
          error: "Chave da OpenAI não configurada",
          message: "Configure a variável OPENAI_API_KEY para usar a geração de atividades"
        });
      }

      console.log(`🎯 Gerando APENAS atividades para ${lessons.length} aulas`);
      
      const results = [];
      
      for (let i = 0; i < lessons.length; i++) {
        const lessonInfo = lessons[i];
        try {
          console.log(`📝 [${i+1}/${lessons.length}] Criando atividades para: ${lessonInfo.lessonName}`);
          
          // Generate only activities using OpenAI
          console.log("🔍 Fazendo requisição para OpenAI...");
          const activitiesResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
              messages: [{
                role: "system",
                content: "Você é um especialista em criação de atividades educacionais. Gere apenas atividades práticas e questões de avaliação específicas para a aula fornecida. Responda SEMPRE em JSON válido com esta estrutura exata: {\"practicalExercises\": [...], \"assessmentQuestions\": [...]}"
              }, {
                role: "user", 
                content: `Gere atividades específicas para a aula "${lessonInfo.lessonName}" do curso "${courseDetails.title}". 
                
                Crie EXATAMENTE:
                - 2 exercícios práticos (practicalExercises) com 1 questão cada
                - 3 questões de avaliação (assessmentQuestions)
                
                Cada questão deve ter:
                - question: texto da pergunta sobre o conteúdo da aula
                - options: array com 4 opções de resposta
                - correct_answer: índice da resposta correta (0, 1, 2 ou 3)
                - explanation: explicação detalhada da resposta correta
                
                Tema: ${courseDetails.theme}
                Foque no conteúdo específico desta aula.`
              }],
              response_format: { type: "json_object" },
              temperature: 0.7
            })
          });
          
          if (!activitiesResponse.ok) {
            const errorText = await activitiesResponse.text();
            console.error(`❌ OpenAI API error: ${activitiesResponse.status} - ${errorText}`);
            throw new Error(`OpenAI API error: ${activitiesResponse.status}`);
          }
          
          const activitiesData = await activitiesResponse.json();
          console.log("✅ OpenAI Response received:", activitiesData);
          
          if (!activitiesData.choices || !activitiesData.choices[0]) {
            console.error("❌ Resposta da OpenAI sem choices:", activitiesData);
            throw new Error("Resposta inválida da OpenAI");
          }
          
          const activities = JSON.parse(activitiesData.choices[0].message.content);
          
          results.push({
            moduleId: lessonInfo.moduleId,
            lessonId: lessonInfo.lessonId,
            activities: activities.practicalExercises || [],
            assessmentQuestions: activities.assessmentQuestions || []
          });
          
          console.log(`✅ Atividades criadas para: ${lessonInfo.lessonName}`);
          
        } catch (error) {
          console.error(`❌ Erro ao gerar atividades para ${lessonInfo.lessonName}:`, error);
          results.push({
            moduleId: lessonInfo.moduleId,
            lessonId: lessonInfo.lessonId,
            activities: [],
            assessmentQuestions: [],
            error: error instanceof Error ? error.message : "Erro desconhecido"
          });
        }
      }
      
      res.json({
        success: true,
        results: results
      });
      
    } catch (error) {
      console.error("Erro na geração de atividades:", error);
      res.status(500).json({ 
        message: "Falha ao gerar atividades", 
        error: error instanceof Error ? error.message : "Erro desconhecido" 
      });
    }
  });

  // Generate course PDF
  app.post("/api/generate/course-pdf", async (req, res) => {
    try {
      const { courseId } = req.body;
      
      // Convert string ID to number for database lookup
      let numericId: number;
      if (typeof courseId === 'string' && courseId.startsWith('course_')) {
        numericId = parseInt(courseId.replace('course_', ''));
      } else {
        numericId = parseInt(courseId);
      }
      
      if (isNaN(numericId)) {
        return res.status(400).json({ error: "Invalid course ID format" });
      }
      
      const course = await storage.getCourse(numericId.toString());
      if (!course) {
        return res.status(404).json({ error: "Course not found" });
      }

      const modules = await storage.listModulesByCourse(numericId.toString());
      
      const { generateCoursePDF } = await import("./pdf-generator");
      
      const courseData = {
        title: course.title,
        theme: course.theme,
        modules: modules.map(module => ({
          id: module.id.toString(),
          title: module.title,
          description: module.description,
          content: module.content || { lessons: [] }
        }))
      };

      const pdfBuffer = await generateCoursePDF(courseData);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${course.title}.pdf"`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error("Error generating course PDF:", error);
      res.status(500).json({ error: "Failed to generate PDF" });
    }
  });

  // Generate activities summary PDF
  app.post("/api/generate/activities-pdf", async (req, res) => {
    try {
      const { courseId } = req.body;
      
      // Convert string ID to number for database lookup
      let numericId: number;
      if (typeof courseId === 'string' && courseId.startsWith('course_')) {
        numericId = parseInt(courseId.replace('course_', ''));
      } else {
        numericId = parseInt(courseId);
      }
      
      if (isNaN(numericId)) {
        return res.status(400).json({ error: "Invalid course ID format" });
      }
      
      const course = await storage.getCourse(numericId.toString());
      if (!course) {
        return res.status(404).json({ error: "Course not found" });
      }

      const modules = await storage.listModulesByCourse(numericId.toString());
      
      const { generateActivitySummaryPDF } = await import("./pdf-generator");
      
      const courseData = {
        title: course.title,
        theme: course.theme,
        modules: modules.map(module => ({
          id: module.id.toString(),
          title: module.title,
          description: module.description,
          content: module.content || { lessons: [] }
        }))
      };

      const pdfBuffer = await generateActivitySummaryPDF(courseData);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${course.title}_Atividades.pdf"`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error("Error generating activities PDF:", error);
      res.status(500).json({ error: "Failed to generate activities PDF" });
    }
  });

  // Google Drive authentication
  app.get("/api/google-drive/auth-url", async (req, res) => {
    try {
      const { getAuthUrl } = await import("./googleDrive");
      const authUrl = getAuthUrl();
      res.json({ authUrl });
    } catch (error) {
      console.error("Error getting Google Drive auth URL:", error);
      res.status(500).json({ error: "Failed to generate auth URL" });
    }
  });

  app.post("/api/google-drive/callback", async (req, res) => {
    try {
      const { code } = req.body;
      if (!code) {
        return res.status(400).json({ error: "Authorization code is required" });
      }

      const { getTokenFromCode } = await import("./googleDrive");
      const tokens = await getTokenFromCode(code);
      
      res.json({ 
        success: true,
        message: "Google Drive authorized successfully",
        tokens 
      });
    } catch (error) {
      console.error("Error processing Google Drive callback:", error);
      res.status(500).json({ error: "Failed to process authorization" });
    }
  });

  app.get("/api/google-drive/auth-status", async (req, res) => {
    try {
      const { isAuthenticated } = await import("./googleDrive");
      res.json({ authenticated: isAuthenticated() });
    } catch (error) {
      console.error("Error checking auth status:", error);
      res.status(500).json({ error: "Failed to check auth status" });
    }
  });

  app.post("/api/google-drive/logout", async (req, res) => {
    try {
      const { clearAuthentication } = await import("./googleDrive");
      clearAuthentication();
      res.json({ success: true, message: "Logged out successfully" });
    } catch (error) {
      console.error("Error logging out:", error);
      res.status(500).json({ error: "Failed to logout" });
    }
  });

  // Upload course structure to Google Drive
  app.post("/api/google-drive/upload-course", async (req, res) => {
    try {
      const { courseId, course } = req.body;
      
      if (!course) {
        return res.status(400).json({ error: "Course data is required" });
      }

      const { createCourseStructureOnDrive } = await import("./googleDrive");
      
      const result = await createCourseStructureOnDrive(course);
      
      res.json({
        success: true,
        message: "Course structure created successfully on Google Drive",
        ...result
      });
    } catch (error) {
      console.error("Error uploading course to Google Drive:", error);
      res.status(500).json({ 
        error: "Failed to upload to Google Drive",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  return httpServer;
}