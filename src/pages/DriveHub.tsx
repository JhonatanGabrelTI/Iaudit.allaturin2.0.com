import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import type { Cliente, Consulta } from '@/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
    FolderOpen, HardDrive, Upload, File, FileText,
    Star, Clock, Download, FolderPlus, Grid3X3, List,
    ChevronRight, ArrowLeft, Search, ExternalLink, Trash2, ShieldAlert
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { useState as _ } from 'react';

interface Folder {
    name: string;
    icon: typeof FolderOpen;
    color: string;
    children?: Folder[];
    files?: FileItem[];
}

interface FileItem {
    name: string;
    type: string;
    url?: string;
    date: string;
    consulta_id?: string;
}

export default function DriveHub() {
    const { user } = useAuth();
    const [view, setView] = useState<'grid' | 'list'>('grid');
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [consultas, setConsultas] = useState<Consulta[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPath, setCurrentPath] = useState<string[]>([]);
    const [search, setSearch] = useState('');

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        const [clientesRes, consultasRes] = await Promise.all([
            supabase.from('clientes').select('*').order('razao_social'),
            supabase.from('consultas').select('*, cliente:clientes(razao_social, cnpj)')
                .eq('status', 'concluido')
                .order('created_at', { ascending: false }),
        ]);
        if (clientesRes.data) setClientes(clientesRes.data);
        if (consultasRes.data) setConsultas(consultasRes.data as unknown as Consulta[]);
        setLoading(false);
    };

    const handleDelete = async (id: string, name: string) => {
        if (!window.confirm(`Tem certeza que deseja excluir definitivamente o documento "${name}"? Esta ação não pode ser desfeita.`)) return;

        try {
            const { error } = await supabase.from('consultas').delete().eq('id', id);
            if (error) throw error;
            toast.success(`Documento ${name} removido definitivamente.`);
            fetchData();
        } catch (e) {
            console.error(e);
            toast.error('Erro ao remover documento.');
        }
    };

    // Build folder structure from data
    const buildFolders = useCallback((): Folder[] => {
        const folders: Folder[] = [
            {
                name: 'CNDs Federais',
                icon: FolderOpen,
                color: 'bg-blue-500',
                children: clientes.map(c => ({
                    name: `${c.razao_social}`,
                    icon: FolderOpen,
                    color: 'bg-blue-400',
                    files: consultas
                        .filter(q => q.cliente_id === c.id && q.tipo === 'cnd_federal')
                        .map(q => ({
                            name: `CND_Federal_${c.cnpj.replace(/\D/g, '')}_${q.data_execucao?.split('T')[0] || 'pending'}.pdf`,
                            type: 'PDF',
                            url: q.pdf_url || undefined,
                            date: q.data_execucao ? new Date(q.data_execucao).toLocaleDateString('pt-BR') : '—',
                            consulta_id: q.id,
                        })),
                })),
            },
            {
                name: 'CNDs Estaduais',
                icon: FolderOpen,
                color: 'bg-purple-500',
                children: clientes.map(c => ({
                    name: `${c.razao_social}`,
                    icon: FolderOpen,
                    color: 'bg-purple-400',
                    files: consultas
                        .filter(q => q.cliente_id === c.id && q.tipo === 'cnd_estadual')
                        .map(q => ({
                            name: `CND_Estadual_PR_${c.cnpj.replace(/\D/g, '')}_${q.data_execucao?.split('T')[0] || 'pending'}.pdf`,
                            type: 'PDF',
                            url: q.pdf_url || undefined,
                            date: q.data_execucao ? new Date(q.data_execucao).toLocaleDateString('pt-BR') : '—',
                            consulta_id: q.id,
                        })),
                })),
            },
            {
                name: 'FGTS Regularidade',
                icon: FolderOpen,
                color: 'bg-amber-500',
                children: clientes.map(c => ({
                    name: `${c.razao_social}`,
                    icon: FolderOpen,
                    color: 'bg-amber-400',
                    files: consultas
                        .filter(q => q.cliente_id === c.id && q.tipo === 'fgts')
                        .map(q => ({
                            name: `FGTS_Regularidade_${c.cnpj.replace(/\D/g, '')}_${q.data_execucao?.split('T')[0] || 'pending'}.pdf`,
                            type: 'PDF',
                            url: q.pdf_url || undefined,
                            date: q.data_execucao ? new Date(q.data_execucao).toLocaleDateString('pt-BR') : '—',
                            consulta_id: q.id,
                        })),
                })),
            },
        ];
        return folders;
    }, [clientes, consultas]);

    const folders = buildFolders();

    // Navigate into folder structure
    const getCurrentItems = () => {
        let current = folders;
        for (let i = 0; i < currentPath.length; i++) {
            const found = current.find(f => f.name === currentPath[i]);
            if (found?.children) current = found.children;
            else return { folders: [], files: found?.files || [] };
        }
        return { folders: current, files: [] as FileItem[] };
    };

    const { folders: currentFolders, files: currentFiles } = getCurrentItems();

    // Count files in tree
    const countFiles = (folder: Folder): number => {
        let count = folder.files?.length || 0;
        folder.children?.forEach(c => { count += countFiles(c); });
        return count;
    };

    const totalFiles = folders.reduce((sum, f) => sum + countFiles(f), 0);

    // All files flat for search & recent
    const allFiles: (FileItem & { folder: string })[] = [];
    folders.forEach(folder => {
        folder.children?.forEach(sub => {
            sub.files?.forEach(f => {
                allFiles.push({ ...f, folder: `${folder.name}/${sub.name}` });
            });
        });
    });

    const filteredFiles = search
        ? allFiles.filter(f => f.name.toLowerCase().includes(search.toLowerCase()) || f.folder.toLowerCase().includes(search.toLowerCase()))
        : allFiles.slice(0, 10);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Documentos</h1>
                    <p className="text-slate-500 mt-2">Gerencie arquivos e documentos dos clientes</p>
                </div>
            </div>

            {/* Content Tabs */}
            <Tabs defaultValue="navegador" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                    <TabsTrigger value="navegador">📂 Navegador de Arquivos</TabsTrigger>
                    <TabsTrigger value="remover" className="text-red-600 data-[state=active]:text-red-700 data-[state=active]:bg-red-50">
                        <Trash2 className="w-4 h-4 mr-2" /> Remover Documentos
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="navegador" className="space-y-6">
                    {/* Storage */}
                    <Card className="border-0 shadow-sm bg-gradient-to-r from-slate-800 to-slate-900 text-white">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                                        <HardDrive className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-lg font-semibold">Armazenamento</p>
                                        <p className="text-sm text-slate-300">{totalFiles} documentos armazenados</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-3xl font-bold">{totalFiles}</p>
                                    <p className="text-xs text-slate-400">documentos</p>
                                </div>
                            </div>
                            <div className="flex gap-4 text-xs text-slate-400">
                                <span>📄 CND Federal: {consultas.filter(c => c.tipo === 'cnd_federal' && c.status === 'concluido').length}</span>
                                <span>📋 CND Estadual: {consultas.filter(c => c.tipo === 'cnd_estadual' && c.status === 'concluido').length}</span>
                                <span>🏗️ FGTS: {consultas.filter(c => c.tipo === 'fgts' && c.status === 'concluido').length}</span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Search */}
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                            placeholder="Buscar documentos..."
                            className="pl-10"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>

                    {/* Breadcrumbs */}
                    {currentPath.length > 0 && (
                        <div className="flex items-center gap-2 text-sm">
                            <Button variant="ghost" size="sm" onClick={() => setCurrentPath([])}>
                                <ArrowLeft className="w-4 h-4 mr-1" /> Raiz
                            </Button>
                            {currentPath.map((segment, i) => (
                                <span key={i} className="flex items-center gap-1 text-muted-foreground">
                                    <ChevronRight className="w-3 h-3" />
                                    <button
                                        className="hover:text-slate-800 hover:underline"
                                        onClick={() => setCurrentPath(currentPath.slice(0, i + 1))}
                                    >
                                        {segment}
                                    </button>
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Folders */}
                    {!search && (
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-semibold text-slate-800">
                                    {currentPath.length === 0 ? 'Pastas' : currentPath[currentPath.length - 1]}
                                </h2>
                                <div className="flex gap-1">
                                    <Button variant={view === 'grid' ? 'default' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => setView('grid')}>
                                        <Grid3X3 className="w-4 h-4" />
                                    </Button>
                                    <Button variant={view === 'list' ? 'default' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => setView('list')}>
                                        <List className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>

                            {currentFolders.length > 0 && (
                                <div className={view === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4' : 'space-y-2'}>
                                    {currentFolders.map((folder) => {
                                        const fileCount = countFiles(folder);
                                        return view === 'grid' ? (
                                            <Card
                                                key={folder.name}
                                                className="border-0 shadow-sm hover:shadow-md transition cursor-pointer group"
                                                onClick={() => setCurrentPath([...currentPath, folder.name])}
                                            >
                                                <CardContent className="p-4 text-center">
                                                    <div className={`w-14 h-14 rounded-xl ${folder.color} mx-auto mb-3 flex items-center justify-center group-hover:scale-110 transition-transform`}>
                                                        <folder.icon className="w-7 h-7 text-white" />
                                                    </div>
                                                    <p className="text-sm font-medium text-slate-700 truncate">{folder.name}</p>
                                                    <p className="text-xs text-muted-foreground mt-1">{fileCount} arquivos</p>
                                                </CardContent>
                                            </Card>
                                        ) : (
                                            <Card
                                                key={folder.name}
                                                className="border-0 shadow-sm hover:shadow-md transition cursor-pointer"
                                                onClick={() => setCurrentPath([...currentPath, folder.name])}
                                            >
                                                <CardContent className="p-3 flex items-center gap-4">
                                                    <div className={`w-10 h-10 rounded-lg ${folder.color} flex items-center justify-center shrink-0`}>
                                                        <folder.icon className="w-5 h-5 text-white" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="text-sm font-medium text-slate-700">{folder.name}</p>
                                                        <p className="text-xs text-muted-foreground">{fileCount} arquivos</p>
                                                    </div>
                                                    <ChevronRight className="w-4 h-4 text-slate-400" />
                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Files in current folder */}
                            {currentFiles.length > 0 && (
                                <div className="mt-4">
                                    <h3 className="text-sm font-semibold text-slate-700 mb-3">Documentos ({currentFiles.length})</h3>
                                    <div className="rounded-lg border overflow-hidden">
                                        <table className="w-full text-sm">
                                            <thead className="bg-slate-50">
                                                <tr>
                                                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Arquivo</th>
                                                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Data</th>
                                                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Ações</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                {currentFiles.map((file, i) => (
                                                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                                                        <td className="px-4 py-3 flex items-center gap-3">
                                                            <FileText className="w-5 h-5 text-red-500 shrink-0" />
                                                            <span className="font-medium truncate">{file.name}</span>
                                                        </td>
                                                        <td className="px-4 py-3 text-muted-foreground">{file.date}</td>
                                                        <td className="px-4 py-3 text-right">
                                                            {file.url ? (
                                                                <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                                                                    <a href={file.url} target="_blank" rel="noopener noreferrer">
                                                                        <Download className="w-4 h-4" />
                                                                    </a>
                                                                </Button>
                                                            ) : (
                                                                <span className="text-xs text-muted-foreground">Sem PDF</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Search Results or Recent Files */}
                    <Card className="border-0 shadow-sm">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-lg">{search ? 'Resultados da Busca' : 'Documentos Recentes'}</CardTitle>
                                    <CardDescription>{search ? `${filteredFiles.length} resultados` : 'Últimos documentos gerados'}</CardDescription>
                                </div>
                                <Badge variant="outline">{filteredFiles.length} arquivos</Badge>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {filteredFiles.length === 0 ? (
                                <p className="text-center py-8 text-muted-foreground text-sm">Nenhum documento encontrado</p>
                            ) : (
                                <div className="rounded-lg border overflow-hidden">
                                    <table className="w-full text-sm">
                                        <thead className="bg-slate-50">
                                            <tr>
                                                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Arquivo</th>
                                                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Pasta</th>
                                                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Data</th>
                                                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {filteredFiles.map((file, i) => (
                                                <tr key={i} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-3">
                                                            <FileText className="w-5 h-5 text-red-500 shrink-0" />
                                                            <span className="font-medium truncate">{file.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-muted-foreground text-xs">{file.folder}</td>
                                                    <td className="px-4 py-3 text-muted-foreground">{file.date}</td>
                                                    <td className="px-4 py-3 text-right">
                                                        {file.url ? (
                                                            <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                                                                <a href={file.url} target="_blank" rel="noopener noreferrer">
                                                                    <Download className="w-4 h-4" />
                                                                </a>
                                                            </Button>
                                                        ) : (
                                                            <span className="text-xs text-muted-foreground">—</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="remover">
                    <Card className="border-red-100 bg-red-50/20">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-red-900">
                                <ShieldAlert className="w-5 h-5" /> Área de Remoção
                            </CardTitle>
                            <CardDescription>
                                Cuidado: A remoção de documentos é irreversível. O registro e o arquivo serão excluídos permanentemente.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-lg border bg-white overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-red-50">
                                        <tr>
                                            <th className="text-left px-4 py-3 font-medium text-red-900">Arquivo</th>
                                            <th className="text-left px-4 py-3 font-medium text-red-900">Pasta</th>
                                            <th className="text-left px-4 py-3 font-medium text-red-900">Data</th>
                                            <th className="text-right px-4 py-3 font-medium text-red-900">Ação</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {allFiles.map((file, i) => (
                                            <tr key={i} className="hover:bg-red-50/30 transition-colors">
                                                <td className="px-4 py-3 font-medium">{file.name}</td>
                                                <td className="px-4 py-3 text-muted-foreground text-xs">{file.folder}</td>
                                                <td className="px-4 py-3 text-muted-foreground">{file.date}</td>
                                                <td className="px-4 py-3 text-right">
                                                    {file.consulta_id && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-red-600 hover:text-red-700 hover:bg-red-100"
                                                            onClick={() => handleDelete(file.consulta_id!, file.name)}
                                                        >
                                                            <Trash2 className="w-4 h-4 mr-2" /> Excluir
                                                        </Button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
