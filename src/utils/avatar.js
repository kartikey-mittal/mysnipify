const AVATAR_PALETTE = [
  '#5813EA',
  '#0E7C86',
  '#C2410C',
  '#0F766E',
  '#9333EA',
  '#DB2777',
  '#2563EB',
  '#16A34A',
  '#D97706',
  '#DC2626',
];

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #667eea, #764ba2)',
  'linear-gradient(135deg, #f093fb, #f5576c)',
  'linear-gradient(135deg, #4facfe, #00f2fe)',
  'linear-gradient(135deg, #43e97b, #38f9d7)',
  'linear-gradient(135deg, #fa709a, #fee140)',
  'linear-gradient(135deg, #30cfd0, #330867)',
  'linear-gradient(135deg, #a8edea, #fed6e3)',
  'linear-gradient(135deg, #fccb90, #d57eeb)',
  'linear-gradient(135deg, #5ee7df, #b490ca)',
  'linear-gradient(135deg, #c471f5, #fa71cd)',
];

const hashName = (name = '') => {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) % 9973;
  }
  return hash;
};

export const getInitials = (name = '') => {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].charAt(0).toUpperCase();
  return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
};

export const getAvatarColor = (name = '') => {
  return AVATAR_PALETTE[hashName(name) % AVATAR_PALETTE.length];
};

export const getAvatarGradient = (name = '') => {
  return AVATAR_GRADIENTS[hashName(name) % AVATAR_GRADIENTS.length];
};
