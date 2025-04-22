import { FC, useRef } from 'react';
import { Flex, useDisclosure } from '@chakra-ui/react';
import { Outlet } from 'react-router-dom';
import { BackTop } from './BackTop';
import { NavBar } from './NavBar';
import { NAVBAR_COLLAPSED_WIDTH, NAVBAR_EXPANDED_WIDTH } from '../config/const';
import { useAuth } from '../hooks/useAuth';

export const Layout: FC = () => {
  const flexRef = useRef<HTMLDivElement>(null);
  const { isOpen: isNavOpen, onToggle: navToggle } = useDisclosure({
    defaultIsOpen: true,
  });
  const { isAuthenticated } = useAuth();

  const currentNavBarWidth =
    isAuthenticated && isNavOpen ? NAVBAR_EXPANDED_WIDTH : isAuthenticated ? NAVBAR_COLLAPSED_WIDTH : '0px';

  return (
    <>
      {isAuthenticated && <NavBar isNavOpen={isNavOpen} onToggle={navToggle} />}

      <Flex
        ref={flexRef}
        minH="100vh"
        ml={currentNavBarWidth}
        transition="margin-left 0.2s ease-in-out"
        justify="center"
        alignItems="stretch"
      >
        <Flex
          flexDirection="column"
          flexGrow={1}
          p={4}
          w={{ base: '100%', sm: '95%', md: '90%', lg: '85%' }}
          maxW="container.xl"
        >
          <Outlet />
        </Flex>
      </Flex>

      <BackTop />
    </>
  );
};
