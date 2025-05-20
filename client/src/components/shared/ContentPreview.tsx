import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { CourseModule } from "@/types";
import { useCourse } from "@/context/CourseContext";

interface ContentPreviewProps {
  module: CourseModule;
  onClose: () => void;
}

export default function ContentPreview({ module, onClose }: ContentPreviewProps) {
  const [activeTab, setActiveTab] = useState("text");
  const { updateModuleStatus } = useCourse();

  const handleApprove = () => {
    updateModuleStatus(module.id, "approved");
    onClose();
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-lg font-heading font-semibold text-neutral-800">
            {module.title} Content Preview
          </DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="text" value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="border-b border-neutral-200 mb-4">
            <TabsTrigger value="text" className="px-4 py-2">
              Text Content
            </TabsTrigger>
            <TabsTrigger value="video" className="px-4 py-2">
              Video Script
            </TabsTrigger>
            <TabsTrigger value="activities" className="px-4 py-2">
              Activities
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="text" className="flex-1 overflow-auto p-1">
            <div className="prose max-w-none text-sm text-neutral-700">
              {module.content?.text ? (
                <div dangerouslySetInnerHTML={{ __html: module.content.text.replace(/\n/g, '<br />') }} />
              ) : (
                <p>No text content available</p>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="video" className="flex-1 overflow-auto p-1">
            <div className="prose max-w-none text-sm text-neutral-700">
              {module.content?.videoScript ? (
                <div dangerouslySetInnerHTML={{ __html: module.content.videoScript.replace(/\n/g, '<br />') }} />
              ) : (
                <p>No video script available</p>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="activities" className="flex-1 overflow-auto p-1">
            <div className="prose max-w-none text-sm text-neutral-700">
              {module.content?.activities?.length ? (
                module.content.activities.map((activity, index) => (
                  <div key={index} className="mb-6">
                    <h3 className="text-base font-medium">{activity.title}</h3>
                    <p className="mb-2">{activity.description}</p>
                    
                    {activity.questions?.length && (
                      <div className="pl-4 border-l-2 border-neutral-300 mt-4">
                        {activity.questions.map((question, qIndex) => (
                          <div key={qIndex} className="mb-4">
                            <p className="font-medium mb-2">Q{qIndex + 1}: {question.question}</p>
                            {question.options?.length && (
                              <ul className="pl-5 list-disc">
                                {question.options.map((option, oIndex) => (
                                  <li key={oIndex} className="mb-1">
                                    {option}
                                    {question.answer === oIndex && (
                                      <span className="text-green-600 ml-2 font-medium">(Correct)</span>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            )}
                            {question.explanation && (
                              <p className="text-sm italic mt-2 text-neutral-600">
                                Explanation: {question.explanation}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p>No activities available</p>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex items-center justify-between mt-4 pt-4 border-t border-neutral-200">
          <Button 
            variant="outline" 
            className="flex items-center"
          >
            <span className="material-icons text-sm mr-1">edit</span>
            Edit Content
          </Button>
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline"
              className="flex items-center"
            >
              <span className="material-icons text-sm mr-1">refresh</span>
              Regenerate
            </Button>
            <Button 
              onClick={handleApprove}
              className="flex items-center"
            >
              <span className="material-icons text-sm mr-1">check</span>
              Approve
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
