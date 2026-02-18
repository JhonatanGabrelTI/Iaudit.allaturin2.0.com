import { Sidebar } from './Sidebar';
import { useIsMobile } from '@/hooks/use-mobile';

interface MainLayoutProps {
    children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
    const isMobile = useIsMobile();

    return (
        <div className="min-h-screen bg-background">
            <Sidebar />
            <main
                className={
                    isMobile
                        ? 'pt-14 px-4 pb-6'
                        : 'ml-64 p-6 transition-all duration-300'
                }
            >
                {children}
            </main>
        </div>
    );
}
