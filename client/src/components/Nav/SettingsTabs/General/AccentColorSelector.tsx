import React from 'react';
import { useTheme } from '@librechat/client';
import { useLocalize } from '~/hooks';

const accentColors = [
  { name: 'Purple', rgb: '171 104 255' },
  { name: 'Blue', rgb: '37 99 235' },
  { name: 'Green', rgb: '16 185 129' },
  { name: 'Red', rgb: '239 68 68' },
  { name: 'Orange', rgb: '249 115 22' },
  { name: 'Pink', rgb: '236 72 153' },
];

const AccentColorSelector = () => {
  const { themeRGB, setThemeRGB, themeName, setThemeName } = useTheme();
  const localize = useLocalize();

  const handleColorSelect = (color: { name: string; rgb: string }) => {
    setThemeRGB({
      ...(themeRGB ?? {}),
      'rgb-brand-purple': color.rgb,
    });
    setThemeName(color.name);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="text-sm font-medium text-text-primary">
        {localize('com_ui_accent_color') || 'Accent Color'}
      </div>
      <div className="flex flex-wrap gap-2">
        {accentColors.map((color) => (
          <button
            key={color.name}
            onClick={() => handleColorSelect(color)}
            className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all ${
              themeName === color.name ? 'border-text-primary scale-110' : 'border-transparent'
            }`}
            style={{ backgroundColor: `rgb(${color.rgb})` }}
            title={color.name}
            aria-label={color.name}
          >
            {themeName === color.name && (
              <div className="h-2 w-2 rounded-full bg-white shadow-sm" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default AccentColorSelector;
