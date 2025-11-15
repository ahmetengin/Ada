/**
 * PassGenerator - Service for generating passes in various formats
 *
 * Supports:
 * - QR code generation (SVG, PNG, Base64)
 * - Apple Wallet (.pkpass) generation
 * - Google Wallet pass generation
 * - PDF pass generation
 */

import { createHash, createHmac } from 'crypto';
import { Pass, QRPayload } from '../types/PassTypes.js';

export interface QRCodeOptions {
  format: 'svg' | 'png' | 'dataurl';
  size?: number;
  errorCorrection?: 'L' | 'M' | 'Q' | 'H';
  margin?: number;
  color?: {
    dark?: string;
    light?: string;
  };
}

export interface AppleWalletConfig {
  teamId: string;
  passTypeId: string;
  organizationName: string;
  certificatePath?: string;
  wwdrCertPath?: string;
  privateKeyPath?: string;
}

export interface GoogleWalletConfig {
  issuerId: string;
  classId: string;
  serviceAccountEmail?: string;
  serviceAccountKeyPath?: string;
}

export class PassGenerator {
  /**
   * Generate QR code from payload
   */
  static async generateQRCode(
    payload: QRPayload,
    options: QRCodeOptions = { format: 'svg' }
  ): Promise<string> {
    const qrData = JSON.stringify(payload);

    // TODO: Implement actual QR generation using 'qrcode' library
    // For now, return a placeholder based on format

    if (options.format === 'svg') {
      return this.generatePlaceholderSVG(qrData, options.size || 256);
    }

    if (options.format === 'dataurl') {
      // Base64 encoded data URL
      const svg = this.generatePlaceholderSVG(qrData, options.size || 256);
      return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
    }

    // PNG format
    return `data:image/png;base64,${Buffer.from(qrData).toString('base64')}`;
  }

  /**
   * Generate Apple Wallet pass (.pkpass)
   */
  static async generateAppleWalletPass(
    pass: Pass,
    config: AppleWalletConfig
  ): Promise<{ passUrl: string; passData: Buffer }> {
    // TODO: Implement Apple PassKit generation
    // Would use passkit-generator library:
    // 1. Create pass.json manifest
    // 2. Add logo, icon, strip images
    // 3. Generate manifest.json (SHA1 hashes)
    // 4. Sign with PKCS7 certificate
    // 5. ZIP into .pkpass file

    const passJson = {
      formatVersion: 1,
      passTypeIdentifier: config.passTypeId,
      serialNumber: pass.passId,
      teamIdentifier: config.teamId,
      organizationName: config.organizationName || pass.branding.organizationName,
      description: `${pass.domain} - ${pass.passType}`,

      // Visual styling
      backgroundColor: this.rgbToHex(pass.branding.backgroundColor || 'rgb(60, 65, 76)'),
      foregroundColor: this.rgbToHex(pass.branding.textColor || 'rgb(255, 255, 255)'),
      labelColor: this.rgbToHex(pass.branding.secondaryColor || 'rgb(255, 255, 255)'),
      logoText: pass.branding.organizationName,

      // Barcode (QR code)
      barcodes: [
        {
          message: JSON.stringify(pass.qrPayload),
          format: 'PKBarcodeFormatQR',
          messageEncoding: 'iso-8859-1',
          altText: pass.passId,
        },
      ],

      // Pass fields based on type
      ...this.generatePassFields(pass),

      // Validity
      relevantDate: pass.validity.validFrom.toISOString(),
      expirationDate: pass.validity.validTo.toISOString(),

      // Locations (if zones have coordinates)
      locations: pass.zones
        .filter(z => z.restrictions)
        .map(z => ({
          latitude: 0, // TODO: Extract from zone metadata
          longitude: 0,
          relevantText: z.name,
        })),
    };

    // Placeholder return
    const passUrl = `https://passes.ada-ecosystem.com/apple/${pass.passId}.pkpass`;
    const passData = Buffer.from(JSON.stringify(passJson));

    return { passUrl, passData };
  }

  /**
   * Generate Google Wallet pass
   */
  static async generateGoogleWalletPass(
    pass: Pass,
    config: GoogleWalletConfig
  ): Promise<{ passUrl: string; saveUrl: string }> {
    // TODO: Implement Google Wallet pass generation
    // Would use Google Wallet API:
    // 1. Create pass class (GenericClass)
    // 2. Create pass object (GenericObject)
    // 3. Sign JWT with service account
    // 4. Generate "Add to Google Wallet" URL

    const passObject = {
      id: `${config.issuerId}.${pass.passId}`,
      classId: `${config.issuerId}.${config.classId}`,
      state: pass.status === 'active' ? 'ACTIVE' : 'INACTIVE',

      // Header
      cardTitle: {
        defaultValue: {
          language: 'en',
          value: pass.passType.replace(/_/g, ' '),
        },
      },

      // Holder info
      header: {
        defaultValue: {
          language: 'en',
          value: pass.holder.name,
        },
      },

      // Barcode (QR)
      barcode: {
        type: 'QR_CODE',
        value: JSON.stringify(pass.qrPayload),
        alternateText: pass.passId,
      },

      // Validity
      validTimeInterval: {
        start: {
          date: pass.validity.validFrom.toISOString(),
        },
        end: {
          date: pass.validity.validTo.toISOString(),
        },
      },

      // Additional fields
      textModulesData: this.generateGoogleWalletFields(pass),
    };

    const passUrl = `https://passes.ada-ecosystem.com/google/${pass.passId}`;
    const saveUrl = `https://pay.google.com/gp/v/save/${Buffer.from(JSON.stringify(passObject)).toString('base64')}`;

    return { passUrl, saveUrl };
  }

  /**
   * Generate PDF pass
   */
  static async generatePDFPass(pass: Pass): Promise<{ pdfUrl: string; pdfData: Buffer }> {
    // TODO: Implement PDF generation using pdf-lib or pdfkit
    // 1. Create PDF with pass details
    // 2. Embed QR code image
    // 3. Add branding (logo, colors)
    // 4. Add holder information
    // 5. Add validity and zone information

    const pdfUrl = `https://passes.ada-ecosystem.com/pdf/${pass.passId}.pdf`;
    const pdfData = Buffer.from('PDF placeholder');

    return { pdfUrl, pdfData };
  }

  /**
   * Sign QR payload with HMAC-SHA256
   */
  static signPayload(payload: QRPayload, secretKey: string): string {
    const data = JSON.stringify({
      namespace: payload.namespace,
      type: payload.type,
      id: payload.id,
      scopes: payload.scopes,
      nonce: payload.nonce,
      issuedAt: payload.issuedAt,
      expiresAt: payload.expiresAt,
    });

    return createHmac('sha256', secretKey)
      .update(data)
      .digest('hex')
      .slice(0, 32);
  }

  /**
   * Verify QR payload signature
   */
  static verifyPayload(payload: QRPayload, secretKey: string): boolean {
    if (!payload.signature) return false;

    const expectedSignature = this.signPayload(payload, secretKey);
    return payload.signature === expectedSignature;
  }

  /**
   * Generate hash for pass data (for manifest.json in Apple Wallet)
   */
  static hashPassData(data: string | Buffer): string {
    return createHash('sha1')
      .update(data)
      .digest('hex');
  }

  /**
   * Generate placeholder SVG QR code
   */
  private static generatePlaceholderSVG(data: string, size: number): string {
    const hash = createHash('md5').update(data).digest('hex');

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="white"/>
  <rect x="10" y="10" width="${size - 20}" height="${size - 20}" fill="black" opacity="0.1"/>
  <text x="${size / 2}" y="${size / 2}" text-anchor="middle" font-family="monospace" font-size="12" fill="black">
    QR: ${hash.slice(0, 8)}
  </text>
  <text x="${size / 2}" y="${size / 2 + 20}" text-anchor="middle" font-family="monospace" font-size="10" fill="gray">
    ${data.slice(0, 30)}...
  </text>
</svg>`;
  }

  /**
   * Generate Apple Wallet pass fields based on pass type
   */
  private static generatePassFields(pass: Pass): any {
    const commonFields = {
      headerFields: [
        {
          key: 'holder',
          label: 'Holder',
          value: pass.holder.name,
        },
      ],
      primaryFields: [
        {
          key: 'passType',
          label: 'Pass Type',
          value: pass.passType.replace(/_/g, ' '),
        },
      ],
      secondaryFields: [
        {
          key: 'validFrom',
          label: 'Valid From',
          value: pass.validity.validFrom.toLocaleDateString(),
          dateStyle: 'PKDateStyleShort',
        },
        {
          key: 'validTo',
          label: 'Valid Until',
          value: pass.validity.validTo.toLocaleDateString(),
          dateStyle: 'PKDateStyleShort',
        },
      ],
      auxiliaryFields: pass.zones.map((zone, idx) => ({
        key: `zone${idx}`,
        label: `Zone ${idx + 1}`,
        value: zone.name,
      })),
      backFields: [
        {
          key: 'passId',
          label: 'Pass ID',
          value: pass.passId,
        },
        {
          key: 'domain',
          label: 'Domain',
          value: pass.domain,
        },
        ...Object.entries(pass.holder).map(([key, value]) => ({
          key,
          label: key.charAt(0).toUpperCase() + key.slice(1),
          value: String(value),
        })),
      ],
    };

    // Use generic pass format (works for all types)
    return {
      generic: commonFields,
    };
  }

  /**
   * Generate Google Wallet text modules
   */
  private static generateGoogleWalletFields(pass: Pass): any[] {
    return [
      {
        header: 'Pass ID',
        body: pass.passId,
      },
      {
        header: 'Valid From',
        body: pass.validity.validFrom.toLocaleDateString(),
      },
      {
        header: 'Valid Until',
        body: pass.validity.validTo.toLocaleDateString(),
      },
      {
        header: 'Authorized Zones',
        body: pass.zones.map(z => z.name).join(', '),
      },
    ];
  }

  /**
   * Convert RGB string to hex
   */
  private static rgbToHex(rgb: string): string {
    if (rgb.startsWith('#')) return rgb;

    const match = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (!match) return '#3C414C'; // Default

    const r = parseInt(match[1]);
    const g = parseInt(match[2]);
    const b = parseInt(match[3]);

    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;
  }
}

export default PassGenerator;
