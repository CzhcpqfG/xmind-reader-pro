import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useMindMapStore } from './store';
import type { ImageData } from '@xmind-reader/core';

export const ImageLightbox: React.FC = () => {
  const lightboxImage = useMindMapStore((s) => s.lightboxImage);
  const closeLightbox = useMindMapStore((s) => s.closeLightbox);

  const imageUrl = useMemo(() => {
    if (!lightboxImage?.buffer) return '';
    const blob = new Blob([lightboxImage.buffer], { type: lightboxImage.mediaType || 'image/png' });
    return URL.createObjectURL(blob);
  }, [lightboxImage]);

  useEffect(() => {
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [imageUrl]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!lightboxImage) return;
      if (e.key === 'Escape') {
        e.stopPropagation();
        closeLightbox();
      }
    };
    window.addEventListener('keydown', handleKey, true);
    return () => window.removeEventListener('keydown', handleKey, true);
  }, [lightboxImage, closeLightbox]);

  const handleClose = useCallback(() => closeLightbox(), [closeLightbox]);

  if (!lightboxImage || !imageUrl) return null;

  return (
    <div
      onClick={handleClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 3000,
        background: 'rgba(0,0,0,0.88)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'fadeIn 0.2s ease',
        cursor: 'pointer',
      }}
    >
      {/* Close button */}
      <button
        onClick={handleClose}
        style={{
          position: 'absolute', top: 20, right: 20,
          width: 36, height: 36, borderRadius: 18,
          background: 'rgba(255,255,255,0.15)', border: 'none',
          color: '#fff', fontSize: 18, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background 0.15s ease',
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>

      {/* Image container */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          maxWidth: '90vw', maxHeight: '90vh',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
        }}
      >
        {/* Image */}
        <img
          src={imageUrl}
          alt="预览"
          style={{
            maxWidth: '90vw', maxHeight: '85vh',
            borderRadius: 12,
            boxShadow: '0 8px 48px rgba(0,0,0,0.4)',
            objectFit: 'contain',
          }}
        />
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
};
