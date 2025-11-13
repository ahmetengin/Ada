/**
 * Document Management Service
 *
 * Handles PDF/image uploads for vessel certificates:
 * - Insurance policies
 * - Registration documents (Ruhsat)
 * - Safety certificates
 * - Radio licenses
 * - Mavi Kart
 * - Survey reports
 * - Maintenance receipts
 */

import { createWriteStream, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { EventEmitter } from 'events';
import crypto from 'crypto';

export type DocumentType =
  | 'insurance'
  | 'registration'
  | 'seaworthiness'
  | 'safety-certificate'
  | 'radio-license'
  | 'mavi-kart'
  | 'deka-tax'
  | 'survey-report'
  | 'maintenance-receipt'
  | 'invoice'
  | 'crew-certificate'
  | 'other';

export interface DocumentMetadata {
  id: string;
  vesselMMSI: string;
  documentType: DocumentType;
  fileName: string;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
  uploadedAt: Date;
  uploadedBy: string;
  filePath: string;
  url: string;

  // Document-specific metadata
  issueDate?: Date;
  expiryDate?: Date;
  documentNumber?: string;
  issuedBy?: string;

  // OCR/Text extraction (optional)
  extractedText?: string;
  ocrProcessed?: boolean;

  // Verification
  verified: boolean;
  verifiedBy?: string;
  verifiedAt?: Date;

  // Tags
  tags: string[];
  notes?: string;
}

export interface UploadOptions {
  vesselMMSI: string;
  documentType: DocumentType;
  uploadedBy: string;
  issueDate?: Date;
  expiryDate?: Date;
  documentNumber?: string;
  issuedBy?: string;
  tags?: string[];
  notes?: string;
}

export class DocumentManagementService extends EventEmitter {
  private uploadDir: string;
  private documents: Map<string, DocumentMetadata> = new Map();

  constructor(uploadDir: string = './uploads/vessels') {
    super();
    this.uploadDir = uploadDir;
    this.ensureUploadDir();
  }

  /**
   * Ensure upload directory exists
   */
  private ensureUploadDir(): void {
    if (!existsSync(this.uploadDir)) {
      mkdirSync(this.uploadDir, { recursive: true });
      console.log(`✅ Created upload directory: ${this.uploadDir}`);
    }
  }

  /**
   * Upload document
   */
  async uploadDocument(
    file: {
      buffer: Buffer;
      originalname: string;
      mimetype: string;
      size: number;
    },
    options: UploadOptions
  ): Promise<DocumentMetadata> {
    // Validate file type
    if (!this.isValidFileType(file.mimetype)) {
      throw new Error(`Invalid file type: ${file.mimetype}. Only PDF, PNG, JPG, JPEG allowed.`);
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      throw new Error('File size exceeds 10MB limit');
    }

    // Generate unique document ID
    const documentId = this.generateDocumentId();

    // Generate unique filename
    const fileExtension = this.getFileExtension(file.originalname);
    const fileName = `${options.vesselMMSI}_${options.documentType}_${documentId}${fileExtension}`;

    // Create vessel-specific directory
    const vesselDir = join(this.uploadDir, options.vesselMMSI);
    if (!existsSync(vesselDir)) {
      mkdirSync(vesselDir, { recursive: true });
    }

    // Full file path
    const filePath = join(vesselDir, fileName);

    // Save file
    await this.saveFile(file.buffer, filePath);

    // Create metadata
    const metadata: DocumentMetadata = {
      id: documentId,
      vesselMMSI: options.vesselMMSI,
      documentType: options.documentType,
      fileName,
      originalFileName: file.originalname,
      mimeType: file.mimetype,
      fileSize: file.size,
      uploadedAt: new Date(),
      uploadedBy: options.uploadedBy,
      filePath,
      url: `/api/documents/${options.vesselMMSI}/${fileName}`,

      issueDate: options.issueDate,
      expiryDate: options.expiryDate,
      documentNumber: options.documentNumber,
      issuedBy: options.issuedBy,

      verified: false,
      tags: options.tags || [],
      notes: options.notes,
    };

    // Store metadata
    this.documents.set(documentId, metadata);

    // Emit event
    this.emit('document:uploaded', metadata);

    // If PDF, queue for OCR (optional)
    if (file.mimetype === 'application/pdf') {
      this.queueForOCR(documentId);
    }

    console.log(`✅ Document uploaded: ${documentId} (${file.originalname})`);

    return metadata;
  }

  /**
   * Save file to disk
   */
  private async saveFile(buffer: Buffer, filePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const writeStream = createWriteStream(filePath);

      writeStream.on('finish', () => {
        console.log(`File saved: ${filePath}`);
        resolve();
      });

      writeStream.on('error', (error) => {
        console.error(`Error saving file: ${error}`);
        reject(error);
      });

      writeStream.write(buffer);
      writeStream.end();
    });
  }

  /**
   * Get document by ID
   */
  getDocument(documentId: string): DocumentMetadata | null {
    return this.documents.get(documentId) || null;
  }

  /**
   * Get all documents for vessel
   */
  getVesselDocuments(vesselMMSI: string): DocumentMetadata[] {
    return Array.from(this.documents.values())
      .filter(doc => doc.vesselMMSI === vesselMMSI)
      .sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
  }

  /**
   * Get documents by type
   */
  getDocumentsByType(vesselMMSI: string, documentType: DocumentType): DocumentMetadata[] {
    return this.getVesselDocuments(vesselMMSI)
      .filter(doc => doc.documentType === documentType);
  }

  /**
   * Get expiring documents (within 30 days)
   */
  getExpiringDocuments(vesselMMSI: string): DocumentMetadata[] {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    return this.getVesselDocuments(vesselMMSI)
      .filter(doc => {
        if (!doc.expiryDate) return false;
        const expiry = new Date(doc.expiryDate);
        return expiry < thirtyDaysFromNow && expiry > new Date();
      });
  }

  /**
   * Get expired documents
   */
  getExpiredDocuments(vesselMMSI: string): DocumentMetadata[] {
    const now = new Date();

    return this.getVesselDocuments(vesselMMSI)
      .filter(doc => {
        if (!doc.expiryDate) return false;
        return new Date(doc.expiryDate) < now;
      });
  }

  /**
   * Verify document
   */
  verifyDocument(documentId: string, verifiedBy: string): boolean {
    const document = this.documents.get(documentId);

    if (!document) {
      return false;
    }

    document.verified = true;
    document.verifiedBy = verifiedBy;
    document.verifiedAt = new Date();

    this.emit('document:verified', document);

    console.log(`✅ Document verified: ${documentId}`);

    return true;
  }

  /**
   * Update document metadata
   */
  updateMetadata(documentId: string, updates: Partial<DocumentMetadata>): boolean {
    const document = this.documents.get(documentId);

    if (!document) {
      return false;
    }

    Object.assign(document, updates);

    this.emit('document:updated', document);

    console.log(`✅ Document metadata updated: ${documentId}`);

    return true;
  }

  /**
   * Delete document
   */
  async deleteDocument(documentId: string): Promise<boolean> {
    const document = this.documents.get(documentId);

    if (!document) {
      return false;
    }

    // Delete file (in production, move to archive instead)
    // await fs.promises.unlink(document.filePath);

    // Remove metadata
    this.documents.delete(documentId);

    this.emit('document:deleted', document);

    console.log(`✅ Document deleted: ${documentId}`);

    return true;
  }

  /**
   * Check document compliance
   * Returns list of missing/expired required documents
   */
  checkCompliance(vesselMMSI: string): {
    compliant: boolean;
    missingDocuments: DocumentType[];
    expiredDocuments: DocumentMetadata[];
    expiringDocuments: DocumentMetadata[];
  } {
    const requiredTypes: DocumentType[] = [
      'insurance',
      'registration',
      'safety-certificate',
      'radio-license',
    ];

    const existingTypes = new Set(
      this.getVesselDocuments(vesselMMSI).map(doc => doc.documentType)
    );

    const missingDocuments = requiredTypes.filter(type => !existingTypes.has(type));
    const expiredDocuments = this.getExpiredDocuments(vesselMMSI);
    const expiringDocuments = this.getExpiringDocuments(vesselMMSI);

    const compliant = missingDocuments.length === 0 && expiredDocuments.length === 0;

    return {
      compliant,
      missingDocuments,
      expiredDocuments,
      expiringDocuments,
    };
  }

  /**
   * Generate document report
   */
  generateReport(vesselMMSI: string): any {
    const documents = this.getVesselDocuments(vesselMMSI);
    const compliance = this.checkCompliance(vesselMMSI);

    const reportByType: Record<string, number> = {};
    documents.forEach(doc => {
      reportByType[doc.documentType] = (reportByType[doc.documentType] || 0) + 1;
    });

    return {
      vesselMMSI,
      totalDocuments: documents.length,
      documentsByType: reportByType,
      compliance: compliance.compliant,
      missingDocuments: compliance.missingDocuments,
      expiredCount: compliance.expiredDocuments.length,
      expiringCount: compliance.expiringDocuments.length,
      verifiedDocuments: documents.filter(d => d.verified).length,
      lastUpload: documents[0]?.uploadedAt,
    };
  }

  /**
   * Queue document for OCR processing
   * (Integration point for OCR service)
   */
  private queueForOCR(documentId: string): void {
    const document = this.documents.get(documentId);

    if (!document) return;

    // In production, queue to OCR service (e.g., Tesseract, Google Cloud Vision)
    console.log(`📄 Queued for OCR: ${documentId}`);

    this.emit('document:ocr-queued', document);

    // Simulate OCR processing
    setTimeout(() => {
      document.extractedText = 'Simulated OCR text extraction...';
      document.ocrProcessed = true;
      this.emit('document:ocr-completed', document);
    }, 5000);
  }

  /**
   * Search documents by text (uses OCR extracted text)
   */
  searchDocuments(vesselMMSI: string, query: string): DocumentMetadata[] {
    return this.getVesselDocuments(vesselMMSI)
      .filter(doc => {
        const searchableText = [
          doc.originalFileName,
          doc.documentNumber,
          doc.issuedBy,
          doc.extractedText,
          doc.notes,
          ...doc.tags,
        ].join(' ').toLowerCase();

        return searchableText.includes(query.toLowerCase());
      });
  }

  /**
   * Validate file type
   */
  private isValidFileType(mimeType: string): boolean {
    const allowedTypes = [
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/jpg',
    ];

    return allowedTypes.includes(mimeType);
  }

  /**
   * Get file extension
   */
  private getFileExtension(filename: string): string {
    const parts = filename.split('.');
    return parts.length > 1 ? `.${parts[parts.length - 1]}` : '';
  }

  /**
   * Generate unique document ID
   */
  private generateDocumentId(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Export documents list to JSON
   */
  exportDocumentsList(vesselMMSI: string): string {
    const documents = this.getVesselDocuments(vesselMMSI);
    return JSON.stringify(documents, null, 2);
  }

  /**
   * Get statistics
   */
  getStatistics(): any {
    const allDocuments = Array.from(this.documents.values());

    const byType: Record<string, number> = {};
    allDocuments.forEach(doc => {
      byType[doc.documentType] = (byType[doc.documentType] || 0) + 1;
    });

    return {
      totalDocuments: allDocuments.length,
      totalVessels: new Set(allDocuments.map(d => d.vesselMMSI)).size,
      documentsByType: byType,
      verifiedDocuments: allDocuments.filter(d => d.verified).length,
      ocrProcessed: allDocuments.filter(d => d.ocrProcessed).length,
      totalFileSize: allDocuments.reduce((sum, d) => sum + d.fileSize, 0),
    };
  }
}
