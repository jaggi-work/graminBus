import React from 'react';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

function createIcon(name) {
  const IconComponent = ({
    size = 24,
    color = '#000',
    strokeWidth,
    width,
    height,
    ...rest
  }) => {
    const inferredSize = Number(size) || Number(width) || Number(height) || 24;
    return (
      <MaterialCommunityIcons
        name={name}
        size={inferredSize}
        color={color}
        {...rest}
      />
    );
  };

  IconComponent.displayName = `AppIcon(${name})`;
  return IconComponent;
}

export const Menu = createIcon('menu');
export const Sun = createIcon('weather-sunny');
export const X = createIcon('close');
export const ArrowUpDown = createIcon('swap-vertical');
export const Bus = createIcon('bus');
export const ChevronRight = createIcon('chevron-right');
export const IdCard = createIcon('card-account-details-outline');
export const ChevronLeft = createIcon('chevron-left');
export const Clock = createIcon('clock-outline');
export const Star = createIcon('star-outline');
export const ShieldCheck = createIcon('shield-check-outline');
export const Search = createIcon('magnify');
export const CheckCircle = createIcon('check-circle-outline');
export const Smartphone = createIcon('cellphone');
export const Home = createIcon('home');
export const Map = createIcon('map');
export const MapPin = createIcon('map-marker');
export const LogOut = createIcon('logout');
export const StopCircle = createIcon('stop-circle-outline');
export const PlayCircle = createIcon('play-circle-outline');
export const XCircle = createIcon('close-circle-outline');
