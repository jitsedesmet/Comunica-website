/**
 * WebMCP (Web Model Context Protocol) Implementation
 * 
 * This implements the WebMCP specification for enabling web apps to provide
 * JavaScript-based tools that can be accessed by AI agents.
 * 
 * Reference: https://github.com/webmachinelearning/webmcp
 */

(function() {
  'use strict';

  // Check if already initialized
  if (window.navigator.modelContext) {
    return;
  }

  // Store registered tools
  const registeredTools = new Map();
  
  // Store active agents
  const activeAgents = new Set();

  /**
   * Agent interface passed to tool execute functions
   */
  class Agent {
    constructor(agentId) {
      this.agentId = agentId;
    }

    /**
     * Request user interaction during tool execution
     * @param {Function} callback - Async function to execute with user interaction
     * @returns {Promise} - Promise resolving to the result of the callback
     */
    async requestUserInteraction(callback) {
      if (typeof callback !== 'function') {
        throw new TypeError('callback must be a function');
      }
      
      try {
        return await callback();
      } catch (error) {
        console.error('Error during user interaction:', error);
        throw error;
      }
    }
  }

  /**
   * Validate tool schema according to JSON Schema
   */
  function validateToolSchema(tool) {
    if (!tool || typeof tool !== 'object') {
      throw new TypeError('Tool must be an object');
    }

    if (!tool.name || typeof tool.name !== 'string') {
      throw new TypeError('Tool must have a string name');
    }

    if (!tool.description || typeof tool.description !== 'string') {
      throw new TypeError('Tool must have a string description');
    }

    if (!tool.inputSchema || typeof tool.inputSchema !== 'object') {
      throw new TypeError('Tool must have an inputSchema object');
    }

    if (typeof tool.execute !== 'function') {
      throw new TypeError('Tool must have an execute function');
    }

    return true;
  }

  /**
   * Execute a tool call
   */
  async function executeTool(toolName, parameters, agentId) {
    const tool = registeredTools.get(toolName);
    
    if (!tool) {
      throw new Error(`Tool "${toolName}" not found`);
    }

    // Create agent instance for this tool call
    const agent = new Agent(agentId);
    
    // Dispatch toolcall event before executing
    const event = new CustomEvent('toolcall', {
      detail: {
        name: toolName,
        parameters,
        agentId
      },
      cancelable: true
    });
    
    let preventedDefault = false;
    let customResponse = null;
    
    event.preventDefault = function() {
      preventedDefault = true;
    };
    
    event.respondWith = function(response) {
      customResponse = response;
    };
    
    window.dispatchEvent(event);
    
    // If event handler prevented default, return custom response
    if (preventedDefault) {
      return customResponse;
    }

    try {
      // Execute the tool
      const result = await tool.execute(parameters, agent);
      return result;
    } catch (error) {
      console.error(`Error executing tool "${toolName}":`, error);
      throw error;
    }
  }

  /**
   * ModelContext interface
   */
  const modelContext = {
    /**
     * Register multiple tools at once, clearing previous tools
     * @param {Object} context - Context object with tools array
     */
    provideContext(context) {
      if (!context || typeof context !== 'object') {
        throw new TypeError('Context must be an object');
      }

      if (!Array.isArray(context.tools)) {
        throw new TypeError('Context must have a tools array');
      }

      // Clear existing tools
      registeredTools.clear();

      // Register new tools
      context.tools.forEach(tool => {
        try {
          validateToolSchema(tool);
          registeredTools.set(tool.name, tool);
        } catch (error) {
          console.error(`Error registering tool "${tool?.name}":`, error);
          throw error;
        }
      });

      // Dispatch event to notify that tools have changed
      window.dispatchEvent(new CustomEvent('webmcp:toolschanged', {
        detail: {
          tools: Array.from(registeredTools.keys())
        }
      }));

      return true;
    },

    /**
     * Register a single tool
     * @param {Object} tool - Tool descriptor
     */
    registerTool(tool) {
      validateToolSchema(tool);
      
      registeredTools.set(tool.name, tool);
      
      // Dispatch event
      window.dispatchEvent(new CustomEvent('webmcp:toolregistered', {
        detail: {
          name: tool.name
        }
      }));

      return true;
    },

    /**
     * Unregister a tool by name
     * @param {string} toolName - Name of the tool to unregister
     */
    unregisterTool(toolName) {
      if (typeof toolName !== 'string') {
        throw new TypeError('Tool name must be a string');
      }

      const existed = registeredTools.delete(toolName);
      
      if (existed) {
        // Dispatch event
        window.dispatchEvent(new CustomEvent('webmcp:toolunregistered', {
          detail: {
            name: toolName
          }
        }));
      }

      return existed;
    },

    /**
     * Get list of registered tool names
     * @returns {Array<string>} - Array of tool names
     */
    getTools() {
      return Array.from(registeredTools.keys());
    },

    /**
     * Get tool descriptor by name
     * @param {string} toolName - Name of the tool
     * @returns {Object} - Tool descriptor (without execute function)
     */
    getTool(toolName) {
      const tool = registeredTools.get(toolName);
      if (!tool) {
        return null;
      }

      // Return descriptor without execute function for security
      return {
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema
      };
    },

    /**
     * Execute a tool (for agent/testing use)
     * @param {string} toolName - Name of the tool to execute
     * @param {Object} parameters - Parameters to pass to the tool
     * @param {string} agentId - Optional agent identifier
     * @returns {Promise} - Promise resolving to tool result
     */
    executeTool(toolName, parameters, agentId = 'default') {
      return executeTool(toolName, parameters, agentId);
    }
  };

  // Expose the ModelContext API
  Object.defineProperty(window.navigator, 'modelContext', {
    value: modelContext,
    writable: false,
    configurable: false,
    enumerable: true
  });

  // Dispatch ready event
  window.dispatchEvent(new CustomEvent('webmcp:ready'));

  console.log('WebMCP initialized successfully');
})();
