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
import { MoonIcon, SettingsIcon, SunIcon } from '@chakra-ui/icons';

import { ColorTheme, themes } from '@theme';
import { BsPaletteFill } from 'react-icons/bs';
import { useThemeProvider } from '@hooks';

export const NavBar: FC<{ sidebarWidth: string }> = ({ sidebarWidth }) => {
  const { isOpen: isPalOpen, onOpen: palOnOpen, onClose: palOnClose } = useDisclosure();
  const { theme, setTheme } = useThemeProvider();
  const { toggleColorMode } = useColorMode();

  return (
    <Box
      as="nav"
      bg={useColorModeValue('primary.200', 'primary.900')}
      py={4}
      px={2}
      w={sidebarWidth}
      h="100vh"
      position="fixed"
      left="0"
      top="0"
      zIndex="sticky"
      borderRightWidth="1px"
      borderColor={useColorModeValue('gray.300', 'gray.700')}
    >
      <Flex
        h="full"
        alignItems="center"
        justifyContent="flex-start" // Align items to the top (can use space-between later)
        direction="column" // Stack children vertically
        py={5} // Padding top/bottom within the flex container
      >
        <VStack spacing={5}>
          <Tooltip label="Change Theme" placement="right" hasArrow>
            <IconButton
              aria-label="Change Theme"
              icon={<BsPaletteFill />}
              variant="ghost"
              onClick={isPalOpen ? palOnClose : palOnOpen}
              size="lg"
            />
          </Tooltip>

          <Tooltip label="Toggle Color Mode" placement="right" hasArrow>
            <IconButton
              aria-label="Toggle Color Mode"
              icon={useColorModeValue(<MoonIcon />, <SunIcon />)}
              variant="ghost"
              onClick={toggleColorMode}
              size="lg"
            />
          </Tooltip>
        </VStack>

        <Spacer />
        <Tooltip label="Nothing here" placement="right" hasArrow>
          <IconButton aria-label="Settings" icon={<SettingsIcon />} variant="ghost" />
        </Tooltip>
      </Flex>

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
