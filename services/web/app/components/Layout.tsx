import { FC, useRef } from 'react';
import { Flex, useDisclosure } from '@chakra-ui/react';
import { Outlet } from 'react-router-dom';
import { BackTop } from './BackTop';
import { NavBar } from './NavBar';
import { NAVBAR_COLLAPSED_WIDTH, NAVBAR_EXPANDED_WIDTH } from '../config/const';

export const Layout: FC = () => {
  const flexRef = useRef<HTMLDivElement>(null);
  const { isOpen: isNavOpen, onToggle: navToggle } = useDisclosure();
  const currentNavBarWidth = isNavOpen ? NAVBAR_EXPANDED_WIDTH : NAVBAR_COLLAPSED_WIDTH;

  return (
    <>
      <NavBar isNavOpen={isNavOpen} onToggle={navToggle} />

      <Flex
        ref={flexRef}
        minH="100vh" // Ensure content area can span full viewport height
        ml={currentNavBarWidth} // <<< Add margin-left to offset for fixed sidebar
        justify="center" // Keep centering the inner container if desired
        alignItems="stretch" // Allow inner container to stretch vertically
      >
        <Flex flexDirection="column" flexGrow={1} p={4} w={{ base: '95%', sm: '90%', lg: '85%' }} maxW="container.xl">
          <Outlet />
        </Flex>
      </Flex>

      <BackTop />
    </>
  );
};
