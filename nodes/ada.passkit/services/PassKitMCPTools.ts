/**
 * PassKitMCPTools - MCP (Model Context Protocol) Tool Interface
 *
 * Exposes PassKit functionality as MCP tools that can be called by:
 * - Other Ada nodes (ada.congress, ada.interpreter, ada.travel, etc.)
 * - External AI agents (via MCP protocol)
 * - Cross-node workflows
 *
 * Tools:
 * - create_pass: Create a new pass
 * - validate_access: Validate pass access to zone
 * - scan_pass: Scan and log pass usage
 * - update_pass: Update pass properties
 * - revoke_pass: Revoke a pass
 * - get_pass: Retrieve pass details
 * - get_statistics: Get PassKit statistics
 */

import { PassKitNode } from '../PassKitNode.js';
import {
  CreatePassRequest,
  UpdatePassRequest,
  RevokePassRequest,
  ValidatePassRequest,
  PassDomain,
} from '../types/PassTypes.js';

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export class PassKitMCPTools {
  private passkitNode: PassKitNode;

  constructor(passkitNode: PassKitNode) {
    this.passkitNode = passkitNode;
  }

  /**
   * Get all available MCP tools
   */
  getTools(): MCPTool[] {
    return [
      this.createPassTool(),
      this.validateAccessTool(),
      this.scanPassTool(),
      this.updatePassTool(),
      this.revokePassTool(),
      this.getPassTool(),
      this.getStatisticsTool(),
    ];
  }

  /**
   * Execute an MCP tool call
   */
  async executeTool(toolName: string, args: any): Promise<any> {
    switch (toolName) {
      case 'create_pass':
        return this.createPass(args);
      case 'validate_access':
        return this.validateAccess(args);
      case 'scan_pass':
        return this.scanPass(args);
      case 'update_pass':
        return this.updatePass(args);
      case 'revoke_pass':
        return this.revokePass(args);
      case 'get_pass':
        return this.getPass(args);
      case 'get_statistics':
        return this.getStatistics(args);
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }

  /**
   * Tool: create_pass
   */
  private createPassTool(): MCPTool {
    return {
      name: 'create_pass',
      description: 'Create a new pass for any Ada domain (congress, travel, sea, interpreter, restaurant). Generates QR code and optional wallet passes.',
      inputSchema: {
        type: 'object',
        properties: {
          domain: {
            type: 'string',
            enum: ['ada.congress', 'ada.travel', 'ada.sea', 'ada.marina', 'ada.interpreter', 'ada.restaurant'],
            description: 'The Ada domain this pass belongs to',
          },
          passType: {
            type: 'string',
            description: 'Type of pass (CONGRESS_BADGE, BOARDING_PASS, YACHT_BOARDING, LANGUAGE_PASS, etc.)',
          },
          holder: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              email: { type: 'string' },
              phone: { type: 'string' },
              role: { type: 'string' },
              company: { type: 'string' },
              customFields: { type: 'object' },
            },
            required: ['name'],
          },
          validity: {
            type: 'object',
            properties: {
              validFrom: { type: 'string', description: 'ISO 8601 datetime' },
              validTo: { type: 'string', description: 'ISO 8601 datetime' },
              timezone: { type: 'string' },
              allowedDays: {
                type: 'array',
                items: {
                  type: 'string',
                  enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
                },
              },
              allowedTimeRanges: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    start: { type: 'string', description: 'HH:mm format' },
                    end: { type: 'string', description: 'HH:mm format' },
                  },
                },
              },
              maxScans: { type: 'number' },
              singleUse: { type: 'boolean' },
            },
            required: ['validFrom', 'validTo'],
          },
          zones: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                description: { type: 'string' },
                restrictions: {
                  type: 'object',
                  properties: {
                    requiresEscort: { type: 'boolean' },
                    maxOccupancy: { type: 'number' },
                    requiresPreAuth: { type: 'boolean' },
                  },
                },
              },
              required: ['id', 'name'],
            },
          },
          branding: {
            type: 'object',
            properties: {
              primaryColor: { type: 'string' },
              secondaryColor: { type: 'string' },
              textColor: { type: 'string' },
              backgroundColor: { type: 'string' },
              logoUrl: { type: 'string' },
              organizationName: { type: 'string' },
              template: {
                type: 'string',
                enum: ['modern', 'classic', 'minimal', 'luxury'],
              },
            },
          },
          metadata: {
            type: 'object',
            description: 'Custom metadata for domain-specific information',
          },
          generateQR: {
            type: 'boolean',
            description: 'Generate QR code (default: true)',
          },
          generateAppleWallet: {
            type: 'boolean',
            description: 'Generate Apple Wallet pass (default: false)',
          },
          generateGoogleWallet: {
            type: 'boolean',
            description: 'Generate Google Wallet pass (default: false)',
          },
          generatePDF: {
            type: 'boolean',
            description: 'Generate PDF pass (default: false)',
          },
        },
        required: ['domain', 'passType', 'holder', 'validity', 'zones'],
      },
    };
  }

  /**
   * Tool: validate_access
   */
  private validateAccessTool(): MCPTool {
    return {
      name: 'validate_access',
      description: 'Validate if a pass grants access to a specific zone. Checks pass status, validity period, time restrictions, and zone permissions.',
      inputSchema: {
        type: 'object',
        properties: {
          passId: {
            type: 'string',
            description: 'The pass ID to validate',
          },
          zoneId: {
            type: 'string',
            description: 'The zone ID to check access for',
          },
          scannedAt: {
            type: 'string',
            description: 'ISO 8601 datetime of scan (optional, defaults to now)',
          },
          scannedBy: {
            type: 'string',
            description: 'ID of the person/device performing the scan',
          },
          location: {
            type: 'string',
            description: 'Physical location of the scan',
          },
        },
        required: ['passId', 'zoneId'],
      },
    };
  }

  /**
   * Tool: scan_pass
   */
  private scanPassTool(): MCPTool {
    return {
      name: 'scan_pass',
      description: 'Scan a pass at a zone entrance. Validates access and logs the scan event. Updates scan count and zone occupancy.',
      inputSchema: {
        type: 'object',
        properties: {
          passId: {
            type: 'string',
            description: 'The pass ID to scan',
          },
          zoneId: {
            type: 'string',
            description: 'The zone ID where the pass is being scanned',
          },
          scannedAt: {
            type: 'string',
            description: 'ISO 8601 datetime of scan (optional, defaults to now)',
          },
          scannedBy: {
            type: 'string',
            description: 'ID of the person/device performing the scan',
          },
          location: {
            type: 'string',
            description: 'Physical location of the scan',
          },
        },
        required: ['passId', 'zoneId'],
      },
    };
  }

  /**
   * Tool: update_pass
   */
  private updatePassTool(): MCPTool {
    return {
      name: 'update_pass',
      description: 'Update an existing pass. Can update status, validity, zones, or metadata. Sends push notification to wallet passes.',
      inputSchema: {
        type: 'object',
        properties: {
          passId: {
            type: 'string',
            description: 'The pass ID to update',
          },
          updates: {
            type: 'object',
            properties: {
              status: {
                type: 'string',
                enum: ['active', 'pending', 'expired', 'revoked', 'redeemed'],
                description: 'New pass status',
              },
              validity: {
                type: 'object',
                description: 'Partial validity updates',
              },
              zones: {
                type: 'array',
                description: 'New zone list (replaces existing)',
              },
              metadata: {
                type: 'object',
                description: 'Metadata updates (merged with existing)',
              },
            },
          },
          reason: {
            type: 'string',
            description: 'Reason for the update',
          },
          updatedBy: {
            type: 'string',
            description: 'ID of the person/system making the update',
          },
        },
        required: ['passId', 'updates'],
      },
    };
  }

  /**
   * Tool: revoke_pass
   */
  private revokePassTool(): MCPTool {
    return {
      name: 'revoke_pass',
      description: 'Revoke a pass, preventing further use. Optionally notifies the pass holder.',
      inputSchema: {
        type: 'object',
        properties: {
          passId: {
            type: 'string',
            description: 'The pass ID to revoke',
          },
          reason: {
            type: 'string',
            description: 'Reason for revocation',
          },
          revokedBy: {
            type: 'string',
            description: 'ID of the person/system revoking the pass',
          },
          notifyHolder: {
            type: 'boolean',
            description: 'Whether to notify the pass holder (default: false)',
          },
        },
        required: ['passId', 'reason', 'revokedBy'],
      },
    };
  }

  /**
   * Tool: get_pass
   */
  private getPassTool(): MCPTool {
    return {
      name: 'get_pass',
      description: 'Retrieve full details of a pass by ID.',
      inputSchema: {
        type: 'object',
        properties: {
          passId: {
            type: 'string',
            description: 'The pass ID to retrieve',
          },
        },
        required: ['passId'],
      },
    };
  }

  /**
   * Tool: get_statistics
   */
  private getStatisticsTool(): MCPTool {
    return {
      name: 'get_statistics',
      description: 'Get PassKit statistics, optionally filtered by domain.',
      inputSchema: {
        type: 'object',
        properties: {
          domain: {
            type: 'string',
            enum: ['ada.congress', 'ada.travel', 'ada.sea', 'ada.marina', 'ada.interpreter', 'ada.restaurant'],
            description: 'Filter statistics by domain (optional)',
          },
        },
      },
    };
  }

  /**
   * Execute: create_pass
   */
  private async createPass(args: any): Promise<any> {
    const request: CreatePassRequest = {
      domain: args.domain,
      passType: args.passType,
      holder: args.holder,
      validity: {
        ...args.validity,
        validFrom: new Date(args.validity.validFrom),
        validTo: new Date(args.validity.validTo),
      },
      zones: args.zones,
      branding: args.branding,
      metadata: args.metadata,
      generateQR: args.generateQR !== false,
      generateAppleWallet: args.generateAppleWallet || false,
      generateGoogleWallet: args.generateGoogleWallet || false,
      generatePDF: args.generatePDF || false,
    };

    return this.passkitNode.processTask({
      type: 'create-pass',
      data: request,
    });
  }

  /**
   * Execute: validate_access
   */
  private async validateAccess(args: any): Promise<any> {
    const request: ValidatePassRequest = {
      passId: args.passId,
      zoneId: args.zoneId,
      scannedAt: args.scannedAt ? new Date(args.scannedAt) : undefined,
      scannedBy: args.scannedBy,
      location: args.location,
    };

    return this.passkitNode.processTask({
      type: 'validate-access',
      data: request,
    });
  }

  /**
   * Execute: scan_pass
   */
  private async scanPass(args: any): Promise<any> {
    const request: ValidatePassRequest = {
      passId: args.passId,
      zoneId: args.zoneId,
      scannedAt: args.scannedAt ? new Date(args.scannedAt) : undefined,
      scannedBy: args.scannedBy,
      location: args.location,
    };

    return this.passkitNode.processTask({
      type: 'scan-pass',
      data: request,
    });
  }

  /**
   * Execute: update_pass
   */
  private async updatePass(args: any): Promise<any> {
    const request: UpdatePassRequest = {
      passId: args.passId,
      updates: args.updates,
      reason: args.reason,
      updatedBy: args.updatedBy,
    };

    return this.passkitNode.processTask({
      type: 'update-pass',
      data: request,
    });
  }

  /**
   * Execute: revoke_pass
   */
  private async revokePass(args: any): Promise<any> {
    const request: RevokePassRequest = {
      passId: args.passId,
      reason: args.reason,
      revokedBy: args.revokedBy,
      notifyHolder: args.notifyHolder || false,
    };

    return this.passkitNode.processTask({
      type: 'revoke-pass',
      data: request,
    });
  }

  /**
   * Execute: get_pass
   */
  private async getPass(args: any): Promise<any> {
    return this.passkitNode.processTask({
      type: 'get-pass',
      data: { passId: args.passId },
    });
  }

  /**
   * Execute: get_statistics
   */
  private async getStatistics(args: any): Promise<any> {
    return this.passkitNode.processTask({
      type: 'get-statistics',
      data: { domain: args.domain },
    });
  }

  /**
   * Register all tools with node communication system
   */
  registerWithNode(): void {
    const tools = this.getTools();

    tools.forEach(tool => {
      this.passkitNode['communication'].onMessage(tool.name, async (message) => {
        return this.executeTool(tool.name, message.payload);
      });
    });

    console.log(`✅ Registered ${tools.length} MCP tools with PassKit node`);
  }
}

export default PassKitMCPTools;
