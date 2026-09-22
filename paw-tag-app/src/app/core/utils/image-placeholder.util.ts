// Inline SVG shown in place of a photo that fails to load (e.g. a broken/expired S3 URL)
export const IMAGE_PLACEHOLDER =
  'data:image/svg+xml,' +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">
      <rect width="96" height="96" fill="#e2e5e9"/>
      <path d="M28 66l14-16 10 11 8-9 16 14H28z" fill="#b7bcc4"/>
      <circle cx="36" cy="34" r="7" fill="#b7bcc4"/>
    </svg>
  `);

export function onImageError(event: Event): void {
  (event.target as HTMLImageElement).src = IMAGE_PLACEHOLDER;
}
