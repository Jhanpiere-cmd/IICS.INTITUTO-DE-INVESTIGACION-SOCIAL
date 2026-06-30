import { useState, useEffect } from 'react';
import { AnimatePresence } from 'motion/react';
import { Routes, Route } from 'react-router-dom';
import AdminApp from '@/src/AdminApp';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import Header from './components/Header';
import Preloader from './components/ui/Preloader';
import Hero from './components/Hero';
import DashboardMockup from './components/DashboardMockup';
import FeatureGrid from './components/FeatureGrid';
import ResearchLines from './components/ResearchLines';
import InteractiveMapSection from './components/InteractiveMapSection';
import InstitutionalModel from './components/InstitutionalModel';
import PublicationsSection from './components/PublicationsSection';
import Footer from './components/Footer';
import ModalPortal from './components/ModalPortal';
import PortalWorkspace from './components/PortalWorkspace';
import AboutValues from './components/AboutValues';
import { FallingPattern } from './components/ui/falling-pattern';

import { provincesData, alertsData, emergentThemesData, researchLinesData } from './data';
import { ProvinceData, Alert, ResearchLine } from './types';

function LandingPage() {
  // Application Data States
  const [provinces, setProvinces] = useState<ProvinceData[]>(provincesData);
  const [alerts, setAlerts] = useState<Alert[]>(alertsData);
  const [selectedProvinceId, setSelectedProvinceId] = useState<string>('cajamarca');

  // Load alerts from Supabase dynamically on mount
  useEffect(() => {
    const fetchDbAlerts = async () => {
      try {
        const { data, error } = await supabase
          .from('alerts')
          .select('*')
          .eq('status', 'aprobado')
          .order('created_at', { ascending: false });
        if (error) throw error;
        if (data && data.length > 0) {
          const dbAlerts: Alert[] = data.map((d: any) => ({
            id: d.id,
            title: d.title,
            province: d.province,
            time: d.created_at ? new Date(d.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : 'Reciente',
            type: d.type as 'Bajo' | 'Medio' | 'Alto',
            description: d.description
          }));
          
          setAlerts(prev => {
            // Keep unique alerts prioritized by database
            const dbTitles = new Set(dbAlerts.map(a => a.title.toLowerCase()));
            const uniquePrev = prev.filter(a => !dbTitles.has(a.title.toLowerCase()));
            return [...dbAlerts, ...uniquePrev];
          });
        }
      } catch (err) {
        console.error('Error fetching database alerts:', err);
      }
    };
    fetchDbAlerts();
  }, []);

  // Load province metrics from Supabase dynamically on mount
  useEffect(() => {
    const fetchDbProvinces = async () => {
      try {
        const { data, error } = await supabase
          .from('province_metrics')
          .select('*');
        if (error) throw error;
        if (data && data.length > 0) {
          setProvinces(prev => 
            prev.map(p => {
              const dbP = data.find((d: any) => d.id === p.id);
              if (dbP) {
                return {
                  ...p,
                  riskScore: Number(dbP.risk_score),
                  riskDescription: dbP.risk_description as any,
                  mencionesRedes: Number(dbP.menciones_redes),
                  alertCount: Number(dbP.alert_count),
                  keyIssues: dbP.key_issues || [],
                  activeAlert: dbP.active_alert,
                  indicators: dbP.indicators || p.indicators
                };
              }
              return p;
            })
          );
        }
      } catch (err) {
        console.error('Error fetching database province metrics:', err);
      }
    };
    fetchDbProvinces();
  }, []);

  // Modal Control States
  const [activeModal, setActiveModal] = useState<'portal' | 'alerts' | 'research' | 'nosotros' | 'publicaciones' | 'documentales' | 'academia' | null>(null);
  const [selectedResearchLine, setSelectedResearchLine] = useState<ResearchLine | null>(null);
  const [initialPortalTab, setInitialPortalTab] = useState<'datasets' | 'afi' | 'alerts' | undefined>(undefined);

  // Active Navigation Header Track
  const [activeTab, setActiveTab] = useState<string>('inicio');

  // User Authentication State
  const { user, signOut } = useAuth();
  const isLoggedIn = !!user;

  // Initial Preloader State (Bypassed on mobile viewports < 1024px to prevent screen freeze)
  const [isInitialLoading, setIsInitialLoading] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024;
    }
    return true;
  });

  // Handlers for Citizen submission in portal
  const handleAddProposedAlert = (newAlert: Alert) => {
    // Insert new civic proposed alert straight on top
    setAlerts((prev) => [newAlert, ...prev]);

    // Dynamically increment the related province metrics for maximum visual realism!
    setProvinces((prev) =>
      prev.map((p) => {
        if (p.name.toLowerCase() === newAlert.province.toLowerCase()) {
          return {
            ...p,
            alertCount: p.alertCount + 1,
            mencionesRedes: p.mencionesRedes + 450,
            riskScore: Math.min(10, p.riskScore + 0.5),
            activeAlert: newAlert.title
          };
        }
        return p;
      })
    );
  };

  const handleOpenResearchDetails = (lineId: ResearchLine) => {
    setSelectedResearchLine(lineId);
    setActiveModal('research');
  };

  // Listen to viewport scroll positions to dynamically update navigation lighting
  useEffect(() => {
    const handleScroll = () => {
      const sections = [
        { id: 'inicio', element: document.getElementById('inicio') },
        { id: 'nosotros', element: document.getElementById('sobre-el-iics') },
        { id: 'investigacion', element: document.getElementById('lineas-investigacion') },
        { id: 'observatorio', element: document.getElementById('observatorio') },
        { id: 'valores', element: document.getElementById('modelo-institucional') || document.getElementById('valores') },
        { id: 'publicaciones', element: document.getElementById('publicaciones') },
      ];

      const scrollPosition = window.scrollY + 160;

      for (const sect of sections) {
        if (sect.element) {
          const offsetTop = sect.element.offsetTop;
          const offsetHeight = sect.element.offsetHeight;

          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveTab(sect.id);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (isLoggedIn) {
    return (
      <div className="relative min-h-screen bg-black font-sans antialiased overflow-x-hidden selection:bg-cyan-500 selection:text-slate-950">
        <div className="fixed top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/15 to-transparent z-50"></div>
        <PortalWorkspace
          provinces={provinces}
          alerts={alerts}
          themes={emergentThemesData}
          selectedProvinceId={selectedProvinceId}
          onSelectProvince={setSelectedProvinceId}
          onLogout={signOut}
          onSubmitSimulatedAlert={handleAddProposedAlert}
          setAlerts={setAlerts}
          setProvinces={setProvinces}
        />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-black font-sans antialiased overflow-x-hidden selection:bg-cyan-500 selection:text-slate-950">
      <AnimatePresence>
        {isInitialLoading && (
          <Preloader onComplete={() => setIsInitialLoading(false)} />
        )}
      </AnimatePresence>
      
      {/* Absolute high-tech space atmospheric visuals */}
      <div className="fixed top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/15 to-transparent z-50"></div>
      
      {/* Falling Data Patterns Background Shader Layer (Disabled on mobile to prevent lag, active only on lg viewports) */}
      <div className="hidden lg:block fixed inset-0 pointer-events-none z-0 opacity-40">
        <FallingPattern 
          color="rgba(0, 153, 255, 0.2)" 
          backgroundColor="transparent"
          duration={180}
          blurIntensity="0px"
          density={0.7}
          className="h-full w-full"
        />
      </div>

      {/* Dynamic atmospheric glow blobs */}
      <div className="hidden lg:block fixed top-[-10%] left-[-10%] h-[600px] w-[600px] rounded-full bg-cyan-500/5 blur-[130px] pointer-events-none -z-10 animate-float-slow"></div>
      <div className="hidden lg:block fixed bottom-[10%] right-[-10%] h-[700px] w-[700px] rounded-full bg-indigo-550/5 blur-[150px] pointer-events-none -z-10 animate-float-slower"></div>
      <div className="hidden lg:block fixed top-[45%] left-[35%] h-[500px] w-[500px] rounded-full bg-cyan-500/3 blur-[140px] pointer-events-none -z-10 animate-pulse"></div>

      <Header 
        onOpenPortal={() => { console.log('App: onOpenPortal'); setActiveModal('portal'); }} 
        onNavigate={(sectId) => {
          console.log('App: onNavigate triggered with:', sectId);
          setActiveTab(sectId);
          if (sectId === 'nosotros') {
            setActiveModal('nosotros');
          } else if (sectId === 'publicaciones') {
            setActiveModal('publicaciones');
          } else {
            setActiveModal(null);
          }
        }}
        activeSection={activeTab}
        isLoggedIn={isLoggedIn}
        onLogout={signOut}
        activeModal={activeModal}
      />

      <main className="relative z-10 flex flex-col pt-16 sm:pt-20">
        
        {/* HERO BLOCK WITH COMPLEX MOCKUP FOR OBSERVATORIO */}
        <Hero 
          onExploreClick={() => { console.log('Hero: onExploreClick (portal)'); setActiveModal('portal'); }}
          onWorkClick={() => { console.log('Hero: onWorkClick (publicaciones)'); setActiveModal('publicaciones'); }}
          onDocumentalesClick={() => { console.log('Hero: onDocumentalesClick'); setActiveModal('documentales'); }}
          onAfiClick={() => { console.log('Hero: onAfiClick (academia)'); setActiveModal('academia'); }}
        >
          <img 
            src="/computador-iics.png" 
            alt="Sistema IICS Observatorio" 
            className="w-[110%] max-w-none h-auto object-contain transition-transform duration-700 hover:scale-[1.03] drop-shadow-[0_20px_50px_rgba(0,153,255,0.25)] lg:-translate-x-6 select-none pointer-events-none animate-float-slow" 
          />
        </Hero>

        {/* 4 FEATURE GRIDS METRICS */}
        <FeatureGrid />

        {/* INVESTIGATION BENTO GRID */}
        <ResearchLines 
          lines={researchLinesData} 
          onOpenDetails={handleOpenResearchDetails} 
        />

        {/* ACTIVE MAP INTERACTIVE FIELD */}
        <InteractiveMapSection
          provinces={provinces}
          onSelectProvince={setSelectedProvinceId}
          selectedProvinceId={selectedProvinceId}
          onOpenPortal={() => setActiveModal('portal')}
        />

        {/* MODELO DE CUÁDRUPLE HÉLICE, MISIÓN, VISIÓN Y OBJETIVOS ESTRATÉGICOS */}
        <InstitutionalModel />

        {/* REPOSITORIO DE PUBLICACIONES INDEXADAS */}
        <PublicationsSection isSubPage={false} onViewAll={() => setActiveModal('publicaciones')} />

      </main>

      <Footer onOpenNosotros={() => {
        setActiveTab('nosotros');
        setActiveModal('nosotros');
      }} />

      {/* DETAILED INTERACTIVE POPUPS PORTALS */}
      <ModalPortal
        provinces={provinces}
        alerts={alerts}
        activeModal={activeModal}
        selectedResearchLine={selectedResearchLine}
        isLoggedIn={isLoggedIn}
        onLogin={() => {}}
        onClose={() => {
          setActiveModal(null);
          setSelectedResearchLine(null);
          setInitialPortalTab(undefined);
        }}
        onSubmitSimulatedAlert={handleAddProposedAlert}
        onOpenPortal={() => setActiveModal('portal')}
        initialPortalTab={initialPortalTab}
      />

    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/admin/*" element={<AdminApp />} />
      <Route path="/*" element={<LandingPage />} />
    </Routes>
  );
}
