import { useDisclosure, Button, Slide, Box, Text, CloseButton, Link, VStack, Heading, HStack } from '@chakra-ui/react';
import { storeData, getData } from '@store';
import { useConfig } from '../hooks/useConfig';
import { FC, useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';

const COOKIE_PREFS_STORAGE_KEY = 'user_cookie_preferences';

export const AcknowledgeCookies: FC = () => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { appName } = useConfig();

  useEffect(() => {
    const hasAcknowledged = getData(COOKIE_PREFS_STORAGE_KEY);
    if (!hasAcknowledged) {
      onOpen();
    }
  }, [onOpen]);

  const handleAcknowledgeCookies = () => {
    storeData(COOKIE_PREFS_STORAGE_KEY, { acknowledged: true });
    onClose();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <Slide direction="bottom" in={isOpen} style={{ zIndex: 1900 }}>
      <Box
        p={{ base: 4, md: 5 }}
        color="white"
        bg="teal.500"
        shadow="md"
        position="fixed"
        bottom="0"
        left="0"
        right="0"
        maxWidth="80%"
        mx="auto"
        zIndex="overlay"
        borderTopRadius={15}
        opacity={'90%'}
      >
        <VStack spacing={{ base: 3, md: 4 }} align="stretch" maxW="container.xl" mx="auto">
          <HStack justifyContent="space-between" alignItems="center">
            <Heading size="md">About Our Cookies</Heading>
            <CloseButton onClick={handleAcknowledgeCookies} color="white" size="lg" />
          </HStack>
          <Text fontSize="sm">
            {appName} uses only essential cookies to keep you logged in and make sure our features work correctly. We
            don't use these cookies to track you or collect personal information.
          </Text>
          <HStack spacing={{ base: 2, md: 4 }} justifyContent="flex-end" alignItems="center">
            <Link as={RouterLink} to={'/privacy-policy'} color="teal.100" fontSize="sm" textDecoration="underline">
              Read our Privacy Policy
            </Link>
            <Button colorScheme="blue" size="sm" onClick={handleAcknowledgeCookies}>
              OK, Got It
            </Button>
          </HStack>
        </VStack>
      </Box>
    </Slide>
  );
};
