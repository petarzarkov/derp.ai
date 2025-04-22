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
  Avatar,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverHeader,
  PopoverBody,
  PopoverFooter,
  PopoverArrow,
  PopoverCloseButton,
  Text,
} from '@chakra-ui/react';
import { MoonIcon, SunIcon, ChevronLeftIcon, ChevronRightIcon } from '@chakra-ui/icons';
import { ColorTheme, themes } from '@theme';
import { BsPaletteFill } from 'react-icons/bs';
import { IoMdLogOut } from 'react-icons/io';
import { useThemeProvider } from '@hooks';

import { NAVBAR_EXPANDED_WIDTH, NAVBAR_COLLAPSED_WIDTH } from '../../config/const';
import { useAuth } from '../../auth/AuthContext';

interface NavBarProps {
  isNavOpen: boolean;
  onToggle: () => void;
}

export const NavBar: FC<NavBarProps> = ({ isNavOpen, onToggle }) => {
  const { isOpen: isPalOpen, onOpen: palOnOpen, onClose: palOnClose } = useDisclosure();
  const { theme, setTheme } = useThemeProvider();
  const { toggleColorMode } = useColorMode();
  const { logout, currentUser, isAuthenticated } = useAuth();
  const navBg = useColorModeValue('primary.200', 'primary.900');
  const borderColor = useColorModeValue('gray.300', 'gray.700');
  const ColorModeIcon = useColorModeValue(<MoonIcon />, <SunIcon />);
  const popoverBg = useColorModeValue('white', 'gray.800');

  const currentWidth = isNavOpen ? NAVBAR_EXPANDED_WIDTH : NAVBAR_COLLAPSED_WIDTH;

  // Use a more descriptive name or keep avatarName if preferred elsewhere
  const userDisplayName = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'User';
  const userEmail = currentUser?.email || 'No Email';

  return (
    <Box
      as="nav"
      bg={navBg}
      w={currentWidth}
      h="100vh"
      position="fixed"
      left="0"
      top="0"
      zIndex="sticky"
      borderRightWidth="1px"
      borderColor={borderColor}
      transition="width 0.2s ease-in-out"
    >
      <Tooltip label={isNavOpen ? 'Collapse Menu' : 'Expand Menu'} placement="right" hasArrow>
        <IconButton
          aria-label={isNavOpen ? 'Collapse Menu' : 'Expand Menu'}
          icon={isNavOpen ? <ChevronLeftIcon /> : <ChevronRightIcon />}
          onClick={onToggle}
          variant="ghost"
          size="sm"
          isRound
          position="absolute"
          top="50%"
          right="-16px"
          transform="translateY(-50%)"
          zIndex="banner"
          bg={navBg}
          boxShadow="md"
          borderWidth="1px"
          borderColor={borderColor}
          _hover={{ bg: useColorModeValue('primary.300', 'primary.700') }}
        />
      </Tooltip>

      <Flex
        h="full"
        alignItems="center"
        justifyContent="space-between" // Pushes top icons up and bottom icons down
        direction="column"
        py={5} // Padding top and bottom
        px={2} // Padding left and right
        // Control visibility based on nav state for smooth transition
        opacity={isNavOpen ? 1 : 0}
        visibility={isNavOpen ? 'visible' : 'hidden'}
        pointerEvents={isNavOpen ? 'auto' : 'none'} // Disable interaction when collapsed
        transition="opacity 0.2s 0.1s, visibility 0.2s 0.1s" // Delay transition slightly
      >
        <VStack spacing={5} alignSelf="stretch">
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

        <VStack spacing={4} alignSelf="stretch">
          {isAuthenticated && currentUser && (
            <Popover placement="right-start" trigger="click" isLazy>
              <PopoverTrigger>
                <Avatar
                  size="sm"
                  name={userDisplayName}
                  src={currentUser.picture ?? undefined}
                  mb={2}
                  cursor="pointer" // Indicate it's clickable
                  _hover={{ opacity: 0.8 }} // Add hover effect
                />
              </PopoverTrigger>
              <PopoverContent zIndex="popover" bg={popoverBg} width="auto" _focus={{ boxShadow: 'lg' }}>
                {' '}
                {/* Ensure popover is above other elements */}
                <PopoverArrow bg={popoverBg} />
                <PopoverCloseButton />
                <PopoverHeader fontWeight="semibold" borderBottomWidth="1px">
                  {userDisplayName}
                </PopoverHeader>
                <PopoverBody>
                  <VStack align="start" spacing={2}>
                    <Text fontSize="sm" color="gray.500">
                      Email: {userEmail}
                    </Text>
                    <Text fontSize="sm" color="gray.500">
                      Joined: {new Date(currentUser?.createdAt).toLocaleString()}
                    </Text>
                  </VStack>
                </PopoverBody>
                <PopoverFooter borderTopWidth="1px">
                  <Button
                    leftIcon={<IoMdLogOut />}
                    colorScheme="red"
                    variant="ghost"
                    size="sm"
                    onClick={logout}
                    width="full"
                    justifyContent="start"
                  >
                    Logout
                  </Button>
                  {/* Add other actions like 'Profile', 'Settings' here later */}
                </PopoverFooter>
              </PopoverContent>
            </Popover>
          )}
        </VStack>
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
