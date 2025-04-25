import { Box, Heading, TabList, TabPanel, TabPanels, Tabs } from '@chakra-ui/react';
import { FC, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { TermsOfService } from './TermsOfService';
import { PrivacyPolicy } from './PrivacyPolicy';
import { useThemeProvider } from '@hooks';
import { CustomTab } from '../../components/CustomTab';

export const LegalPage: FC = () => {
  const { theme } = useThemeProvider();
  const location = useLocation();
  const navigate = useNavigate();
  // Determine the active tab index based on the current URL path
  const activeIndex = useMemo(() => {
    if (location.pathname.includes('/terms-of-service')) {
      return 1; // Index of the Terms of Service tab
    }
    return 0; // Default to Privacy Policy tab (index 0)
  }, [location.pathname]);

  const handleTabsChange = useCallback(
    (index: number) => {
      // Update the URL based on the selected tab index
      const path = index === 1 ? '/terms-of-service' : '/privacy-policy';
      // Use replace to avoid adding multiple history entries for tab switching
      navigate(path, { replace: true });
    },
    [navigate],
  );

  return (
    <Box>
      <Heading as="h1" size="xl" textAlign="center">
        Legal Information
      </Heading>

      <Tabs isFitted isLazy index={activeIndex} onChange={handleTabsChange} variant="soft-rounded" colorScheme={theme}>
        <TabList mb="1em">
          <CustomTab title="Privacy Policy" />
          <CustomTab title="Terms of Service" />
        </TabList>
        <TabPanels>
          <TabPanel p={0}>
            <PrivacyPolicy />
          </TabPanel>
          <TabPanel p={0}>
            <TermsOfService />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
};
