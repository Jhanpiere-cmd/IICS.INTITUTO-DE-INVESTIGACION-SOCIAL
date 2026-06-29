import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface MainLayoutProps {
    children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="bg-[#000000] text-white font-sans antialiased h-screen flex overflow-hidden">
            {/* Mobile Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar - 256px fixed */}
            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col w-full h-full overflow-hidden bg-black pt-safe pb-safe" style={{ backgroundColor: '#000000' }}>
                {/* Header - 64px fixed */}
                <Header onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />

                {/* Page Content - Full Width & Height - Pure Black */}
                <main className="flex-1 w-full h-full overflow-y-auto bg-black px-6 py-2 md:px-8 md:py-2" style={{ backgroundColor: '#000000' }}>
                    {children}
                </main>
            </div>
        </div>
    );
};
