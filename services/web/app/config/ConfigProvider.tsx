import { ReactNode, useState, useCallback, useEffect } from 'react';
import { ConfigContext, ConfigState, initialConfigState } from './ConfigContext';
import { Center, Spinner } from '@chakra-ui/react';

export interface ConfigProviderProps {
  children: ReactNode;
}

export const ConfigProvider: React.FC<ConfigProviderProps> = ({ children }) => {
  const [configState, setConfigState] = useState<ConfigState>(initialConfigState);

  const fetchAppConfig = useCallback(async (url: string) => {
    const response = await fetch(`${url}/service/config`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (response.ok) {
      const config: Record<string, string> = await response.json();
      return config;
    } else {
      console.error(`Failed to fetch app config: ${response.status}`);
      return null;
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    setConfigState((prev) => ({ ...prev, isLoading: true }));

    fetchAppConfig(configState.serverUrl)
      .then((config) => {
        if (isMounted && config) {
          setConfigState({
            appEnv: config.env,
            appName: config.name,
            supportEmail: config.supportEmail,
            serverUrl: config.serverUrl,
            swaggerDocsUrl: `${config.serverUrl}/${config.docsApiPath}`,
            isLoading: false,
          });
        } else if (isMounted) {
          console.warn('App config fetch succeeded but returned no data. Using defaults.');
          setConfigState((prev) => ({
            ...prev,
            isLoading: false,
          }));
        }
      })
      .catch((err) => {
        console.error('Error fetching app config:', err);
        if (isMounted) {
          setConfigState((prev) => ({
            ...prev,
            isLoading: false,
          }));
        }
      });

    return () => {
      isMounted = false;
    };
  }, [fetchAppConfig, configState.serverUrl]);

  if (configState.isLoading) {
    return (
      <Center h="100vh">
        <Spinner thickness="4px" speed="0.65s" emptyColor="primary.200" color="blue.500" size="xl" />
      </Center>
    );
  }

  return <ConfigContext.Provider value={configState}>{children}</ConfigContext.Provider>;
};
