import {
  Box,
  Heading,
  Text,
  VStack,
  UnorderedList,
  ListItem,
  Code,
  Link as ChakraLink,
  Divider,
} from '@chakra-ui/react';
import { FC } from 'react';
import { useConfig } from '../../hooks/useConfig';

const PrivacyPolicy: FC = () => {
  const { appName } = useConfig();
  const lastUpdated = 'April 22, 2025';

  const sectionIds = {
    infoCollect: 'info-collect',
    infoUse: 'info-use',
    infoDisclosure: 'info-disclosure',
    dataSecurity: 'data-security',
    dataDeletion: 'data-deletion',
    yourRights: 'your-rights',
    policyChanges: 'policy-changes',
    contactUs: 'contact-us',
  };

  return (
    <VStack spacing={6} align="stretch">
      <Text>Last Updated: {lastUpdated}</Text>

      <Box pt={4} pb={2}>
        <Heading as="h3" size="md" mb={3}>
          Contents
        </Heading>
        <UnorderedList spacing={1} styleType="none" ml={0}>
          <ListItem>
            <ChakraLink href={`#${sectionIds.infoCollect}`}>1. Information We Collect</ChakraLink>
          </ListItem>
          <ListItem>
            <ChakraLink href={`#${sectionIds.infoUse}`}>2. How We Use Your Information</ChakraLink>
          </ListItem>
          <ListItem>
            <ChakraLink href={`#${sectionIds.infoDisclosure}`}>3. Disclosure of Your Information</ChakraLink>
          </ListItem>
          <ListItem>
            <ChakraLink href={`#${sectionIds.dataSecurity}`}>4. Data Security</ChakraLink>
          </ListItem>
          <ListItem>
            <ChakraLink href={`#${sectionIds.dataDeletion}`}>5. Data Retention & Deletion</ChakraLink>
          </ListItem>
          <ListItem>
            <ChakraLink href={`#${sectionIds.yourRights}`}>6. Your Rights</ChakraLink>
          </ListItem>
          <ListItem>
            <ChakraLink href={`#${sectionIds.policyChanges}`}>7. Changes to This Privacy Policy</ChakraLink>
          </ListItem>
          <ListItem>
            <ChakraLink href={`#${sectionIds.contactUs}`}>8. Contact Us</ChakraLink>
          </ListItem>
        </UnorderedList>
        <Divider my={6} />
      </Box>

      <Text>
        Welcome to {appName}! This Privacy Policy explains how we collect, use, disclose, and safeguard your information
        when you use our application. Please read this privacy policy carefully. If you do not agree with the terms of
        this privacy policy, please do not access the application.
      </Text>

      <Heading id={sectionIds.infoCollect} as="h2" size="lg">
        1. Information We Collect
      </Heading>
      <Text>
        We may collect information about you in a variety of ways. The information we may collect via the Application
        includes:
      </Text>
      <UnorderedList spacing={2} pl={5}>
        <ListItem>
          <strong>Personal Data:</strong>
          Personally identifiable information, such as your name, email address, and profile picture, that you
          voluntarily give to us when you register with the Application or when you choose to participate in various
          activities related to the Application, such as chat.
        </ListItem>
        <ListItem>
          <strong>Usage Data:</strong>
          Information automatically collected when accessing the Application, such as your IP address, browser type,
          operating system, access times, and the pages you have viewed directly before and after accessing the
          Application.
        </ListItem>
        <ListItem>
          <strong>Chat Data:</strong>
          Content of the messages you send and receive through the chat interface.
        </ListItem>
      </UnorderedList>

      <Heading id={sectionIds.infoUse} as="h2" size="lg">
        2. How We Use Your Information
      </Heading>
      <Text>
        Having accurate information about you permits us to provide you with a smooth, efficient, and customized
        experience. Specifically, we may use information collected about you via the Application to:
      </Text>
      <UnorderedList spacing={2} pl={5}>
        <ListItem>Create and manage your account.</ListItem>
        <ListItem>Provide the chat functionality.</ListItem>
        <ListItem>Improve application performance and user experience.</ListItem>
        <ListItem>Monitor and analyze usage and trends.</ListItem>
      </UnorderedList>

      <Heading id={sectionIds.infoDisclosure} as="h2" size="lg">
        3. Disclosure of Your Information
      </Heading>
      <Text>
        We do not share your personal information with third parties except as described in this Privacy Policy or with
        your consent.
      </Text>

      <Heading id={sectionIds.dataSecurity} as="h2" size="lg">
        4. Data Security
      </Heading>
      <Text>
        We use administrative, technical, and physical security measures to help protect your personal information.
        While we have taken reasonable steps to secure the personal information you provide to us, please be aware that
        despite our efforts, no security measures are perfect or impenetrable, and no method of data transmission can be
        guaranteed against any interception or other type of misuse.
      </Text>

      <Heading id={sectionIds.dataDeletion} as="h2" size="lg">
        5. Data Retention & Deletion
      </Heading>
      <Text>
        We retain your personal information for as long as your account is active or as needed to provide you services.
        You may request the deletion of your account and associated personal data at any time.
      </Text>
      <Text>
        To delete your account, please click the "Delete Account" button found in your profile section within the
        application's navigation bar. Clicking this button will initiate a request to our server endpoint{' '}
        <Code>DELETE /api/users/me</Code> to permanently remove your account information, including email, display name,
        chat history from our active databases.
      </Text>

      <Heading id={sectionIds.yourRights} as="h2" size="lg">
        6. Your Rights
      </Heading>
      <Box>
        <Text display="inline">
          Depending on your location, you may have certain rights regarding your personal information, such as the right
          to access, correct, or delete your data. Please contact us to exercise these rights. Email us:{' '}
        </Text>
        <ChakraLink href={'mailto:derpai.app@gmail.com'} isExternal color="teal.500">
          derpai.app@gmail.com
        </ChakraLink>
      </Box>

      <Heading id={sectionIds.policyChanges} as="h2" size="lg">
        7. Changes to This Privacy Policy
      </Heading>
      <Text>
        We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new
        Privacy Policy on this page and updating the "Last Updated" date. You are advised to review this Privacy Policy
        periodically for any changes.
      </Text>

      <Heading id={sectionIds.contactUs} as="h2" size="lg">
        8. Contact Us
      </Heading>
      <Box>
        <Text display="inline">
          If you have questions or comments about this Privacy Policy, please contact us at:{' '}
        </Text>
        <ChakraLink href={'mailto:derpai.app@gmail.com'} isExternal color="teal.500">
          derpai.app@gmail.com
        </ChakraLink>
      </Box>
    </VStack>
  );
};

export default PrivacyPolicy;
