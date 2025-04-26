import React, { useState } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  FormControl,
  FormLabel,
  Input,
  Button,
  VStack,
  Text,
  Link,
  Alert,
  AlertIcon,
  useToast,
  InputGroup,
  InputRightElement,
  FormErrorMessage,
  IconButton,
  Box,
} from '@chakra-ui/react';
import { ViewIcon, ViewOffIcon } from '@chakra-ui/icons';
import { FcGoogle } from 'react-icons/fc';
import { FaGithub, FaLinkedin } from 'react-icons/fa';
import { useAuth } from '../hooks/useAuth';
import { AuthProviderType } from './AuthContext';
import { useThemeProvider } from '@hooks';

const passwordMinLength = 8;
const passwordError = `Password must be at least ${passwordMinLength} characters long.`;

export const AuthModal: React.FC = () => {
  const [isRegisterView, setIsRegisterView] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [isPasswordTouched, setIsPasswordTouched] = useState(false);
  const isPasswordLengthValid = password.length >= passwordMinLength;
  const showPasswordError = isPasswordTouched && !isPasswordLengthValid;

  const { login, register, initiateOAuthLogin, error, isLoading } = useAuth();
  const { theme } = useThemeProvider();
  const toast = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    if (isRegisterView && !isPasswordLengthValid) {
      setIsPasswordTouched(true);
      toast({
        title: 'Password too short',
        description: passwordError,
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    let success = false;
    if (isRegisterView) {
      success = await register(displayName, email, password);
    } else {
      success = await login(email, password);
    }

    if (success) {
      toast({
        title: isRegisterView ? 'Registration successful.' : 'Login successful.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleOAuthLogin = (provider: AuthProviderType) => {
    if (isLoading) return;
    initiateOAuthLogin(provider);
  };

  const toggleView = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isLoading) {
      setIsRegisterView(!isRegisterView);
      setIsPasswordTouched(false);
      setPassword('');
    }
  };

  return (
    <Modal isOpen={true} onClose={() => null} isCentered>
      <ModalOverlay />
      <ModalContent mx="4">
        <ModalHeader textAlign="center">{isRegisterView ? 'Create Account' : 'Welcome'}</ModalHeader>
        <ModalBody pb={6}>
          <Box as={'form'} onSubmit={handleSubmit}>
            <VStack spacing={4}>
              {isRegisterView && (
                <FormControl isRequired>
                  <FormLabel>Display Name</FormLabel>
                  <Input
                    placeholder="Choose a display name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                </FormControl>
              )}
              <FormControl isRequired>
                <FormLabel>Email</FormLabel>
                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </FormControl>
              <FormControl isRequired isInvalid={showPasswordError} onBlur={() => setIsPasswordTouched(true)}>
                <FormLabel>Password</FormLabel>
                <InputGroup size="md">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    pr="4.5rem"
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={isRegisterView ? passwordMinLength : undefined}
                  />
                  <InputRightElement width="4.5rem">
                    <IconButton
                      h="1.75rem"
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      icon={showPassword ? <ViewOffIcon /> : <ViewIcon />}
                    />
                  </InputRightElement>
                </InputGroup>
                {showPasswordError && <FormErrorMessage>{passwordError}</FormErrorMessage>}
              </FormControl>

              {error && (
                <Alert status="error" borderRadius="md">
                  <AlertIcon />
                  {error}
                </Alert>
              )}

              <Button
                colorScheme={theme}
                width="full"
                mt={4}
                type="submit"
                isLoading={isLoading}
                loadingText={isRegisterView ? 'Registering...' : 'Logging in...'}
                isDisabled={isLoading || (isRegisterView && password.length > 0 && !isPasswordLengthValid)}
              >
                {isRegisterView ? 'Register' : 'Login'}
              </Button>

              <Button
                width="full"
                variant="outline"
                leftIcon={<FcGoogle />}
                onClick={() => handleOAuthLogin('google')}
                isLoading={isLoading}
              >
                Sign in with Google
              </Button>

              <Button
                width="full"
                variant="outline"
                leftIcon={<FaGithub />}
                onClick={() => handleOAuthLogin('github')}
                isLoading={isLoading}
              >
                Sign in with Github
              </Button>

              <Button
                width="full"
                variant="outline"
                leftIcon={<FaLinkedin />}
                onClick={() => handleOAuthLogin('linkedin')}
                isLoading={isLoading}
              >
                Sign in with LinkedIn
              </Button>

              <Text textAlign="center" mt={2}>
                {isRegisterView ? 'Already have an account?' : "Don't have an account?"}{' '}
                <Link color="blue.500" href="#" onClick={toggleView}>
                  {isRegisterView ? 'Login' : 'Register'}
                </Link>
              </Text>
            </VStack>
          </Box>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};
