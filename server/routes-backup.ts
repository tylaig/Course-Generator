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
  generateAllEvaluations,
  generateCompetencyMapping,
  expandContent
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
  
  // Google Drive Authorization Routes
  app.get("/api/auth/google", (req, res) => {
    try {
      const authUrl = getAuthUrl();
      res.json({ authUrl });
    } catch (error) {
      console.error("Erro ao obter URL de autorização do Google:", error);
      res.status(500).json({ error: "Falha ao gerar URL de autorização" });
    }
  });

  app.get("/api/auth/google/callback", async (req, res) => {
    try {
      const { code } = req.query;
      if (!code || typeof code !== 'string') {
        return res.status(400).json({ error: "Código de autorização inválido" });
      }
      
      const tokens = await getTokenFromCode(code);
      
      // Aqui você pode salvar o refresh_token em algum lugar seguro
      // como uma variável de ambiente ou banco de dados
      if (tokens.refresh_token) {
        console.log("Refresh token obtido:", tokens.refresh_token);
        // Em um ambiente de produção, você deve salvar isso de forma segura
        process.env.GOOGLE_REFRESH_TOKEN = tokens.refresh_token;
      }
      
      res.json({ success: true, message: "Autorização concluída com sucesso" });
    } catch (error) {
      console.error("Erro no callback de autorização do Google:", error);
      res.status(500).json({ error: "Falha na autorização" });
    }
  });

  // PDF Generation and Google Drive Upload Routes
  app.get("/api/course/:id/generate-pdf", async (req, res) => {
    try {
      const courseId = req.params.id;
      const course = await storage.getCourse(courseId);
      
      if (!course) {
        return res.status(404).json({ error: "Curso não encontrado" });
      }
      
      const pdfPath = await generateCoursePDF(course);
      
      // Retorna o caminho do PDF para download local
      res.json({ 
        success: true, 
        pdfPath,
        downloadUrl: `/api/course/${courseId}/download-pdf`
      });
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      res.status(500).json({ error: "Falha ao gerar PDF" });
    }
  });
  
  app.get("/api/course/:id/download-pdf", async (req, res) => {
    try {
      const courseId = req.params.id;
      const course = await storage.getCourse(courseId);
      
      if (!course) {
        return res.status(404).json({ error: "Curso não encontrado" });
      }
      
      const pdfPath = await generateCoursePDF(course);
      
      res.download(pdfPath, `curso_${course.title.replace(/\s+/g, '_')}.pdf`, (err) => {
        if (err) {
          console.error("Erro ao enviar arquivo:", err);
        } else {
          // Limpa o arquivo temporário após o download
          setTimeout(() => {
            try {
              if (require('fs').existsSync(pdfPath)) {
                require('fs').unlinkSync(pdfPath);
              }
            } catch (e) {
              console.error("Erro ao remover arquivo temporário:", e);
            }
          }, 5000);
        }
      });
    } catch (error) {
      console.error("Erro ao baixar PDF:", error);
      res.status(500).json({ error: "Falha ao gerar PDF para download" });
    }
  });
  
  app.post("/api/course/:id/upload-to-drive", async (req, res) => {
    try {
      const courseId = req.params.id;
      const course = await storage.getCourse(courseId);
      
      if (!course) {
        return res.status(404).json({ error: "Curso não encontrado" });
      }
      
      // Verifica se temos as credenciais do Google Drive
      if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REFRESH_TOKEN) {
        return res.status(400).json({ 
          error: "Configuração do Google Drive incompleta", 
          needsAuth: true,
          authUrl: getAuthUrl()
        });
      }
      
      const result = await generateAndUploadCourse(course);
      
      res.json({
        success: true,
        fileId: result.fileId,
        viewLink: result.viewLink
      });
    } catch (error) {
      console.error("Erro ao fazer upload para o Google Drive:", error);
      res.status(500).json({ error: "Falha ao enviar para o Google Drive" });
    }
  });

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
  
  // ---- Course Strategy (Direct API for Phase 1) ----
  app.post("/api/courses/strategy", async (req, res) => {
    try {
      console.log("Recebendo solicitação para gerar estratégia de curso:", req.body);
      
      // Validação básica dos campos necessários
      if (!req.body.title || !req.body.theme) {
        return res.status(400).json({ 
          success: false,
          message: "Campos obrigatórios faltando. Título e tema são necessários." 
        });
      }
      
      // Passar para a função de geração de estratégia
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
      
      try {
        const strategyData = await generateStrategy(courseDetails);
        
        res.json({
          success: true,
          strategy: strategyData,
          strategySummary: {
            keyPoints: [
              "Estratégia alinhada ao perfil do público-alvo",
              "Abordagem pedagógica personalizada",
              "Progressão cognitiva estruturada",
              "Desenvolvimento de competências específicas"
            ],
            recommendedApproach: "Abordagem construtivista com elementos práticos"
          }
        });
      } catch (error) {
        console.error("Erro ao gerar estratégia:", error);
        res.status(500).json({ 
          success: false,
          message: "Falha ao gerar estratégia de curso",
          error: error instanceof Error ? error.message : "Erro desconhecido"
        });
      }
    } catch (error) {
      console.error("Erro no endpoint de estratégia:", error);
      res.status(500).json({ 
        success: false,
        message: "Falha no processamento da solicitação", 
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
      
      // Usar a função generateStructure do OpenAI
      const formattedDetails = {
        title: courseDetails.title || "Curso de JavaScript",
        theme: courseDetails.theme || "Programação",
        estimatedHours: courseDetails.estimatedHours || 40,
        format: courseDetails.format || "Online",
        platform: courseDetails.platform || "Web",
        deliveryFormat: courseDetails.deliveryFormat || "Assíncrono",
        moduleCount: moduleCount, // Usar o valor configurado
        lessonsPerModule: lessonsPerModule, // Usar o valor configurado
        publicTarget: courseDetails.publicTarget,
        educationalLevel: courseDetails.educationalLevel,
        familiarityLevel: courseDetails.familiarityLevel,
        motivation: courseDetails.motivation,
        cognitiveSkills: courseDetails.cognitiveSkills,
        behavioralSkills: courseDetails.behavioralSkills,
        technicalSkills: courseDetails.technicalSkills,
        courseLanguage: courseDetails.courseLanguage || "pt-BR"
      };
      
      // Gerar a estrutura usando IA
      const structureData = await generateStructure(formattedDetails, phaseData || {});
      
      console.log(`✅ Estrutura gerada: ${structureData.modules?.length || 0} módulos`);
      
      res.json({
        success: true,
        modules: structureData.modules || [],
        courseStructure: structureData.courseStructure,
        statistics: structureData.statistics
      });
      
    } catch (error) {
      console.error("Erro na geração de estrutura:", error);
      res.status(500).json({ 
        message: "Falha ao gerar estrutura do curso", 
        error: error instanceof Error ? error.message : "Erro desconhecido" 
      });
    }
  });

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
      const data = {
        courseId: parseInt(req.params.courseId),
        phaseNumber: parseInt(req.params.phaseNumber),
        data: req.body
      };
      
      const phaseData = await storage.createPhaseData(data);
      res.json(phaseData);
    } catch (error) {
      console.error("Erro ao salvar dados da fase:", error);
      res.status(500).json({ error: "Falha ao salvar dados da fase" });
    }
  });
          description: "Condicionais, loops e estruturas de decisão",
          competencyType: "technical",
          difficultyLevel: "intermediate",
          objectives: [
            "Implementar estruturas condicionais",
            "Criar loops eficientes",
            "Controlar fluxo de execução"
          ]
        },
        {
          title: "Funções em JavaScript",
          description: "Declaração, parâmetros, retorno e escopo de funções",
          competencyType: "technical",
          difficultyLevel: "intermediate",
          objectives: [
            "Criar funções reutilizáveis",
            "Gerenciar parâmetros e retornos",
            "Compreender escopo de variáveis"
          ]
        },
        {
          title: "Arrays e Objetos",
          description: "Estruturas de dados complexas e manipulação",
          competencyType: "technical",
          difficultyLevel: "advanced",
          objectives: [
            "Manipular arrays com métodos nativos",
            "Criar e modificar objetos",
            "Aplicar destructuring"
          ]
        }
      ];
      
      // Gerar módulos baseados na estrutura do JavaScript
      const modules = [];
      const maxModules = Math.min(moduleCount, jsModules.length);
      
      for (let i = 0; i < maxModules; i++) {
        const moduleTemplate = jsModules[i];
        const module = {
          id: `module_${i + 1}`,
          title: `${i + 1}. ${moduleTemplate.title}`,
          description: moduleTemplate.description,
          order: i + 1,
          estimatedHours: Math.ceil(courseDetails.estimatedHours / maxModules),
          status: "not_started" as const,
          objective: moduleTemplate.objectives[0],
          competencyType: moduleTemplate.competencyType,
          difficultyLevel: moduleTemplate.difficultyLevel,
          evaluationType: i < 2 ? "quiz" : (i < 4 ? "project" : "assignment"),
          bloomLevel: i < 2 ? "understand" : (i < 4 ? "apply" : "create"),
          objectives: moduleTemplate.objectives,
          lessons: []
        };
        
        // Gerar aulas específicas para cada módulo
        const lessonsPerMod = lessonsPerModule;
        for (let j = 1; j <= lessonsPerMod; j++) {
          const lessonTopics = {
            1: ["História do JavaScript", "Configuração do ambiente", "Primeiro programa", "Ferramentas de desenvolvimento", "Debugging básico"],
            2: ["Declaração de variáveis", "Tipos primitivos", "String e template literals", "Conversão de tipos", "Escopo de variáveis"],
            3: ["Operadores aritméticos", "Operadores de comparação", "Operadores lógicos", "Operador ternário", "Precedência"],
            4: ["If/else statements", "Switch case", "Loop for", "While e do-while", "Break e continue"],
            5: ["Declaração de funções", "Parâmetros e argumentos", "Return statements", "Arrow functions", "Closures"],
            6: ["Criação de arrays", "Métodos de array", "Criação de objetos", "Propriedades e métodos", "Destructuring"]
          };
          
          const topics = lessonTopics[i + 1] || [`Tópico ${j} do módulo ${i + 1}`];
          const topic = topics[j - 1] || `Conceito ${j}`;
          
          module.lessons.push({
            id: `lesson_${i + 1}_${j}`,
            title: `Aula ${j}: ${topic}`,
            duration: "45min",
            type: j === lessonsPerMod ? "practical" : "video",
            content: `Conteúdo detalhado sobre ${topic}`
          });
        }
        
        modules.push(module);
      }
      
      const response = {
        success: true,
        modules,
        statistics: {
          totalModules: modules.length,
          totalLessons: modules.length * lessonsPerModule,
          totalHours: modules.reduce((acc, m) => acc + m.estimatedHours, 0)
        }
      };
      
      console.log(`✅ Estrutura JavaScript gerada: ${response.modules.length} módulos com ${response.statistics.totalLessons} aulas`);
      
      res.json(response);
    } catch (error) {
      console.error("❌ Erro na geração:", error);
      res.status(500).json({ 
        success: false,
        message: "Falha na geração de estrutura", 
        error: error instanceof Error ? error.message : "Erro desconhecido" 
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

  // ---- Generate Modules (Phase 2) ----
  app.post("/api/generate/modules", async (req, res) => {
    try {
      const { courseId, courseDetails, moduleCount, lessonsPerModule } = req.body;
      
      console.log("Recebendo dados para geração de módulos:", {
        courseId,
        moduleCount,
        lessonsPerModule
      });
      
      if (!courseId || !courseDetails) {
        return res.status(400).json({ 
          success: false, 
          message: "ID do curso e detalhes do curso são obrigatórios" 
        });
      }
      
      // Formatar os dados do curso para a geração
      const formattedDetails = {
        title: courseDetails.title,
        theme: courseDetails.theme,
        estimatedHours: courseDetails.estimatedHours || 10,
        moduleCount: moduleCount || 4, // Número padrão de módulos
        lessonsPerModule: lessonsPerModule || 3, // Número padrão de aulas por módulo
        format: courseDetails.format || "Online",
        platform: courseDetails.platform || "Web",
        deliveryFormat: courseDetails.deliveryFormat || "HTML5",
        publicTarget: courseDetails.publicTarget,
        educationalLevel: courseDetails.educationalLevel,
        familiarityLevel: courseDetails.familiarityLevel,
        motivation: courseDetails.motivation,
        cognitiveSkills: courseDetails.cognitiveSkills,
        behavioralSkills: courseDetails.behavioralSkills,
        technicalSkills: courseDetails.technicalSkills,
        languageLevel: courseDetails.languageLevel,
        courseLanguage: courseDetails.courseLanguage || "Português"
      };
      
      // Gerar a estrutura dos módulos usando a mesma função que já temos
      const structureData = await generateStructure(formattedDetails, {});
      
      res.json({
        success: true,
        modules: structureData.modules || []
      });
    } catch (error) {
      console.error("Erro na geração de módulos:", error);
      res.status(500).json({ 
        success: false,
        message: "Falha ao gerar módulos", 
        error: error instanceof Error ? error.message : "Erro desconhecido" 
      });
    }
  });

  // ---- Generate Competency Mapping (Phase 2) ----
  app.post("/api/generate/competency-mapping", async (req, res) => {
    try {
      const { courseId, modules, courseDetails } = req.body;
      
      console.log("Recebendo solicitação para mapeamento de competências:", {
        courseId,
        modulesCount: modules?.length || 0
      });
      
      if (!courseId) {
        return res.status(400).json({ message: "Course ID is required" });
      }
      
      if (!modules || !Array.isArray(modules) || modules.length === 0) {
        return res.status(400).json({ message: "Modules are required and must be an array" });
      }
      
      if (!courseDetails) {
        return res.status(400).json({ message: "Course details are required" });
      }
      
      const mappingData = await generateCompetencyMapping(modules, courseDetails);
      
      res.json({
        success: true,
        ...mappingData
      });
    } catch (error) {
      console.error("Error in competency mapping generation:", error);
      res.status(500).json({ 
        success: false,
        message: "Failed to generate competency mapping", 
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

  // Route for expanding specific content
  app.post("/api/content/expand", async (req, res) => {
    try {
      const { originalContent, contentType, expansionType, courseDetails, aiConfig } = req.body;
      
      // Validar parâmetros obrigatórios
      if (!originalContent || !contentType || !expansionType) {
        return res.status(400).json({ 
          error: "Parâmetros obrigatórios: originalContent, contentType, expansionType" 
        });
      }
      
      // Validar tipos de expansão disponíveis
      const validExpansionTypes = ["detailed", "examples", "simplified", "advanced", "practical", "theoretical"];
      if (!validExpansionTypes.includes(expansionType)) {
        return res.status(400).json({ 
          error: `Tipo de expansão inválido. Tipos válidos: ${validExpansionTypes.join(', ')}` 
        });
      }
      
      const expandedContent = await expandContent(
        originalContent,
        contentType,
        expansionType,
        courseDetails,
        aiConfig
      );
      
      res.json(expandedContent);
    } catch (error) {
      console.error("Erro ao expandir conteúdo:", error);
      res.status(500).json({ 
        error: "Falha ao expandir conteúdo",
        details: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  return httpServer;
}
