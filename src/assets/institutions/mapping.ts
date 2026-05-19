export type InstitutionRegion = 'brazil' | 'uae' | 'ecuador';

export interface InstitutionAsset {
  id: string;
  name: string;
  region: InstitutionRegion;
  logoPath: string;
  isFallback?: boolean;
  fallbackInitials?: string;
  brandColor: string;
}

export const INSTITUTION_ASSETS: InstitutionAsset[] = [
  // Brazil
  { id: 'nubank',    name: 'Nubank',    region: 'brazil', logoPath: './logos/nubank.svg',    brandColor: '#820AD1' },
  { id: 'itau',      name: 'Itaú',      region: 'brazil', logoPath: './logos/itau.svg',      brandColor: '#F88300' },
  { id: 'inter',     name: 'Inter',     region: 'brazil', logoPath: './logos/inter.svg',     brandColor: '#FF7A00' },
  { id: 'xp',        name: 'XP Inc.',   region: 'brazil', logoPath: './logos/xp.svg',        brandColor: '#111111' },
  { id: 'santander', name: 'Santander', region: 'brazil', logoPath: './logos/santander.svg', brandColor: '#EA0029' },

  // UAE
  { id: 'emirates-nbd', name: 'Emirates NBD', region: 'uae', logoPath: './logos/emirates-nbd.svg', brandColor: '#003366' },
  { id: 'adcb',         name: 'ADCB',         region: 'uae', logoPath: './logos/adcb.svg',         brandColor: '#E41E26' },
  { id: 'fab',          name: 'FAB',           region: 'uae', logoPath: './logos/fab.svg',          brandColor: '#1B3A2D' },
  { id: 'mashreq',      name: 'Mashreq',       region: 'uae', logoPath: './logos/mashreq.svg',      brandColor: '#00A651' },
  { id: 'hsbc',         name: 'HSBC UAE',      region: 'uae', logoPath: './logos/hsbc.svg',         brandColor: '#DB0011' },
  { id: 'sarwa',        name: 'SARWA',         region: 'uae', logoPath: './fallbacks/sarwa.svg',    brandColor: '#00C27C', isFallback: true, fallbackInitials: 'SA' },
  { id: 'dib',          name: 'DIB',           region: 'uae', logoPath: './logos/dib.svg',          brandColor: '#007B5E' },

  // Ecuador
  { id: 'banco-pichincha', name: 'Banco Pichincha', region: 'ecuador', logoPath: './logos/banco-pichincha.svg', brandColor: '#CC0000' },
  { id: 'banco-guayaquil', name: 'Banco Guayaquil', region: 'ecuador', logoPath: './logos/banco-guayaquil.svg', brandColor: '#E05A00' },
  { id: 'produbanco',      name: 'Produbanco',      region: 'ecuador', logoPath: './logos/produbanco.svg',      brandColor: '#003087' },
];

export const getInstitutionById = (id: string): InstitutionAsset | undefined =>
  INSTITUTION_ASSETS.find(i => i.id === id);

export const getInstitutionsByRegion = (region: InstitutionRegion): InstitutionAsset[] =>
  INSTITUTION_ASSETS.filter(i => i.region === region);
