export interface RelatedTool {
  title: string;
  href: string;
}

export const relatedTools: Record<string, RelatedTool[]> = {
  compress: [
    { title: 'Compress Image to 20KB', href: '/compress/to-20kb/' },
    { title: 'Compress Image to 50KB', href: '/compress/to-50kb/' },
    { title: 'Compress Image to 100KB', href: '/compress/to-100kb/' },
    { title: 'Compress Image to 200KB', href: '/compress/to-200kb/' },
    { title: 'Compress Image to 500KB', href: '/compress/to-500kb/' },
    { title: 'Compress Image to 1MB', href: '/compress/to-1mb/' },
    { title: 'Compress Image for Email', href: '/compress/for-email/' },
    { title: 'Compress Image for Website', href: '/compress/for-website/' },
    { title: 'Compress Photo for Government Form', href: '/compress/for-government/' },
  ],
  compressPdf: [
    { title: 'Compress PDF for Email', href: '/compress-pdf/for-email/' },
    { title: 'Compress PDF for Government Portal', href: '/compress-pdf/for-government/' },
  ],
  resize: [
    { title: 'Resize Image to 300×300', href: '/resize/to-300x300/' },
    { title: 'Resize Image to 600×600', href: '/resize/to-600x600/' },
    { title: 'Resize Image to 800×600', href: '/resize/to-800x600/' },
    { title: 'Resize Image to 1080×1080', href: '/resize/to-1080x1080/' },
    { title: 'Resize Image to 1920×1080', href: '/resize/to-1920x1080/' },
  ],
  examCompress: [
    { title: 'Compress Photo for SSC', href: '/compress/for-ssc/' },
    { title: 'Compress Photo for IBPS', href: '/compress/for-ibps/' },
    { title: 'Compress Photo for UPSC', href: '/compress/for-upsc/' },
    { title: 'Compress Photo for PAN Card', href: '/compress/for-pan-card/' },
    { title: 'Compress Photo for Aadhaar', href: '/compress/for-aadhaar/' },
    { title: 'Compress Signature', href: '/compress/signature/' },
    { title: 'Compress UPSC Signature', href: '/compress/signature-upsc/' },
    { title: 'Compress Signature for PAN Card', href: '/compress/signature-pan/' },
  ],
  examResize: [
    { title: 'Resize Image for SSC', href: '/resize/for-ssc/' },
    { title: 'Resize Image for IBPS', href: '/resize/for-ibps/' },
    { title: 'Resize Image for UPSC', href: '/resize/for-upsc/' },
    { title: 'Resize Photo for PAN Card', href: '/resize/for-pan-card/' },
    { title: 'Resize Image for Aadhaar', href: '/resize/for-aadhaar/' },
  ],
  convert: [
    { title: 'Convert HEIC to JPG', href: '/convert/heic-to-jpg/' },
    { title: 'Convert HEIC to PNG', href: '/convert/heic-to-png/' },
    { title: 'Convert JPG to PNG', href: '/convert/jpg-to-png/' },
    { title: 'Convert JPG to WebP', href: '/convert/jpg-to-webp/' },
    { title: 'Convert PNG to JPG', href: '/convert/png-to-jpg/' },
    { title: 'Convert PNG to WebP', href: '/convert/png-to-webp/' },
    { title: 'Convert WebP to JPG', href: '/convert/webp-to-jpg/' },
    { title: 'Convert WebP to PNG', href: '/convert/webp-to-png/' },
  ],
  passportPhoto: [
    { title: 'Indian Passport Photo', href: '/passport-photo/india/' },
    { title: 'US Passport Photo', href: '/passport-photo/usa/' },
    { title: 'UK Passport Photo', href: '/passport-photo/uk/' },
    { title: 'Canadian Passport Photo', href: '/passport-photo/canada/' },
    { title: 'Australian Passport Photo', href: '/passport-photo/australia/' },
    { title: 'Chinese Passport Photo', href: '/passport-photo/china/' },
    { title: 'Japan Passport Photo', href: '/passport-photo/japan/' },
    { title: 'Schengen Visa Photo', href: '/passport-photo/schengen/' },
  ],
  metadata: [
    { title: 'EXIF Metadata Viewer', href: '/metadata/viewer/' },
    { title: 'Remove Photo Metadata', href: '/metadata/remover/' },
  ],
};
