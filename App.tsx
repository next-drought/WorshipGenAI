import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, 
  FileText, 
  File as FileIcon, 
  Loader2, 
  CheckCircle2, 
  Download, 
  AlertCircle, 
  BookOpen,
  Languages
} from 'lucide-react';
import { InputMode, ProcessingState, GeneratedProgram } from './types';
import { extractTextFromPdf, extractTextFromDocx, extractTextFromPptx, readFileAsText, downloadFile, generateDocxHtml } from './utils/pdfUtils';
import * as GeminiService from './services/geminiService';

const App: React.FC = () => {
  // --- State ---
  const [inputMode, setInputMode] = useState<InputMode>(InputMode.MANUSCRIPT);
  const [date, setDate] = useState<string>('');
  
  // Files
  const [bulletinFile, setBulletinFile] = useState<File | null>(null);
  const [sermonFile, setSermonFile] = useState<File | null>(null);
  
  // Processing
  const [status, setStatus] = useState<ProcessingState>({ step: 'idle', message: 'Ready to start', progress: 0 });
  const [result, setResult] = useState<GeneratedProgram | null>(null);
  
  // Refs for auto-scrolling console/logs
  const resultRef = useRef<HTMLDivElement>(null);

  // --- Handlers ---

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setter: (f: File | null) => void) => {
    if (e.target.files && e.target.files[0]) {
      setter(e.target.files[0]);
    }
  };

  const processFiles = async () => {
    if (!bulletinFile || !sermonFile) {
      alert("Please upload both the bulletin and the sermon source.");
      return;
    }

    try {
      // 1. Extraction
      setStatus({ step: 'extracting', message: 'Extracting text from documents...', progress: 10 });
      
      const bulletinText = await extractTextFromPdf(bulletinFile);
      
      let sermonText = '';
      if (inputMode === InputMode.MANUSCRIPT) {
        if (sermonFile.type === 'application/pdf') {
          sermonText = await extractTextFromPdf(sermonFile);
        } else if (
          sermonFile.name.endsWith('.docx') || 
          sermonFile.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ) {
          sermonText = await extractTextFromDocx(sermonFile);
        } else {
          sermonText = await readFileAsText(sermonFile);
        }
      } else {
        // Slides Mode (PDF or PPTX)
        if (sermonFile.type === 'application/pdf') {
          sermonText = await extractTextFromPdf(sermonFile);
        } else if (
          sermonFile.name.endsWith('.pptx') || 
          sermonFile.type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
        ) {
          sermonText = await extractTextFromPptx(sermonFile);
        } else {
           throw new Error("Unsupported slides format. Please upload PDF or PPTX.");
        }
      }

      // 2. Bulletin Parsing
      setStatus({ step: 'extracting', message: 'Analyzing bulletin structure...', progress: 25 });
      const bulletinData = await GeminiService.parseBulletin(bulletinText);
      if (date) bulletinData.date = date; // Override if user provided

      // 3. Narrative Generation (if needed)
      let processedSermon = sermonText;
      if (inputMode === InputMode.SLIDES) {
        setStatus({ step: 'generating_narrative', message: 'Converting slides to narrative...', progress: 40 });
        processedSermon = await GeminiService.generateNarrativeFromSlides(sermonText);
      }

      // 4. Translation
      setStatus({ step: 'translating', message: 'Translating content (Chinese <-> English)...', progress: 60 });
      // Assuming source is Chinese for this specific prompt context, but API handles both.
      // We will translate the processed sermon.
      const translatedSermon = await GeminiService.translateText(processedSermon, 'en');

      // 5. Assembly
      setStatus({ step: 'assembling', message: 'Assembling final program...', progress: 85 });
      const markdown = await GeminiService.assembleProgram(bulletinData, processedSermon, translatedSermon);
      
      const htmlContent = generateDocxHtml(markdown);

      setResult({
        markdown,
        htmlContent,
        metadata: {
          date: bulletinData.date || 'Unknown Date',
          sermonTitle: bulletinData.sermonTitle || 'Sermon',
          preacher: bulletinData.preacher || 'Preacher'
        }
      });

      setStatus({ step: 'complete', message: 'Generation complete!', progress: 100 });
      
      // Scroll to result
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 500);

    } catch (error: any) {
      console.error(error);
      setStatus({ 
        step: 'error', 
        message: error.message || 'An unexpected error occurred.', 
        progress: 0 
      });
    }
  };

  const handleDownload = (type: 'md' | 'doc') => {
    if (!result) return;
    const filename = `Worship_Program_${result.metadata.date.replace(/-/g, '')}.${type === 'doc' ? 'doc' : 'md'}`;
    const content = type === 'doc' ? result.htmlContent : result.markdown;
    const mime = type === 'doc' ? 'application/msword' : 'text/markdown';
    downloadFile(content, filename, mime);
  };

  // --- Render ---

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2 rounded-lg text-white">
              <BookOpen size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
                WorshipGen AI
              </h1>
              <p className="text-xs text-slate-500">Bilingual Program Generator</p>
            </div>
          </div>
          
          <div className="text-sm font-medium text-slate-500 flex items-center space-x-1">
             <span className="w-2 h-2 rounded-full bg-green-500"></span>
             <span>System Ready</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Controls */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Step 1: Configuration */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 text-xs font-bold mr-2">1</span>
                Configuration
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Input Mode</label>
                  <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg">
                    <button
                      onClick={() => setInputMode(InputMode.MANUSCRIPT)}
                      className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                        inputMode === InputMode.MANUSCRIPT 
                          ? 'bg-white text-indigo-600 shadow-sm' 
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      Manuscript (.txt/pdf/docx)
                    </button>
                    <button
                      onClick={() => setInputMode(InputMode.SLIDES)}
                      className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                        inputMode === InputMode.SLIDES 
                          ? 'bg-white text-indigo-600 shadow-sm' 
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      Slides (.pdf/.pptx)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Worship Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                  />
                  <p className="mt-1 text-xs text-slate-400">Optional: Extracted from bulletin if empty</p>
                </div>
              </div>
            </div>

            {/* Step 2: File Uploads */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 text-xs font-bold mr-2">2</span>
                Upload Materials
              </h2>

              <div className="space-y-6">
                {/* Bulletin Upload */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Worship Bulletin (PDF) <span className="text-red-500">*</span>
                  </label>
                  <div className={`relative border-2 border-dashed rounded-lg p-4 transition-colors ${bulletinFile ? 'border-green-300 bg-green-50' : 'border-slate-300 hover:border-indigo-400'}`}>
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => handleFileChange(e, setBulletinFile)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="flex flex-col items-center justify-center space-y-2 text-center">
                      {bulletinFile ? (
                        <>
                          <CheckCircle2 className="h-8 w-8 text-green-500" />
                          <p className="text-sm font-medium text-green-700 truncate w-full px-2">{bulletinFile.name}</p>
                        </>
                      ) : (
                        <>
                          <FileIcon className="h-8 w-8 text-slate-400" />
                          <p className="text-sm text-slate-500">Drop PDF or click to browse</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Sermon Upload */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {inputMode === InputMode.MANUSCRIPT ? 'Sermon Manuscript (.txt/.pdf/.docx)' : 'Sermon Slides (.pdf/.pptx)'} <span className="text-red-500">*</span>
                  </label>
                  <div className={`relative border-2 border-dashed rounded-lg p-4 transition-colors ${sermonFile ? 'border-green-300 bg-green-50' : 'border-slate-300 hover:border-indigo-400'}`}>
                    <input
                      type="file"
                      accept={inputMode === InputMode.MANUSCRIPT ? ".txt,.pdf,.docx" : ".pdf,.pptx"}
                      onChange={(e) => handleFileChange(e, setSermonFile)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="flex flex-col items-center justify-center space-y-2 text-center">
                      {sermonFile ? (
                        <>
                          <CheckCircle2 className="h-8 w-8 text-green-500" />
                          <p className="text-sm font-medium text-green-700 truncate w-full px-2">{sermonFile.name}</p>
                        </>
                      ) : (
                        <>
                          <FileText className="h-8 w-8 text-slate-400" />
                          <p className="text-sm text-slate-500">
                            {inputMode === InputMode.MANUSCRIPT ? 'Text, PDF, or Word' : 'PDF or PPTX Slides'}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Area */}
            <div className="sticky bottom-4 z-10">
              <button
                onClick={processFiles}
                disabled={status.step !== 'idle' && status.step !== 'complete' && status.step !== 'error'}
                className={`w-full flex items-center justify-center py-4 px-6 border border-transparent rounded-xl shadow-lg text-base font-bold text-white transition-all ${
                  status.step === 'idle' || status.step === 'complete' || status.step === 'error'
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 transform hover:-translate-y-0.5' 
                    : 'bg-slate-400 cursor-not-allowed'
                }`}
              >
                {status.step === 'idle' || status.step === 'complete' || status.step === 'error' ? (
                  <>
                    <Languages className="mr-2 h-5 w-5" />
                    Generate Program
                  </>
                ) : (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Processing...
                  </>
                )}
              </button>
            </div>

          </div>

          {/* Right Column: Status & Output */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Status Panel */}
            {status.step !== 'idle' && (
               <div className={`rounded-xl border p-6 transition-all duration-300 ${status.step === 'error' ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200 shadow-sm'}`}>
                 <div className="flex items-center justify-between mb-4">
                   <h3 className={`text-lg font-semibold ${status.step === 'error' ? 'text-red-700' : 'text-slate-800'}`}>
                     {status.step === 'complete' ? 'Generation Successful' : status.step === 'error' ? 'Processing Error' : 'Processing...'}
                   </h3>
                   <span className={`text-sm font-medium px-3 py-1 rounded-full ${
                     status.step === 'complete' ? 'bg-green-100 text-green-700' : 
                     status.step === 'error' ? 'bg-red-100 text-red-700' :
                     'bg-indigo-100 text-indigo-700'
                   }`}>
                     {status.progress}%
                   </span>
                 </div>
                 
                 {status.step !== 'error' && (
                   <div className="w-full bg-slate-100 rounded-full h-2.5 mb-4">
                     <div 
                       className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500 ease-out" 
                       style={{ width: `${status.progress}%` }}
                     ></div>
                   </div>
                 )}
                 
                 <div className="flex items-center space-x-3 text-sm">
                   {status.step === 'error' ? (
                     <AlertCircle className="h-5 w-5 text-red-500" />
                   ) : status.step === 'complete' ? (
                     <CheckCircle2 className="h-5 w-5 text-green-500" />
                   ) : (
                     <Loader2 className="h-5 w-5 text-indigo-500 animate-spin" />
                   )}
                   <span className={`${status.step === 'error' ? 'text-red-600' : 'text-slate-600'}`}>
                     {status.message}
                   </span>
                 </div>
               </div>
            )}

            {/* Results Preview */}
            {result && (
              <div ref={resultRef} className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">Program Preview</h3>
                    <p className="text-sm text-slate-500">Markdown format</p>
                  </div>
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => handleDownload('md')}
                      className="inline-flex items-center px-4 py-2 border border-slate-300 shadow-sm text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 focus:outline-none"
                    >
                      <FileText className="mr-2 h-4 w-4 text-slate-500" />
                      Markdown
                    </button>
                    <button 
                      onClick={() => handleDownload('doc')}
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download Word (.doc)
                    </button>
                  </div>
                </div>
                
                <div className="p-8 overflow-auto max-h-[800px] bg-white">
                  <article className="prose prose-slate max-w-none">
                    <pre className="whitespace-pre-wrap font-sans text-sm text-slate-700 leading-relaxed">
                      {result.markdown}
                    </pre>
                  </article>
                </div>
              </div>
            )}

            {/* Placeholder / Empty State */}
            {!status.step.match(/extracting|generating|translating|assembling|complete|error/) && (
              <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center h-96 flex flex-col items-center justify-center text-slate-400">
                <Upload className="h-16 w-16 mb-4 text-slate-200" />
                <p className="text-lg font-medium text-slate-500">Ready to Generate</p>
                <p className="max-w-md mx-auto mt-2">
                  Upload your worship bulletin and sermon materials on the left to begin generating a bilingual program.
                </p>
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  );
};

export default App;