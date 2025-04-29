import { FC, useRef } from 'react';
import { Flex, useDisclosure, Image, Text, HStack, useColorModeValue } from '@chakra-ui/react';
import { Outlet } from 'react-router-dom';
import { BackTop } from './BackTop';
import { NavBar } from './NavBar';
import { NAVBAR_COLLAPSED_WIDTH, NAVBAR_EXPANDED_WIDTH } from '../config/const';
import { useAuth } from '../hooks/useAuth';
import { useConfig } from '../hooks/useConfig';

export const Layout: FC = () => {
  const scrollableContentRef = useRef<HTMLDivElement>(null);
  const { isOpen: isNavOpen, onToggle: navToggle } = useDisclosure({
    defaultIsOpen: true,
  });
  const { isAuthenticated } = useAuth();
  const { appName } = useConfig();

  const currentNavBarWidth =
    isAuthenticated && isNavOpen ? NAVBAR_EXPANDED_WIDTH : isAuthenticated ? NAVBAR_COLLAPSED_WIDTH : '0px';

  return (
    <>
      {isAuthenticated && <NavBar isNavOpen={isNavOpen} onToggle={navToggle} />}

      <Flex
        ml={currentNavBarWidth}
        transition="margin-left 0.2s ease-in-out"
        flexDirection="column"
        minH="100vh"
        position="relative"
        bg={useColorModeValue('primary.50', 'primary.900')}
      >
        <HStack
          bg={useColorModeValue('primary.50', 'primary.600')}
          opacity={'60%'}
          color={useColorModeValue('primary.800', 'whiteAlpha.900')}
          borderRadius={'md'}
          position="fixed"
          top={4}
          zIndex={10}
          right={15}
          align="center"
          transition="left 0.2s ease-in-out"
        >
          <Text fontSize="lg" fontWeight="bold" color={useColorModeValue('primary.800', 'whiteAlpha.900')}>
            {appName}
          </Text>
          <Image alt={`${appName}-logo`} src="/png/derp_ai_icon_128x128.png" borderRadius="md" h={8} w={8} />
        </HStack>

        <Flex
          ref={scrollableContentRef}
          flexGrow={1}
          overflowY="auto"
          direction="column"
          alignItems="center"
          pt="80px"
          pb={4}
          w="100%"
        >
          <Outlet />
        </Flex>
      </Flex>
      <BackTop />
    </>
  );
};
