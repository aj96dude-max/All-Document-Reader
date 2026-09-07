export interface ColorPalette {
  background: string;
  surface: string; 
  surfaceElevated: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  primary: string;
  border: string;
  icon: string;
  iconInactive: string;
  red: string;
  overlay: string;
}

export const lightColors: ColorPalette = {
  background: '#F5F6F8',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  text: '#1C1C1C',
  textSecondary: '#6B7280',
  textTertiary: '#A7A7A7',
  primary: '#ED1C24',
  border: '#E5E7EB',
  icon: '#1F2937',
  iconInactive: '#A7A7A7',
  red: '#ED1C24',
  overlay: 'rgba(0, 0, 0, 0.4)',
};

export const darkColors: ColorPalette = {
  background: '#141414',
  surface: '#1C1C1C',
  surfaceElevated: '#262626',
  text: '#F3F4F6',
  textSecondary: '#9CA3AF',
  textTertiary: '#6B7280',
  primary: '#ED1C24',
  border: '#374151',
  icon: '#E5E7EB',
  iconInactive: '#6B7280',
  red: '#ED1C24',
  overlay: 'rgba(0, 0, 0, 0.6)',
};
