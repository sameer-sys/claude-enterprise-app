'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Search,
  Check,
  Plus,
  Settings,
  RefreshCw,
  ExternalLink,
  Sparkles,
  Layers,
  Lock,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { Connector, ConnectorConfig } from '@/types/chat';

export type { Connector, ConnectorConfig };

// ============================================================================
// BRAND ICONS (Official Claude Connectors SVGs)
// ============================================================================

export function BrandIcon({ name }: { name: string }) {
  switch (name) {
    case 'gdrive':
    case 'conn-gdrive':
      return (
        <svg className="w-5 h-5" viewBox="0 0 87.3 78" fill="none">
          <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H0c0 1.55.4 3.1 1.2 4.5z" fill="#0066DA" />
          <path d="M43.65 25 29.9 1.2c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44C.4 49.9 0 51.45 0 53h27.5z" fill="#00AC47" />
          <path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5H59.8l5.85 10.5z" fill="#EA4335" />
          <path d="M43.65 25 57.4 1.2C56.05.4 54.5 0 52.95 0H34.35c-1.55 0-3.1.4-4.45 1.2z" fill="#00832D" />
          <path d="m59.8 53-13.75-23.8-13.75 23.8h54.95c0-1.55-.4-3.1-1.2-4.5z" fill="#2684FC" />
          <path d="M73.55 76.8H27.5L13.75 53h54.95c1.55 0 3.1.4 4.45 1.2 1.35.8 2.5 1.9 3.3 3.3 1.3 2.25 1.3 5.05 0 7.3l-2.9 5" fill="#FFBA00" />
        </svg>
      );
    case 'gmail':
    case 'conn-gmail':
      return (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
          <path d="M22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6z" fill="#26241f" />
          <path d="M20 6l-8 5-8-5" stroke="#EA4335" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4 6v12h16V6" stroke="#4285F4" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M2 7l10 6.5L22 7" stroke="#FBBC05" strokeWidth="1.5" />
          <path d="M12 13.5L2 7v11h20V7l-10 6.5z" fill="#EA4335" fillOpacity="0.85" />
        </svg>
      );
    case 'gcalendar':
    case 'conn-gcalendar':
      return (
        <svg className="w-5 h-5" viewBox="0 0 48 48" fill="none">
          <rect width="48" height="48" rx="8" fill="#1A73E8" />
          <rect x="8" y="14" width="32" height="26" rx="4" fill="#FFFFFF" />
          <text x="24" y="33" fill="#1A73E8" fontSize="16" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">31</text>
        </svg>
      );
    case 'canva':
    case 'conn-canva':
      return (
        <svg className="w-5 h-5" viewBox="0 0 48 48" fill="none">
          <circle cx="24" cy="24" r="24" fill="url(#canva-grad)" />
          <path d="M30 18c-3-3-8-3-11 0-4 4-4 10 0 14 3 3 8 3 11 0" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" />
          <defs>
            <linearGradient id="canva-grad" x1="0" y1="0" x2="48" y2="48">
              <stop stopColor="#00C4CC" />
              <stop offset="1" stopColor="#7D2AE8" />
            </linearGradient>
          </defs>
        </svg>
      );
    case 'm365':
    case 'conn-m365':
      return (
        <svg className="w-5 h-5" viewBox="0 0 48 48" fill="none">
          <rect x="4" y="4" width="18" height="18" rx="2" fill="#F25022" />
          <rect x="26" y="4" width="18" height="18" rx="2" fill="#7FBA00" />
          <rect x="4" y="26" width="18" height="18" rx="2" fill="#00A4EF" />
          <rect x="26" y="26" width="18" height="18" rx="2" fill="#FFB900" />
        </svg>
      );
    case 'notion':
    case 'conn-notion':
      return (
        <svg className="w-5 h-5" viewBox="0 0 100 100" fill="none">
          <rect width="100" height="100" rx="16" fill="#000000" />
          <path d="M22 25l45-7 11 4v50l-44 8-12-5V25z" fill="#FFFFFF" />
          <path d="M34 32v38l8 2V36l20 38 7-2V34l-8-2v36L41 30l-7 2z" fill="#000000" />
        </svg>
      );
    case 'figma':
    case 'conn-figma':
      return (
        <svg className="w-5 h-5" viewBox="0 0 38 57" fill="none">
          <path d="M19 28.5a9.5 9.5 0 1 1 19 0 9.5 9.5 0 0 1-19 0z" fill="#1ABCFE" />
          <path d="M0 47.5A9.5 9.5 0 0 1 9.5 38H19v9.5a9.5 9.5 0 1 1-19 0z" fill="#0ACF83" />
          <path d="M19 0v19h9.5a9.5 9.5 0 1 0 0-19H19z" fill="#FF7262" />
          <path d="M0 9.5A9.5 9.5 0 0 0 9.5 19H19V0H9.5A9.5 9.5 0 0 0 0 9.5z" fill="#F24E1E" />
          <path d="M0 28.5A9.5 9.5 0 0 0 9.5 38H19V19H9.5A9.5 9.5 0 0 0 0 28.5z" fill="#A259FF" />
        </svg>
      );
    case 'slack':
    case 'conn-slack':
      return (
        <svg className="w-5 h-5" viewBox="0 0 48 48" fill="none">
          <path d="M12 28a4 4 0 1 1-4-4h4v4zm2 0a4 4 0 1 1 8 0v10a4 4 0 1 1-8 0V28z" fill="#E01E5A" />
          <path d="M20 12a4 4 0 1 1 4-4v4h-4zm0 2a4 4 0 1 1 0 8H10a4 4 0 1 1 0-8h10z" fill="#36C5F0" />
          <path d="M36 20a4 4 0 1 1 4 4h-4v-4zm-2 0a4 4 0 1 1-8 0V10a4 4 0 1 1 8 0v10z" fill="#2EB67D" />
          <path d="M28 36a4 4 0 1 1-4 4v-4h4zm0-2a4 4 0 1 1 0-8h10a4 4 0 1 1 0 8H28z" fill="#ECB22E" />
        </svg>
      );
    case 'rovo':
    case 'conn-rovo':
      return (
        <svg className="w-5 h-5" viewBox="0 0 48 48" fill="none">
          <rect width="48" height="48" rx="10" fill="#0052CC" />
          <path d="M24 12L12 36h8l4-8 4 8h8L24 12z" fill="#FFFFFF" />
        </svg>
      );
    case 'hubspot':
    case 'conn-hubspot':
      return (
        <svg className="w-5 h-5" viewBox="0 0 48 48" fill="none">
          <rect width="48" height="48" rx="10" fill="#FF7A59" />
          <circle cx="24" cy="24" r="8" fill="#FFFFFF" />
          <circle cx="36" cy="16" r="4" fill="#FFFFFF" />
          <circle cx="24" cy="9" r="3" fill="#FFFFFF" />
        </svg>
      );
    case 'asana':
    case 'conn-asana':
      return (
        <svg className="w-5 h-5" viewBox="0 0 48 48" fill="none">
          <rect width="48" height="48" rx="10" fill="#221B28" />
          <circle cx="24" cy="18" r="6" fill="#F06A6A" />
          <circle cx="16" cy="30" r="6" fill="#F06A6A" />
          <circle cx="32" cy="30" r="6" fill="#F06A6A" />
        </svg>
      );
    case 'linear':
    case 'conn-linear':
      return (
        <svg className="w-5 h-5" viewBox="0 0 48 48" fill="none">
          <rect width="48" height="48" rx="10" fill="#1B1C22" />
          <circle cx="24" cy="24" r="12" stroke="#5E6AD2" strokeWidth="4" />
          <path d="M16 24h16" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    case 'composio':
    case 'conn-composio':
      return (
        <svg className="w-5 h-5" viewBox="0 0 48 48" fill="none">
          <rect width="48" height="48" rx="10" fill="#0E121B" />
          <path d="M14 18h10v6H14z" fill="#00D2FF" />
          <path d="M24 24h10v6H24z" fill="#0070F3" />
          <path d="M14 24h6v10h-6z" fill="#00D2FF" />
          <path d="M28 14h6v10h-6z" fill="#0070F3" />
        </svg>
      );
    case 'helena':
    case 'conn-helena':
      return (
        <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-amber-400 to-rose-500 flex items-center justify-center text-[10px] font-bold text-white shadow-inner">
          H
        </div>
      );
    case 'vanguard':
    case 'conn-vanguard':
      return (
        <svg className="w-5 h-5" viewBox="0 0 48 48" fill="none">
          <rect width="48" height="48" rx="10" fill="#A21A1E" />
          <path d="M16 16l8 18 8-18h-5l-3 8-3-8h-5z" fill="#FFFFFF" />
        </svg>
      );
    case 'blackrock':
    case 'conn-blackrock':
      return (
        <svg className="w-5 h-5" viewBox="0 0 48 48" fill="none">
          <rect width="48" height="48" rx="10" fill="#111111" />
          <path d="M14 18h20M14 24h20M14 30h14" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    case 'rome2rio':
    case 'conn-rome2rio':
      return (
        <svg className="w-5 h-5" viewBox="0 0 48 48" fill="none">
          <rect width="48" height="48" rx="10" fill="#C4185E" />
          <path d="M24 14c-4 0-7 3-7 7 0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7zm0 9a2 2 0 1 1 0-4 2 2 0 0 1 0 4z" fill="#FFFFFF" />
        </svg>
      );
    case 'links':
    case 'conn-links':
      return (
        <svg className="w-5 h-5" viewBox="0 0 48 48" fill="none">
          <rect width="48" height="48" rx="10" fill="#22201D" />
          <path d="M18 24a6 6 0 0 1 6-6h4a6 6 0 0 1 0 12h-4" stroke="#DCD8CE" strokeWidth="3" />
          <path d="M30 24a6 6 0 0 1-6 6h-4a6 6 0 0 1 0-12h4" stroke="#DCD8CE" strokeWidth="3" />
        </svg>
      );
    case 'maryland':
    case 'conn-maryland':
      return (
        <svg className="w-5 h-5" viewBox="0 0 48 48" fill="none">
          <rect width="48" height="48" rx="10" fill="#1B1917" />
          <path d="M14 16h20v4H14zm0 8h20v4H14zm0 8h12v4H14z" fill="#A8A29E" />
        </svg>
      );
    case 'gamma':
    case 'conn-gamma':
      return (
        <svg className="w-5 h-5" viewBox="0 0 48 48" fill="none">
          <rect width="48" height="48" rx="10" fill="#3B2667" />
          <path d="M28 16h-8a4 4 0 0 0-4 4v8a4 4 0 0 0 4 4h8a4 4 0 0 0 4-4v-4h-8" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    case 'shopify':
    case 'conn-shopify':
      return (
        <svg className="w-5 h-5" viewBox="0 0 48 48" fill="none">
          <rect width="48" height="48" rx="10" fill="#5E8E3E" />
          <path d="M28 14s-2-2-4-2c-2 0-3 1-3 3 0 3 8 4 8 10 0 4-4 7-8 7-5 0-7-3-7-3l1-3s2 2 5 2c2 0 4-1 4-3 0-4-8-4-8-10 0-4 3-7 8-7 4 0 6 2 6 2l-1 3z" fill="#FFFFFF" />
        </svg>
      );
    case 'salesforce':
    case 'conn-salesforce':
      return (
        <svg className="w-5 h-5" viewBox="0 0 48 48" fill="none">
          <rect width="48" height="48" rx="10" fill="#00A1E0" />
          <path d="M22 17a6 6 0 0 1 9 1 5 5 0 0 1 5 5 5 5 0 0 1-5 5H17a5 5 0 0 1-5-5 5 5 0 0 1 3-4 6 6 0 0 1 7-2z" fill="#FFFFFF" />
        </svg>
      );
    case 'windsor':
    case 'conn-windsor':
      return (
        <svg className="w-5 h-5" viewBox="0 0 48 48" fill="none">
          <rect width="48" height="48" rx="10" fill="#1C1B1F" />
          <text x="24" y="32" fill="#FFFFFF" fontSize="18" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">W.</text>
        </svg>
      );
    case 'apollo':
    case 'conn-apollo':
      return (
        <svg className="w-5 h-5" viewBox="0 0 48 48" fill="none">
          <rect width="48" height="48" rx="10" fill="#E5B500" />
          <path d="M24 12v24M12 24h24M16 16l16 16M32 16L16 32" stroke="#111111" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    case 'zoominfo':
    case 'conn-zoominfo':
      return (
        <svg className="w-5 h-5" viewBox="0 0 48 48" fill="none">
          <rect width="48" height="48" rx="10" fill="#D8232A" />
          <text x="24" y="33" fill="#FFFFFF" fontSize="22" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">Z</text>
        </svg>
      );
    case 'youtube':
    case 'conn-youtube':
      return (
        <svg className="w-5 h-5" viewBox="0 0 48 48" fill="none">
          <rect width="48" height="48" rx="10" fill="#FF0000" />
          <path d="M20 18l11 6-11 6V18z" fill="#FFFFFF" />
        </svg>
      );
    case 'instagram':
    case 'conn-instagram':
      return (
        <svg className="w-5 h-5" viewBox="0 0 48 48" fill="none">
          <rect width="48" height="48" rx="10" fill="url(#ig-grad)" />
          <rect x="13" y="13" width="22" height="22" rx="6" stroke="#FFFFFF" strokeWidth="2.5" />
          <circle cx="24" cy="24" r="5" stroke="#FFFFFF" strokeWidth="2.5" />
          <circle cx="30" cy="18" r="1.5" fill="#FFFFFF" />
          <defs>
            <linearGradient id="ig-grad" x1="0" y1="48" x2="48" y2="0" gradientUnits="userSpaceOnUse">
              <stop stopColor="#FA7E1E" />
              <stop offset="0.5" stopColor="#D62976" />
              <stop offset="1" stopColor="#962FBF" />
            </linearGradient>
          </defs>
        </svg>
      );
    case 'facebook':
    case 'conn-facebook':
      return (
        <svg className="w-5 h-5" viewBox="0 0 48 48" fill="none">
          <rect width="48" height="48" rx="10" fill="#1877F2" />
          <path d="M28 25h-3.5v13h-5V25h-3v-4.5h3V17c0-3.3 1.8-5 5-5h3.5v4.5h-2.2c-1.3 0-1.8.6-1.8 1.6V20.5h4L28 25z" fill="#FFFFFF" />
        </svg>
      );
    case 'twitter':
    case 'conn-twitter':
    case 'x':
      return (
        <svg className="w-5 h-5" viewBox="0 0 48 48" fill="none">
          <rect width="48" height="48" rx="10" fill="#000000" />
          <path d="M14 13l8.2 11.2L14.3 35h3.2l6.5-7.7 5.6 7.7H36l-8.6-11.8L34.7 13h-3.2l-6 7-5.5-7H14zm4.8 2.5h3.6l10.8 17h-3.6l-10.8-17z" fill="#FFFFFF" />
        </svg>
      );
    case 'linkedin':
    case 'conn-linkedin':
      return (
        <svg className="w-5 h-5" viewBox="0 0 48 48" fill="none">
          <rect width="48" height="48" rx="10" fill="#0A66C2" />
          <path d="M14 19h5v15h-5V19zm2.5-7a3 3 0 1 1 0 6 3 3 0 0 1 0-6zm7.5 7h4.8v2.2h.1c.7-1.3 2.3-2.6 4.7-2.6 5 0 5.9 3.3 5.9 7.6V34h-5v-7.2c0-1.7 0-3.9-2.4-3.9s-2.7 1.8-2.7 3.7V34h-5V19z" fill="#FFFFFF" />
        </svg>
      );
    case 'tiktok':
    case 'conn-tiktok':
      return (
        <svg className="w-5 h-5" viewBox="0 0 48 48" fill="none">
          <rect width="48" height="48" rx="10" fill="#010101" />
          <path d="M31.5 17c-2.2-.4-3.8-2-4.2-4.2h-3.8v16.2c0 2.2-1.8 4-4 4s-4-1.8-4-4 1.8-4 4-4c.4 0 .8.1 1.2.2V20.5c-.4 0-.8-.1-1.2-.1-4.4 0-8 3.6-8 8s3.6 8 8 8 8-3.6 8-8v-9.3c2.4 1.7 5.3 2.7 8.5 2.7v-4c-2.3 0-4.3-.8-4.5-.8z" fill="#FFFFFF" />
        </svg>
      );
    case 'whatsapp':
    case 'conn-whatsapp':
      return (
        <svg className="w-5 h-5" viewBox="0 0 48 48" fill="none">
          <rect width="48" height="48" rx="10" fill="#25D366" />
          <path d="M24 10C16.3 10 10 16.3 10 24c0 2.8.8 5.4 2.2 7.6L10 38l6.7-2.1c2.1 1.2 4.6 1.9 7.3 1.9 7.7 0 14-6.3 14-14S31.7 10 24 10zm7.1 19.8c-.3.8-1.7 1.6-2.4 1.7-.7.1-1.6.2-5-1.2-4.2-1.7-6.9-6-7.1-6.3-.2-.3-1.6-2.1-1.6-4.1 0-1.9 1-2.9 1.4-3.3.4-.4.8-.5 1.1-.5.3 0 .5 0 .7.1.3.1.6.8.8 1.3.3.6.8 2 .9 2.2.1.2.1.4 0 .6-.1.2-.2.4-.4.6l-.6.7c-.2.2-.4.4-.2.8.2.4 1 1.7 2.2 2.7 1.5 1.3 2.7 1.8 3.1 2 .4.2.6.2.8-.1.3-.3 1.1-1.3 1.4-1.7.3-.4.6-.3 1-.2.4.1 2.5 1.2 2.9 1.4.4.2.7.3.8.5.1.2.1 1.3-.2 2.1z" fill="#FFFFFF" />
        </svg>
      );
    case 'telegram':
    case 'conn-telegram':
      return (
        <svg className="w-5 h-5" viewBox="0 0 48 48" fill="none">
          <rect width="48" height="48" rx="10" fill="#229ED9" />
          <path d="M12 23.5l19-7.5c.9-.4 1.7.2 1.4 1.4l-3.2 15.3c-.2 1.1-.9 1.4-1.8.9l-5-3.7-2.4 2.3c-.3.3-.5.5-1 .5l.4-5.2 9.5-8.6c.4-.4-.1-.6-.6-.2l-11.8 7.4-5.1-1.6c-1.1-.3-1.1-1.1.2-1.6z" fill="#FFFFFF" />
        </svg>
      );
    case 'discord':
    case 'conn-discord':
      return (
        <svg className="w-5 h-5" viewBox="0 0 48 48" fill="none">
          <rect width="48" height="48" rx="10" fill="#5865F2" />
          <path d="M32.5 15.5c-2.3-1-4.8-1.7-7.4-1.8-.3.6-.7 1.4-.9 2-2.8-.4-5.6-.4-8.4 0-.3-.6-.6-1.4-.9-2-2.6.1-5.1.8-7.4 1.8-4.7 7-6 13.8-5.3 20.5 3.1 2.3 6.1 3.7 9 3.8.7-1 1.4-2.1 2-3.2-1.1-.4-2.1-1-3.1-1.6.3-.2.5-.4.8-.6 6 2.8 12.5 2.8 18.4 0 .3.2.5.4.8.6-1 .7-2 1.2-3.1 1.6.6 1.1 1.3 2.2 2 3.2 2.9-.1 5.9-1.5 9-3.8.8-7.7-.6-14.4-5.4-20.5zM19 28.5c-1.7 0-3-1.6-3-3.5s1.3-3.5 3-3.5 3.1 1.6 3 3.5c0 2-1.3 3.5-3 3.5zm10 0c-1.7 0-3-1.6-3-3.5s1.3-3.5 3-3.5 3.1 1.6 3 3.5c0 2-1.3 3.5-3 3.5z" fill="#FFFFFF" />
        </svg>
      );
    case 'reddit':
    case 'conn-reddit':
      return (
        <svg className="w-5 h-5" viewBox="0 0 48 48" fill="none">
          <rect width="48" height="48" rx="10" fill="#FF4500" />
          <path d="M37 23.5c0-1.7-1.3-3-3-3-.8 0-1.6.3-2.1.9-2.3-1.6-5.4-2.6-8.9-2.7l1.7-7.9 5.5 1.2c.1 1.4 1.3 2.5 2.8 2.5 1.7 0 3-1.3 3-3s-1.3-3-3-3c-1.1 0-2.1.6-2.6 1.6l-6.2-1.3c-.4-.1-.8.2-.9.6l-2 9.2c-3.6.1-6.8 1.1-9.1 2.7-.5-.6-1.3-.9-2.1-.9-1.7 0-3 1.3-3 3 0 1.2.7 2.2 1.7 2.7-.1.5-.1 1.1-.1 1.6 0 5 5.8 9 13 9s13-4 13-9c0-.6 0-1.1-.1-1.6 1-.5 1.7-1.5 1.7-2.7zM18 25c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm12.3 8.3c-1.6 1.6-4.7 1.7-6.3 1.7s-4.7-.1-6.3-1.7c-.3-.3-.3-.8 0-1.1.3-.3.8-.3 1.1 0 1.1 1.1 3.5 1.3 5.2 1.3 1.7 0 4.1-.2 5.2-1.3.3-.3.8-.3 1.1 0 .3.3.3.8 0 1.1zm-.3-4.3c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z" fill="#FFFFFF" />
        </svg>
      );
    case 'github':
    case 'conn-github':
    default:
      return (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
        </svg>
      );
  }
}

// ============================================================================
// DEFAULT CONNECTORS FACTORY (Matches Screenshots 1, 2, 3)
// ============================================================================

export function createDefaultConnectors(): Connector[] {
  return [
    // Your Custom Connectors (Image 1)
    {
      id: 'conn-composio',
      name: 'composio',
      description: 'connect.composio.dev',
      icon: 'composio',
      enabled: true,
      status: 'connected',
      category: 'Developer Tools',
      section: 'custom',
      isCustom: true,
      url: 'connect.composio.dev',
      capabilities: ['Unified Tool Execution', 'Auth Relays', 'Multi-app Actions'],
    },
    {
      id: 'conn-github',
      name: 'GitHub',
      description: 'Search repositories, inspect source code, issues, commits, and pull requests in real time.',
      icon: 'github',
      enabled: false,
      status: 'ready',
      category: 'Code',
      section: 'custom',
      isVerified: true,
      isCustom: false,
      capabilities: ['Code Search', 'Repo Inspection', 'Pull Requests', 'Issues'],
      config: {
        repo: 'sameer-sys/claude-enterprise-app',
      },
    },

    // Top Connectors (Image 1)
    {
      id: 'conn-gdrive',
      name: 'Google Drive',
      description: 'Search, read, and upload files instantly',
      icon: 'gdrive',
      enabled: false,
      status: 'ready',
      category: 'Productivity',
      section: 'top',
      isVerified: true,
      capabilities: ['File Search', 'Docs Reading', 'Sheet Analysis', 'Instant Upload'],
      config: { driveFolder: 'My Drive' },
    },
    {
      id: 'conn-gmail',
      name: 'Gmail',
      description: 'Draft replies, summarize threads, & search your inbox via Composio',
      icon: 'gmail',
      enabled: false,
      status: 'ready',
      category: 'Communication',
      section: 'top',
      isVerified: true,
      capabilities: ['Inbox Search', 'Thread Summaries', 'Draft Replies', 'Zero-Click Send'],
      config: {},
    },
    {
      id: 'conn-gcalendar',
      name: 'Google Calendar',
      description: 'Manage your schedule and coordinate meetings effortlessly',
      icon: 'gcalendar',
      enabled: false,
      status: 'ready',
      category: 'Productivity',
      section: 'top',
      isVerified: true,
      capabilities: ['Event Creation', 'Agenda Lookup', 'Conflict Detection'],
      config: {},
    },
    {
      id: 'conn-canva',
      name: 'Canva',
      description: 'Search, create, autofill, and export Canva designs',
      icon: 'canva',
      enabled: false,
      status: 'ready',
      category: 'Design',
      section: 'top',
      isVerified: true,
      capabilities: ['Template Generation', 'Design Autofill', 'Asset Export'],
    },
    {
      id: 'conn-m365',
      name: 'Microsoft 365',
      description: "Access your company's SharePoint, OneDrive, Outlook, and Teams directly in...",
      icon: 'm365',
      enabled: false,
      status: 'ready',
      category: 'Productivity',
      section: 'top',
      isVerified: true,
      capabilities: ['SharePoint Access', 'OneDrive Files', 'Teams Messages'],
    },
    {
      id: 'conn-notion',
      name: 'Notion',
      description: 'Connect your Notion workspace to search, update, and power workflows across tools',
      icon: 'notion',
      enabled: false,
      status: 'ready',
      category: 'Productivity',
      section: 'top',
      isVerified: true,
      capabilities: ['Database Query', 'PRD Search', 'Page Creation'],
    },
    {
      id: 'conn-figma',
      name: 'Figma',
      description: 'Generate diagrams and better code from Figma context',
      icon: 'figma',
      enabled: false,
      status: 'ready',
      category: 'Design',
      section: 'top',
      isVerified: true,
      capabilities: ['Design Tokens', 'Frame Inspection', 'Code Export'],
    },
    {
      id: 'conn-slack',
      name: 'Slack',
      description: 'Send messages, create canvases, and fetch Slack data',
      icon: 'slack',
      enabled: false,
      status: 'ready',
      category: 'Communication',
      section: 'top',
      isVerified: true,
      capabilities: ['Channel Messages', 'Thread Summaries', 'Canvas Generation'],
      config: { slackChannel: '#general' },
    },
    {
      id: 'conn-rovo',
      name: 'Atlassian Rovo',
      description: 'Access Jira & Confluence from Claude',
      icon: 'rovo',
      enabled: false,
      status: 'ready',
      category: 'Productivity',
      section: 'top',
      isVerified: true,
      capabilities: ['Jira Issues', 'Confluence Docs', 'Sprint Tracking'],
    },
    {
      id: 'conn-hubspot',
      name: 'HubSpot',
      description: 'CRM context for every answer, insight, and action',
      icon: 'hubspot',
      enabled: false,
      status: 'ready',
      category: 'Sales and marketing',
      section: 'top',
      isVerified: true,
      capabilities: ['Contact CRM', 'Deal Pipelines', 'Sales Activity'],
    },
    {
      id: 'conn-youtube',
      name: 'YouTube Studio',
      description: 'Upload videos, optimize viral SEO titles & tags, manage channel schedules, and track analytics',
      icon: 'youtube',
      enabled: false,
      status: 'ready',
      category: 'Media and entertainment',
      section: 'trending',
      isVerified: true,
      capabilities: ['Studio Uploads', 'Shorts Automation', 'SEO Tags & Metadata', '1-Click Studio'],
      config: { channelName: 'My Official Channel' },
    },
    {
      id: 'conn-instagram',
      name: 'Instagram Creator',
      description: 'Publish Reels, generate 30 high-reach hashtags, format carousel captions, and automate DMs',
      icon: 'instagram',
      enabled: false,
      status: 'ready',
      category: 'Social media',
      section: 'trending',
      isVerified: true,
      capabilities: ['Reels Publishing', 'Carousel Staging', 'Hashtag Generator', '1-Click Creator'],
      config: { handle: '@sameer.official' },
    },
    {
      id: 'conn-facebook',
      name: 'Facebook Meta Business',
      description: 'Cross-post to Pages & Groups, schedule community updates, track reach, and run Meta Ads',
      icon: 'facebook',
      enabled: false,
      status: 'ready',
      category: 'Social media',
      section: 'trending',
      isVerified: true,
      capabilities: ['Page Publishing', 'Group Sync', 'Meta Business Suite', 'Audience Reach'],
      config: { platform: 'Meta Business Suite' },
    },
    {
      id: 'conn-twitter',
      name: 'X (formerly Twitter)',
      description: 'Draft viral tweets, build multi-post threads, schedule releases, and track impressions',
      icon: 'twitter',
      enabled: false,
      status: 'ready',
      category: 'Social media',
      section: 'trending',
      isVerified: true,
      capabilities: ['Tweet Drafting', 'Thread Composer', '1-Click Tweet Intent', 'Viral Hooks'],
      config: { handle: '@sameer_ai' },
    },
    {
      id: 'conn-linkedin',
      name: 'LinkedIn',
      description: 'Draft professional thought-leadership posts, company updates, and Pulse articles',
      icon: 'linkedin',
      enabled: false,
      status: 'ready',
      category: 'Social media',
      section: 'trending',
      isVerified: true,
      capabilities: ['B2B Thought Leadership', 'Article Drafting', 'Network Announcements', '1-Click Share'],
      config: { handle: 'sameer-workspace' },
    },
    {
      id: 'conn-asana',
      name: 'Asana',
      description: 'Connect to Asana to coordinate tasks, projects, and goals',
      icon: 'asana',
      enabled: false,
      status: 'ready',
      category: 'Productivity',
      section: 'top',
      isVerified: true,
      capabilities: ['Task Boards', 'Project Milestones', 'Goal Tracking'],
    },
    {
      id: 'conn-linear',
      name: 'Linear',
      description: 'Manage issues, projects & team workflows in Linear',
      icon: 'linear',
      enabled: false,
      status: 'ready',
      category: 'Productivity',
      section: 'top',
      isVerified: true,
      capabilities: ['Issue Tracking', 'Bug Logging', 'Cycle Management'],
    },

    // Trending Connectors (Image 2 & 3)
    {
      id: 'conn-helena',
      name: 'Helena by Enrich Labs',
      description: 'Your AI marketer for paid ads, SEO, email, social, and analytics',
      icon: 'helena',
      enabled: false,
      status: 'ready',
      category: 'Sales and marketing',
      section: 'trending',
      isVerified: true,
      isTrending: true,
      capabilities: ['Paid Ads Audit', 'SEO Keywords', 'Social Analytics'],
    },
    {
      id: 'conn-vanguard',
      name: 'Vanguard Advisor Tools',
      description: 'Access Vanguard models data and content from Claude',
      icon: 'vanguard',
      enabled: false,
      status: 'ready',
      category: 'Financial services',
      section: 'trending',
      isVerified: true,
      isTrending: true,
      capabilities: ['Portfolio Models', 'Fund Benchmarks', 'Market Research'],
    },
    {
      id: 'conn-blackrock',
      name: 'BlackRock Advisor Center',
      description: 'Build, analyze, and compare portfolios for advisors',
      icon: 'blackrock',
      enabled: false,
      status: 'ready',
      category: 'Financial services',
      section: 'trending',
      isVerified: true,
      isTrending: true,
      capabilities: ['Portfolio Analysis', 'Risk Modeling', 'Asset Allocation'],
    },
    {
      id: 'conn-rome2rio',
      name: 'Rome2Rio',
      description: 'Discover how to get anywhere',
      icon: 'rome2rio',
      enabled: false,
      status: 'ready',
      category: 'Travel',
      section: 'trending',
      isVerified: true,
      isTrending: true,
      capabilities: ['Route Planning', 'Multi-modal Transit', 'Cost Estimates'],
    },
    {
      id: 'conn-links',
      name: 'Links Connect',
      description: 'Live financial data. Let Claude do the rest.',
      icon: 'links',
      enabled: false,
      status: 'ready',
      category: 'Financial services',
      section: 'trending',
      isVerified: true,
      isTrending: true,
      capabilities: ['Real-time Quotes', 'Balance Sheets', 'SEC Filings'],
    },
    {
      id: 'conn-maryland',
      name: 'Maryland Community Co...',
      description: "Maryland's neighborhood development data platform.",
      icon: 'maryland',
      enabled: false,
      status: 'ready',
      category: 'Data',
      section: 'trending',
      isVerified: true,
      isTrending: true,
      capabilities: ['Community Stats', 'Zoning Data', 'Housing Metrics'],
    },
    {
      id: 'conn-gamma',
      name: 'Gamma',
      description: 'Create presentations, docs, socials, and sites with AI',
      icon: 'gamma',
      enabled: false,
      status: 'ready',
      category: 'Productivity',
      section: 'trending',
      isVerified: true,
      capabilities: ['Deck Generation', 'Visual Summaries', 'Slide Outlines'],
    },
    {
      id: 'conn-shopify',
      name: 'Shopify',
      description: 'Build, manage, and analyze your Shopify store',
      icon: 'shopify',
      enabled: false,
      status: 'ready',
      category: 'Commerce and shopping',
      section: 'trending',
      isVerified: true,
      capabilities: ['Product Catalogs', 'Order Lookups', 'Sales Metrics'],
    },
    {
      id: 'conn-salesforce',
      name: 'Salesforce',
      description: 'Sell, serve, and operate at scale with Salesforce.',
      icon: 'salesforce',
      enabled: false,
      status: 'ready',
      category: 'Sales and marketing',
      section: 'trending',
      isVerified: true,
      isBeta: true,
      capabilities: ['Leads & Accounts', 'Opportunity Stages', 'Service Cloud'],
    },
    {
      id: 'conn-windsor',
      name: 'Windsor.ai',
      description: 'Connect Meta Ads, Google Ads, TikTok Ads, LinkedIn Ads + 320 more',
      icon: 'windsor',
      enabled: false,
      status: 'ready',
      category: 'Data',
      section: 'trending',
      isVerified: true,
      capabilities: ['Multi-channel Attribution', 'ROAS Analysis', 'Ad Spend'],
    },
    {
      id: 'conn-apollo',
      name: 'Apollo.io',
      description: 'Find, enrich, and reach ideal prospects, on Claude',
      icon: 'apollo',
      enabled: false,
      status: 'ready',
      category: 'Sales and marketing',
      section: 'trending',
      isVerified: true,
      capabilities: ['B2B Leads', 'Email Verification', 'Buyer Intent'],
    },
    {
      id: 'conn-zoominfo',
      name: 'ZoomInfo',
      description: 'Find prospects. Research accounts. Enrich buyers with verified B2B data. Act on inten...',
      icon: 'zoominfo',
      enabled: false,
      status: 'ready',
      category: 'Sales and marketing',
      section: 'trending',
      isVerified: true,
      capabilities: ['Org Charts', 'Verified Phone & Email', 'Technographics'],
    },
    {
      id: 'conn-tiktok',
      name: 'TikTok Studio',
      description: 'Draft viral TikTok scripts, hooks, trending audio suggestions, and stage uploads',
      icon: 'tiktok',
      enabled: false,
      status: 'ready',
      category: 'Media and entertainment',
      section: 'trending',
      isVerified: true,
      isTrending: true,
      capabilities: ['Viral Scripts', 'Hook Formulations', 'Trending Sounds', 'TikTok Studio Upload'],
      config: { handle: '@sameer_tok' },
    },
    {
      id: 'conn-whatsapp',
      name: 'WhatsApp Business',
      description: 'Draft customer alerts, broadcast updates, and launch 1-click WhatsApp web chats',
      icon: 'whatsapp',
      enabled: false,
      status: 'ready',
      category: 'Communication',
      section: 'trending',
      isVerified: true,
      isTrending: true,
      capabilities: ['1-Click Direct Send', 'Broadcast Templates', 'Instant Chat Links'],
    },
    {
      id: 'conn-telegram',
      name: 'Telegram Broadcast',
      description: 'Post markdown announcements, broadcast to channels, and trigger bot alerts',
      icon: 'telegram',
      enabled: false,
      status: 'ready',
      category: 'Communication',
      section: 'trending',
      isVerified: true,
      isTrending: true,
      capabilities: ['Channel Broadcast', 'Markdown Formatting', '1-Click Telegram Share'],
    },
    {
      id: 'conn-discord',
      name: 'Discord Webhooks',
      description: 'Compose rich embed messages, send server announcements, and format developer alerts',
      icon: 'discord',
      enabled: false,
      status: 'ready',
      category: 'Communication',
      section: 'trending',
      isVerified: true,
      capabilities: ['Rich Embeds', 'Webhook Dispatch', 'Developer Alerts'],
    },
    {
      id: 'conn-reddit',
      name: 'Reddit Community',
      description: 'Draft discussion posts, AMA questions, and stage subreddit submissions with markdown',
      icon: 'reddit',
      enabled: false,
      status: 'ready',
      category: 'Social media',
      section: 'trending',
      isVerified: true,
      capabilities: ['Subreddit Staging', 'Discussion Hooks', '1-Click Reddit Post'],
      config: { subreddit: 'r/artificial' },
    },
  ];
}

export const DEFAULT_CONNECTORS: Connector[] = createDefaultConnectors();

const CATEGORIES_WITH_COUNTS = [
  { name: 'Code', count: 486 },
  { name: 'Commerce and shopping', count: 239 },
  { name: 'Communication', count: 275 },
  { name: 'Data', count: 1057 },
  { name: 'Design', count: 181 },
  { name: 'Education', count: 97 },
  { name: 'Financial services', count: 325 },
  { name: 'Health', count: 30 },
  { name: 'Legal', count: 118 },
  { name: 'Life sciences', count: 48 },
  { name: 'Media and entertainment', count: 109 },
  { name: 'Nonprofit', count: 23 },
  { name: 'Other', count: 196 },
  { name: 'Productivity', count: 1449 },
  { name: 'Sales and marketing', count: 686 },
  { name: 'Social media', count: 342 },
  { name: 'Travel', count: 70 },
];

interface ConnectorsModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeConnectors: Connector[];
  onToggleConnector: (id: string) => void;
  onUpdateConnectorConfig?: (id: string, config: ConnectorConfig) => void;
  onAddCustomConnector?: (conn: Connector) => void;
  sessionTitle?: string;
  onResetConnectors?: () => void;
  sessionId?: string;
}

export default function ConnectorsModal({
  isOpen,
  onClose,
  activeConnectors,
  onToggleConnector,
  onUpdateConnectorConfig,
  onAddCustomConnector,
  sessionTitle,
  onResetConnectors,
  sessionId,
}: ConnectorsModalProps) {
  // Main Top-Level Tab: Skills | Connectors | Plugins
  const [mainTab, setMainTab] = useState<'skills' | 'connectors' | 'plugins'>('connectors');
  // Sub-View: Yours | Discover
  const [subView, setSubView] = useState<'yours' | 'discover'>('discover');

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);

  // Show all toggles for sections
  const [showAllTop, setShowAllTop] = useState(true);
  const [showAllTrending, setShowAllTrending] = useState(true);

  // Exact "Add Custom Connector" Modal (Screenshot 4)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addStep, setAddStep] = useState<'form' | 'login'>('form');
  const [newConnName, setNewConnName] = useState('');
  const [newConnUrl, setNewConnUrl] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authSuccess, setAuthSuccess] = useState(false);

  // Config editor for active connector
  const [editingConnector, setEditingConnector] = useState<Connector | null>(null);
  const [accountPickerConnector, setAccountPickerConnector] = useState<Connector | null>(null);
  const [accountPickerAccounts, setAccountPickerAccounts] = useState<any[]>([]);
  const [configEmail, setConfigEmail] = useState('');
  const [configRepo, setConfigRepo] = useState('');
  const [configChannel, setConfigChannel] = useState('');
  const [configHandle, setConfigHandle] = useState('');
  const [configSubreddit, setConfigSubreddit] = useState('');
  const [configAccountId, setConfigAccountId] = useState('');

  // Google OAuth Modal state (matches Screenshot 1: media_1789661196153.png)
  const [googleOAuthConnector, setGoogleOAuthConnector] = useState<Connector | null>(null);
  const [isGoogleSigningIn, setIsGoogleSigningIn] = useState(false);
  const [showCustomGoogleAccount, setShowCustomGoogleAccount] = useState(false);
  const [customGoogleEmail, setCustomGoogleEmail] = useState('');
  // Composio Master OAuth Hub State
  const ensureComposioUserId = () => {
    if (typeof window === 'undefined') return 'default';
    const key = 'sameer_composio_user_id';
    const existing = localStorage.getItem(key);
    if (existing && existing.trim()) return existing.trim();
    let generated = '';
    try {
      generated = typeof crypto?.randomUUID === 'function'
        ? 'sameer_' + crypto.randomUUID()
        : 'sameer_' + Date.now() + '_' + Math.random().toString(36).slice(2);
    } catch {
      generated = 'sameer_' + Date.now() + '_' + Math.random().toString(36).slice(2);
    }
    localStorage.setItem(key, generated);
    return generated;
  };

  const composioAccountsRef = React.useRef<any[]>([]);
  const [composioApiKey, setComposioApiKey] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('composio_api_key') || '';
    }
    return '';
  });
  const [composioSaved, setComposioSaved] = useState(false);
  const [composioAccounts, setComposioAccounts] = useState<any[]>([]);
  const [isConnectingComposio, setIsConnectingComposio] = useState<string | null>(null);
  const [isSyncingComposio, setIsSyncingComposio] = useState(false);
  const [composioSyncMessage, setComposioSyncMessage] = useState<string | null>(null);
  const [composioError, setComposioError] = useState<string | null>(null);

  const toolkitForConnector = (connectorId: string) => {
    const raw = String(connectorId || '').replace(/^conn-/i, '').toLowerCase();
    const aliases: Record<string, string> = {
      gdrive: 'google_drive',
      gcalendar: 'google_calendar',
      m365: 'microsoft365',
      google_drive: 'google_drive',
      google_calendar: 'google_calendar',
    };
    return aliases[raw] || raw;
  };
  // Synchronize authentic connected accounts from Composio
  const fetchComposioAccounts = async () => {
    if (!composioApiKey) return;
    setIsSyncingComposio(true);
    setComposioError(null);
    try {
      const userId = ensureComposioUserId();
      const res = await fetch(
        `/api/composio?apiKey=${encodeURIComponent(composioApiKey)}&entityId=${encodeURIComponent(userId)}`
      );
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.connectedAccounts) && onUpdateConnectorConfig) {
          setComposioAccounts(data.connectedAccounts);
          composioAccountsRef.current = data.connectedAccounts;
          let updatedCount = 0;

          // Preserve an explicitly selected account for each chat. Auto-select only
          // when exactly one active account exists for that platform.
          for (const conn of activeConnectors) {
            if (conn.isCustom) continue;
            const toolkit = toolkitForConnector(conn.id);
            const matching = data.connectedAccounts.filter((acc: any) =>
              String(acc?.appUniqueId || acc?.appName || '').toLowerCase() === toolkit &&
              acc?.status === 'ACTIVE'
            );
            const selectedId = String(conn.config?.connectedAccountId || '').trim();

            if (selectedId && matching.some((acc: any) => String(acc.id) === selectedId)) {
              const selected = matching.find((acc: any) => String(acc.id) === selectedId);
              const display = selected?.email || selected?.accountIdentifier || conn.config?.email;
              if (display && display !== conn.config?.email) {
                onUpdateConnectorConfig(conn.id, { ...conn.config, email: display, connectedAccountId: selectedId });
                updatedCount++;
              }
              continue;
            }

            if (!selectedId && matching.length === 1) {
              const only = matching[0];
              onUpdateConnectorConfig(conn.id, {
                ...conn.config,
                email: only.email || only.accountIdentifier || undefined,
                connectedAccountId: only.id,
              });
              if (!conn.enabled) onToggleConnector(conn.id);
              updatedCount++;
            }
          }
          setComposioSyncMessage(
            data.connectedAccounts.length > 0
              ? `Synced ${data.connectedAccounts.length} account${data.connectedAccounts.length > 1 ? 's' : ''} from Composio!`
              : 'No connected accounts found in Composio yet.'
          );
          setTimeout(() => setComposioSyncMessage(null), 4000);
        }
      }
    } catch (err: any) {
      setComposioError(err.message || 'Failed to sync with Composio');
    } finally {
      setIsSyncingComposio(false);
    }
  };

  useEffect(() => {
    if (!composioApiKey || !isOpen) return;
    fetchComposioAccounts();

    const handleFocus = () => {
      fetchComposioAccounts();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [composioApiKey, isOpen]);

  const handleSaveComposioKey = (key: string) => {
    setComposioApiKey(key);
    if (typeof window !== 'undefined') {
      localStorage.setItem('composio_api_key', key);
    }
    setComposioSaved(true);
    setTimeout(() => setComposioSaved(false), 2000);
  };

  const handleComposioConnect = async (connectorId: string, forceNewAccount = false) => {
    let keyToUse = composioApiKey;
    if (!keyToUse && typeof window !== 'undefined') {
      keyToUse = localStorage.getItem('composio_api_key') || '';
    }
    if (!keyToUse) {
      const entered = window.prompt('Enter your Composio API Key from app.composio.dev to authenticate:');
      if (entered && entered.trim()) {
        keyToUse = entered.trim();
        handleSaveComposioKey(keyToUse);
      } else {
        return;
      }
    }

    setIsConnectingComposio(connectorId);
    setComposioError(null);

    // Reuse accounts already authorized for this app user without forcing OAuth
    // again. This is what makes accounts reusable across chats.
    if (!forceNewAccount) {
      try {
        const userId = ensureComposioUserId();
        const accountRes = await fetch(
          `/api/composio?apiKey=${encodeURIComponent(keyToUse)}&entityId=${encodeURIComponent(userId)}`
        );
        if (accountRes.ok) {
          const accountData = await accountRes.json();
          const toolkit = toolkitForConnector(connectorId);
          const existingAccounts = Array.isArray(accountData?.connectedAccounts)
            ? accountData.connectedAccounts.filter((a: any) =>
                normalizeComposioToolkitSlug(String(a?.appUniqueId || a?.appName || '')) === toolkit && a?.status === 'ACTIVE'
              )
            : [];
          setComposioAccounts(existingAccounts.length ? accountData.connectedAccounts : []);
          composioAccountsRef.current = Array.isArray(accountData?.connectedAccounts) ? accountData.connectedAccounts : [];

          if (existingAccounts.length === 1) {
            const account = existingAccounts[0];
            onUpdateConnectorConfig?.(connectorId, {
              connectedAccountId: account.id,
              email: account.email || account.accountIdentifier || undefined,
            });
            if (!activeConnectors.find((c) => c.id === connectorId)?.enabled) onToggleConnector(connectorId);
            setComposioSyncMessage('Existing account selected for this chat.');
            setTimeout(() => setComposioSyncMessage(null), 2500);
            setIsConnectingComposio(null);
            return;
          }
          if (existingAccounts.length > 1) {
            const connector = activeConnectors.find((c) => c.id === connectorId) ||
              ({ id: connectorId, name: connectorId.replace('conn-', ''), config: {} } as Connector);
            setAccountPickerConnector(connector);
            setAccountPickerAccounts(existingAccounts);
            setIsConnectingComposio(null);
            return;
          }
        }
      } catch {}
    }

    // Open popup immediately on user action to prevent browser popup blockers
    let authWindow: Window | null = null;
    try {
      authWindow = window.open('about:blank', '_blank', 'width=650,height=750');
      if (authWindow) {
        authWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head><title>Composio OAuth Gateway</title></head>
            <body style="background:#161512;color:#ece9e2;font-family:system-ui,-apple-system,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0;">
              <div style="text-align:center;padding:24px;background:#1e1d19;border:1px solid #38352d;border-radius:18px;max-width:380px;">
                <div style="font-size:32px;margin-bottom:12px;">⚡</div>
                <h3 style="margin:0 0 8px 0;font-size:16px;color:#f2eee6;">Connecting via Composio</h3>
                <p style="margin:0;font-size:13px;color:#9c978b;line-height:1.5;">Preparing OAuth authorization window. Redirecting you to Composio...</p>
              </div>
            </body>
          </html>
        `);
      }
    } catch (e) {}

    const userId = ensureComposioUserId();
    const beforeIds = new Set(
      composioAccountsRef.current
        .filter((a: any) => toolkitForConnector(connectorId) === String(a?.appUniqueId || a?.appName || '').toLowerCase())
        .map((a: any) => String(a.id))
    );

    try {
      const res = await fetch('/api/composio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'connect',
          appName: connectorId,
          apiKey: keyToUse,
          entityId: userId,
        }),
      });
      const data = await res.json();
      if (data.redirectUrl) {
        if (authWindow && !authWindow.closed) {
          authWindow.location.href = data.redirectUrl;
        } else {
          window.open(data.redirectUrl, '_blank');
        }
        // Poll until Composio confirms the newly authorized account. Do not enable
        // the chat connector before a real account exists.

        // Poll for newly connected account and extract real email
        let pollCount = 0;
        const pollTimer = setInterval(async () => {
          pollCount++;
          if (pollCount > 30 || authWindow?.closed) {
            clearInterval(pollTimer);
          }
          try {
            const checkRes = await fetch(
              `/api/composio?apiKey=${encodeURIComponent(keyToUse)}&entityId=${encodeURIComponent(userId)}`
            );
            if (checkRes.ok) {
              const checkData = await checkRes.json();
              if (Array.isArray(checkData.connectedAccounts) && onUpdateConnectorConfig) {
                const toolkit = toolkitForConnector(connectorId);
                const candidates = checkData.connectedAccounts.filter((a: any) =>
                  normalizeComposioToolkitSlug(String(a?.appUniqueId || a?.appName || '')) === toolkit &&
                  a?.status === 'ACTIVE'
                );
                const matched = candidates.find((a: any) => !beforeIds.has(String(a.id))) ||
                  candidates.slice().sort((a: any, b: any) =>
                    new Date(b.updatedAt || b.updated_at || 0).getTime() - new Date(a.updatedAt || a.updated_at || 0).getTime()
                  )[0];
                if (matched) {
                  const resolvedEmail = matched.email || matched.accountIdentifier || 'Connected via Composio';
                  if (onUpdateConnectorConfig) {
                    onUpdateConnectorConfig(connectorId, {
                      email: resolvedEmail,
                      connectedAccountId: matched.id,
                    });
                  }
                  if (!activeConnectors.find((c) => c.id === connectorId)?.enabled) {
                    onToggleConnector(connectorId);
                  }
                  setComposioAccounts(checkData.connectedAccounts);
                  composioAccountsRef.current = checkData.connectedAccounts;
                  clearInterval(pollTimer);
                }
              }
            }
          } catch (e) {}
        }, 2500);
      } else {
        const fallbackUrl = 'https://app.composio.dev/apps';
        if (authWindow && !authWindow.closed) {
          authWindow.location.href = fallbackUrl;
        }
        if (data.error) {
          setComposioError(data.error);
        }
      }
    } catch (e: any) {
      const fallbackUrl = 'https://app.composio.dev/apps';
      if (authWindow && !authWindow.closed) {
        authWindow.location.href = fallbackUrl;
      }
      setComposioError(e.message || 'Failed to connect via Composio');
    } finally {
      setIsConnectingComposio(null);
    }
  };

  const handleSelectGoogleAccount = (_email: string, _name: string) => {
    if (!googleOAuthConnector) return;
    // Typing an email is not authentication. Always use the real Composio OAuth
    // flow so the connector cannot be marked connected with a fake identity.
    const connectorId = googleOAuthConnector.id;
    setGoogleOAuthConnector(null);
    setShowCustomGoogleAccount(false);
    setCustomGoogleEmail('');
    handleComposioConnect(connectorId);
  };

  if (!isOpen) return null;

  const activeCount = activeConnectors.filter((c) => c.enabled).length;

  const displayedConnectors = activeConnectors.filter((conn) => {
    if (subView === 'yours' && !conn.enabled) return false;
    if (selectedCategory !== 'all' && conn.category !== selectedCategory) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      conn.name.toLowerCase().includes(q) ||
      conn.description.toLowerCase().includes(q) ||
      conn.category.toLowerCase().includes(q)
    );
  });

  const customConnectors = activeConnectors.filter((c) => {
    if (!c.isCustom && c.section !== 'custom') return false;
    if (subView === 'yours' && !c.enabled) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q)
    );
  });
  const topConnectors = displayedConnectors.filter((c) => c.section === 'top' || (!c.section && c.category === 'Productivity'));
  const trendingConnectors = displayedConnectors.filter((c) => c.section === 'trending');

  const handleOpenConfig = (e: React.MouseEvent, conn: Connector) => {
    e.stopPropagation();
    setEditingConnector(conn);
    setConfigEmail(conn.config?.email || '');
    setConfigRepo(conn.config?.repo || 'sameer-sys/claude-enterprise-app');
    setConfigChannel(conn.config?.channelName || 'My Official Channel');
    setConfigHandle(conn.config?.handle || '@sameer.official');
    setConfigSubreddit(conn.config?.subreddit || 'r/artificial');
    setConfigAccountId(conn.config?.connectedAccountId || '');
  };

  const handleSaveConfig = () => {
    if (!editingConnector || !onUpdateConnectorConfig) return;
    onUpdateConnectorConfig(editingConnector.id, {
      ...editingConnector.config,
      email: configEmail.trim(),
      repo: configRepo.trim(),
      channelName: configChannel.trim(),
      handle: configHandle.trim(),
      subreddit: configSubreddit.trim(),
      connectedAccountId: configAccountId.trim() || undefined,
    });
    setEditingConnector(null);
  };

  // Submit from "Add Custom Connector" form -> Immediately add and activate connector
  const handleContinueToAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newConnName.trim() || !newConnUrl.trim()) return;

    const newConn: Connector = {
      id: `conn-custom-${Date.now()}`,
      name: newConnName.trim(),
      description: newConnUrl.trim(),
      icon: 'mcp',
      enabled: false,
      status: 'ready',
      category: 'Developer Tools',
      section: 'custom',
      isCustom: true,
      url: newConnUrl.trim(),
      capabilities: ['Custom MCP Protocol', 'Live Remote Tools', 'OAuth Active'],
    };

    if (onAddCustomConnector) {
      onAddCustomConnector(newConn);
    } else {
      onToggleConnector(newConn.id);
    }

    setIsAddModalOpen(false);
    setNewConnName('');
    setNewConnUrl('');
    setAddStep('form');
  };

  // Finalize OAuth Login / Connection
  const handleCompleteLogin = () => {
    handleContinueToAdd({ preventDefault: () => {} } as any);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl rounded-3xl bg-[#191816] border border-[#2b2923] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-[#f2eee6]">
        
        {/* ================================================================= */}
        {/* MODAL HEADER: Title + Tally Widget + Tabs + Add + Close          */}
        {/* ================================================================= */}
        <div className="px-6 pt-6 pb-4 border-b border-[#24231e] bg-[#191816] flex flex-col gap-4 shrink-0">
          <div className="flex items-center justify-between">
            <h1 className="font-serif text-3xl font-medium tracking-tight text-[#f2eee6]">
              Customize
            </h1>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-[#8a8579] hover:text-[#f2eee6] hover:bg-[#282622] transition-colors"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Tally Card (Matches Screenshot 2 Box) */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#141310] border border-[#26241f] min-w-[200px] shadow-sm">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-xl bg-[#cc785c]/15 text-[#cc785c] flex items-center justify-center font-mono font-bold text-sm">
                  {activeCount}
                </div>
                <div>
                  <div className="text-xs font-semibold text-[#f2eee6]">
                    {activeCount} active connector{activeCount !== 1 ? 's' : ''}
                  </div>
                  <div className="text-[11px] text-[#8a8579]">
                    Configured for this chat
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between text-[10px] font-mono text-[#6d685e]">
                <span>weekly · all models</span>
                <span>──</span>
              </div>
            </div>

            {/* Connected Mailbox Badge */}
            {(() => {
              const connectedEmail = activeConnectors.find((c) => c.id === 'conn-gmail')?.config?.email;
              return (
                <div className="flex items-center space-x-2.5 bg-[#131210] border border-[#26241f] rounded-xl px-3.5 py-2 select-none shadow-sm">
                  <div className={`w-2 h-2 rounded-full ${connectedEmail ? 'bg-emerald-400' : 'bg-amber-400'}`}></div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-mono text-[#8a8579] uppercase">Composio Mailbox</span>
                    <span className="text-xs font-semibold text-[#cc785c] font-mono truncate max-w-[220px]">
                      {connectedEmail || 'No Mailbox Connected (Use ⚡ Connect)'}
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* Primary & Sub Switchers */}
            <div className="flex items-center flex-wrap gap-2 sm:gap-3">
              <div className="flex items-center bg-[#141310] border border-[#26241f] rounded-xl p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setMainTab('skills')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                    mainTab === 'skills'
                      ? 'bg-[#282622] text-[#f2eee6] shadow-sm'
                      : 'text-[#8a8579] hover:text-[#dcd8ce]'
                  }`}
                >
                  Skills
                </button>
                <button
                  type="button"
                  onClick={() => setMainTab('connectors')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                    mainTab === 'connectors'
                      ? 'bg-[#282622] text-[#f2eee6] shadow-sm font-semibold'
                      : 'text-[#8a8579] hover:text-[#dcd8ce]'
                  }`}
                >
                  Connectors
                </button>
                <button
                  type="button"
                  onClick={() => setMainTab('plugins')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                    mainTab === 'plugins'
                      ? 'bg-[#282622] text-[#f2eee6] shadow-sm'
                      : 'text-[#8a8579] hover:text-[#dcd8ce]'
                  }`}
                >
                  Plugins
                </button>
              </div>

              <span className="text-[#38352d] select-none">|</span>

              <div className="flex items-center bg-[#141310] border border-[#26241f] rounded-xl p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setSubView('yours')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center space-x-1.5 ${
                    subView === 'yours'
                      ? 'bg-[#282622] text-[#f2eee6] shadow-sm font-semibold'
                      : 'text-[#8a8579] hover:text-[#dcd8ce]'
                  }`}
                >
                  <span>Yours</span>
                  {activeCount > 0 && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 font-mono">
                      {activeCount}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setSubView('discover')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                    subView === 'discover'
                      ? 'bg-[#282622] text-[#f2eee6] shadow-sm font-semibold'
                      : 'text-[#8a8579] hover:text-[#dcd8ce]'
                  }`}
                >
                  Discover
                </button>
              </div>

              {/* Add Button (Matches Screenshot 2 rounded button) */}
              <button
                type="button"
                onClick={() => {
                  setAddStep('form');
                  setIsAddModalOpen(true);
                }}
                className="px-4 py-1.5 rounded-xl bg-[#282622] hover:bg-[#33302a] border border-[#38352d] text-xs font-medium text-[#f2eee6] transition-all shadow-sm active:scale-95 flex items-center space-x-1"
              >
                <span>Add</span>
              </button>
            </div>
          </div>
        </div>

        {/* BREADCRUMB (Screenshot 2: Connectors / Directory) */}
        {mainTab === 'connectors' && (
          <div className="flex items-center space-x-2 text-xs text-[#8a8579] px-6 pt-3 pb-1 bg-[#191816]">
            <span className="cursor-pointer hover:text-[#dcd8ce] transition-colors" onClick={() => setSubView('yours')}>Connectors</span>
            <span className="text-[#555146]">/</span>
            <span className="text-[#f2eee6] font-semibold">Directory</span>
          </div>
        )}

        {/* SEARCH & FILTER BAR */}
        {mainTab === 'connectors' && (
          <div className="flex items-center gap-3 px-6 py-3 border-b border-[#24231e] bg-[#171614] shrink-0">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#6d685e] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search connectors"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#131210] border border-[#2b2923] rounded-xl pl-9 pr-4 py-2 text-xs text-[#f2eee6] placeholder-[#6d685e] focus:outline-none focus:border-[#4a463d] transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#8a8579] hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
                  className="px-3.5 py-2 bg-[#1c1b18] border border-[#2b2923] hover:border-[#38352d] text-xs font-medium text-[#dcd8ce] rounded-xl flex items-center space-x-1.5 transition-all"
                >
                  <span>Filter: {selectedCategory === 'all' ? 'All' : selectedCategory}</span>
                  <span className="text-[#8a8579]">▾</span>
                </button>

                {isFilterMenuOpen && (
                  <div className="absolute right-0 mt-1 w-56 bg-[#1e1d19] border border-[#333028] rounded-xl shadow-2xl py-1 z-30 text-xs max-h-60 overflow-y-auto animate-in fade-in zoom-in-95">
                    <button
                      onClick={() => { setSelectedCategory('all'); setIsFilterMenuOpen(false); }}
                      className={`w-full text-left px-3.5 py-2 hover:bg-[#282622] transition-colors flex items-center justify-between ${
                        selectedCategory === 'all' ? 'text-[#cc785c] font-semibold' : 'text-[#dcd8ce]'
                      }`}
                    >
                      <span>All Connectors</span>
                      {selectedCategory === 'all' && <Check className="w-3.5 h-3.5" />}
                    </button>
                    {CATEGORIES_WITH_COUNTS.map((cat) => (
                      <button
                        key={cat.name}
                        onClick={() => { setSelectedCategory(cat.name); setIsFilterMenuOpen(false); }}
                        className={`w-full text-left px-3.5 py-2 hover:bg-[#282622] transition-colors flex items-center justify-between ${
                          selectedCategory === cat.name ? 'text-[#cc785c] font-semibold' : 'text-[#dcd8ce]'
                        }`}
                      >
                        <span>{cat.name}</span>
                        <span className="text-[10px] text-[#8a8579] font-mono">{cat.count}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={fetchComposioAccounts}
                disabled={isSyncingComposio}
                className="p-2 bg-[#1c1b18] border border-[#2b2923] hover:border-[#38352d] text-[#8a8579] hover:text-[#f2eee6] rounded-xl transition-all cursor-pointer disabled:opacity-50"
                title={composioSyncMessage || "Refresh connected accounts from Composio"}
              >
                <RefreshCw className={`w-4 h-4 ${isSyncingComposio ? 'animate-spin text-[#cc785c]' : ''}`} />
              </button>
            </div>
          </div>
        )}

        {/* MODAL BODY */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8">

          {/* TAB: SKILLS */}
          {mainTab === 'skills' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-medium text-[#f2eee6]">Built-in Enterprise Skills</h3>
                <p className="text-xs text-[#8a8579] mt-0.5">
                  Autonomous skills natively active in Claude 3.7 Sonnet for this session.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  { title: 'Generative UI & Visual Sandboxes', desc: 'Live rendering of React, Tailwind, and interactive widgets directly in chat.', active: true },
                  { title: 'Code Interpreter & Execution', desc: 'Syntax verification, execution sandboxing, and production-grade diff patching.', active: true },
                  { title: 'Extended Hybrid Reasoning', desc: '16k-32k token thinking budget for multi-step architecture and logic analysis.', active: true },
                  { title: 'Live Web Research & Citations', desc: 'Real-time documentation inspection, benchmarks, and factual retrieval.', active: true },
                  { title: 'Multimodal Vision & Analysis', desc: 'Image OCR, UI mock inspection, and screenshot error debugging.', active: true },
                  { title: 'Autonomous Multi-Agent Squad', desc: 'Specialized subagents running asynchronously with proactive check-ins.', active: true },
                ].map((skill, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-[#1c1b18] border border-[#2b2923] flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <Sparkles className="w-4 h-4 text-[#cc785c]" />
                        <h4 className="text-xs font-semibold text-[#f2eee6]">{skill.title}</h4>
                      </div>
                      <p className="text-xs text-[#8a8579] leading-relaxed">{skill.desc}</p>
                    </div>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 shrink-0 ml-3">
                      Active
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: PLUGINS */}
          {mainTab === 'plugins' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-medium text-[#f2eee6]">Workspace Plugins</h3>
                <p className="text-xs text-[#8a8579] mt-0.5">
                  Plugins that augment Claude’s execution runtime and workspace persistence.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  { name: 'Claude Artifacts 2.0', desc: 'Interactive split-pane code & preview sandbox with 1-click copy.', active: true },
                  { name: 'Live PWA Network-First Sync', desc: 'Instant live caching and zero-friction updates across all devices.', active: true },
                  { name: 'Cross-Device Cloud Sync', desc: 'Supabase relay connecting your laptop, desktop, and mobile tabs.', active: true },
                  { name: 'Speech & Audio Synthesis', desc: 'High-speed browser voice dictation and natural speech playback.', active: true },
                ].map((p, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-[#1c1b18] border border-[#2b2923] flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <Layers className="w-4 h-4 text-[#cc785c]" />
                        <h4 className="text-xs font-semibold text-[#f2eee6]">{p.name}</h4>
                      </div>
                      <p className="text-xs text-[#8a8579] leading-relaxed">{p.desc}</p>
                    </div>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 shrink-0 ml-3">
                      Active
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: CONNECTORS */}
          {mainTab === 'connectors' && (
            <>
              {/* Session Context Banner in "Yours" Mode */}
              {subView === 'yours' && (
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#1c1b18] border border-[#2b2923]">
                  <div className="space-y-0.5">
                    <div className="text-xs font-medium text-[#f2eee6]">
                      Active for current chat: <span className="text-[#cc785c]">{sessionTitle || 'New Chat'}</span>
                    </div>
                    <p className="text-[11px] text-[#8a8579]">
                      Connectors enabled below are isolated to this specific chat. Switch chats to use different accounts!
                    </p>
                  </div>
                  {onResetConnectors && (
                    <button
                      type="button"
                      onClick={onResetConnectors}
                      className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[#26241f] hover:bg-[#302e27] border border-[#38352d] text-xs font-medium text-[#dcd8ce] transition-all hover:text-white shrink-0 ml-3"
                      title="Reset connectors for this chat to default"
                    >
                      <RefreshCw className="w-3 h-3 text-[#cc785c]" />
                      <span>Fresh Reset</span>
                    </button>
                  )}
                </div>
              )}



              {/* 1. YOUR CUSTOM CONNECTORS (Image 1) */}
              {customConnectors.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-[#f2eee6]">
                    Your custom connectors
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {customConnectors.map((conn) => (
                      <ConnectorCard
                        key={conn.id}
                        connector={conn}
                        onToggle={() => onToggleConnector(conn.id)}
                        onOpenConfig={(e) => handleOpenConfig(e, conn)}
                        onGoogleAuth={(c) => setGoogleOAuthConnector(c)}
                        onComposioConnect={handleComposioConnect}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* 2. TOP CONNECTORS (Screenshot 2: 8 items in 2 columns) */}
              {topConnectors.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-[#f2eee6]">
                      Top connectors
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowAllTop(!showAllTop)}
                      className="text-xs text-[#8a8579] hover:text-[#dcd8ce] transition-colors"
                    >
                      {showAllTop ? 'Show less' : 'Show all'}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {(showAllTop ? topConnectors : topConnectors.slice(0, 10)).map((conn) => (
                      <ConnectorCard
                        key={conn.id}
                        connector={conn}
                        onToggle={() => {
                          if (!conn.enabled) {
                            handleComposioConnect(conn.id);
                          } else {
                            onToggleConnector(conn.id);
                          }
                        }}
                        onOpenConfig={(e) => handleOpenConfig(e, conn)}
                        onGoogleAuth={(c) => handleComposioConnect(c.id)}
                        onComposioConnect={handleComposioConnect}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* 3. TRENDING CONNECTORS */}
              {trendingConnectors.length > 0 && subView === 'discover' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-[#f2eee6]">
                      Trending connectors
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowAllTrending(!showAllTrending)}
                      className="text-xs text-[#8a8579] hover:text-[#dcd8ce] transition-colors"
                    >
                      {showAllTrending ? 'Show less' : 'Show all'}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {(showAllTrending ? trendingConnectors : trendingConnectors.slice(0, 8)).map((conn) => (
                      <ConnectorCard
                        key={conn.id}
                        connector={conn}
                        onToggle={() => onToggleConnector(conn.id)}
                        onOpenConfig={(e) => handleOpenConfig(e, conn)}
                        onGoogleAuth={(c) => setGoogleOAuthConnector(c)}
                        onComposioConnect={handleComposioConnect}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* 4. BROWSE BY CATEGORY (Image 3) */}
              {subView === 'discover' && (
                <div className="space-y-3 pt-2">
                  <h3 className="text-sm font-semibold text-[#f2eee6]">
                    Browse by category
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES_WITH_COUNTS.map((cat) => (
                      <button
                        key={cat.name}
                        type="button"
                        onClick={() => setSelectedCategory(selectedCategory === cat.name ? 'all' : cat.name)}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-all flex items-center space-x-1.5 ${
                          selectedCategory === cat.name
                            ? 'bg-[#cc785c]/20 border-[#cc785c] text-[#f2eee6]'
                            : 'bg-[#1c1b18] hover:bg-[#26241f] border-[#2b2923] text-[#dcd8ce]'
                        }`}
                      >
                        <span>{cat.name}</span>
                        <span className="text-[10px] text-[#8a8579] font-mono">{cat.count}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Footer legal text */}
              <div className="text-center pt-4 pb-2 border-t border-[#24231e]">
                <p className="text-[11px] text-[#6d685e]">
                  Submission to the Directory is governed by the Software Directory Terms; use of Connectors is governed by your relevant terms.
                </p>
              </div>
            </>
          )}

        </div>

        {/* ================================================================= */}
        {/* POPUP: EXACT "ADD CUSTOM CONNECTOR" MODAL (Screenshot 4)          */}
        {/* ================================================================= */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-[#1e1d1a] border border-[#333027] rounded-2xl p-6 space-y-5 shadow-2xl animate-in zoom-in-95 text-[#f2eee6]">
              
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-[#f2eee6]">
                    {addStep === 'form' ? 'Add custom connector' : `Authenticate & Connect ${newConnName}`}
                  </h3>
                  {addStep === 'form' && (
                    <p className="text-xs text-[#a39e91] mt-1 leading-relaxed">
                      Connect Claude to your data and tools.{' '}
                      <span className="text-[#3b82f6] hover:underline cursor-pointer">Learn more about connectors</span>{' '}
                      or get started with{' '}
                      <span className="text-[#3b82f6] hover:underline cursor-pointer">pre-built ones</span>.
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-1 rounded-lg text-[#8a8579] hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* STEP 1: FORM INPUTS (Exact match to Screenshot 4) */}
              {addStep === 'form' && (
                <form onSubmit={handleContinueToAdd} className="space-y-4">
                  {/* Field 1: Name */}
                  <div className="space-y-1.5">
                    <input
                      type="text"
                      required
                      value={newConnName}
                      onChange={(e) => setNewConnName(e.target.value)}
                      placeholder="Name"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#141310] border border-[#2e2c24] text-xs text-[#f2eee6] placeholder-[#6d685e] focus:outline-none focus:border-[#4a463d]"
                    />
                    <p className="text-[11px] text-[#8a8579]">
                      Shown in the connectors list.
                    </p>
                  </div>

                  {/* Field 2: MCP server URL */}
                  <div className="space-y-1.5">
                    <input
                      type="text"
                      required
                      value={newConnUrl}
                      onChange={(e) => setNewConnUrl(e.target.value)}
                      placeholder="MCP server URL"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#141310] border border-[#2e2c24] text-xs text-[#f2eee6] placeholder-[#6d685e] focus:outline-none focus:border-[#4a463d]"
                    />
                    <p className="text-[11px] text-[#8a8579]">
                      The HTTPS address where the server accepts MCP requests, for example https://mcp.example.com/mcp.
                    </p>
                  </div>

                  {/* Trust Disclaimer */}
                  <p className="text-[11px] text-[#8a8579] leading-relaxed">
                    Only use connectors from developers you trust. Anthropic does not control which tools developers make available and cannot verify that they will work as intended or that they won't change.
                  </p>

                  {/* Report Link */}
                  <p className="text-[11px] text-[#8a8579]">
                    Building an MCP server?{' '}
                    <span className="text-[#3b82f6] hover:underline cursor-pointer">
                      Report issues and subscribe to updates here
                    </span>
                  </p>

                  {/* Buttons */}
                  <div className="flex items-center justify-end space-x-2.5 pt-3">
                    <button
                      type="button"
                      onClick={() => setIsAddModalOpen(false)}
                      className="px-4 py-2 rounded-xl bg-[#282622] hover:bg-[#33302a] text-xs font-medium text-[#dcd8ce] hover:text-white transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-[#3a3832] hover:bg-[#4a4740] text-xs font-medium text-white transition-all shadow-sm"
                    >
                      Continue
                    </button>
                  </div>
                </form>
              )}

              {/* STEP 2: USER LOGIN / AUTH FLOW ("make me to login in that app first") */}
              {addStep === 'login' && (
                <div className="space-y-4 py-2">
                  <div className="p-4 rounded-xl bg-[#141310] border border-[#2b2923] space-y-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-[#21201c] border border-[#333028] flex items-center justify-center text-[#cc785c]">
                        <Lock className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-[#f2eee6]">
                          Authorize Claude for {newConnName}
                        </div>
                        <div className="text-[11px] text-[#8a8579] font-mono truncate max-w-xs">
                          {newConnUrl}
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-[#a39e91] leading-relaxed">
                      To activate this connector for your chat, please authenticate your account with <strong className="text-white">{newConnName}</strong>. Claude will securely negotiate OAuth tokens for tool execution.
                    </p>

                    {authSuccess && (
                      <div className="flex items-center space-x-2 text-xs text-emerald-400 font-medium animate-in fade-in">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        <span>Authentication verified! Adding connector to chat...</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => setAddStep('form')}
                      className="text-xs text-[#8a8579] hover:text-white"
                    >
                      ← Back
                    </button>

                    <button
                      type="button"
                      onClick={handleCompleteLogin}
                      disabled={isAuthenticating || authSuccess}
                      className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-[#cc785c] hover:bg-[#db8a6e] text-black font-semibold text-xs transition-all shadow-md active:scale-95 disabled:opacity-50"
                    >
                      {isAuthenticating ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Logging in & verifying...</span>
                        </>
                      ) : (
                        <>
                          <span>Log in to {newConnName} & Connect</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

        {/* POPUP: ACCOUNT PICKER FOR THIS CHAT */}
        {accountPickerConnector && (
          <div className="absolute inset-0 z-30 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-[#1e1d19] border border-[#333129] rounded-2xl p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-[#f2eee6]">Choose the account for this chat</h4>
                  <p className="text-xs text-[#8a8579] mt-1">{accountPickerConnector.name} has multiple authorized accounts.</p>
                </div>
                <button type="button" onClick={() => setAccountPickerConnector(null)} className="p-1 rounded-lg text-[#8a8579] hover:text-white"><X className="w-4 h-4" /></button>
              </div>
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {accountPickerAccounts.map((acc: any) => (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => {
                      onUpdateConnectorConfig?.(accountPickerConnector.id, {
                        connectedAccountId: acc.id,
                        email: acc.email || acc.accountIdentifier || undefined,
                      });
                      if (!activeConnectors.find((c) => c.id === accountPickerConnector.id)?.enabled) onToggleConnector(accountPickerConnector.id);
                      setAccountPickerConnector(null);
                      setComposioSyncMessage('Account selected for this chat.');
                      setTimeout(() => setComposioSyncMessage(null), 2500);
                    }}
                    className="w-full text-left px-3.5 py-3 rounded-xl bg-[#141310] border border-[#2b2923] hover:border-[#cc785c] hover:bg-[#1c1b18] transition-colors"
                  >
                    <div className="text-xs font-medium text-[#f2eee6]">{acc.email || acc.accountIdentifier || 'Connected account'}</div>
                    <div className="text-[10px] text-[#6d685e] font-mono mt-1">{acc.id}</div>
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => { const id = accountPickerConnector.id; setAccountPickerConnector(null); handleComposioConnect(id, true); }} className="w-full px-3 py-2 rounded-xl bg-[#282622] hover:bg-[#33302a] text-xs text-[#dcd8ce]">Connect a new account</button>
            </div>
          </div>
        )}

        {/* POPUP: CONFIG EDITOR FOR ACTIVE CONNECTOR */}
        {editingConnector && (
          <div className="absolute inset-0 z-20 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-[#1e1d19] border border-[#333129] rounded-2xl p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-[#2d2b24] pb-3">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#141310] border border-[#2b2923] flex items-center justify-center">
                    <BrandIcon name={editingConnector.icon} />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-[#f2eee6]">{editingConnector.name}</h4>
                    <p className="text-xs text-[#8a8579]">Configure for this chat session</p>
                  </div>
                </div>
                <button
                  onClick={() => setEditingConnector(null)}
                  className="p-1 rounded-lg text-[#8a8579] hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {!editingConnector.isCustom && (() => {
                const toolkit = toolkitForConnector(editingConnector.id);
                const options = composioAccounts.filter((a: any) =>
                  normalizeComposioToolkitSlug(String(a?.appUniqueId || a?.appName || '')) === toolkit && a?.status === 'ACTIVE'
                );
                return (
                  <div className="space-y-1.5">
                    <label className="text-xs text-[#dcd8ce]">Account for this chat:</label>
                    <select
                      value={configAccountId}
                      onChange={(e) => setConfigAccountId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#141310] border border-[#2b2923] text-xs text-[#f2eee6] focus:outline-none focus:border-[#cc785c]"
                    >
                      <option value="">Auto-select only account (when unambiguous)</option>
                      {options.map((acc: any) => (
                        <option key={acc.id} value={acc.id}>
                          {(acc.email || acc.accountIdentifier || 'Connected account') + ' · ' + acc.id}
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-[#8a8579]">This selection belongs to this chat only. The same connected account can be reused by other chats.</p>
                    <button
                      type="button"
                      onClick={() => handleComposioConnect(editingConnector.id, true)}
                      className="text-[10px] text-[#cc785c] hover:text-[#f2eee6] font-medium"
                    >
                      + Connect another account
                    </button>
                  </div>
                );
              })()}
              {editingConnector.id === 'conn-gmail' && (
                <div className="space-y-1.5">
                  <label className="text-xs text-[#dcd8ce]">Target Mailbox / Assigned Email:</label>
                  <input
                    type="email"
                    value={configEmail}
                    onChange={(e) => setConfigEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full px-3 py-2 rounded-xl bg-[#141310] border border-[#2b2923] text-xs text-[#f2eee6] focus:outline-none focus:border-[#cc785c]"
                  />
                  <p className="text-[10px] text-[#8a8579]">
                    Emails drafted and 1-click send links in this chat will be associated with this account.
                  </p>
                </div>
              )}

              {editingConnector.id === 'conn-github' && (
                <div className="space-y-1.5">
                  <label className="text-xs text-[#dcd8ce]">GitHub Target Repository:</label>
                  <input
                    type="text"
                    value={configRepo}
                    onChange={(e) => setConfigRepo(e.target.value)}
                    placeholder="owner/repo"
                    className="w-full px-3 py-2 rounded-xl bg-[#141310] border border-[#2b2923] text-xs text-[#f2eee6] focus:outline-none focus:border-[#cc785c]"
                  />
                  <p className="text-[10px] text-[#8a8579]">
                    Repo context, live commit stats, and pull request links will target this repository.
                  </p>
                </div>
              )}

              {editingConnector.id === 'conn-youtube' && (
                <div className="space-y-1.5">
                  <label className="text-xs text-[#dcd8ce]">YouTube Channel Name / ID:</label>
                  <input
                    type="text"
                    value={configChannel}
                    onChange={(e) => setConfigChannel(e.target.value)}
                    placeholder="My Official Channel"
                    className="w-full px-3 py-2 rounded-xl bg-[#141310] border border-[#2b2923] text-xs text-[#f2eee6] focus:outline-none focus:border-[#cc785c]"
                  />
                  <p className="text-[10px] text-[#8a8579]">
                    Video staging, titles, SEO tags, and YouTube Studio links will be tied to this channel.
                  </p>
                </div>
              )}

              {(editingConnector.id === 'conn-instagram' ||
                editingConnector.id === 'conn-twitter' ||
                editingConnector.id === 'conn-tiktok' ||
                editingConnector.id === 'conn-linkedin') && (
                <div className="space-y-1.5">
                  <label className="text-xs text-[#dcd8ce]">Account Username / Handle:</label>
                  <input
                    type="text"
                    value={configHandle}
                    onChange={(e) => setConfigHandle(e.target.value)}
                    placeholder="@handle"
                    className="w-full px-3 py-2 rounded-xl bg-[#141310] border border-[#2b2923] text-xs text-[#f2eee6] focus:outline-none focus:border-[#cc785c]"
                  />
                  <p className="text-[10px] text-[#8a8579]">
                    Social post syndication and profile tags will be associated with this handle in this chat.
                  </p>
                </div>
              )}

              {editingConnector.id === 'conn-reddit' && (
                <div className="space-y-1.5">
                  <label className="text-xs text-[#dcd8ce]">Target Subreddit:</label>
                  <input
                    type="text"
                    value={configSubreddit}
                    onChange={(e) => setConfigSubreddit(e.target.value)}
                    placeholder="r/artificial"
                    className="w-full px-3 py-2 rounded-xl bg-[#141310] border border-[#2b2923] text-xs text-[#f2eee6] focus:outline-none focus:border-[#cc785c]"
                  />
                  <p className="text-[10px] text-[#8a8579]">
                    Subreddit staging and markdown post links will default to this community.
                  </p>
                </div>
              )}

              {editingConnector.id !== 'conn-gmail' &&
                editingConnector.id !== 'conn-github' &&
                editingConnector.id !== 'conn-youtube' &&
                editingConnector.id !== 'conn-instagram' &&
                editingConnector.id !== 'conn-twitter' &&
                editingConnector.id !== 'conn-tiktok' &&
                editingConnector.id !== 'conn-linkedin' &&
                editingConnector.id !== 'conn-reddit' && (
                  <div className="p-3 rounded-xl bg-[#141310] border border-[#2b2923] text-xs text-[#a39e91] space-y-1">
                    <p className="font-semibold text-[#dcd8ce]">Zero-Configuration Active</p>
                    <p className="text-[11px]">
                      This connector is pre-configured and immediately executes in the prompt context of this chat.
                    </p>
                  </div>
                )}

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingConnector(null)}
                  className="px-3.5 py-1.5 rounded-xl bg-[#26241f] text-xs text-[#dcd8ce] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveConfig}
                  className="px-4 py-1.5 rounded-xl bg-[#cc785c] text-xs font-semibold text-black hover:bg-[#db8a6e]"
                >
                  Save for this Chat
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* POPUP: EXACT GOOGLE SIGN-IN DIALOG (Screenshot 1: media_1789661196153.png) */}
        {/* ================================================================= */}
        {googleOAuthConnector && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-2xl bg-[#131314] border border-[#303134] rounded-3xl p-8 shadow-2xl text-[#e3e3e3] animate-in zoom-in-95">
              {/* Top Google Branding Header */}
              <div className="flex items-center space-x-3 mb-8">
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z" />
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z" />
                  <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z" />
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
                </svg>
                <span className="text-sm font-medium text-[#e3e3e3]">Sign in with Google</span>
              </div>

              {/* 2-Column Responsive Split */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left Column: Anthropic Asterisk + Title + App Info */}
                <div className="flex flex-col justify-between">
                  <div>
                    {/* Anthropic Terracotta Asterisk Logo */}
                    <div className="w-12 h-12 text-[#cc785c] mb-6">
                      <svg viewBox="0 0 100 100" fill="currentColor" className="w-12 h-12">
                        <circle cx="50" cy="50" r="10" />
                        <rect x="46" y="4" width="8" height="32" rx="4" />
                        <rect x="46" y="64" width="8" height="32" rx="4" />
                        <rect x="4" y="46" width="32" height="8" rx="4" />
                        <rect x="64" y="46" width="32" height="8" rx="4" />
                        <rect x="17.5" y="17.5" width="8" height="32" rx="4" transform="rotate(-45 21.5 33.5)" />
                        <rect x="60" y="60" width="8" height="32" rx="4" transform="rotate(-45 64 76)" />
                        <rect x="17.5" y="60" width="8" height="32" rx="4" transform="rotate(45 21.5 76)" />
                        <rect x="60" y="17.5" width="8" height="32" rx="4" transform="rotate(45 64 33.5)" />
                      </svg>
                    </div>

                    <h2 className="text-3xl font-normal text-white tracking-tight mb-3">
                      Choose an account
                    </h2>
                    <p className="text-sm text-[#9aa0a6]">
                      to continue to <span className="text-[#8ab4f8] font-medium">Claude for {googleOAuthConnector.name}</span>
                    </p>
                  </div>
                </div>

                {/* Right Column: Accounts List + Use another account + Disclaimer */}
                <div className="flex flex-col justify-between space-y-4">
                  <div className="space-y-1">
                    {/* Option 1: Real OAuth via Composio */}
                    <button
                      type="button"
                      onClick={() => {
                        if (googleOAuthConnector) {
                          handleComposioConnect(googleOAuthConnector.id);
                          setGoogleOAuthConnector(null);
                        }
                      }}
                      className="w-full text-left py-3 px-3 rounded-xl bg-[#202124] hover:bg-[#2a2b2e] transition-colors border border-[#3c4043] flex items-center space-x-3.5 group cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-full bg-[#cc785c] text-black flex items-center justify-center font-bold text-sm shrink-0">
                        ⚡
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-white group-hover:text-[#8ab4f8] transition-colors">
                          Log in with Google (via Composio Real OAuth)
                        </div>
                        <div className="text-xs text-[#9aa0a6] truncate font-mono">
                          Authenticate your real account securely with 0 hardcoded emails
                        </div>
                      </div>
                    </button>

                    {/* Account 2: Use another account */}
                    {!showCustomGoogleAccount ? (
                      <button
                        type="button"
                        onClick={() => setShowCustomGoogleAccount(true)}
                        className="w-full text-left py-3.5 px-2 rounded-xl hover:bg-[#202124] transition-colors border-b border-[#3c4043] flex items-center space-x-3.5 group cursor-pointer"
                      >
                        <div className="w-8 h-8 rounded-full border border-[#5f6368] flex items-center justify-center text-[#9aa0a6] shrink-0">
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                          </svg>
                        </div>
                        <span className="text-sm font-medium text-white group-hover:text-[#8ab4f8] transition-colors">
                          Use another account
                        </span>
                      </button>
                    ) : (
                      <div className="py-3 px-2 border-b border-[#3c4043] space-y-2">
                        <input
                          type="email"
                          value={customGoogleEmail}
                          onChange={(e) => setCustomGoogleEmail(e.target.value)}
                          placeholder="Enter your Google email"
                          autoFocus
                          className="w-full px-3 py-2 rounded-lg bg-[#1e1f20] border border-[#5f6368] text-xs text-white placeholder-[#80868b] focus:outline-none focus:border-[#8ab4f8]"
                        />
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            type="button"
                            onClick={() => setShowCustomGoogleAccount(false)}
                            className="text-xs text-[#9aa0a6] hover:text-white px-2 py-1"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (customGoogleEmail.trim()) {
                                handleSelectGoogleAccount(customGoogleEmail.trim(), customGoogleEmail.split('@')[0]);
                              }
                            }}
                            className="text-xs font-semibold bg-[#8ab4f8] text-[#131314] px-3 py-1 rounded hover:bg-[#a8c7fa]"
                          >
                            Connect
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Privacy Disclaimer */}
                  <p className="text-[11px] text-[#9aa0a6] leading-relaxed pt-2">
                    Before using this app, you can review Claude for {googleOAuthConnector.name}&apos;s{' '}
                    <span className="text-[#8ab4f8] cursor-pointer hover:underline">Privacy Policy</span> and{' '}
                    <span className="text-[#8ab4f8] cursor-pointer hover:underline">Terms of Service</span>.
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom Links Outside Card (Exact match to Screenshot 1) */}
            <div className="w-full max-w-2xl flex items-center justify-between text-xs text-[#9aa0a6] mt-4 px-2">
              <div className="flex items-center space-x-1 cursor-pointer hover:text-white">
                <span>English (United Kingdom)</span>
                <span>▾</span>
              </div>
              <div className="flex items-center space-x-6">
                <span className="cursor-pointer hover:text-white">Help</span>
                <span className="cursor-pointer hover:text-white">Privacy</span>
                <span className="cursor-pointer hover:text-white">Terms</span>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// ============================================================================
// CONNECTOR CARD COMPONENT (Exact visual match to official Claude cards)
// ============================================================================

function ConnectorCard({
  connector,
  onToggle,
  onOpenConfig,
  onGoogleAuth,
  onComposioConnect,
}: {
  connector: Connector;
  onToggle: () => void;
  onOpenConfig: (e: React.MouseEvent) => void;
  onGoogleAuth?: (c: Connector) => void;
  onComposioConnect?: (connectorId: string) => void;
}) {
  const isEnabled = connector.enabled;
  const isGoogle = connector.id === 'conn-gmail' || connector.id === 'conn-gdrive' || connector.id === 'conn-gcalendar';

  const handleClick = () => {
    if (!isEnabled && !connector.isCustom && onComposioConnect) {
      onComposioConnect(connector.id);
    } else if (isGoogle && !isEnabled && onGoogleAuth) {
      onGoogleAuth(connector);
    } else {
      onToggle();
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`p-3.5 rounded-2xl border transition-all cursor-pointer select-none flex items-center justify-between group ${
        isEnabled
          ? 'bg-[#1e1c19] border-[#38352d] hover:border-[#4a463d]'
          : 'bg-[#171614] border-[#26241f] hover:border-[#333129] hover:bg-[#1a1916]'
      }`}
    >
      {/* Left: Icon + Info */}
      <div className="flex items-center space-x-3 min-w-0 pr-2">
        <div className="w-10 h-10 rounded-xl bg-[#12110f] border border-[#26241f] flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
          <BrandIcon name={connector.icon} />
        </div>

        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="flex items-center space-x-1.5 flex-wrap">
            <span className="text-xs font-semibold text-[#f2eee6] truncate">
              {connector.name}
            </span>

            {connector.isVerified && (
              <svg className="w-3.5 h-3.5 text-[#8a8579] shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            )}

            {connector.isTrending && (
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-blue-500/15 text-blue-400 border border-blue-500/20">
                Trending
              </span>
            )}

            {connector.isBeta && (
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#2b2923] text-[#a39e91]">
                Beta
              </span>
            )}

            {connector.isCustom && (
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#282622] text-[#8a8579]">
                Custom
              </span>
            )}
          </div>

          <p className="text-[11px] text-[#8a8579] truncate leading-tight">
            {connector.description}
          </p>

          {isEnabled && connector.config?.email && (
            <p className="text-[10px] text-emerald-400 font-mono flex items-center gap-1 truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"></span>
              <span>Mailbox: {connector.config.email}</span>
            </p>
          )}
          {isEnabled && connector.config?.repo && (
            <p className="text-[10px] text-[#cc785c] truncate">
              Repo: {connector.config.repo}
            </p>
          )}
          {isEnabled && connector.config?.channelName && (
            <p className="text-[10px] text-[#cc785c] truncate">
              Channel: {connector.config.channelName}
            </p>
          )}
          {isEnabled && connector.config?.handle && (
            <p className="text-[10px] text-[#cc785c] truncate">
              Handle: {connector.config.handle}
            </p>
          )}
          {isEnabled && connector.config?.subreddit && (
            <p className="text-[10px] text-[#cc785c] truncate">
              Subreddit: {connector.config.subreddit}
            </p>
          )}
        </div>
      </div>

      {/* Right: Toggle Button & Config Gear */}
      <div className="flex items-center space-x-1.5 shrink-0">
        {isEnabled && (
          connector.id === 'conn-gmail' ||
          connector.id === 'conn-github' ||
          connector.id === 'conn-youtube' ||
          connector.id === 'conn-instagram' ||
          connector.id === 'conn-twitter' ||
          connector.id === 'conn-tiktok' ||
          connector.id === 'conn-linkedin' ||
          connector.id === 'conn-reddit'
        ) && (
          <button
            type="button"
            onClick={onOpenConfig}
            className="p-1.5 rounded-lg text-[#8a8579] hover:text-[#f2eee6] hover:bg-[#282622] transition-colors"
            title="Configure settings for this chat"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        )}

        {!isEnabled && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onComposioConnect) {
                onComposioConnect(connector.id);
              } else if (isGoogle && onGoogleAuth) {
                onGoogleAuth(connector);
              } else {
                onToggle();
              }
            }}
            className="px-2 py-1 rounded-lg bg-[#cc785c]/15 hover:bg-[#cc785c]/25 border border-[#cc785c]/35 text-[#cc785c] hover:text-[#f4efe6] text-[10px] font-semibold transition-all flex items-center gap-1 shadow-sm"
            title="Authenticate with real account via Composio"
          >
            <Sparkles className="w-3 h-3 text-[#cc785c]" />
            <span>Connect</span>
          </button>
        )}

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (!isEnabled && !connector.isCustom && onComposioConnect) {
              onComposioConnect(connector.id);
            } else if (isGoogle && !isEnabled && onGoogleAuth) {
              onGoogleAuth(connector);
            } else {
              onToggle();
            }
          }}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
            isEnabled
              ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25'
              : 'bg-[#26241f] border border-[#333028] text-[#dcd8ce] hover:text-white hover:bg-[#33302a]'
          }`}
          title={isEnabled ? 'Enabled for this chat (Click to turn off)' : 'Enable for this chat'}
        >
          {isEnabled ? (
            <Check className="w-4 h-4" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
}
