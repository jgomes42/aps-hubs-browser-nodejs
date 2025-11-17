# MCP UI Compatible Clients

This document lists MCP clients that support the MCP UI protocol for rendering interactive HTML components.

## Official MCP UI Support

### 1. **MCP-UI SDK Clients**
The official MCP-UI SDK provides client libraries for building MCP UI-compatible applications:
- **Website**: https://mcpui.dev
- **SDKs Available**: TypeScript, Ruby, Python
- **Components**: React and Web Components for host integration
- **Status**: Official SDK for MCP UI protocol

## Third-Party MCP Clients

### 2. **Model Context Client (MCC)**
- **Website**: https://www.modelcontextclient.com
- **Description**: AI chat application designed for seamless MCP integration
- **Features**:
  - Supports multiple AI models via MCP servers
  - Intuitive UI
  - Full support for resources, prompts, and tools
- **MCP UI Support**: Likely (designed for MCP integration)
- **Platform**: Cross-platform

### 3. **Dify MCP Client**
- **GitHub**: https://github.com/3dify-project/dify-mcp-client
- **Description**: Agent Strategy Plugin with GUI operations support
- **Features**:
  - Supports GUI operations via UI-TARS-SDK
  - Converts MCP tools, resources, and prompts into Dify Tools
  - Enables graphical user interface interactions
- **MCP UI Support**: Yes (via UI-TARS-SDK)
- **Platform**: Plugin for Dify platform

### 4. **MCP Chat Desktop App**
- **GitHub**: https://github.com/AI-QL/chat-mcp
- **Description**: Cross-platform interface for LLMs using MCP
- **Features**:
  - Built on Electron
  - Cross-platform compatibility
  - Clean, minimalistic codebase
- **MCP UI Support**: Unknown (may need verification)
- **Platform**: Desktop (Electron)

### 5. **mcp-ui (Vue.js/Electron)**
- **Website**: https://www.mcp.pizza/mcp-client/iErt/mcp-ui
- **Description**: Modern, cross-platform client built on Vue.js and Electron
- **Features**:
  - Supports Model Context Protocol (MCP)
  - Integrates OpenAI and Anthropic APIs
  - Multi-model support
  - Clean, intuitive chat interface
- **MCP UI Support**: Unknown (may need verification)
- **Platform**: Desktop (Electron)

## Current Status: Cursor IDE

**Cursor IDE** currently supports:
- ✅ Standard MCP protocol (tools, resources, prompts)
- ❌ MCP UI protocol (interactive HTML rendering) - **Not yet supported**

This is why you're seeing text/markdown responses instead of interactive UI components.

## Recommendations

### For Testing MCP UI Now:

1. **Build Your Own Client** (Recommended for development)
   - Use the official MCP-UI SDK: https://mcpui.dev
   - React components available: `<UIResourceRenderer />`
   - Web Components also available
   - Full control over UI rendering

2. **Try Model Context Client (MCC)**
   - Most likely to support MCP UI
   - Designed specifically for MCP integration
   - Cross-platform

3. **Use Dify MCP Client**
   - If you're using Dify platform
   - Has explicit GUI operations support

### For Production Use:

- **Wait for Cursor Support**: Cursor may add MCP UI support in future updates
- **Use Web UI**: Your Express server at `http://localhost:8080` provides full interactive UI
- **Build Custom Client**: Use MCP-UI SDK to create a custom client tailored to your needs

## Testing Your MCP Server

To test if a client supports MCP UI:

1. Configure the client to connect to your MCP server
2. Call a tool that returns a UI resource (like `list_hubs`)
3. Check if the client renders HTML/UI components or just shows text

Your MCP server returns both:
- UI resources (for MCP UI-compatible clients)
- Text/markdown (for standard MCP clients like Cursor)

## Resources

- **MCP UI Official Docs**: https://mcpui.dev
- **MCP Protocol Spec**: https://modelcontextprotocol.io
- **MCP Servers Directory**: https://mcpservers.org

## Next Steps

1. **Try Model Context Client** - Download and test with your MCP server
2. **Build a Simple Test Client** - Use MCP-UI SDK React components
3. **Monitor Cursor Updates** - Check for MCP UI support in future releases
4. **Use Web UI** - Continue using `http://localhost:8080` for interactive features




