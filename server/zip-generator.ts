import archiver from 'archiver';
import PDFDocument from 'pdfkit';

export interface CourseDataForZip {
  title: string;
  theme: string;
  modules: Array<{
    id: string;
    title: string;
    description: string;
    content: {
      lessons: Array<{
        id: string;
        title: string;
        content?: string;
        detailedContent?: {
          objectives?: string[];
          content?: string;
          practicalExercises?: Array<{
            title: string;
            description: string;
            questions?: Array<{
              question: string;
              options: string[];
              correct_answer: number;
              explanation: string;
            }>;
          }>;
          assessmentQuestions?: Array<{
            question: string;
            options: string[];
            correct_answer: number;
            explanation: string;
          }>;
        };
      }>;
    };
  }>;
}

// Generate individual lesson PDF
export async function generateLessonPDF(lesson: any, module: any, course: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    try {
      // Title
      doc.fontSize(20).text(`${course.title}`, { align: 'center' });
      doc.moveDown();
      doc.fontSize(16).text(`Module: ${module.title}`, { align: 'center' });
      doc.moveDown();
      doc.fontSize(14).text(`Lesson: ${lesson.title}`, { align: 'center' });
      doc.moveDown(2);

      // Objectives
      if (lesson.detailedContent?.objectives?.length > 0) {
        doc.fontSize(12).text('Learning Objectives:', { underline: true });
        doc.moveDown(0.5);
        lesson.detailedContent.objectives.forEach((objective: string) => {
          doc.text(`• ${objective}`);
        });
        doc.moveDown();
      }

      // Content
      if (lesson.detailedContent?.content) {
        doc.fontSize(12).text('Content:', { underline: true });
        doc.moveDown(0.5);
        doc.text(lesson.detailedContent.content);
        doc.moveDown();
      } else if (lesson.content) {
        doc.fontSize(12).text('Content:', { underline: true });
        doc.moveDown(0.5);
        doc.text(lesson.content);
        doc.moveDown();
      }

      // Practical Exercises
      if (lesson.detailedContent?.practicalExercises?.length > 0) {
        doc.addPage();
        doc.fontSize(12).text('Practical Exercises:', { underline: true });
        doc.moveDown();

        lesson.detailedContent.practicalExercises.forEach((exercise: any, index: number) => {
          doc.text(`Exercise ${index + 1}: ${exercise.title}`, { underline: true });
          doc.moveDown(0.5);
          doc.text(exercise.description);
          doc.moveDown();

          if (exercise.questions?.length > 0) {
            exercise.questions.forEach((question: any, qIndex: number) => {
              doc.text(`Question ${qIndex + 1}: ${question.question}`);
              question.options.forEach((option: string, oIndex: number) => {
                const marker = oIndex === question.correct_answer ? '✓' : '○';
                doc.text(`  ${marker} ${option}`);
              });
              if (question.explanation) {
                doc.text(`Explanation: ${question.explanation}`, { fontSize: 10 });
              }
              doc.moveDown();
            });
          }
        });
      }

    } catch (error) {
      reject(error);
    }

    doc.end();
  });
}

// Generate module tasks PDF
export async function generateModuleTasksPDF(module: any, course: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    try {
      // Title
      doc.fontSize(20).text(`${course.title}`, { align: 'center' });
      doc.moveDown();
      doc.fontSize(16).text(`Module: ${module.title}`, { align: 'center' });
      doc.moveDown();
      doc.fontSize(14).text('Tasks and Activities', { align: 'center' });
      doc.moveDown(2);

      // Module Description
      if (module.description) {
        doc.fontSize(12).text('Module Description:', { underline: true });
        doc.moveDown(0.5);
        doc.text(module.description);
        doc.moveDown();
      }

      // Collect all assessment questions from lessons
      const allQuestions: any[] = [];
      if (module.content?.lessons) {
        module.content.lessons.forEach((lesson: any) => {
          if (lesson.detailedContent?.assessmentQuestions) {
            allQuestions.push(...lesson.detailedContent.assessmentQuestions);
          }
        });
      }

      if (allQuestions.length > 0) {
        doc.fontSize(12).text('Assessment Questions:', { underline: true });
        doc.moveDown();

        allQuestions.forEach((question: any, index: number) => {
          doc.text(`${index + 1}. ${question.question}`);
          question.options.forEach((option: string, oIndex: number) => {
            const marker = oIndex === question.correct_answer ? '✓' : '○';
            doc.text(`  ${marker} ${option}`);
          });
          if (question.explanation) {
            doc.text(`Explanation: ${question.explanation}`, { fontSize: 10 });
          }
          doc.moveDown();
        });
      } else {
        doc.text('This module includes practical activities and exercises that will be covered during the lessons.');
      }

    } catch (error) {
      reject(error);
    }

    doc.end();
  });
}

// Generate course summary PDF
export async function generateCourseSummaryPDF(course: CourseDataForZip): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    try {
      // Title Page
      doc.fontSize(24).text(course.title, { align: 'center' });
      doc.moveDown();
      doc.fontSize(16).text(`Theme: ${course.theme}`, { align: 'center' });
      doc.moveDown(2);

      // Course Overview
      doc.fontSize(14).text('Course Overview', { underline: true });
      doc.moveDown();
      doc.fontSize(12).text(`This course covers ${course.theme} and is organized into ${course.modules?.length || 0} modules.`);
      doc.moveDown();

      // Modules Summary
      if (course.modules && course.modules.length > 0) {
        doc.fontSize(14).text('Course Structure', { underline: true });
        doc.moveDown();

        course.modules.forEach((module, index) => {
          doc.fontSize(12).text(`Module ${index + 1}: ${module.title}`, { underline: true });
          doc.moveDown(0.5);
          doc.text(module.description || 'Module description not available.');
          
          const lessonCount = module.content?.lessons?.length || 0;
          doc.text(`Number of lessons: ${lessonCount}`);
          doc.moveDown();
        });
      }

    } catch (error) {
      reject(error);
    }

    doc.end();
  });
}

// MAIN FUNCTION: Generate course ZIP with correct sequence
export async function generateCourseZip(courseData: CourseDataForZip): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      console.log('🚀 STARTING ZIP GENERATION FOR:', courseData.title);
      console.log('📚 Number of modules:', courseData.modules?.length || 0);

      // Validate course data
      if (!courseData.modules || courseData.modules.length === 0) {
        console.log('⚠️ No modules found, creating default structure');
        courseData.modules = [{
          id: "1",
          title: "Introduction",
          description: `Introduction to ${courseData.theme}`,
          content: {
            lessons: [{
              id: "1",
              title: "Getting Started",
              content: `Welcome to ${courseData.title}`,
              detailedContent: {
                objectives: [`Learn about ${courseData.theme}`],
                content: `This course covers ${courseData.theme}`,
                practicalExercises: [],
                assessmentQuestions: []
              }
            }]
          }
        }];
      }

      // ===== STEP 1: GENERATE ALL PDF FILES FIRST =====
      console.log('📄 STEP 1: GENERATING ALL PDF FILES...');
      const allGeneratedPDFs: Array<{buffer: Buffer, filePath: string, fileName: string}> = [];

      // Generate course summary PDF
      console.log('📋 Generating course summary PDF...');
      const courseSummaryPDF = await generateCourseSummaryPDF(courseData);
      console.log(`✅ Course summary PDF generated (${courseSummaryPDF.length} bytes)`);
      allGeneratedPDFs.push({
        buffer: courseSummaryPDF,
        filePath: 'Course_Summary.pdf',
        fileName: 'Course Summary'
      });

      // Generate ALL PDFs for ALL modules and lessons
      for (let moduleIndex = 0; moduleIndex < courseData.modules.length; moduleIndex++) {
        const module = courseData.modules[moduleIndex];
        console.log(`📁 Processing module ${moduleIndex + 1}: ${module.title}`);
        
        const cleanModuleName = module.title.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
        const moduleFolder = `Module_${moduleIndex + 1}_${cleanModuleName}/`;

        const lessons = module.content?.lessons || [];
        if (lessons.length === 0) {
          console.log(`⚠️ No lessons found for module ${module.title}, creating default lesson`);
          lessons.push({
            id: "1",
            title: `Introduction to ${module.title}`,
            content: `Content for ${module.title}`,
            detailedContent: {
              objectives: [`Learn about ${module.title}`],
              content: `This module covers ${module.title}`,
              practicalExercises: [],
              assessmentQuestions: []
            }
          });
        }

        // Generate ALL lesson PDFs for this module
        for (let lessonIndex = 0; lessonIndex < lessons.length; lessonIndex++) {
          const lesson = lessons[lessonIndex];
          console.log(`  📖 Generating lesson PDF ${lessonIndex + 1}: ${lesson.title}`);
          
          const lessonPDF = await generateLessonPDF(lesson, module, courseData);
          const cleanLessonName = lesson.title.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
          const lessonFileName = `Lesson_${lessonIndex + 1}_${cleanLessonName}.pdf`;
          
          console.log(`     ✅ Lesson PDF completed: ${lessonFileName} (${lessonPDF.length} bytes)`);
          allGeneratedPDFs.push({
            buffer: lessonPDF,
            filePath: moduleFolder + lessonFileName,
            fileName: `${module.title} - ${lesson.title}`
          });
        }

        // Generate tasks PDF for this module
        console.log(`  📝 Generating tasks PDF for module: ${module.title}`);
        const tasksPDF = await generateModuleTasksPDF(module, courseData);
        const tasksFileName = `Tasks_${cleanModuleName}.pdf`;
        
        console.log(`     ✅ Tasks PDF completed: ${tasksFileName} (${tasksPDF.length} bytes)`);
        allGeneratedPDFs.push({
          buffer: tasksPDF,
          filePath: moduleFolder + tasksFileName,
          fileName: `${module.title} - Tasks`
        });
      }

      console.log(`📊 ALL PDFs GENERATED! Total: ${allGeneratedPDFs.length} files`);
      const totalSize = allGeneratedPDFs.reduce((sum, pdf) => sum + pdf.buffer.length, 0);
      console.log(`📊 Total content size: ${Math.round(totalSize / 1024)} KB`);

      // ===== STEP 2: NOW COMPRESS ALL GENERATED PDFs INTO ZIP =====
      console.log('🗜️ STEP 2: COMPRESSING ALL PDFs INTO ZIP ARCHIVE...');
      
      const archive = archiver('zip', {
        zlib: { level: 9 } // Maximum compression
      });

      const chunks: Buffer[] = [];
      archive.on('data', (chunk: Buffer) => chunks.push(chunk));
      archive.on('end', () => {
        console.log('✅ ZIP ARCHIVE COMPLETED SUCCESSFULLY!');
        resolve(Buffer.concat(chunks));
      });
      archive.on('error', reject);

      // Add all generated PDFs to the ZIP archive
      for (const pdf of allGeneratedPDFs) {
        console.log(`   📁 Adding to ZIP: ${pdf.filePath}`);
        archive.append(pdf.buffer, { name: pdf.filePath });
      }

      console.log('✅ All PDFs added to ZIP. Finalizing archive...');
      archive.finalize();
      
    } catch (error) {
      console.error('❌ Error generating ZIP:', error);
      reject(error);
    }
  });
}