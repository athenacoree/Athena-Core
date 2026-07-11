import React from 'react';
import { Download, Upload, Database } from 'lucide-react';
import { Button } from '~/components/ui';

const BackupRestore = () => {
  const handleExport = () => {
    const data: Record<string, string | null> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        data[key] = localStorage.getItem(key);
      }
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `librechat-data-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target?.result as string);
          if (confirm('¿Importar datos? Esto sobrescribirá tu configuración actual.')) {
            Object.entries(data).forEach(([key, value]) => {
              if (typeof value === 'string') localStorage.setItem(key, value);
            });
            window.location.reload();
          }
        } catch (err) {
          alert('Error al importar JSON.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  return (
    <div className="flex flex-col gap-4 border-t border-border-light pt-4 mt-2">
      <div className="flex items-center gap-2 mb-1">
        <Database size={16} className="text-text-primary" />
        <h3 className="text-sm font-medium text-text-primary uppercase tracking-wider">Datos Portables</h3>
      </div>

      <p className="text-xs text-text-secondary">
        Exporta e importa tu configuración local y perfil para moverlo entre dispositivos.
      </p>

      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={handleExport}
          className="flex-1 gap-2 rounded-xl iphone-blur border-white/10 text-xs"
        >
          <Download size={14} /> Exportar
        </Button>

        <Button
          variant="outline"
          onClick={handleImportClick}
          className="flex-1 gap-2 rounded-xl iphone-blur border-white/10 text-xs"
        >
          <Upload size={14} /> Importar
        </Button>
      </div>
    </div>
  );
};

export default BackupRestore;
