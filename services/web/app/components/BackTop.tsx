import { FC, useEffect, useState } from 'react';
import { Box, Button, useColorModeValue } from '@chakra-ui/react';
import { ArrowUpIcon } from '@chakra-ui/icons';

export const BackTop: FC = () => {
  const [scrollPosition, setScrollPosition] = useState(0),
    handleScroll = () => {
      const position = window.scrollY;
      setScrollPosition(position);
    },
    arrowColor = useColorModeValue('primary.200', 'primary.800');
  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const handleScrollUp = () => {
    window.scrollTo({ left: 0, top: 0, behavior: 'smooth' });
  };

  return (
    <>
      {scrollPosition > 500 && (
        <Box position="fixed" bottom="190px" right={['4px', '84px']} zIndex={1}>
          <Button
            onClick={() => handleScrollUp()}
            bgGradient="linear(to-r, primary.400, primary.500, primary.600)"
            _hover={{
              bg: 'primary.300',
            }}
            _active={{
              bg: 'primary.400',
            }}
            _focus={{
              boxShadow: 'none',
            }}
            color={arrowColor}
            variant="ghost"
            size={'sm'}
          >
            <ArrowUpIcon />
          </Button>
        </Box>
      )}
    </>
  );
};
