
import React, { useState, useEffect } from 'react';
import { 
  AppTabs, 
  AppState, 
  ImageSize, 
  AspectRatio 
} from './types';
import { 
  generateStylistStory, 
  editImageWithPrompt, 
  generateImage, 
  analyzeImage, 
  checkApiKey, 
  openApiKeySelection 
} from './services/geminiService';

const IconStory = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>;
const IconMagic = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-7.714 2.143L11 21l-2.286-6.857L1 12l7.714-2.143L11 3z" /></svg>;
const IconPlus = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>;
const IconSearch = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>;
const IconUpload = () => <svg className="w-12 h-12 text-amber-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>;

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    originalImage: null,
    processedImage: null,
    storyResult: null,
    loading: false,
    error: null,
    activeTab: AppTabs.STORY,
    prompt: '',
    selectedSize: '1K',
    selectedAR: '1:1',
    analysisResult: null,
  });

  const [hasKey, setHasKey] = useState<boolean>(true);

  useEffect(() => {
    checkApiKey().then(setHasKey);
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setState(prev => ({ 
          ...prev, 
          originalImage: reader.result as string, 
          processedImage: null, 
          storyResult: null,
          analysisResult: null 
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAction = async () => {
    if (!hasKey) {
      await openApiKeySelection();
      setHasKey(true);
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null, processedImage: null, storyResult: null, analysisResult: null }));
    
    try {
      switch (state.activeTab) {
        case AppTabs.STORY:
          if (!state.originalImage) throw new Error("Please upload an image first.");
          const story = await generateStylistStory(state.originalImage);
          setState(prev => ({ ...prev, storyResult: story }));
          break;
        case AppTabs.EDIT:
          if (!state.originalImage) throw new Error("Please upload an image first.");
          const editResult = await editImageWithPrompt(state.originalImage, state.prompt);
          setState(prev => ({ ...prev, processedImage: editResult }));
          break;
        case AppTabs.GENERATE:
          const genResult = await generateImage(state.prompt, state.selectedSize, state.selectedAR);
          setState(prev => ({ ...prev, processedImage: genResult }));
          break;
        case AppTabs.ANALYZE:
          if (!state.originalImage) throw new Error("Please upload an image first.");
          const analysis = await analyzeImage(state.originalImage);
          setState(prev => ({ ...prev, analysisResult: analysis }));
          break;
      }
    } catch (err: any) {
      setState(prev => ({ ...prev, error: err.message || "An unexpected error occurred." }));
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  };

  const TabButton = ({ id, label, icon: Icon }: { id: any, label: string, icon: any }) => (
    <button
      onClick={() => setState(prev => ({ ...prev, activeTab: id, processedImage: null, storyResult: null, analysisResult: null }))}
      className={`flex items-center gap-2 px-6 py-3 transition-all duration-200 border-b-2 font-medium ${
        state.activeTab === id 
          ? 'border-amber-500 text-amber-500 bg-amber-500/10' 
          : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
      }`}
    >
      <Icon />
      {label}
    </button>
  );

  // Helper for badge positioning class
  const getBadgePositionClass = (pos: string) => {
    switch(pos) {
      case 'top-left': return 'top-4 left-4';
      case 'top-right': return 'top-4 right-4';
      case 'bottom-left': return 'bottom-4 left-4';
      case 'bottom-right': return 'bottom-4 right-4';
      default: return 'top-4 left-4';
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-zinc-800 py-4 px-8 sticky top-0 bg-zinc-950/80 backdrop-blur-md z-50 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center text-zinc-950 font-bold">B</div>
          <h1 className="text-xl font-bold tracking-tight text-white">Banana <span className="text-amber-500">Studio</span> Pro</h1>
        </div>
        {!hasKey && (
          <button onClick={openApiKeySelection} className="px-4 py-2 bg-red-600/20 text-red-400 border border-red-600/50 rounded-full text-sm font-medium">
            Select Paid API Key
          </button>
        )}
      </header>

      <main className="flex-1 flex flex-col md:flex-row p-6 gap-6 overflow-hidden">
        <div className="w-full md:w-[400px] flex flex-col gap-6 overflow-y-auto pr-2">
          <nav className="flex flex-wrap border border-zinc-800 rounded-xl overflow-hidden glass">
            <TabButton id={AppTabs.STORY} label="Stylist Story" icon={IconStory} />
            <TabButton id={AppTabs.EDIT} label="Magic Edit" icon={IconMagic} />
            <TabButton id={AppTabs.GENERATE} label="Create" icon={IconPlus} />
            <TabButton id={AppTabs.ANALYZE} label="Analyze" icon={IconSearch} />
          </nav>

          {state.activeTab !== AppTabs.GENERATE && (
            <div className="glass p-6 rounded-2xl border border-zinc-800 group transition-all">
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-zinc-700 rounded-xl py-10 cursor-pointer hover:border-amber-500 hover:bg-amber-500/5 transition-all">
                <IconUpload />
                <span className="text-zinc-300 font-medium">Upload Image</span>
                <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
              </label>
              {state.originalImage && (
                <div className="mt-4 relative group">
                  <img src={state.originalImage} alt="Preview" className="w-full h-40 object-cover rounded-lg border border-zinc-700" />
                </div>
              )}
            </div>
          )}

          <div className="glass p-6 rounded-2xl border border-zinc-800 flex flex-col gap-6">
            {(state.activeTab === AppTabs.EDIT || state.activeTab === AppTabs.GENERATE) && (
              <div>
                <label className="block text-zinc-400 text-sm font-medium mb-2">Prompt Instructions</label>
                <textarea 
                  value={state.prompt}
                  onChange={(e) => setState(prev => ({ ...prev, prompt: e.target.value }))}
                  placeholder="Describe details..."
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-3 text-zinc-100 min-h-[100px]"
                />
              </div>
            )}

            {state.activeTab === AppTabs.STORY && (
              <div className="text-zinc-400 text-sm leading-relaxed">
                <p><strong>Stylist Mode:</strong> Creates a complete 8-slide makeover story.</p>
                <ul className="list-disc ml-5 mt-2 space-y-1">
                  <li><strong>Slide 1-2:</strong> The Problem & Belief (Before)</li>
                  <li><strong>Slide 3-5:</strong> The Twist & Process (Theory/Testing)</li>
                  <li><strong>Slide 6-8:</strong> The Result & Insight (After)</li>
                </ul>
              </div>
            )}

            <button 
              onClick={handleAction}
              disabled={state.loading || (!state.originalImage && state.activeTab !== AppTabs.GENERATE)}
              className="w-full py-4 bg-amber-500 hover:bg-amber-600 disabled:bg-zinc-800 disabled:text-zinc-500 rounded-xl font-bold text-zinc-950 transition-all flex items-center justify-center gap-2"
            >
              {state.loading ? "Creating Full Story..." : "Generate Makeover Story"}
            </button>

            {state.error && <div className="p-3 bg-red-900/30 border border-red-500/50 rounded-lg text-red-200 text-sm">{state.error}</div>}
          </div>
        </div>

        <div className="flex-1 glass rounded-3xl border border-zinc-800 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-zinc-800 bg-zinc-900/20">
            <h2 className="text-zinc-300 font-semibold tracking-wide uppercase text-xs">Visual Results</h2>
          </div>
          
          <div className="flex-1 relative flex flex-col items-center justify-center p-6 bg-[#0d0d0d] overflow-y-auto">
            {state.loading ? (
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin"></div>
                <p className="text-amber-500 font-medium animate-pulse">Designing new wardrobe & writing 8-part story...</p>
              </div>
            ) : state.storyResult ? (
              <div className="w-full h-full flex items-center overflow-x-auto pb-4 gap-6 px-4">
                 {/* Story Slides Container */}
                {state.storyResult.slides.map((slide, index) => (
                  <div key={index} className="flex-shrink-0 relative w-[300px] h-[533px] bg-black rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl group">
                    <img src={slide.image} className="w-full h-full object-cover" alt={`Slide ${index + 1}`} />
                    
                    {/* Text Overlay - Positioned based on slide.textPosition */}
                    <div className={`absolute w-[85%] transition-all duration-300 ${
                      slide.textPosition === 'top' 
                        ? 'top-8 left-1/2 -translate-x-1/2' 
                        : slide.textPosition === 'middle'
                        ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'
                        : 'bottom-16 left-1/2 -translate-x-1/2'
                    }`}>
                      <div className="bg-white/90 backdrop-blur-sm text-black px-4 py-3 rounded-xl shadow-lg text-center font-semibold text-sm leading-snug">
                        {slide.text}
                      </div>
                    </div>

                    {/* Badge - Dynamic Position */}
                    <div className={`absolute ${getBadgePositionClass(slide.badgePosition)} px-2 py-1 bg-black/60 backdrop-blur-sm rounded text-xs font-bold uppercase text-white border border-white/20 z-10`}>
                      {slide.type}
                    </div>

                    {/* Download Button */}
                    <a 
                      href={slide.image} 
                      download={`story-slide-${index+1}.png`}
                      className="absolute bottom-4 right-4 p-3 bg-amber-500 text-black rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-20"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    </a>
                  </div>
                ))}
              </div>
            ) : state.processedImage ? (
              <img src={state.processedImage} className="max-w-full max-h-[70vh] rounded-xl shadow-2xl border border-zinc-800" />
            ) : state.analysisResult ? (
              <div className="max-w-2xl w-full glass p-8 rounded-3xl border border-zinc-800 text-zinc-300 whitespace-pre-wrap">{state.analysisResult}</div>
            ) : (
              <div className="text-zinc-600 text-center">No results to display. Upload an image to start the transformation.</div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
