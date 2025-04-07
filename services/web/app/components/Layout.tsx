import { FC, useRef } from 'react';
import { Flex, useColorModeValue } from '@chakra-ui/react';
import { Outlet } from 'react-router-dom';
import { BackTop } from './BackTop';
import { NavBar } from './NavBar';

export const Layout: FC = () => {
  const navBarRef = useRef<HTMLDivElement>(null);
  const flexRef = useRef<HTMLDivElement>(null);
  return (
    <>
      <NavBar ref={navBarRef} />

      <Flex
        ref={flexRef}
        minH={`calc(100vh - ${navBarRef.current?.clientHeight || 0}px)`}
        bgColor={useColorModeValue('primary.100', 'primary.800')}
        justify="center"
        alignItems="stretch"
      >
        <Flex
          flexDirection="column"
          flexGrow={1} // Add flexGrow to make it expand
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
