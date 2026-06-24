export const CLOUDINARY_GUIDE = {
  title: 'Cloudinary Setup Guide',
  description: 'Get your free 25 GB media storage with full API access',
  signupUrl: 'https://cloudinary.com/users/register_free',
  signupLabel: 'Sign up free at cloudinary.com',
  steps: [
    {
      step: 1,
      title: 'Create a free Cloudinary account',
      description:
        'Go to cloudinary.com and sign up with your email. No credit card needed. You get 25 GB storage and 25 GB bandwidth per month free.',
    },
    {
      step: 2,
      title: 'Go to your Dashboard',
      description:
        'After login, you land on the Dashboard. At the top you will see your Account Details card.',
    },
    {
      step: 3,
      title: 'Find your Cloud Name',
      description:
        'In the Dashboard → Account Details section, copy the "Cloud name" value. It looks like a word or short phrase (e.g. "my-cloud-abc123").',
      code: 'Example: my-cloud-abc123',
    },
    {
      step: 4,
      title: 'Get API Key and API Secret',
      description:
        'On the same Dashboard page, click the eye icon next to "API Secret" to reveal it. Copy both "API Key" (a 15-digit number) and "API Secret" (a long string).',
      code: 'API Key: 123456789012345\nAPI Secret: abc123def456...',
    },
    {
      step: 5,
      title: 'Paste into PixelVault',
      description:
        'Fill in Cloud Name, API Key, and API Secret in the form. Your credentials are encrypted with AES-256 and never shared.',
    },
  ],
  freeNote:
    'Free tier includes 25 GB storage, 25 GB bandwidth/month, image transformations (resize, crop, filters), and CDN delivery. Sufficient for thousands of photos.',
};

export const IMAGEKIT_GUIDE = {
  title: 'ImageKit Setup Guide',
  description: 'Get your free 20 GB media storage with transformation API',
  signupUrl: 'https://imagekit.io/registration/',
  signupLabel: 'Sign up free at imagekit.io',
  steps: [
    {
      step: 1,
      title: 'Create a free ImageKit account',
      description:
        'Go to imagekit.io and sign up. Free tier gives you 20 GB storage and 20 GB bandwidth per month.',
    },
    {
      step: 2,
      title: 'Open Developer Options',
      description:
        'After login, click your profile icon (top right) → Settings → Developer Options. Or go to: imagekit.io/dashboard#/developer/api-keys',
    },
    {
      step: 3,
      title: 'Copy your Public Key',
      description:
        'Under "API Keys" you will see "Public Key" — a string starting with "public_". Copy it.',
      code: 'Example: public_abc123DEF456xyz...',
    },
    {
      step: 4,
      title: 'Copy your Private Key',
      description:
        'Click "Copy" next to "Private Key" — a string starting with "private_". Keep this secret, never share it.',
      code: 'Example: private_xyz789ABC...',
    },
    {
      step: 5,
      title: 'Copy your URL Endpoint',
      description:
        'In the same section, find "URL-endpoint". It looks like a full URL with your ImageKit ID in it.',
      code: 'Example: https://ik.imagekit.io/your_id',
    },
    {
      step: 6,
      title: 'Paste into PixelVault',
      description:
        'Fill in Public Key, Private Key, and URL Endpoint in the form. Done — you can now manage all your ImageKit media from PixelVault.',
    },
  ],
  freeNote:
    'Free tier: 20 GB storage, 20 GB bandwidth/month. API is nearly identical to Cloudinary — both accounts together give you 45 GB of managed cloud storage for free.',
};

export const GOOGLE_PHOTOS_GUIDE = {
  title: 'Google Photos / Drive Setup',
  description: 'Add your Google account to track its 15 GB free storage',
  signupUrl: 'https://photos.google.com',
  signupLabel: 'Open Google Photos',
  steps: [
    {
      step: 1,
      title: 'Each Google account has 15 GB free',
      description:
        'Gmail, Google Drive, and Google Photos all share 15 GB per account. You can create multiple Google accounts to multiply your free storage.',
    },
    {
      step: 2,
      title: 'Get the link to this account\'s photos',
      description:
        'Log in to photos.google.com with the account you want to track. Copy the URL from the browser address bar.',
      code: 'https://photos.google.com/',
    },
    {
      step: 3,
      title: 'Add to PixelVault',
      description:
        'Paste the link in the "Link / URL" field. Add the account email and any notes (e.g. "Work photos", "Backup account 2"). PixelVault stores this as a quick-access card — clicking "Open" takes you straight to that account\'s photos.',
    },
    {
      step: 4,
      title: 'Optional: Add the password hint',
      description:
        'Use the Notes field to store a password hint or reminder (not the actual password) so you remember which password belongs to which account.',
    },
  ],
  freeNote:
    'PixelVault does not connect to Google Photos API (Google charges for it). This card is a quick-access vault so you can jump to any account without remembering which email has what photos.',
};

export const SHARED_ALBUM_GUIDE = {
  title: 'Shared Album Setup',
  description: 'Track an album someone shared with you from any platform',
  steps: [
    {
      step: 1,
      title: 'Get the share link',
      description:
        'Ask the person who shared the album with you to send the link. This works for Google Photos shared albums, iCloud shared albums, Dropbox shared folders, or any other shared link.',
      code: 'Example: https://photos.app.goo.gl/abc123...',
    },
    {
      step: 2,
      title: 'Find "Shared to" email',
      description:
        'This is the email address the album was shared to (usually your email). Helps you know which of your accounts to use when opening the link.',
    },
    {
      step: 3,
      title: 'Find "Shared from" email',
      description:
        'This is the email of the person who shared the album with you. Useful if you receive shares from multiple people.',
    },
    {
      step: 4,
      title: 'Add name and notes',
      description:
        'Give the album a memorable name (e.g. "Mom - Family Trip 2024") and add any notes. The card will show on your dashboard for one-click access.',
    },
  ],
  freeNote:
    'PixelVault stores shared album links as quick-access cards. Clicking "Open" takes you directly to the album. Works with Google Photos, iCloud, Dropbox, OneDrive, and any shareable link.',
};

export const BACKBLAZE_GUIDE = {
  title: 'Backblaze B2 Setup',
  description: 'Get 10 GB free cloud storage with S3-compatible API',
  signupUrl: 'https://www.backblaze.com/sign-up/cloud-storage',
  signupLabel: 'Sign up free at backblaze.com',
  steps: [
    {
      step: 1,
      title: 'Create a Backblaze account',
      description:
        'Go to backblaze.com/b2 and sign up. Free tier gives you 10 GB storage with no egress fees (unlike AWS S3).',
    },
    {
      step: 2,
      title: 'Create a Bucket',
      description:
        'In the B2 dashboard, click "Create a Bucket". Give it a unique name. Choose Public or Private based on your needs.',
    },
    {
      step: 3,
      title: 'Get Application Key',
      description:
        'Go to Account → App Keys → Add a New Application Key. Set permissions and copy the "keyID" and "applicationKey". The applicationKey is only shown once.',
    },
    {
      step: 4,
      title: 'Add to PixelVault',
      description:
        'Paste your bucket URL or the B2 console URL in the Link field. Use the Notes field to store key IDs and hints. Full API file manager coming in a future update.',
    },
  ],
  freeNote:
    'Free tier: 10 GB storage, 1 GB/day download. No egress fees to Cloudflare CDN. After free tier: $6/TB/month — much cheaper than AWS S3.',
};
