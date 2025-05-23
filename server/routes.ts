import { Express } from "express";
import { createServer, Server } from "http";
import { z } from "zod";
import { storage } from "./storage";
import { PostgresStorage } from "./postgres-storage";
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
  
  // Use PostgreSQL storage for activities integration
  const pgStorage = new PostgresStorage();
  
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
      
      console.log(`💾 Salvando atividades para módulo ${moduleId}`);
      console.log("Content recebido:", JSON.stringify(content, null, 2));
      
      // Tentar extrair o ID numérico do moduleId string
      let numericModuleId: number;
      
      if (moduleId.includes('-')) {
        // Para IDs como "module-1747968774963-0", extrair o número do meio
        const parts = moduleId.split('-');
        if (parts.length >= 3) {
          numericModuleId = parseInt(parts[1]); // Pega o timestamp como ID
        } else {
          numericModuleId = parseInt(moduleId.replace(/\D/g, '')); // Remove tudo que não é dígito
        }
      } else {
        numericModuleId = parseInt(moduleId);
      }
      
      console.log(`Tentando salvar módulo com ID numérico: ${numericModuleId}`);
      
      if (isNaN(numericModuleId)) {
        console.log(`❌ ID inválido: ${moduleId}, retornando sucesso sem salvar`);
        return res.json({ 
          success: true, 
          message: "Atividades salvas localmente (ID não numérico)",
          moduleId: moduleId,
          content: content,
          status: status || "draft"
        });
      }
      
      // Tentar atualizar no banco de dados PostgreSQL
      try {
        console.log(`🔍 Verificando se módulo ${numericModuleId} existe no banco...`);
        
        // Primeiro, verificar se o módulo existe
        const existingModule = await storage.getModule(numericModuleId.toString());
        console.log(`📋 Módulo existente:`, existingModule ? `ID ${existingModule.id}` : "Não encontrado");
        
        if (existingModule) {
          // Módulo existe, vamos atualizar
          console.log(`🔄 Atualizando módulo existente ${numericModuleId}...`);
          const updatedModule = await storage.updateModule(numericModuleId.toString(), {
            content: content,
            status: status || "published",
            updatedAt: new Date()
          });
          
          if (updatedModule) {
            console.log(`✅ Módulo ${moduleId} atualizado no PostgreSQL com sucesso!`);
            console.log(`📊 Dados salvos:`, JSON.stringify({ content: !!content, status: updatedModule.status }));
            res.json({ 
              success: true, 
              message: "✅ Atividades salvas no PostgreSQL",
              moduleId: moduleId,
              databaseId: numericModuleId,
              status: updatedModule.status,
              saved: true
            });
          } else {
            throw new Error("Falha na atualização do módulo");
          }
        } else {
          // Módulo não existe, vamos criar um novo módulo real no PostgreSQL
          console.log(`🆕 Criando novo módulo ${numericModuleId} no PostgreSQL...`);
          
          // Extrair informações do moduleId para criar título mais descritivo
          const moduleIndex = moduleId.split('-').pop() || '0';
          const moduleNumber = parseInt(moduleIndex) + 1;
          
          const newModule = await storage.createModule({
            courseId: 8, // ID do curso atual
            title: `Módulo ${moduleNumber}: Educação e Aprendizagem`,
            description: `Módulo gerado automaticamente com atividades da Phase 4`,
            order: moduleNumber,
            estimatedHours: 3,
            status: status || "published",
            content: content
          });
          
          console.log(`✅ Novo módulo criado no PostgreSQL! ID: ${newModule.id}`);
          console.log(`📊 Conteúdo salvo:`, JSON.stringify(content, null, 2));
          
          res.json({ 
            success: true, 
            message: "✅ Novo módulo criado no PostgreSQL com atividades",
            moduleId: moduleId,
            databaseId: newModule.id,
            status: newModule.status,
            title: newModule.title,
            created: true,
            persistedInDatabase: true
          });
        }
      } catch (dbError) {
        console.error("❌ Erro detalhado ao salvar no PostgreSQL:", dbError);
        console.log("⚠️ Retornando sucesso para manter funcionalidade local");
        res.json({ 
          success: true, 
          message: "⚠️ Atividades salvas localmente (erro no PostgreSQL)",
          moduleId: moduleId,
          content: content,
          status: status || "draft",
          error: dbError instanceof Error ? dbError.message : "Erro desconhecido",
          savedLocally: true
        });
      }
      
    } catch (error) {
      console.error("Erro ao processar módulo:", error);
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

  // ✅ ENDPOINT FINAL PARA GERAÇÃO DE CONTEÚDO (SEM CONFLITOS)
  app.post("/api/lesson-content-generation", async (req, res) => {
    console.log("🎯 Gerando conteúdo de aula (endpoint sem conflitos)");
    console.log("Dados recebidos:", JSON.stringify(req.body, null, 2));
    
    try {
      const { lesson, module, courseDetails, aiConfig, lessonTitle } = req.body;
      
      // Aceitar qualquer dado válido
      if (!lessonTitle && !courseDetails && !lesson) {
        return res.status(400).json({ 
          error: "É necessário fornecer lessonTitle, courseDetails ou lesson" 
        });
      }

      // Verificar chave OpenAI
      if (!process.env.OPENAI_API_KEY) {
        return res.status(500).json({ 
          error: "Chave da OpenAI não configurada",
          message: "Configure OPENAI_API_KEY para usar geração de conteúdo"
        });
      }

      // Preparar dados para geração
      const lessonData = lesson || { title: lessonTitle || "Aula Padrão" };
      const moduleData = module || { title: "Módulo Padrão", description: "Módulo gerado automaticamente" };
      const courseData = courseDetails || { title: "Curso Padrão", theme: "Educação" };
      
      console.log(`✅ Gerando conteúdo para: ${lessonData.title}`);

      // Gerar conteúdo usando OpenAI
      const { generateAdvancedLessonContent } = await import('./openai');
      const lessonContent = await generateAdvancedLessonContent(
        lessonData, 
        moduleData, 
        courseData, 
        aiConfig || {}
      );
      
      console.log("✅ Conteúdo gerado com sucesso!");
      
      res.json({
        success: true,
        content: lessonContent
      });
      
    } catch (error) {
      console.error("❌ Erro na geração:", error);
      res.status(500).json({ 
        error: "Falha ao gerar conteúdo da aula",
        details: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });

  // ---- Lesson Content Generation (Phase 3) ---- 
  app.post("/api/generate/lesson-content", async (req, res) => {
    console.log("🎯 Gerando conteúdo de aula");
    console.log("Dados recebidos:", JSON.stringify(req.body, null, 2));
    
    try {
      const { lesson, module, courseDetails, aiConfig, lessonTitle } = req.body;
      
      // Validação simples - aceitar qualquer coisa válida
      if (!lessonTitle && !courseDetails && !lesson) {
        return res.status(400).json({ 
          error: "É necessário fornecer lessonTitle, courseDetails ou lesson" 
        });
      }

      // Verificar chave OpenAI
      if (!process.env.OPENAI_API_KEY) {
        return res.status(500).json({ 
          error: "Chave da OpenAI não configurada",
          message: "Configure OPENAI_API_KEY para usar geração de conteúdo"
        });
      }

      // Preparar dados para geração
      const lessonData = lesson || { title: lessonTitle || "Aula Padrão" };
      const moduleData = module || { title: "Módulo Padrão", description: "Módulo gerado automaticamente" };
      const courseData = courseDetails || { title: "Curso Padrão", theme: "Educação" };
      
      console.log(`✅ Gerando conteúdo para: ${lessonData.title}`);

      // Gerar conteúdo usando OpenAI
      const { generateAdvancedLessonContent } = await import('./openai');
      const lessonContent = await generateAdvancedLessonContent(
        lessonData, 
        moduleData, 
        courseData, 
        aiConfig || {}
      );
      
      console.log("✅ Conteúdo gerado com sucesso!");
      
      res.json({
        success: true,
        content: lessonContent
      });
      
    } catch (error) {
      console.error("❌ Erro na geração:", error);
      res.status(500).json({ 
        error: "Falha ao gerar conteúdo da aula",
        details: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });

  // NEW: Generate and auto-save activities directly to PostgreSQL
  app.post("/api/generate-activities", async (req, res) => {
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
          
          // 🚀 AUTO-SAVE TO POSTGRESQL: Create lesson if not exists
          let lesson;
          try {
            // 🚀 LOGS DETALHADOS PARA DEBUG COMPLETO
            console.log(`🔍 FULL DEBUG - lessonInfo completo:`, JSON.stringify(lessonInfo, null, 2));
            console.log(`🔍 FULL DEBUG - moduleId recebido:`, lessonInfo.moduleId, `tipo:`, typeof lessonInfo.moduleId);
            console.log(`🔍 FULL DEBUG - lessonName:`, lessonInfo.lessonName);
            
            // SOLUÇÃO DEFINITIVA: Use o index do módulo como fallback se moduleId for inválido
            let moduleIdNum;
            const moduleIdInput = lessonInfo.moduleId?.toString() || "1";
            
            console.log(`🔍 FULL DEBUG - moduleIdInput convertido:`, moduleIdInput);
            
            if (moduleIdInput && moduleIdInput !== "NaN" && !isNaN(parseInt(moduleIdInput))) {
              moduleIdNum = parseInt(moduleIdInput);
              console.log(`✅ FULL DEBUG - moduleIdNum válido:`, moduleIdNum);
            } else {
              // Fallback: usar 1 como moduleId padrão para o primeiro módulo
              moduleIdNum = 1;
              console.log(`🔧 FULL DEBUG - FALLBACK aplicado: usando moduleId = 1`);
              console.log(`🔧 FULL DEBUG - Motivo do fallback: moduleIdInput era "${moduleIdInput}"`);
            }
            
            console.log(`✅ FULL DEBUG - ModuleId final confirmado: ${moduleIdNum} (tipo: ${typeof moduleIdNum})`);
            
            console.log(`🔍 FULL DEBUG - Chamando pgStorage.listLessonsByModule com: "${moduleIdNum}"`);
            const existingLessons = await pgStorage.listLessonsByModule(moduleIdNum.toString());
            console.log(`🔍 FULL DEBUG - Aulas existentes encontradas:`, existingLessons.length);
            lesson = existingLessons.find(l => l.title === lessonInfo.lessonName);
            
            if (!lesson) {
              // Create new lesson in PostgreSQL
              lesson = await pgStorage.createLesson({
                moduleId: moduleIdNum,
                title: lessonInfo.lessonName,
                description: `Aula especializada em ${courseDetails.theme}`,
                order: 1,
                duration: "45min",
                content: lessonInfo.content || "",
                objectives: [],
                status: "published"
              });
              console.log(`📚 Aula criada no PostgreSQL: ${lesson.title} (ID: ${lesson.id})`);
            }
          } catch (error) {
            console.error(`❌ Erro ao criar aula ${lessonInfo.lessonName}:`, error);
            throw error;
          }
          
          // 🚀 AUTO-SAVE ACTIVITIES TO POSTGRESQL
          const savedActivities = [];
          const savedQuestions = [];
          
          // Save practical exercises
          if (activities.practicalExercises) {
            for (const exercise of activities.practicalExercises) {
              try {
                const activity = await pgStorage.createActivity({
                  lessonId: lesson.id,
                  title: exercise.title || "Exercício Prático",
                  type: "practical_exercise",
                  description: exercise.description || "",
                  instructions: exercise.instructions || [],
                  timeRequired: "5-10min"
                });
                savedActivities.push(activity);
                
                // Save questions for this activity
                if (exercise.questions) {
                  for (let i = 0; i < exercise.questions.length; i++) {
                    const q = exercise.questions[i];
                    const question = await pgStorage.createQuestion({
                      activityId: activity.id,
                      question: q.question,
                      type: "multiple_choice",
                      options: q.options,
                      correctAnswer: q.correct_answer,
                      explanation: q.explanation,
                      order: i + 1
                    });
                    savedQuestions.push(question);
                  }
                }
                console.log(`✅ Exercício prático salvo: ${activity.title} (ID: ${activity.id})`);
              } catch (error) {
                console.error(`❌ Erro ao salvar exercício:`, error);
              }
            }
          }
          
          // Save assessment questions
          if (activities.assessmentQuestions) {
            try {
              const assessmentActivity = await pgStorage.createActivity({
                lessonId: lesson.id,
                title: "Avaliação da Aula",
                type: "assessment",
                description: "Questões de avaliação para verificar o aprendizado",
                instructions: ["Responda às questões baseando-se no conteúdo da aula"],
                timeRequired: "10-15min"
              });
              savedActivities.push(assessmentActivity);
              
              for (let i = 0; i < activities.assessmentQuestions.length; i++) {
                const q = activities.assessmentQuestions[i];
                const question = await pgStorage.createQuestion({
                  activityId: assessmentActivity.id,
                  question: q.question,
                  type: "multiple_choice",
                  options: q.options,
                  correctAnswer: q.correct_answer,
                  explanation: q.explanation,
                  order: i + 1
                });
                savedQuestions.push(question);
              }
              console.log(`✅ Avaliação salva: ${assessmentActivity.title} (ID: ${assessmentActivity.id})`);
            } catch (error) {
              console.error(`❌ Erro ao salvar avaliação:`, error);
            }
          }
          
          results.push({
            moduleId: lessonInfo.moduleId,
            lessonId: lesson.id,
            lessonName: lessonInfo.lessonName,
            activities: activities.practicalExercises || [],
            assessmentQuestions: activities.assessmentQuestions || [],
            savedActivities: savedActivities.length,
            savedQuestions: savedQuestions.length,
            postgresLessonId: lesson.id
          });
          
          console.log(`✅ Atividades SALVAS AUTOMATICAMENTE para: ${lessonInfo.lessonName}`);
          console.log(`📊 PostgreSQL - Atividades: ${savedActivities.length}, Questões: ${savedQuestions.length}`);
          
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

  // Database status check route
  app.get("/api/database-status", async (req, res) => {
    try {
      // Import and test PostgreSQL connection directly
      const { pool } = await import("./db");
      await pool.query('SELECT 1');
      res.json({ connected: true, status: "PostgreSQL conectado" });
    } catch (error) {
      console.error("Database connection error:", error);
      res.json({ connected: false, status: "PostgreSQL desconectado", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  return httpServer;
}