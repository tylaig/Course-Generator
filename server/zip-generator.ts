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
    const doc = new PDFDocument();
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Course header
    doc.fontSize(20).text(course.title, { align: 'center' });
    doc.fontSize(16).text(`${module.title}`, { align: 'center' });
    doc.moveDown();

    // Lesson title
    doc.fontSize(18).text(lesson.title, { underline: true });
    doc.moveDown();

    // Lesson content
    if (lesson.detailedContent?.content) {
      doc.fontSize(12).text(lesson.detailedContent.content);
    } else if (lesson.content) {
      doc.fontSize(12).text(lesson.content);
    } else {
      doc.fontSize(12).text(`Content for ${lesson.title}\n\nThis lesson covers important topics related to ${module.title}.`);
    }

    // Objectives
    if (lesson.detailedContent?.objectives) {
      doc.moveDown();
      doc.fontSize(14).text('Learning Objectives:', { underline: true });
      lesson.detailedContent.objectives.forEach((objective: string, index: number) => {
        doc.fontSize(12).text(`${index + 1}. ${objective}`);
      });
    }

    doc.end();
  });
}

// Generate PDF buffer for module tasks/activities
export async function generateModuleTasksPDF(module: any, course: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Header
    doc.fontSize(20).text(course.title, { align: 'center' });
    doc.fontSize(16).text(`Tasks and Activities - ${module.title}`, { align: 'center' });
    doc.moveDown();

    let hasContent = false;

    // Collect all exercises and assessments from all lessons
    module.content.lessons.forEach((lesson: any, lessonIndex: number) => {
      if (lesson.detailedContent?.practicalExercises || lesson.detailedContent?.assessmentQuestions) {
        hasContent = true;
        
        doc.fontSize(16).text(`Lesson ${lessonIndex + 1}: ${lesson.title}`, { underline: true });
        doc.moveDown();

        // Practical exercises
        if (lesson.detailedContent.practicalExercises) {
          doc.fontSize(14).text('Practical Exercises:', { underline: true });
          lesson.detailedContent.practicalExercises.forEach((exercise: any, index: number) => {
            doc.fontSize(12).text(`Exercise ${index + 1}: ${exercise.title}`);
            doc.fontSize(11).text(exercise.description);
            
            if (exercise.questions) {
              exercise.questions.forEach((question: any, qIndex: number) => {
                doc.fontSize(11).text(`Q${qIndex + 1}: ${question.question}`);
                question.options.forEach((option: string, oIndex: number) => {
                  doc.fontSize(10).text(`  ${String.fromCharCode(65 + oIndex)}) ${option}`);
                });
                doc.fontSize(10).text(`Answer: ${String.fromCharCode(65 + question.correct_answer)}`);
                doc.fontSize(10).text(`Explanation: ${question.explanation}`);
                doc.moveDown();
              });
            }
            doc.moveDown();
          });
        }

        // Assessment questions
        if (lesson.detailedContent.assessmentQuestions) {
          doc.fontSize(14).text('Assessment Questions:', { underline: true });
          lesson.detailedContent.assessmentQuestions.forEach((question: any, index: number) => {
            doc.fontSize(11).text(`${index + 1}. ${question.question}`);
            question.options.forEach((option: string, oIndex: number) => {
              doc.fontSize(10).text(`  ${String.fromCharCode(65 + oIndex)}) ${option}`);
            });
            doc.fontSize(10).text(`Answer: ${String.fromCharCode(65 + question.correct_answer)}`);
            doc.fontSize(10).text(`Explanation: ${question.explanation}`);
            doc.moveDown();
          });
        }

        doc.moveDown();
      }
    });

    if (!hasContent) {
      doc.fontSize(12).text('Tasks and activities will be available after content generation.');
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
      // Create course summary
      const courseSummaryPDF = await generateCourseSummaryPDF(courseData);
      archive.append(courseSummaryPDF, { name: 'Course_Summary.pdf' });

      // Process each module
      for (const module of courseData.modules) {
        const moduleFolder = `Module_${module.title.replace(/[^a-zA-Z0-9]/g, '_')}/`;

        // Generate lesson PDFs
        for (let i = 0; i < module.content.lessons.length; i++) {
          const lesson = module.content.lessons[i];
          const lessonPDF = await generateLessonPDF(lesson, module, courseData);
          const lessonFileName = `Lesson_${i + 1}_${lesson.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
          archive.append(lessonPDF, { name: moduleFolder + lessonFileName });
        }

        // Generate tasks/activities PDF for the module
        const tasksPDF = await generateModuleTasksPDF(module, courseData);
        const tasksFileName = `Tasks_${module.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
        archive.append(tasksPDF, { name: moduleFolder + tasksFileName });
      }

      archive.finalize();
    } catch (error) {
      reject(error);
    }
  });
}