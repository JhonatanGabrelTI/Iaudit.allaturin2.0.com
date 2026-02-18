import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import {
    LayoutDashboard,
    Monitor,
    Users,
    FolderOpen,
    CheckSquare,
    MessageSquare,
    Settings,
    LogOut,
    ChevronLeft,
    ChevronRight,
    Shield,
    Menu,
    X,
    DollarSign,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

const menuItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/monitor', icon: Monitor, label: 'Monitoramento' },
    { path: '/clientes', icon: Users, label: 'Clientes' },
    { path: '/documentos', icon: FolderOpen, label: 'Documentos' },
    { path: '/tarefas', icon: CheckSquare, label: 'Tarefas' },
    { path: '/cobrancas', icon: DollarSign, label: 'Cobranças' },
    { path: '/comunicacao', icon: MessageSquare, label: 'Comunicação' },
    { path: '/configuracoes', icon: Settings, label: 'Configurações' },
];

export function Sidebar() {
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const isMobile = useIsMobile();
    const location = useLocation();
    const { user, signOut } = useAuth();

    const sidebarWidth = collapsed ? 'w-16' : 'w-64';

    const SidebarContent = () => (
        <div className="flex flex-col h-full">
            {/* Logo */}
            {/* Logo */}
            <div className="flex items-center gap-3 px-4 h-16 shrink-0">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--sidebar-primary)] text-[var(--sidebar-primary-foreground)]">
                    <Shield className="w-5 h-5" />
                </div>
                {!collapsed && (
                    <div className="flex flex-col">
                        <span className="text-lg font-bold text-[var(--sidebar-foreground)] tracking-tight">IAudit</span>
                        <span className="text-[10px] text-[var(--sidebar-foreground)]/70 -mt-1">Gestão Contábil</span>
                    </div>
                )}
            </div>

            <Separator className="bg-[var(--sidebar-border)]" />

            {/* Navigation */}
            <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
                {menuItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            onClick={() => isMobile && setMobileOpen(false)}
                            className={cn(
                                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                                isActive
                                    ? 'bg-[var(--sidebar-accent)] text-[var(--sidebar-accent-foreground)] border-l-2 border-[var(--sidebar-primary)]'
                                    : 'text-[var(--sidebar-foreground)]/70 hover:text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)]/50'
                            )}
                        >
                            <item.icon className={cn('w-5 h-5 shrink-0', isActive && 'text-[var(--sidebar-primary)]')} />
                            {!collapsed && <span>{item.label}</span>}
                        </NavLink>
                    );
                })}
            </nav>

            <Separator className="bg-[var(--sidebar-border)]" />

            {/* User & Logout */}
            <div className="p-3 space-y-2 shrink-0">
                {!collapsed && user && (
                    <div className="px-3 py-2">
                        <p className="text-sm font-medium text-[var(--sidebar-foreground)] truncate">{user.nome}</p>
                        <p className="text-xs text-[var(--sidebar-foreground)]/70 truncate">{user.email}</p>
                    </div>
                )}
                <Button
                    variant="ghost"
                    className={cn(
                        'w-full text-[var(--sidebar-foreground)]/70 hover:text-red-400 hover:bg-red-500/10',
                        collapsed ? 'justify-center px-0' : 'justify-start gap-3'
                    )}
                    onClick={signOut}
                >
                    <LogOut className="w-5 h-5 shrink-0" />
                    {!collapsed && <span>Sair</span>}
                </Button>
            </div>
        </div>
    );

    // Mobile overlay
    if (isMobile) {
        return (
            <>
                <Button
                    variant="ghost"
                    size="icon"
                    className="fixed top-3 left-3 z-50 bg-[var(--sidebar)] text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)]"
                    onClick={() => setMobileOpen(true)}
                >
                    <Menu className="w-5 h-5" />
                </Button>

                {mobileOpen && (
                    <>
                        <div
                            className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
                            onClick={() => setMobileOpen(false)}
                        />
                        <aside className="fixed inset-y-0 left-0 w-64 bg-[var(--sidebar)] z-50 shadow-2xl">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute top-3 right-3 text-slate-400 hover:text-white"
                                onClick={() => setMobileOpen(false)}
                            >
                                <X className="w-5 h-5" />
                            </Button>
                            <SidebarContent />
                        </aside>
                    </>
                )}
            </>
        );
    }

    // Desktop sidebar
    return (
        <aside
            className={cn(
                'fixed inset-y-0 left-0 bg-[var(--sidebar)] border-r border-[var(--sidebar-border)] z-30 transition-all duration-300',
                sidebarWidth
            )}
        >
            <SidebarContent />

            {/* Collapse toggle */}
            <Button
                variant="ghost"
                size="icon"
                className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-[var(--sidebar-accent)] border border-[var(--sidebar-border)] text-[var(--sidebar-foreground)] hover:text-white hover:bg-[var(--sidebar-primary)] shadow-lg"
                onClick={() => setCollapsed(!collapsed)}
            >
                {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
            </Button>
        </aside>
    );
}
