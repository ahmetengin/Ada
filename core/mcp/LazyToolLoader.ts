/**
 * LazyToolLoader - Lazy loading pattern for MCP tools
 *
 * Loads tools only when needed, reducing initial context size
 * and keeping the agent focused on core tasks.
 */

import { MCPToolExecutor, MCPToolConfig, MCPToolResult } from './MCPToolExecutor.js';

export interface ToolDefinition {
  name: string;
  serverCommand: string;
  description: string;
  parameters: Record<string, any>;
  estimatedTokens: number;
}

export class LazyToolLoader {
  private executor: MCPToolExecutor;
  private loadedTools: Map<string, ToolDefinition> = new Map();
  private toolRegistry: Map<string, ToolDefinition> = new Map();

  constructor(executor: MCPToolExecutor) {
    this.executor = executor;
    this.registerDefaultTools();
  }

  /**
   * Register available tools (lightweight metadata only)
   */
  private registerDefaultTools(): void {
    // Yargi-MCP tools
    this.registerTool({
      name: 'search_yargitay',
      serverCommand: 'uvx yargi-mcp',
      description: 'Search Turkish Supreme Court (Yargıtay) decisions',
      parameters: { keyword: 'string', chamber: 'string?', date_range: 'string?' },
      estimatedTokens: 8692,
    });

    this.registerTool({
      name: 'search_danistay',
      serverCommand: 'uvx yargi-mcp',
      description: 'Search Turkish Council of State (Danıştay) decisions',
      parameters: { keyword: 'string', chamber: 'string?', date_range: 'string?' },
      estimatedTokens: 8692,
    });

    this.registerTool({
      name: 'search_anayasa',
      serverCommand: 'uvx yargi-mcp',
      description: 'Search Turkish Constitutional Court decisions',
      parameters: { keyword: 'string', decision_type: 'string?' },
      estimatedTokens: 8692,
    });

    // More tools can be added here without increasing context size
  }

  /**
   * Register a tool (metadata only, not the actual implementation)
   */
  registerTool(tool: ToolDefinition): void {
    this.toolRegistry.set(tool.name, tool);
  }

  /**
   * Get available tools (just names and descriptions)
   */
  getAvailableTools(): Array<{ name: string; description: string }> {
    return Array.from(this.toolRegistry.values()).map(tool => ({
      name: tool.name,
      description: tool.description,
    }));
  }

  /**
   * Execute a tool (loads and executes on-demand)
   */
  async executeTool(
    toolName: string,
    parameters: Record<string, any>
  ): Promise<MCPToolResult> {
    const toolDef = this.toolRegistry.get(toolName);

    if (!toolDef) {
      throw new Error(`Tool not found: ${toolName}`);
    }

    // Mark as loaded (for statistics)
    if (!this.loadedTools.has(toolName)) {
      this.loadedTools.set(toolName, toolDef);
    }

    // Execute via MCP executor
    const config: MCPToolConfig = {
      serverCommand: toolDef.serverCommand,
      toolName: toolDef.name,
      parameters,
    };

    return await this.executor.executeTool(config);
  }

  /**
   * Smart tool suggestion based on context
   */
  suggestTools(context: string): ToolDefinition[] {
    const keywords = context.toLowerCase();
    const suggestions: ToolDefinition[] = [];

    // Simple keyword matching - would use ML in production
    if (keywords.includes('yargıtay') || keywords.includes('supreme court')) {
      const tool = this.toolRegistry.get('search_yargitay');
      if (tool) suggestions.push(tool);
    }

    if (keywords.includes('danıştay') || keywords.includes('council of state')) {
      const tool = this.toolRegistry.get('search_danistay');
      if (tool) suggestions.push(tool);
    }

    if (keywords.includes('anayasa') || keywords.includes('constitutional')) {
      const tool = this.toolRegistry.get('search_anayasa');
      if (tool) suggestions.push(tool);
    }

    return suggestions;
  }

  /**
   * Get loading statistics
   */
  getLoadingStats(): {
    totalRegistered: number;
    totalLoaded: number;
    loadRate: number;
    tokensSaved: number;
  } {
    const totalRegistered = this.toolRegistry.size;
    const totalLoaded = this.loadedTools.size;
    const unloaded = totalRegistered - totalLoaded;

    // Calculate tokens saved by not loading all tools
    let tokensSaved = 0;
    this.toolRegistry.forEach((tool, name) => {
      if (!this.loadedTools.has(name)) {
        tokensSaved += tool.estimatedTokens;
      }
    });

    return {
      totalRegistered,
      totalLoaded,
      loadRate: totalRegistered > 0 ? (totalLoaded / totalRegistered) * 100 : 0,
      tokensSaved,
    };
  }

  /**
   * Preload specific tools (for hot paths)
   */
  async preloadTools(toolNames: string[]): Promise<void> {
    for (const name of toolNames) {
      const tool = this.toolRegistry.get(name);
      if (tool && !this.loadedTools.has(name)) {
        this.loadedTools.set(name, tool);
      }
    }
  }

  /**
   * Unload unused tools to free resources
   */
  unloadTool(toolName: string): void {
    this.loadedTools.delete(toolName);
  }

  /**
   * Clear all loaded tools
   */
  clearLoaded(): void {
    this.loadedTools.clear();
  }
}
