import React, { useState } from 'react';
import { Sparkles, Download, ArrowLeft, Trophy } from 'lucide-react';
import { CertificateGenerator } from './CertificateGenerator';
import confetti from 'canvas-confetti';
import { useEffect } from 'react';

interface CourseCompletionViewProps {
    courseTitle: string;
    courseId: string;
    userName: string;
    userId: string;
    onBack: () => void;
}

export const CourseCompletionView: React.FC<CourseCompletionViewProps> = ({
    courseTitle,
    courseId,
    userName,
    userId,
    onBack
}) => {
    useEffect(() => {
        const duration = 3000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

        const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

        const interval: any = setInterval(function () {
            const timeLeft = animationEnd - Date.now();

            if (timeLeft <= 0) {
                return clearInterval(interval);
            }

            const particleCount = 50 * (timeLeft / duration);
            confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
            confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
        }, 250);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="flex-1 bg-[#0D0D0D] rounded-none border border-[#262626] shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col h-full relative">
            {/* Header decorativo (Rigid Line) */}
            <div className="absolute top-0 left-0 w-full h-1 bg-exec-blue z-20"></div>
            <div className="absolute top-0 left-0 w-full h-32 bg-exec-blue/5 border-b border-exec-blue/10"></div>

            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center relative z-10">
                <div className="mb-6 relative">
                    <div className="absolute inset-0 bg-yellow-400/20 blur-2xl rounded-full"></div>
                    <Trophy className="w-24 h-24 text-yellow-400 relative z-10 animate-bounce-slow drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]" />
                </div>

                <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight drop-shadow-md">
                    ¡Felicidades!
                </h2>

                <p className="text-xl text-gray-300 mb-8 max-w-2xl font-medium">
                    Has completado exitosamente el curso <span className="font-black text-exec-blue drop-shadow-[0_0_10px_rgba(0,136,255,0.3)]">"{courseTitle}"</span>.
                    Tu excelencia técnica ha sido validada.
                </p>

                <div className="bg-[#151515] p-8 rounded-none w-full max-w-3xl mb-8 border border-[#262626] shadow-[0_0_30px_rgba(0,0,0,0.3)] hover:border-exec-blue transition-colors relative">
                    <div className="absolute top-0 left-0 w-1 h-full bg-exec-blue"></div>
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="text-left">
                            <h3 className="text-lg font-black text-white mb-1 uppercase tracking-widest">Certificado Oficial</h3>
                            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Validación Administrativa de Competencia</p>
                        </div>

                        <div className="w-full md:w-auto">
                            {/* Certificate Generator Rendered Automatically or via Button? 
                                The component likely renders a button or preview. 
                                Based on previous code, it seems to render a button that triggers generation.
                            */}
                            <CertificateGenerator
                                userId={userId}
                                courseId={courseId}
                                courseName={courseTitle}
                                userName={userName}
                                userRole="Estudiante"
                            />
                        </div>
                    </div>
                </div>

                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors uppercase tracking-widest text-[10px] font-black border-t border-transparent hover:border-white/20 pt-2"
                >
                    <ArrowLeft className="w-3.5 h-3.5" /> Volver al portal de capacitación
                </button>
            </div>
        </div>
    );
};
