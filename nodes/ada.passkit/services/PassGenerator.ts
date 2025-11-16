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
import QRCode from 'qrcode';
import PDFDocument from 'pdfkit';
import { PassKit } from 'passkit-generator';

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

    const qrOptions = {
      errorCorrectionLevel: options.errorCorrection || 'H',
      margin: options.margin || 1,
      width: options.size || 256,
      color: options.color || {
        dark: '#000000',
        light: '#FFFFFF',
      },
    };

    try {
      if (options.format === 'svg') {
        // Generate SVG format
        return await QRCode.toString(qrData, {
          ...qrOptions,
          type: 'svg',
        });
      }

      if (options.format === 'png') {
        // Generate PNG as Buffer
        const buffer = await QRCode.toBuffer(qrData, qrOptions);
        return `data:image/png;base64,${buffer.toString('base64')}`;
      }

      if (options.format === 'dataurl') {
        // Generate data URL
        return await QRCode.toDataURL(qrData, qrOptions);
      }

      // Default to data URL
      return await QRCode.toDataURL(qrData, qrOptions);
    } catch (error) {
      console.error('QR code generation failed:', error);
      // Fallback to placeholder
      return this.generatePlaceholderSVG(qrData, options.size || 256);
    }
  }

  /**
   * Generate Apple Wallet pass (.pkpass)
   */
  static async generateAppleWalletPass(
    pass: Pass,
    config: AppleWalletConfig
  ): Promise<{ passUrl: string; passData: Buffer }> {
    try {
      // Create PassKit instance
      const passKit = new PassKit({
        model: './passModels/generic', // Path to pass template
        certificates: {
          wwdr: config.wwdrCertPath || process.env.PASSKIT_WWDR_CERT,
          signerCert: config.certificatePath || process.env.PASSKIT_CERT,
          signerKey: config.privateKeyPath || process.env.PASSKIT_KEY,
        },
      });

      // Set pass data
      passKit.type = 'generic';
      passKit.serialNumber = pass.passId;
      passKit.passTypeIdentifier = config.passTypeId;
      passKit.teamIdentifier = config.teamId;
      passKit.organizationName = config.organizationName || pass.branding.organizationName;
      passKit.description = `${pass.domain} - ${pass.passType}`;

      // Visual styling
      passKit.backgroundColor = this.rgbToHex(pass.branding.backgroundColor || 'rgb(60, 65, 76)');
      passKit.foregroundColor = this.rgbToHex(pass.branding.textColor || 'rgb(255, 255, 255)');
      passKit.labelColor = this.rgbToHex(pass.branding.secondaryColor || 'rgb(255, 255, 255)');
      passKit.logoText = pass.branding.organizationName;

      // Barcode (QR code)
      passKit.setBarcodes({
        message: JSON.stringify(pass.qrPayload),
        format: 'PKBarcodeFormatQR',
        messageEncoding: 'iso-8859-1',
        altText: pass.passId,
      });

      // Pass fields
      const fields = this.generatePassFields(pass);
      passKit.headerFields = fields.generic.headerFields;
      passKit.primaryFields = fields.generic.primaryFields;
      passKit.secondaryFields = fields.generic.secondaryFields;
      passKit.auxiliaryFields = fields.generic.auxiliaryFields;
      passKit.backFields = fields.generic.backFields;

      // Validity
      passKit.relevantDate = pass.validity.validFrom.toISOString();
      passKit.expirationDate = pass.validity.validTo.toISOString();

      // Generate the .pkpass file
      const passData = passKit.getAsBuffer();

      const passUrl = `https://passes.ada-ecosystem.com/apple/${pass.passId}.pkpass`;

      return { passUrl, passData };
    } catch (error) {
      console.error('Apple Wallet pass generation failed:', error);

      // Fallback: Return a minimal pass structure
      const passUrl = `https://passes.ada-ecosystem.com/apple/${pass.passId}.pkpass`;
      const passData = Buffer.from(JSON.stringify({
        formatVersion: 1,
        passTypeIdentifier: config.passTypeId,
        serialNumber: pass.passId,
        teamIdentifier: config.teamId,
        organizationName: config.organizationName,
        description: `${pass.domain} - ${pass.passType}`,
      }));

      return { passUrl, passData };
    }
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
    return new Promise(async (resolve, reject) => {
      try {
        // Create PDF document
        const doc = new PDFDocument({
          size: 'LETTER',
          margins: {
            top: 50,
            bottom: 50,
            left: 50,
            right: 50,
          },
        });

        const chunks: Buffer[] = [];

        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => {
          const pdfData = Buffer.concat(chunks);
          const pdfUrl = `https://passes.ada-ecosystem.com/pdf/${pass.passId}.pdf`;
          resolve({ pdfUrl, pdfData });
        });

        // Header
        doc.fontSize(24)
           .fillColor(pass.branding.primaryColor || '#3C414C')
           .text(pass.branding.organizationName || 'Ada Ecosystem', { align: 'center' });

        doc.moveDown(0.5);

        // Pass type
        doc.fontSize(18)
           .fillColor('#000000')
           .text(pass.passType.replace(/_/g, ' '), { align: 'center' });

        doc.moveDown(1);

        // Horizontal line
        doc.moveTo(50, doc.y)
           .lineTo(562, doc.y)
           .stroke();

        doc.moveDown(1);

        // Holder information
        doc.fontSize(12)
           .fillColor('#000000')
           .text(`Holder: ${pass.holder.name}`, { align: 'left' });

        if (pass.holder.email) {
          doc.text(`Email: ${pass.holder.email}`, { align: 'left' });
        }

        if (pass.holder.role) {
          doc.text(`Role: ${pass.holder.role}`, { align: 'left' });
        }

        doc.moveDown(1);

        // Validity information
        doc.fontSize(10)
           .fillColor('#666666')
           .text(`Valid From: ${pass.validity.validFrom.toLocaleDateString('en-US', {
             year: 'numeric',
             month: 'long',
             day: 'numeric',
             hour: '2-digit',
             minute: '2-digit'
           })}`, { align: 'left' });

        doc.text(`Valid Until: ${pass.validity.validTo.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}`, { align: 'left' });

        doc.moveDown(1);

        // Authorized zones
        if (pass.zones.length > 0) {
          doc.fontSize(12)
             .fillColor('#000000')
             .text('Authorized Zones:', { align: 'left' });

          doc.fontSize(10)
             .fillColor('#666666');

          pass.zones.forEach((zone, idx) => {
            doc.text(`  ${idx + 1}. ${zone.name}`, { align: 'left' });
          });

          doc.moveDown(1);
        }

        // Generate QR code
        const qrCodeDataUrl = await this.generateQRCode(pass.qrPayload, {
          format: 'dataurl',
          size: 200,
        });

        // Remove data URL prefix to get base64
        const qrBase64 = qrCodeDataUrl.replace(/^data:image\/\w+;base64,/, '');
        const qrBuffer = Buffer.from(qrBase64, 'base64');

        // Add QR code to PDF
        doc.image(qrBuffer, {
          fit: [200, 200],
          align: 'center',
          valign: 'center',
        });

        doc.moveDown(1);

        // Pass ID
        doc.fontSize(8)
           .fillColor('#999999')
           .text(`Pass ID: ${pass.passId}`, { align: 'center' });

        doc.text(`Domain: ${pass.domain}`, { align: 'center' });

        // Footer
        doc.fontSize(8)
           .fillColor('#CCCCCC')
           .text('Powered by Ada Ecosystem', 50, 750, { align: 'center' });

        // Finalize PDF
        doc.end();
      } catch (error) {
        console.error('PDF generation failed:', error);
        reject(error);
      }
    });
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
