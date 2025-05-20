export default function Footer() {
  return (
    <footer className="bg-white border-t border-neutral-200 py-4">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between">
          <div className="flex items-center space-x-1 text-neutral-500 text-sm">
            <span>EduGen AI</span>
            <span>&copy; {new Date().getFullYear()}</span>
          </div>
          <div className="mt-2 md:mt-0">
            <span className="text-xs text-neutral-500">Powered by OpenAI API</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
