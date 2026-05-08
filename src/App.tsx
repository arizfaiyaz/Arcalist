
import './App.css'
import './index.css'
function App() {
 

  return (
    <>
      <div className="min-h-screen bg-background flex items-center justify-center">
            <div className="text-center">
              {/* Accent colored logo text */}
              <h1 className="text-5xl font-bold">
                <span className="text-accent">Arca</span>
                <span className="text-white">list</span>
              </h1>
              <p className="text-slate-400 mt-3 text-lg">
                Your visual bookmark workspace
              </p>
      
              {/* Simple status card to confirm everything is wired up */}
              <div className="mt-8 bg-surface rounded-xl p-6 border border-surface-2 max-w-sm mx-auto">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-accent animate-pulse" />
                  <span className="text-slate-300 text-sm">
                    Extension is running ✓
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-3">
                  <div className="w-3 h-3 rounded-full bg-accent animate-pulse" />
                  <span className="text-slate-300 text-sm">
                    Tailwind is working ✓
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-3">
                  <div className="w-3 h-3 rounded-full bg-accent animate-pulse" />
                  <span className="text-slate-300 text-sm">
                    React is mounted ✓
                  </span>
                </div>
              </div>
            </div>
          </div>
    </>
  )
}

export default App
