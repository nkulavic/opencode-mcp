import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerSessionTool } from "./tools/session.js";
import { registerMessageTool } from "./tools/message.js";
import { registerFileTool } from "./tools/file.js";
import { registerFindTool } from "./tools/find.js";
import { registerProjectTool } from "./tools/project.js";
import { registerConfigTool } from "./tools/config.js";
import { registerAuthTool } from "./tools/auth.js";

const server = new McpServer({
  name: "opencode-mcp",
  version: "0.1.0",
});

registerSessionTool(server);
registerMessageTool(server);
registerFileTool(server);
registerFindTool(server);
registerProjectTool(server);
registerConfigTool(server);
registerAuthTool(server);

const transport = new StdioServerTransport();
await server.connect(transport);
