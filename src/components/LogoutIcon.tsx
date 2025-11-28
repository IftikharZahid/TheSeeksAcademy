import React from 'react';
import Svg, { Path, G } from 'react-native-svg';

interface LogoutIconProps {
  size?: number;
  color?: string;
}

export const LogoutIcon: React.FC<LogoutIconProps> = ({ size = 20, color = '#FF3B30' }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <G>
        {/* Door frame */}
        <Path
          d="M14 3H5C3.89543 3 3 3.89543 3 5V19C3 20.1046 3.89543 21 5 21H14"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Arrow */}
        <Path
          d="M16 12H9M16 12L13 9M16 12L13 15"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Arrow line extending to edge */}
        <Path
          d="M16 12H21"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </G>
    </Svg>
  );
};
