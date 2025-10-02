import Image from 'next/image';
import { useState } from 'react';

const OptimizedImage = ({
  src,
  alt,
  width,
  height,
  className,
  sizes,
  priority = false,
  fallbackSrc = '/placeholder.jpg',
  fill = false,
  style = {},
  ...props
}) => {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentSrc, setCurrentSrc] = useState(src);

  // Handle image errors by falling back to unoptimized img tag
  const handleError = () => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔄 Image fallback triggered for:', currentSrc);
    }

    // Try fallback src first if not already using it
    if (currentSrc !== fallbackSrc && fallbackSrc) {
      setCurrentSrc(fallbackSrc);
      setIsLoading(true);
      return;
    }

    // If fallback also fails, use unoptimized approach
    setImageError(true);
    setIsLoading(false);
  };

  const handleLoad = () => {
    setIsLoading(false);
  };

  // If image optimization failed completely, use regular img tag
  if (imageError) {
    return (
      <img
        src={currentSrc}
        alt={alt}
        width={!fill ? width : undefined}
        height={!fill ? height : undefined}
        className={className}
        onLoad={handleLoad}
        onError={() => {
          console.error('Failed to load image:', currentSrc);
          // Set a basic placeholder if even the fallback fails
          if (currentSrc !== fallbackSrc) {
            setCurrentSrc(fallbackSrc);
          }
        }}
        style={{
          objectFit: 'cover',
          ...(fill ? { width: '100%', height: '100%' } : {}),
          ...style,
        }}
        {...props}
      />
    );
  }

  // If using fill prop, use absolute positioning
  if (fill) {
    return (
      <>
        {isLoading && (
          <div className='absolute inset-0 bg-gray-200 animate-pulse' />
        )}
        <Image
          src={currentSrc}
          alt={alt}
          fill
          className={`${
            isLoading ? 'opacity-0' : 'opacity-100'
          } transition-opacity duration-300 ${className || ''}`}
          sizes={sizes}
          priority={priority}
          onError={handleError}
          onLoad={handleLoad}
          unoptimized={true}
          style={{ objectFit: 'cover', ...style }}
          {...props}
        />
      </>
    );
  }

  return (
    <div className={`relative ${className || ''}`} style={{ width, height }}>
      {isLoading && (
        <div
          className='absolute inset-0 bg-gray-200 animate-pulse rounded'
          style={{ width, height }}
        />
      )}
      <Image
        src={currentSrc}
        alt={alt}
        width={width}
        height={height}
        className={`${
          isLoading ? 'opacity-0' : 'opacity-100'
        } transition-opacity duration-300`}
        sizes={sizes}
        priority={priority}
        onError={handleError}
        onLoad={handleLoad}
        unoptimized={true}
        style={{ objectFit: 'cover', ...style }}
        {...props}
      />
    </div>
  );
};

export default OptimizedImage;
