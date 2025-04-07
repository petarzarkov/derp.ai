import { FC, useRef } from 'react';
import { Flex, useColorModeValue } from '@chakra-ui/react';
import { Outlet } from 'react-router-dom';
import { BackTop } from './BackTop';
import { NavBar } from './NavBar';

export const Layout: FC = () => {
  const flexRef = useRef<HTMLDivElement>(null);
  const sidebarWidth = '44px';

  return (
    <>
      <NavBar sidebarWidth={sidebarWidth} />

      <Flex
        ref={flexRef}
        minH="100vh" // Ensure content area can span full viewport height
        ml={sidebarWidth} // <<< Add margin-left to offset for fixed sidebar
        bgColor={useColorModeValue('primary.100', 'primary.800')}
        justify="center" // Keep centering the inner container if desired
        alignItems="stretch" // Allow inner container to stretch vertically
      >
        <Flex
          flexDirection="column"
          flexGrow={1}
          borderRadius="md"
          p={4}
          w={{ base: '95%', sm: '90%', lg: '85%' }}
          maxW="container.xl"
        >
          <Outlet />
        </Flex>
      </Flex>

      <BackTop />
    </>
  );
};
