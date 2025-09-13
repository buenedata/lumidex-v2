# Profile Avatar & Banner Upload Specification

## Simplified Upload System

### Design Philosophy
**Simple & Clean**: Users upload one avatar and one banner. New uploads replace the old files in Supabase storage - no galleries or multiple versions.

## Upload Implementation

### 1. Profile Header Layout
```
┌─ Profile Header ────────────────────────────────────────────────────────────┐
│ [Custom Banner - 1200x300px]                               [📸 Change Banner] │
│ ┌─ User's Collection Background ──────────────────────────┐                   │
│ │ [Single uploaded banner image]                          │                   │
│ │                                                         │                   │
│ │ [Avatar]      CardMaster92                             │                   │
│ │ [120x120]     Level 12 Collector • 1,240 XP           │                   │
│ │ [📸 Change]   Member since March 2023                  │                   │
│ └─────────────────────────────────────────────────────────┘                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2. Upload Interface
```
┌─ Change Avatar ─────────────────────┐ ┌─ Change Banner ─────────────────────┐
│                                     │ │                                     │
│ [Current Avatar Preview]            │ │ [Current Banner Preview]            │
│ 120x120px                          │ │ 1200x300px                          │
│                                     │ │                                     │
│ [📁 Choose File] [📷 Take Photo]    │ │ [📁 Choose File]                    │
│                                     │ │                                     │
│ 🔧 Edit Tools:                     │ │ 🔧 Edit Tools:                     │
│ [Crop] [Rotate] [Preview]          │ │ [Crop] [Position] [Preview]         │
│                                     │ │                                     │
│ [Cancel] [Upload & Replace]         │ │ [Cancel] [Upload & Replace]         │
│                                     │ │                                     │
└─────────────────────────────────────┘ └─────────────────────────────────────┘
```

## Technical Implementation

### Supabase Storage Structure
```
supabase-bucket/
├── avatars/
│   ├── user-{userId}.jpg         // Single avatar per user
│   └── user-{userId}.webp        // Optimized version
└── banners/
    ├── user-{userId}.jpg         // Single banner per user
    └── user-{userId}.webp        // Optimized version
```

### Upload Process
1. **File Selection**: User selects image file
2. **Client-Side Processing**: Crop, resize, compress
3. **Upload to Supabase**: Replace existing file with same filename
4. **Database Update**: Update user profile with new image URL
5. **Cache Invalidation**: Clear CDN cache for immediate update

### File Specifications
```typescript
interface UploadSpecs {
  avatar: {
    maxSize: 5MB;
    formats: ['jpg', 'png', 'webp'];
    dimensions: {
      min: 100x100px;
      recommended: 400x400px;
      output: 120x120px;
    };
    aspectRatio: 1:1; // Square only
  };
  banner: {
    maxSize: 10MB;
    formats: ['jpg', 'png', 'webp'];
    dimensions: {
      min: 600x150px;
      recommended: 1200x300px;
      output: 1200x300px;
    };
    aspectRatio: 4:1; // Fixed ratio
  };
}
```

### Upload Component Interface
```typescript
interface ProfileImageUpload {
  currentImage?: string;
  imageType: 'avatar' | 'banner';
  onUploadComplete: (newImageUrl: string) => void;
  onUploadError: (error: string) => void;
}

// Usage
<ProfileImageUpload 
  currentImage={user.avatar_url}
  imageType="avatar"
  onUploadComplete={(url) => updateUserProfile({ avatar_url: url })}
  onUploadError={(error) => showErrorToast(error)}
/>
```

## User Experience Flow

### First-Time Upload:
1. User clicks "Add Avatar" or "Add Banner"
2. File picker opens
3. User selects image
4. Crop/edit interface appears
5. User adjusts image and confirms
6. Image uploads and replaces placeholder
7. Profile updates immediately

### Replacing Existing Image:
1. User hovers over current avatar/banner
2. "Change" button appears
3. File picker opens
4. User selects new image
5. Edit interface shows current vs new
6. User confirms replacement
7. Old file deleted, new file uploaded
8. Profile updates with new image

## Error Handling
- **File too large**: Show size limit and compression options
- **Invalid format**: List supported formats
- **Upload failed**: Retry button with progress indicator
- **Network issues**: Offline queue for retry when reconnected

## Security & Moderation
- **File type validation**: Server-side MIME type checking
- **Content scanning**: Basic inappropriate content detection
- **Rate limiting**: Max 10 uploads per hour per user
- **Virus scanning**: Automated malware detection

## Performance Optimizations
- **Image compression**: Auto-compress for web optimization
- **CDN delivery**: Fast global image delivery
- **Lazy loading**: Load images only when needed
- **WebP conversion**: Modern format for smaller files
- **Caching**: Aggressive caching with cache-busting for updates

This simplified approach eliminates complexity while providing all essential customization features users need.