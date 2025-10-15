# GraphQL Client Tablet

A world-class, client-only GraphQL client for Scratch Tabs that supports queries, mutations, subscriptions, and schema introspection.

## Features

### 🎯 Core Functionality

- **Schema Introspection**: Automatically introspect GraphQL APIs to explore available queries, mutations, and subscriptions
- **Query Execution**: Execute GraphQL queries and mutations with full error handling
- **Subscriptions**: Real-time subscription support using native WebSocket API with graphql-transport-ws protocol
- **Variables & Headers**: Full support for query variables and custom HTTP headers
- **Response Viewer**: Clean display of response data, errors, and performance metrics

### 🎨 User Interface

**Three-Panel Layout** (following industry-standard GraphQL client UX):

1. **Left Panel - Schema Explorer**
   - Tree view of all queries, mutations, and subscriptions
   - Searchable field explorer
   - Type documentation viewer
   - Click fields to insert into query editor

2. **Middle Panel - Query Editor**
   - GraphQL syntax highlighting (textarea-based for simplicity)
   - Tabbed interface for Query, Variables, and Headers
   - Auto-detection of operation type (query/mutation/subscription)
   - Execute button with loading states

3. **Right Panel - Response Viewer**
   - Tabbed view for Response Data, Errors, and Subscription Messages
   - Performance metrics (response time, payload size, status)
   - JSON formatting
   - Real-time subscription message log

### 📜 History Management

- Automatic query history tracking
- Pin important queries for quick access
- One-hour retention for unpinned queries
- Restore previous queries with one click

### 🔒 Security

- Sensitive header masking using SensitiveDataManager
- Auto-detection and masking of authentication headers
- Secure handling of bearer tokens and API keys

### 🌐 WebSocket Support

- Native WebSocket API implementation
- graphql-transport-ws protocol support
- Auto-reconnection with exponential backoff
- Real-time subscription message streaming
- Proper connection lifecycle management

## Architecture

### File Structure

```
graphql/
├── GraphQLTablet.tsx         # Main tablet component
├── types.ts                  # TypeScript type definitions
├── utils/
│   └── graphqlUtils.ts       # Core utilities (introspection, execution, WebSocket)
├── __tests__/
│   ├── GraphQLTablet.test.tsx    # Component tests
│   └── graphqlUtils.test.ts      # Utility tests
└── README.md                 # This file
```

### State Management

The tablet uses a single `GraphQLTabletState` object that manages:

- GraphQL endpoint URL
- Current query, variables, and headers
- Introspected schema
- Query execution state and response
- Subscription state and messages
- UI state (active tabs, panel widths, etc.)
- Query history

### Components

All components are co-located in `GraphQLTablet.tsx` following the Single Responsibility Principle:

- `UrlBar`: Endpoint input and schema loading
- `SchemaExplorer`: Interactive schema documentation browser
- `QueryHistory`: Historical query management
- `HeadersEditor`: Key-value editor for HTTP headers
- `MonacoEditor`: Simple textarea-based editor (can be upgraded to Monaco)
- `ResponseViewer`: Response data, errors, and subscription messages

## Usage

### Basic Query

1. Enter your GraphQL endpoint URL
2. Click "Load Schema" to introspect the API
3. Browse available queries in the left panel
4. Write your query in the middle panel
5. Click "Execute Query" to run it
6. View results in the right panel

### With Variables

1. Write a query with variables:
   ```graphql
   query GetUser($id: ID!) {
     user(id: $id) {
       id
       name
       email
     }
   }
   ```
2. Switch to the "Variables" tab
3. Add your variables in JSON format:
   ```json
   {
     "id": "123"
   }
   ```
4. Execute the query

### With Authentication

1. Switch to the "Headers" tab
2. Add an Authorization header:
   - Key: `Authorization`
   - Value: `Bearer your-token-here`
3. The value will be automatically masked for security

### Subscriptions

1. Write a subscription query:
   ```graphql
   subscription OnUserUpdated {
     userUpdated {
       id
       name
     }
   }
   ```
2. Click "Start Subscription"
3. View incoming messages in the "Subscription" tab
4. Click "Stop Subscription" when done

## Technical Details

### GraphQL Introspection

The tablet uses the standard GraphQL introspection query to fetch the complete schema, including:
- All available types
- Fields and their arguments
- Type descriptions
- Deprecation information
- Directives

### Query Execution

Queries and mutations are executed using the native `fetch` API:
- POST request to the GraphQL endpoint
- JSON body with `query` and `variables`
- Custom headers support
- 30-second timeout
- Comprehensive error handling

### WebSocket Subscriptions

Subscriptions use the `graphql-transport-ws` protocol:
1. Convert HTTP endpoint to WebSocket (https → wss)
2. Establish WebSocket connection
3. Send `connection_init` message
4. Subscribe to operations
5. Handle incoming data/error/complete messages
6. Auto-reconnection on connection loss

### Error Handling

The client gracefully handles:
- **Network Errors**: Connection failures, timeouts
- **CORS Errors**: Detects and explains CORS issues
- **GraphQL Errors**: Displays errors from the `errors` array
- **Schema Errors**: Introspection failures
- **Invalid JSON**: Variable parsing errors

### Performance

- Response time tracking using `performance.now()`
- Payload size calculation
- Efficient state updates with minimal re-renders
- Auto-cleanup of old history items

## Testing

Comprehensive test coverage with Jest and React Testing Library:

### Component Tests (`GraphQLTablet.test.tsx`)
- Tablet interface compliance
- State serialization/deserialization
- Rendering all UI components
- Schema loading and error handling
- Query execution with variables
- Tab switching
- Headers management
- Response display
- History management

### Utility Tests (`graphqlUtils.test.ts`)
- Schema introspection
- Query execution
- Type formatting
- Schema parsing
- WebSocket client
- Variable parsing
- Operation detection

Run tests with:
```bash
npm test -- graphql
```

## Browser Compatibility

- Modern browsers with `fetch` API support
- WebSocket API support required for subscriptions
- No polyfills needed for recent Chrome, Firefox, Safari, Edge

## CORS Considerations

Since this is a client-side application, CORS restrictions apply:
- The GraphQL server must include appropriate CORS headers
- For development, consider using a CORS proxy
- The UI displays a warning about CORS limitations

## Future Enhancements

Possible improvements for future versions:
- Monaco Editor integration for advanced syntax highlighting
- GraphQL auto-completion based on schema
- Query prettification/formatting
- Query fragments support
- Multiple operations in single document with operation selector
- Request/response size limits
- Export/import functionality
- Mock response generation
- GraphQL over SSE support
- File upload support (multipart requests)

## Dependencies

This implementation uses **only native browser APIs**:
- `fetch` for HTTP requests
- `WebSocket` for subscriptions
- `JSON.parse/stringify` for data handling
- `crypto.randomUUID` for ID generation

No external GraphQL libraries required!

## License

Part of the Scratch Tabs project.
