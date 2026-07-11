import React, { useState, useEffect } from 'react';
import { Label, Input, Button } from '~/components/ui';
import { useLocalize } from '~/hooks';

const IntegrationSettings = () => {
  const localize = useLocalize();
  const [googleKey, setGoogleKey] = useState('');
  const [googleCx, setGoogleCx] = useState('');

  useEffect(() => {
    const savedKey = localStorage.getItem('googleImagesApiKey');
    const savedCx = localStorage.getItem('googleImagesCx');
    if (savedKey) setGoogleKey(savedKey);
    if (savedCx) setGoogleCx(savedCx);
  }, []);

  const handleSave = () => {
    localStorage.setItem('googleImagesApiKey', googleKey);
    localStorage.setItem('googleImagesCx', googleCx);
    alert('Configuración guardada en el navegador.');
  };

  return (
    <div className="flex flex-col gap-4 border-t border-border-light pt-4 mt-4">
      <h3 className="text-sm font-medium text-text-primary italic">Integraciones de IA (Navegador)</h3>

      <div className="flex flex-col gap-2">
        <Label htmlFor="google-images-key">Google Images API Key</Label>
        <Input
          id="google-images-key"
          value={googleKey}
          onChange={(e) => setGoogleKey(e.target.value)}
          placeholder="AIza..."
          type="password"
          className="iphone-blur border-white/10"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="google-images-cx">Google Images CX ID</Label>
        <Input
          id="google-images-cx"
          value={googleCx}
          onChange={(e) => setGoogleCx(e.target.value)}
          placeholder="012345..."
          className="iphone-blur border-white/10"
        />
      </div>

      <Button
        variant="primary"
        onClick={handleSave}
        className="w-full mt-2 rounded-xl"
      >
        {localize('com_ui_save')}
      </Button>

      <div className="mt-2 space-y-1">
        <p className="text-[10px] text-text-secondary italic">
          * <strong>Wikipedia:</strong> Activada automáticamente (pública).
        </p>
        <p className="text-[10px] text-text-secondary italic">
          * <strong>YouTube:</strong> Configura tu clave en el servidor o espera soporte OAuth.
        </p>
      </div>
    </div>
  );
};

export default IntegrationSettings;
