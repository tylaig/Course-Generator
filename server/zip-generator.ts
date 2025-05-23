import archiver from 'archiver';
import PDFDocument from 'pdfkit';
import { Readable } from 'stream';

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

// Generate PDF buffer for a lesson
export async function generateLessonPDF(lesson: any, module: any, course: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Course header
      doc.fontSize(20).text(course.title || 'Course', { align: 'center' });
      doc.fontSize(16).text(module.title || 'Module', { align: 'center' });
      doc.moveDown(2);

      // Lesson title
      doc.fontSize(18).text(lesson.title || 'Lesson', { underline: true });
      doc.moveDown();

      // Lesson content
      let contentText = '';
      if (lesson.detailedContent?.content) {
        contentText = lesson.detailedContent.content;
      } else if (lesson.content) {
        contentText = lesson.content;
      } else {
        contentText = `Welcome to ${lesson.title || 'this lesson'}!\n\nThis lesson is part of ${module.title || 'the module'} in ${course.title || 'the course'}.\n\nKey topics covered:\n• Introduction to the subject\n• Core concepts and principles\n• Practical applications\n• Summary and next steps`;
      }

      // Clean and format content
      const cleanContent = contentText.replace(/#+\s*/g, '').replace(/\*\*/g, '');
      doc.fontSize(12).text(cleanContent, { align: 'left', lineGap: 5 });

      // Objectives
      if (lesson.detailedContent?.objectives && lesson.detailedContent.objectives.length > 0) {
        doc.moveDown(2);
        doc.fontSize(14).text('Learning Objectives:', { underline: true });
        doc.moveDown(0.5);
        lesson.detailedContent.objectives.forEach((objective: string, index: number) => {
          doc.fontSize(12).text(`${index + 1}. ${objective}`, { indent: 20 });
        });
      }

      // Add footer
      doc.moveDown(2);
      doc.fontSize(10).text(`Generated from ${course.title} - ${module.title}`, { align: 'center' });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

// Generate PDF buffer for module tasks/activities
export async function generateModuleTasksPDF(module: any, course: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(20).text(course.title || 'Course', { align: 'center' });
      doc.fontSize(16).text(`Tasks and Activities - ${module.title || 'Module'}`, { align: 'center' });
      doc.moveDown(2);

      let hasContent = false;
      const lessons = module.content?.lessons || [];

      // Collect all exercises and assessments from all lessons
      lessons.forEach((lesson: any, lessonIndex: number) => {
        const exercises = lesson.detailedContent?.practicalExercises || [];
        const assessments = lesson.detailedContent?.assessmentQuestions || [];
        
        if (exercises.length > 0 || assessments.length > 0) {
          hasContent = true;
          
          doc.fontSize(16).text(`Lesson ${lessonIndex + 1}: ${lesson.title || 'Lesson'}`, { underline: true });
          doc.moveDown();

          // Practical exercises
          if (exercises.length > 0) {
            doc.fontSize(14).text('Practical Exercises:', { underline: true });
            doc.moveDown(0.5);
            
            exercises.forEach((exercise: any, index: number) => {
              doc.fontSize(12).text(`Exercise ${index + 1}: ${exercise.title || 'Exercise'}`);
              doc.fontSize(11).text(exercise.description || 'Complete the following tasks...');
              doc.moveDown(0.5);
              
              const questions = exercise.questions || [];
              if (questions.length > 0) {
                questions.forEach((question: any, qIndex: number) => {
                  doc.fontSize(11).text(`Q${qIndex + 1}: ${question.question}`);
                  const options = question.options || [];
                  options.forEach((option: string, oIndex: number) => {
                    doc.fontSize(10).text(`  ${String.fromCharCode(65 + oIndex)}) ${option}`, { indent: 20 });
                  });
                  doc.fontSize(10).text(`Answer: ${String.fromCharCode(65 + (question.correct_answer || 0))}`, { indent: 20 });
                  if (question.explanation) {
                    doc.fontSize(10).text(`Explanation: ${question.explanation}`, { indent: 20 });
                  }
                  doc.moveDown(0.5);
                });
              }
              doc.moveDown();
            });
          }

          // Assessment questions
          if (assessments.length > 0) {
            doc.fontSize(14).text('Assessment Questions:', { underline: true });
            doc.moveDown(0.5);
            
            assessments.forEach((question: any, index: number) => {
              doc.fontSize(11).text(`${index + 1}. ${question.question}`);
              const options = question.options || [];
              options.forEach((option: string, oIndex: number) => {
                doc.fontSize(10).text(`  ${String.fromCharCode(65 + oIndex)}) ${option}`, { indent: 20 });
              });
              doc.fontSize(10).text(`Answer: ${String.fromCharCode(65 + (question.correct_answer || 0))}`, { indent: 20 });
              if (question.explanation) {
                doc.fontSize(10).text(`Explanation: ${question.explanation}`, { indent: 20 });
              }
              doc.moveDown();
            });
          }

          doc.moveDown();
        }
      });

      if (!hasContent) {
        doc.fontSize(12).text(`This module contains ${lessons.length} lesson${lessons.length !== 1 ? 's' : ''}.\n\nPractical exercises and assessment questions will be displayed here once they are generated for the lessons.\n\nTo add activities:\n1. Go to Phase 3 (Content Generation)\n2. Generate detailed content for each lesson\n3. Activities will automatically appear in this section`);
      }

      // Add footer
      doc.moveDown(2);
      doc.fontSize(10).text(`Generated from ${course.title} - ${module.title}`, { align: 'center' });

      doc.end();
    } catch (error) {
      reject(error);
    }
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

    // Course title
    doc.fontSize(24).text(course.title, { align: 'center' });
    doc.moveDown();

    // Course info
    doc.fontSize(14).text(`Theme: ${course.theme}`);
    doc.moveDown();

    // Modules overview
    doc.fontSize(18).text('Course Structure', { underline: true });
    doc.moveDown();

    course.modules.forEach((module, index) => {
      doc.fontSize(16).text(`Module ${index + 1}: ${module.title}`);
      doc.fontSize(12).text(module.description);
      doc.fontSize(12).text(`Lessons: ${module.content.lessons.length}`);
      
      module.content.lessons.forEach((lesson, lessonIndex) => {
        doc.fontSize(11).text(`  ${lessonIndex + 1}. ${lesson.title}`);
      });
      
      doc.moveDown();
    });

    doc.end();
  });
}

// Main function to generate course ZIP
export async function generateCourseZip(courseData: CourseDataForZip): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });

    const chunks: Buffer[] = [];
    archive.on('data', (chunk: Buffer) => chunks.push(chunk));
    archive.on('end', () => resolve(Buffer.concat(chunks)));
    archive.on('error', reject);

    try {
      console.log('🚀 Starting ZIP generation for:', courseData.title);
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

      // STEP 1: Generate all PDFs first (same as Google Drive)
      console.log('📄 STEP 1: Generating all PDF files...');
      const generatedPDFs: Array<{buffer: Buffer, path: string, name: string}> = [];

      // Generate course summary PDF
      console.log('📋 Generating course summary PDF...');
      try {
        const courseSummaryPDF = await generateCourseSummaryPDF(courseData);
        console.log('✅ Course summary PDF generated successfully');
        generatedPDFs.push({
          buffer: courseSummaryPDF,
          path: 'Course_Summary.pdf',
          name: 'Course Summary'
        });
      } catch (error) {
        console.error('❌ Failed to generate course summary PDF:', error);
        throw error;
      }

      // Generate all lesson and task PDFs
      for (let moduleIndex = 0; moduleIndex < courseData.modules.length; moduleIndex++) {
        const module = courseData.modules[moduleIndex];
        console.log(`📁 Processing module ${moduleIndex + 1}: ${module.title}`);
        
        // Clean module name for folder
        const cleanModuleName = module.title.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
        const moduleFolder = `Module_${moduleIndex + 1}_${cleanModuleName}/`;

        // Ensure module has lessons
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

        // Generate all lesson PDFs for this module
        for (let lessonIndex = 0; lessonIndex < lessons.length; lessonIndex++) {
          const lesson = lessons[lessonIndex];
          console.log(`  📖 Generating lesson PDF ${lessonIndex + 1}: ${lesson.title}`);
          
          try {
            const lessonPDF = await generateLessonPDF(lesson, module, courseData);
            const cleanLessonName = lesson.title.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
            const lessonFileName = `Lesson_${lessonIndex + 1}_${cleanLessonName}.pdf`;
            
            console.log(`     ✅ Lesson PDF generated: ${lessonFileName} (${lessonPDF.length} bytes)`);
            
            generatedPDFs.push({
              buffer: lessonPDF,
              path: moduleFolder + lessonFileName,
              name: `${module.title} - ${lesson.title}`
            });
          } catch (error) {
            console.error(`     ❌ Failed to generate lesson PDF for ${lesson.title}:`, error);
            throw error;
          }
        }

        // Generate tasks PDF for this module
        console.log(`  📝 Generating tasks PDF for module: ${module.title}`);
        try {
          const tasksPDF = await generateModuleTasksPDF(module, courseData);
          const tasksFileName = `Tasks_${cleanModuleName}.pdf`;
          
          console.log(`     ✅ Tasks PDF generated: ${tasksFileName} (${tasksPDF.length} bytes)`);
          
          generatedPDFs.push({
            buffer: tasksPDF,
            path: moduleFolder + tasksFileName,
            name: `${module.title} - Tasks`
          });
        } catch (error) {
          console.error(`     ❌ Failed to generate tasks PDF for ${module.title}:`, error);
          throw error;
        }
      }

      // STEP 2: Create ZIP structure with all generated PDFs
      console.log('🗂️ STEP 2: Creating ZIP file structure...');
      console.log(`📦 Total PDFs generated: ${generatedPDFs.length}`);
      
      let totalSize = 0;
      for (const pdf of generatedPDFs) {
        console.log(`   📁 Adding to ZIP: ${pdf.path} (${pdf.buffer.length} bytes)`);
        archive.append(pdf.buffer, { name: pdf.path });
        totalSize += pdf.buffer.length;
      }

      console.log(`📊 Total content size: ${Math.round(totalSize / 1024)} KB`);
      console.log('✅ Finalizing ZIP archive...');
      archive.finalize();
    } catch (error) {
      console.error('Error generating ZIP:', error);
      reject(error);
    }
  });
}