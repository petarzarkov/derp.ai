import { FC } from 'react';
import {
  Box,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  Flex,
  IconButton,
  useColorMode,
  useColorModeValue,
  useDisclosure,
  VStack,
  Tooltip,
  Button,
  Spacer,
} from '@chakra-ui/react';
import { MoonIcon, SettingsIcon, SunIcon, ChevronLeftIcon, ChevronRightIcon } from '@chakra-ui/icons';
import { ColorTheme, themes } from '@theme';
import { BsPaletteFill } from 'react-icons/bs';
import { useThemeProvider } from '@hooks';

import { NAVBAR_EXPANDED_WIDTH, NAVBAR_COLLAPSED_WIDTH } from '../../config/const';

interface NavBarProps {
  isNavOpen: boolean;
  onToggle: () => void;
}

export const NavBar: FC<NavBarProps> = ({ isNavOpen, onToggle }) => {
  const { isOpen: isPalOpen, onOpen: palOnOpen, onClose: palOnClose } = useDisclosure();
  const { theme, setTheme } = useThemeProvider();
  const { toggleColorMode } = useColorMode();
  const navBg = useColorModeValue('primary.200', 'primary.900');
  const borderColor = useColorModeValue('gray.300', 'gray.700');
  const ColorModeIcon = useColorModeValue(<MoonIcon />, <SunIcon />);

  const currentWidth = isNavOpen ? NAVBAR_EXPANDED_WIDTH : NAVBAR_COLLAPSED_WIDTH;

  return (
    <Box
      as="nav"
      bg={navBg}
      // Dynamic width based on isNavOpen state
      w={currentWidth}
      h="100vh"
      position="fixed"
      left="0"
      top="0"
      zIndex="sticky" // Ensure it stays above content scroll
      borderRightWidth="1px"
      borderColor={borderColor}
      // Add smooth transition for the width change
      transition="width 0.2s ease-in-out"
    >
      {/* Toggle Button */}
      <Tooltip label={isNavOpen ? 'Collapse Menu' : 'Expand Menu'} placement="right" hasArrow>
        <IconButton
          aria-label={isNavOpen ? 'Collapse Menu' : 'Expand Menu'}
          // Change icon based on state
          icon={isNavOpen ? <ChevronLeftIcon /> : <ChevronRightIcon />}
          onClick={onToggle} // Toggle the nav state
          variant="ghost"
          size="sm"
          isRound
          position="absolute"
          top="50%" // Center vertically
          // Position near the right edge, slightly outside when collapsed
          right="-16px" // Adjust this value to position correctly
          transform="translateY(-50%)"
          zIndex="banner" // Ensure it's above the nav background but below modals
          bg={navBg} // Match nav background to blend edge
          boxShadow="md" // Add shadow to make it pop
          borderWidth="1px"
          borderColor={borderColor}
          _hover={{ bg: useColorModeValue('primary.300', 'primary.700') }}
        />
      </Tooltip>

      {/* Main Nav Content Area */}
      <Flex
        h="full"
        alignItems="center"
        justifyContent="flex-start" // Align items top
        direction="column"
        py={5} // Inner padding
        px={2} // Keep horizontal padding consistent for icon alignment
        // Fade content out/in when collapsed/expanded
        opacity={isNavOpen ? 1 : 0}
        visibility={isNavOpen ? 'visible' : 'hidden'}
        pointerEvents={isNavOpen ? 'auto' : 'none'} // Prevent interaction when hidden
        transition="opacity 0.2s ease-in-out, visibility 0.2s ease-in-out"
      >
        {/* Only show content fully when open */}
        {isNavOpen && ( // You can alternatively use the opacity/visibility approach above
          <>
            <VStack spacing={5}>
              <Tooltip label="Change Theme" placement="right" hasArrow>
                <IconButton
                  aria-label="Change Theme"
                  icon={<BsPaletteFill />}
                  variant="ghost"
                  onClick={palOnOpen}
                  size="lg"
                />
              </Tooltip>

              <Tooltip label="Toggle Color Mode" placement="right" hasArrow>
                <IconButton
                  aria-label="Toggle Color Mode"
                  icon={ColorModeIcon}
                  variant="ghost"
                  onClick={toggleColorMode}
                  size="lg"
                />
              </Tooltip>
            </VStack>

            <Spacer />
            <Tooltip label="Nothing here" placement="right" hasArrow>
              <IconButton aria-label="Settings" icon={<SettingsIcon />} variant="ghost" size="lg" />
            </Tooltip>
          </>
        )}
      </Flex>

      {/* Theme Palette Drawer (remains the same) */}
      <Drawer placement={'left'} onClose={palOnClose} isOpen={isPalOpen}>
        <DrawerOverlay />
        <DrawerContent>
          <DrawerHeader borderBottomWidth="1px" backgroundColor={useColorModeValue(`${theme}.300`, `${theme}.500`)}>
            Pick your theme
          </DrawerHeader>
          <DrawerCloseButton />
          <DrawerBody>
            <Flex wrap="wrap">
              {Object.keys(themes).map((tt, indx) => (
                <Button
                  p={2}
                  m={1}
                  variant="outline"
                  key={`${tt}-${indx}`}
                  colorScheme={tt}
                  bgColor={theme === tt ? useColorModeValue(`${tt}.300`, `${tt}.500`) : 'transparent'}
                  onClick={() => setTheme(tt as ColorTheme)}
                  size="sm"
                >
                  {tt}
                </Button>
              ))}
            </Flex>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </Box>
  );
};
