import { Box, Flex, Heading, TabList, TabPanel, TabPanels, Tabs } from '@chakra-ui/react';
import { FC, lazy, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useThemeProvider } from '@hooks';
import { CustomTab } from '../../components/CustomTab';
import { NavLink } from '../../components/NavBar/NavLink';
import { IoIosArrowBack } from 'react-icons/io';

const PrivacyPolicy = lazy(() => import('./PrivacyPolicy'));
const TermsOfService = lazy(() => import('./TermsOfService'));

const LegalPage: FC = () => {
  const { theme } = useThemeProvider();
  const location = useLocation();
  const navigate = useNavigate();
  const activeIndex = useMemo(() => {
    if (location.pathname.includes('/terms-of-service')) {
      return 1;
    }
    return 0;
  }, [location.pathname]);

  const handleTabsChange = useCallback(
    (index: number) => {
      const path = index === 1 ? '/terms-of-service' : '/privacy-policy';
      navigate(path, { replace: true });
    },
    [navigate],
  );

  return (
    <Box p={25}>
      <Flex align="center" justify="space-between" mb={8}>
        <NavLink label={'Home'} key={'home'} to={'/'} icon={<IoIosArrowBack size={24} />}>
          {'Home'}
        </NavLink>
        <Heading as="h1" size="xl" flex="1" textAlign="center" ml={-10}>
          Legal Information
        </Heading>
      </Flex>

      <Tabs isLazy index={activeIndex} onChange={handleTabsChange} variant="soft-rounded" colorScheme={theme}>
        <TabList mb="1em" justifyContent="center">
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

export default LegalPage;
