import { FC, useRef } from 'react';
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
  AlertDialog,
  AlertDialogBody,
  AlertDialogCloseButton,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  Divider,
  useToast,
} from '@chakra-ui/react';
import { MoonIcon, SunIcon, ChevronLeftIcon, ChevronRightIcon } from '@chakra-ui/icons';
import { ColorTheme, themes } from '@theme';
import { BsPaletteFill } from 'react-icons/bs';
import { IoMdLogOut, IoMdHome } from 'react-icons/io';
import { useThemeProvider } from '@hooks';
import { Link as RouterLink } from 'react-router-dom';
import { NAVBAR_EXPANDED_WIDTH, NAVBAR_COLLAPSED_WIDTH } from '../../config/const';
import { useAuth } from '../../hooks/useAuth';
import { MdPrivacyTip, MdDeleteForever } from 'react-icons/md';

interface NavBarProps {
  isNavOpen: boolean;
  onToggle: () => void;
}

export const NavBar: FC<NavBarProps> = ({ isNavOpen, onToggle }) => {
  const { isOpen: isPalOpen, onOpen: palOnOpen, onClose: palOnClose } = useDisclosure();
  const { theme, setTheme } = useThemeProvider();
  const { toggleColorMode } = useColorMode();
  const { logout, deleteAccount, currentUser, isAuthenticated } = useAuth();
  const navBg = useColorModeValue('primary.200', 'primary.900');
  const borderColor = useColorModeValue('gray.300', 'gray.700');
  const ColorModeIcon = useColorModeValue(<MoonIcon />, <SunIcon />);
  const popoverBg = useColorModeValue('white', 'gray.800');

  const { isOpen: isAlertOpen, onOpen: onAlertOpen, onClose: onAlertClose } = useDisclosure();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const toast = useToast();

  const currentWidth = isNavOpen ? NAVBAR_EXPANDED_WIDTH : NAVBAR_COLLAPSED_WIDTH;
  const userDisplayName = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'User';
  const userEmail = currentUser?.email || 'No Email';

  const handleDeleteConfirmed = async () => {
    try {
      await deleteAccount(); // Call the function from context
      // Success state is handled by logout within deleteAccount
      toast({
        title: 'Account Deleted',
        description: 'Your account has been successfully deleted.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      onAlertClose(); // Close dialog only on success indication from deleteAccount maybe not needed as logout will likely unmount this anyway
    } catch (error) {
      // Error state is handled within deleteAccount, just show toast here
      toast({
        title: 'Deletion Error',
        description: error instanceof Error ? error.message : 'Could not delete account. Please try again.',
        status: 'error',
        duration: 7000,
        isClosable: true,
      });
      onAlertClose(); // Close dialog on error
    }
  };

  return (
    <>
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
          justifyContent="space-between"
          direction="column"
          py={5}
          px={2}
          opacity={isNavOpen ? 1 : 0}
          visibility={isNavOpen ? 'visible' : 'hidden'}
          pointerEvents={isNavOpen ? 'auto' : 'none'} // Disable interaction when collapsed
          transition="opacity 0.2s 0.1s, visibility 0.2s 0.1s" // Delay transition slightly
        >
          <VStack spacing={5} alignSelf="stretch">
            <Tooltip label="Home" placement="right" hasArrow>
              <IconButton as={RouterLink} to="/" aria-label="Home" icon={<IoMdHome />} variant="ghost" size="lg" />
            </Tooltip>
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
            <Tooltip label="Privacy Policy" placement="right" hasArrow>
              <IconButton
                as={RouterLink}
                to="/privacy-policy"
                aria-label="Privacy Policy"
                icon={<MdPrivacyTip />}
                variant="ghost"
                size="lg"
              />
            </Tooltip>
            {isAuthenticated && currentUser && (
              <Popover placement="right-start" trigger="click" isLazy>
                <PopoverTrigger>
                  <Avatar
                    size="sm"
                    name={userDisplayName}
                    src={currentUser.picture ?? undefined}
                    mb={2}
                    cursor="pointer"
                    _hover={{ opacity: 0.8 }}
                  />
                </PopoverTrigger>
                <PopoverContent zIndex="popover" bg={popoverBg} width="auto" _focus={{ boxShadow: 'lg' }}>
                  {' '}
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

                    <Divider />
                    <Button
                      leftIcon={<MdDeleteForever />}
                      colorScheme="red"
                      variant="ghost"
                      size="sm"
                      onClick={onAlertOpen}
                      width="full"
                      justifyContent="start"
                    >
                      Delete Account
                    </Button>
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

      <AlertDialog isOpen={isAlertOpen} leastDestructiveRef={cancelRef} onClose={onAlertClose} isCentered>
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete Account
            </AlertDialogHeader>
            <AlertDialogCloseButton />

            <AlertDialogBody>
              Are you sure you want to delete your account? This action cannot be undone and all your data associated
              with DerpAI will be permanently removed.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onAlertClose}>
                Cancel
              </Button>
              <Button colorScheme="red" onClick={handleDeleteConfirmed} ml={3}>
                Delete Account
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </>
  );
};
