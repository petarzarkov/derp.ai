import { ConfigState, ConfigContext } from '../config/ConfigContext';
import { useContext } from 'react';

export const useConfig = (): ConfigState => {
  const context = useContext(ConfigContext);
  if (context === undefined) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
};
