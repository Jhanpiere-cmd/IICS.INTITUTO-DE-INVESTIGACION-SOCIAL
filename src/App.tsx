import { useState, useEffect } from 'react';
import Header from './components/Header';
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

import { provincesData, alertsData, emergentThemesData, researchLinesData } from './data';
import { ProvinceData, Alert, ResearchLine } from './types';

export default function App() {
  // Application Data States
  const [provinces, setProvinces] = useState<ProvinceData[]>(provincesData);
  const [alerts, setAlerts] = useState<Alert[]>(alertsData);
  const [selectedProvinceId, setSelectedProvinceId] = useState<string>('cajamarca');

  // Modal Control States
  const [activeModal, setActiveModal] = useState<'portal' | 'alerts' | 'research' | 'nosotros' | null>(null);
  const [selectedResearchLine, setSelectedResearchLine] = useState<ResearchLine | null>(null);

  // Active Navigation Header Track
  const [activeTab, setActiveTab] = useState<string>('inicio');

  // User Authentication State
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);

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
          onLogout={() => setIsLoggedIn(false)}
          onSubmitSimulatedAlert={handleAddProposedAlert}
          setAlerts={setAlerts}
          setProvinces={setProvinces}
        />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-black font-sans antialiased overflow-x-hidden selection:bg-cyan-500 selection:text-slate-950">
      
      {/* Absolute high-tech space atmospheric visuals */}
      <div className="fixed top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/15 to-transparent z-50"></div>
      
      {/* Dynamic atmospheric glow blobs */}
      <div className="fixed top-[-10%] left-[-10%] h-[600px] w-[600px] rounded-full bg-cyan-500/5 blur-[130px] pointer-events-none -z-10 animate-float-slow"></div>
      <div className="fixed bottom-[10%] right-[-10%] h-[700px] w-[700px] rounded-full bg-indigo-550/5 blur-[150px] pointer-events-none -z-10 animate-float-slower"></div>
      <div className="fixed top-[45%] left-[35%] h-[500px] w-[500px] rounded-full bg-cyan-500/3 blur-[140px] pointer-events-none -z-10 animate-pulse"></div>

      <Header 
        onOpenPortal={() => setActiveModal('portal')} 
        onNavigate={(sectId) => {
          setActiveTab(sectId);
          if (sectId === 'nosotros') {
            setActiveModal('nosotros');
          } else {
            setActiveModal(null);
          }
        }}
        activeSection={activeTab}
        isLoggedIn={isLoggedIn}
        onLogout={() => setIsLoggedIn(false)}
      />

      <main className="relative flex flex-col pt-16 sm:pt-20">
        
        {/* HERO BLOCK WITH COMPLEX MOCKUP FOR OBSERVATORIO */}
        <Hero 
          onExploreClick={() => setActiveModal('portal')}
          onWorkClick={() => setActiveModal('portal')}
        >
          <img 
            src="/computador-iics.png" 
            alt="Sistema IICS Observatorio" 
            className="w-[110%] max-w-none h-auto object-contain transition-transform duration-700 hover:scale-[1.03] drop-shadow-[0_20px_50px_rgba(0,153,255,0.25)] lg:-translate-x-6 select-none pointer-events-none" 
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
        <PublicationsSection />

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
        onLogin={setIsLoggedIn}
        onClose={() => {
          setActiveModal(null);
          setSelectedResearchLine(null);
        }}
        onSubmitSimulatedAlert={handleAddProposedAlert}
        onOpenPortal={() => setActiveModal('portal')}
      />

    </div>
  );
}
