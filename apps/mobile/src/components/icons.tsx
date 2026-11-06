import Svg, { Circle, Path, Rect } from 'react-native-svg';

type P = { size?: number; color?: string; fill?: string; strokeWidth?: number };

export const Crown = ({ size = 16, color = '#3E1C2F' }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z" fill={color} /></Svg>
);

export const Star = ({ size = 14, color = '#5B2A45', fill }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M12 3l2.5 5 5.5.8-4 3.9.9 5.5L12 15.6 7.1 18.2 8 12.7 4 8.8 9.5 8z" fill={fill ?? color} stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
  </Svg>
);

export const Check = ({ size = 12, color = '#2F5D50', strokeWidth = 2.4 }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M6 12l4 4 8-8" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" fill="none" /></Svg>
);

export const Heart = ({ size = 22, color = '#5B2A45', fill = 'none' }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" fill={fill} />
  </Svg>
);

export const Search = ({ size = 22, color = '#5B2A45' }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24"><Circle cx={11} cy={11} r={7} stroke={color} strokeWidth={1.8} fill="none" /><Path d="M20 20l-3.5-3.5" stroke={color} strokeWidth={1.8} strokeLinecap="round" /></Svg>
);

export const Chat = ({ size = 22, color = '#5B2A45' }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M4 5h16v11H9l-5 4z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" fill="none" /></Svg>
);

export const User = ({ size = 22, color = '#5B2A45' }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24"><Circle cx={12} cy={8} r={4} stroke={color} strokeWidth={1.8} fill="none" /><Path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" stroke={color} strokeWidth={1.8} strokeLinecap="round" fill="none" /></Svg>
);

export const Calendar = ({ size = 22, color = '#5B2A45' }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24"><Rect x={4} y={5} width={16} height={15} rx={2} stroke={color} strokeWidth={1.8} fill="none" /><Path d="M4 10h16M9 3v4M15 3v4" stroke={color} strokeWidth={1.8} strokeLinecap="round" /></Svg>
);

export const Mail = ({ size = 22, color = '#5B2A45' }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M4 6h16v12H4z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" fill="none" /><Path d="M4 7l8 6 8-6" stroke={color} strokeWidth={1.8} fill="none" /></Svg>
);

export const Shield = ({ size = 16, color = '#2F5D50' }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z" stroke={color} strokeWidth={2} strokeLinejoin="round" fill="none" /><Path d="M8.5 12l2.5 2.5 4.5-5" stroke={color} strokeWidth={2} strokeLinecap="round" fill="none" /></Svg>
);

export const Lock = ({ size = 18, color = '#5B2A45' }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24"><Rect x={5} y={11} width={14} height={9} rx={2} stroke={color} strokeWidth={1.8} fill="none" /><Path d="M8 11V8a4 4 0 0 1 8 0v3" stroke={color} strokeWidth={1.8} fill="none" /></Svg>
);

export const Back = ({ size = 20, color = '#2B1F24' }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M15 5l-7 7 7 7" stroke={color} strokeWidth={2} strokeLinecap="round" fill="none" /></Svg>
);

export const Send = ({ size = 20, color = '#FFFFFF' }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M4 12l16-8-6 16-2.5-6.5z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" fill="none" /></Svg>
);

export const Chevron = ({ size = 18, color = '#5B2A45' }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M9 5l7 7-7 7" stroke={color} strokeWidth={2} strokeLinecap="round" fill="none" /></Svg>
);
