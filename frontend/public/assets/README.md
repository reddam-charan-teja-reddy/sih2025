# Samudra Sahayak - Assets Documentation

This document describes the asset organization and usage for the Samudra Sahayak emergency reporting system.

## Folder Structure

```
public/assets/
├── icons/          # UI and hazard type icons (24×24 SVG)
├── markers/        # Map markers (32×40 SVG)
└── thumbs/         # Thumbnail templates and placeholders
```

## Assets Inventory

### Hazard Type Icons (`/assets/icons/`)

All icons are 24×24 SVG format, optimized for web use:

| Icon | Filename        | Usage                  | Colors                      |
| ---- | --------------- | ---------------------- | --------------------------- |
| 🌊   | `flood.svg`     | Flood warnings         | Blue tones (#4A90E2)        |
| 🔥   | `fire.svg`      | Fire emergencies       | Red/orange (#FF6B35)        |
| 🏔️   | `landslide.svg` | Landslide warnings     | Brown tones (#8B4513)       |
| ⛈️   | `storm.svg`     | Storm/weather warnings | Gray/yellow (#666, #FFD700) |
| 🚧   | `roadblock.svg` | Road blockages         | Orange/yellow (#FF6B35)     |
| 🚗   | `accident.svg`  | Traffic accidents      | Blue/orange mix             |
| ⚕️   | `medical.svg`   | Medical emergencies    | Red cross (#FF4444)         |
| ⚠️   | `other.svg`     | General emergencies    | Yellow warning (#FFD700)    |

### UI Icons (`/assets/icons/`)

| Icon | Filename          | Usage                | Description               |
| ---- | ----------------- | -------------------- | ------------------------- |
| 📷   | `camera.svg`      | Camera capture       | Photo capture button      |
| 🎥   | `video.svg`       | Video recording      | Video capture button      |
| 📍   | `pin.svg`         | Location marker      | Geolocation indicator     |
| 🕒   | `clock.svg`       | Time/timing          | Timestamps, countdowns    |
| ✅   | `verified.svg`    | Verification badge   | Verified status indicator |
| 👤   | `guest-badge.svg` | Guest mode indicator | Guest session badge       |

### Map Markers (`/assets/markers/`)

All markers are 32×40 SVG format for optimal map display:

| Marker | Filename                | Usage                    | Colors                         |
| ------ | ----------------------- | ------------------------ | ------------------------------ |
| 🏛️     | `official-alert.svg`    | Official alerts          | Red (#FF4444) with badge       |
| ✅     | `verified-report.svg`   | Verified citizen reports | Green (#22C55E) with checkmark |
| ⏳     | `unverified-report.svg` | Pending reports          | Orange (#F59E0B) with clock    |
| 📊     | `cluster.svg`           | Clustered markers        | Blue (#3B82F6) with count      |

### Thumbnail Templates (`/assets/thumbs/`)

| File              | Dimensions | Usage                       |
| ----------------- | ---------- | --------------------------- |
| `placeholder.svg` | 400×300    | Fallback for missing images |

## Usage Guidelines

### In React Components

```jsx
// Hazard type icon
<img src='/assets/icons/flood.svg' alt='Flood warning' className='w-6 h-6' />;

// Map marker (with Leaflet)
const iconUrl = `/assets/markers/${markerType}.svg`;
const customIcon = L.icon({
  iconUrl,
  iconSize: [32, 40],
  iconAnchor: [16, 40],
  popupAnchor: [0, -40],
});

// Placeholder image
<img
  src={imageUrl || '/assets/thumbs/placeholder.svg'}
  alt='Report thumbnail'
  className='w-full h-48 object-cover'
/>;
```

### CSS Classes for Consistency

```css
/* Icon sizes */
.icon-sm {
  width: 16px;
  height: 16px;
} /* Small UI elements */
.icon-md {
  width: 24px;
  height: 24px;
} /* Standard icons */
.icon-lg {
  width: 32px;
  height: 32px;
} /* Large displays */

/* Map marker sizes */
.marker-standard {
  width: 32px;
  height: 40px;
}
.marker-small {
  width: 24px;
  height: 30px;
}
.marker-large {
  width: 48px;
  height: 60px;
}
```

## Icon Color Schemes

### Severity-based Colors

- **Critical**: #DC2626 (red-600)
- **High**: #EA580C (orange-600)
- **Medium**: #CA8A04 (yellow-600)
- **Low**: #16A34A (green-600)

### Status-based Colors

- **Official**: #DC2626 (red-600)
- **Verified**: #16A34A (green-600)
- **Pending**: #CA8A04 (yellow-600)
- **Rejected**: #6B7280 (gray-500)

### Role-based Colors

- **Official**: #DC2626 (red-600)
- **Citizen**: #2563EB (blue-600)
- **Guest**: #CA8A04 (yellow-600)

## Accessibility Considerations

1. **Alt Text**: All images include descriptive alt text
2. **Color Contrast**: Icons meet WCAG AA standards (4.5:1 ratio)
3. **Size Flexibility**: SVG format scales without quality loss
4. **Semantic Colors**: Consistent color meanings across the app
5. **Text Labels**: Icons paired with text labels where space permits

## Performance Optimization

1. **SVG Format**: Vector graphics for crisp display at any size
2. **Optimized Code**: Minimal SVG code for faster loading
3. **Consistent Sizing**: Standardized dimensions reduce layout shifts
4. **Lazy Loading**: Large assets loaded on demand
5. **Caching Strategy**: Assets versioned for browser caching

## Adding New Assets

When adding new icons or markers:

1. **Follow naming convention**: `kebab-case.svg`
2. **Maintain dimensions**: Icons 24×24, Markers 32×40
3. **Use semantic colors**: Follow established color scheme
4. **Optimize SVG**: Remove unnecessary elements and attributes
5. **Update documentation**: Add to this file with usage examples
6. **Test accessibility**: Verify color contrast and alt text

## Browser Support

All assets are optimized for:

- Modern browsers (Chrome 60+, Firefox 55+, Safari 12+)
- Mobile browsers (iOS Safari, Chrome Mobile)
- SVG support required (universal in target browsers)

## File Size Guidelines

- Icons: Target < 2KB each
- Markers: Target < 3KB each
- Thumbnails: Target < 5KB each
- Total assets folder: Target < 100KB

This ensures fast loading even on slower connections.
