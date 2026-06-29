import { useState } from 'react';
import { useGeminiLive } from './hooks/useGeminiLive';
import { Square, Power } from 'lucide-react';
import { motion } from 'motion/react';

const VOICES = ['Zephyr', 'Puck', 'Charon', 'Kore', 'Fenrir'];

const AudioWaves = ({ isConnected, isSpeaking, isListening }: { isConnected: boolean, isSpeaking: boolean, isListening: boolean }) => {
  const numBars = 7;

  return (
    <div className="flex items-center justify-center gap-3 h-48 w-full">
      {Array.from({ length: numBars }).map((_, i) => {
        let animate: any = { height: "8px", opacity: 0.2 };
        let transition: any = { duration: 0.5 };

        if (isConnected) {
          if (isSpeaking) {
            // Active speaking waves: erratic and high
            const heights = [
              ["20%", "70%", "30%", "90%", "40%"],
              ["40%", "100%", "20%", "80%", "50%"],
              ["60%", "30%", "100%", "40%", "80%"],
              ["80%", "50%", "70%", "100%", "30%"],
              ["100%", "20%", "80%", "60%", "90%"],
              ["50%", "90%", "40%", "100%", "20%"],
              ["30%", "80%", "50%", "70%", "40%"],
            ];
            animate = { height: heights[i % heights.length], opacity: 1 };
            transition = { 
              repeat: Infinity, 
              duration: 0.4 + (i % 3) * 0.1, 
              repeatType: "mirror",
              ease: "easeInOut"
            };
          } else if (isListening) {
            // Gentle listening waves: smooth and low
            animate = { height: ["15%", "35%", "15%"], opacity: 0.8 };
            transition = { 
              repeat: Infinity, 
              duration: 1.2, 
              delay: i * 0.15,
              repeatType: "mirror",
              ease: "easeInOut"
            };
          }
        }

        return (
          <motion.div
            key={i}
            animate={animate}
            transition={transition}
            className="w-5 bg-[var(--color-electric)] shadow-[0_0_20px_var(--color-electric)] rounded-none"
            style={{ originY: 0.5 }}
          />
        );
      })}
    </div>
  );
};

export default function App() {
  const [selectedVoice, setSelectedVoice] = useState('Zephyr');
  const { isConnected, isSpeaking, isListening, error, connect, disconnect } = useGeminiLive();

  return (
    <div className="min-h-screen bg-[var(--color-ink)] flex items-center justify-center p-4 sm:p-8">
      {/* Abstract background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[20%] left-[10%] w-[40vw] h-[40vw] bg-[var(--color-electric)]/5 rounded-none blur-[100px] mix-blend-screen" />
        <div className="absolute bottom-[10%] right-[10%] w-[30vw] h-[30vw] bg-[var(--color-electric)]/10 rounded-none blur-[120px] mix-blend-screen" />
      </div>

      <div className="relative w-full max-w-md bg-[var(--color-surface)] rounded-none p-8 sm:p-12 flex flex-col items-center justify-center min-h-[600px] shadow-2xl z-10">
        
        {/* Header / Status */}
        <div className="absolute top-8 left-0 w-full flex justify-center">
          <div className="flex items-center gap-3 px-6 py-2 bg-black/40 backdrop-blur-md rounded-none">
            <div className={`w-3 h-3 rounded-none ${isConnected ? 'bg-[var(--color-electric)] shadow-[0_0_10px_var(--color-electric)]' : 'bg-gray-600'}`} />
            <span className="text-xs font-mono tracking-widest uppercase text-gray-400">
              {isConnected ? 'System Active' : 'System Offline'}
            </span>
          </div>
        </div>

        {/* Main Visualizer Area - The Waves */}
        <div className="flex-1 flex items-center justify-center w-full mt-12 mb-6">
          <AudioWaves isConnected={isConnected} isSpeaking={isSpeaking} isListening={isListening} />
        </div>

        {/* Status Text */}
        <div className="h-8 flex items-center justify-center mb-6">
          {error ? (
            <div className="flex items-center gap-2 text-red-400 font-mono text-sm">
              <span className="w-2 h-2 bg-red-500 rounded-none" />
              <span>{error}</span>
            </div>
          ) : (
            <p className="font-mono text-sm tracking-widest uppercase text-[var(--color-electric)]/80">
              {isSpeaking ? 'Transmitting...' : isListening ? 'Listening...' : 'Awaiting Connection'}
            </p>
          )}
        </div>

        {/* Voice Selector */}
        <div className="w-full mb-8">
          <div className="text-[10px] font-mono text-[var(--color-electric)]/60 mb-3 uppercase tracking-[0.2em] text-center">
            Voice Profile
          </div>
          <div className="grid grid-cols-5 gap-2">
            {VOICES.map(voice => (
              <button
                key={voice}
                onClick={() => setSelectedVoice(voice)}
                disabled={isConnected}
                className={`
                  py-2 text-[10px] font-mono uppercase tracking-wider transition-all duration-300 rounded-none
                  ${selectedVoice === voice 
                    ? 'bg-[var(--color-electric)] text-black shadow-[0_0_10px_var(--color-electric)]' 
                    : 'bg-black/40 text-gray-400 hover:bg-[var(--color-electric)]/20 hover:text-[var(--color-electric)]'
                  }
                  ${isConnected ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                {voice.substring(0, 3)}
              </button>
            ))}
          </div>
        </div>

        {/* Controls */}
        <button
          onClick={() => isConnected ? disconnect() : connect(selectedVoice)}
          className={`
            relative overflow-hidden group rounded-none
            w-full py-5 font-sans font-bold tracking-widest uppercase text-sm transition-all duration-300
            ${isConnected 
              ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' 
              : 'bg-[var(--color-electric)] text-black hover:shadow-[0_0_40px_rgba(0,240,255,0.6)] hover:scale-[1.02]'
            }
          `}
        >
          <span className="relative z-10 flex items-center justify-center gap-3">
            {isConnected ? (
              <>
                <Square className="w-4 h-4 fill-current rounded-none" />
                Terminate Session
              </>
            ) : (
              <>
                <Power className="w-5 h-5" />
                Initialize Link
              </>
            )}
          </span>
        </button>
      </div>
    </div>
  );
}
