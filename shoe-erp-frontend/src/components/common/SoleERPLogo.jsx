import React from 'react'

export default function SoleERPLogo({ size = 'md', showText = true, alignLeft = false }) {
  const sizes = {
    sm: { box: 32, font: 22, tagSize: 8 },
    md: { box: 48, font: 32, tagSize: 10 },
    lg: { box: 72, font: 48, tagSize: 13 },
  }
  const s = sizes[size] || sizes.md

  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: 12, 
      justifyContent: alignLeft ? 'flex-start' : 'center',
      width: alignLeft ? '100%' : 'auto'
    }}>
      {/* Icon */}
      <svg
        width={s.box} height={s.box}
        viewBox="0 0 80 80"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0 }}
      >
        <rect x="0" y="0" width="80" height="80" rx="18" fill="#2563eb"/>
        <ellipse cx="40" cy="50" rx="28" ry="11" fill="#fff" opacity="0.15"/>
        <rect x="14" y="30" width="52" height="22" rx="10" fill="#fff" opacity="0.9"/>
        <ellipse cx="40" cy="30" rx="22" ry="10" fill="#fff" opacity="0.9"/>
        <rect x="14" y="46" width="14" height="8" rx="4" fill="#fff" opacity="0.5"/>
        <ellipse cx="54" cy="36" rx="12" ry="7" fill="#fff" opacity="0.6"/>
        <rect x="12" y="54" width="56" height="5" rx="2.5" fill="#2563eb" opacity="0.7"/>
        <rect x="12" y="54" width="56" height="5" rx="2.5" fill="#fff" opacity="0.25"/>
      </svg>

      {/* Wordmark */}
      {showText && (
        <div style={{ flexShrink: 0 }}>
          <div style={{ 
            fontSize: s.font, 
            fontWeight: 900, 
            lineHeight: 1,
            letterSpacing: '-0.5px'
          }}>
            <span style={{ color: 'var(--color-text-primary, #111)' }}>Sole</span>
            <span style={{ color: '#2563eb' }}>ERP</span>
          </div>
          {size !== 'sm' && (
            <div style={{ 
              fontSize: s.tagSize, 
              color: '#6b7280',
              letterSpacing: '2px',
              marginTop: 4,
              textTransform: 'uppercase',
              fontWeight: 700
            }}>
              Shoe Manufacturing
            </div>
          )}
        </div>
      )}
    </div>
  )
}
