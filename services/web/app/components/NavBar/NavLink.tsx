import { FC } from 'react';
import { IconButton, Tooltip, useColorModeValue } from '@chakra-ui/react';
import { Link as RouterLink, useMatch, useResolvedPath } from 'react-router-dom';

export const NavLink: FC<{ children: React.ReactNode; icon: React.ReactElement; to?: string; label: string }> = ({
  label,
  icon,
  to = '/',
}) => {
  const resolved = useResolvedPath(to),
    match = useMatch({ path: resolved.pathname, end: true }),
    linkBgColor = useColorModeValue('primary.300', 'primary.500'),
    hoverBg = useColorModeValue('primary.500', 'primary.300');
  return (
    <Tooltip label={label} placement="right" hasArrow>
      <IconButton
        _hover={{
          textDecoration: 'none',
          bg: hoverBg,
        }}
        as={RouterLink}
        to={to}
        aria-label={to}
        icon={icon}
        variant="ghost"
        size="lg"
        background={match ? linkBgColor : undefined}
      />
    </Tooltip>
  );
};
