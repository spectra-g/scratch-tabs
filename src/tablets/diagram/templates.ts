import { DiagramTemplate } from './types';

export const DIAGRAM_TEMPLATES: DiagramTemplate[] = [
  // Flowchart Templates
  {
    id: 'flowchart-basic',
    name: 'Basic Flowchart',
    description: 'Simple decision flow with start and end nodes',
    category: 'flowchart',
    code: `flowchart TD
    A[Start] --> B{Decision?}
    B -->|Yes| C[Action 1]
    B -->|No| D[Action 2]
    C --> E[End]
    D --> E`,
    tags: ['basic', 'decision', 'flow'],
    complexity: 'basic'
  },
  {
    id: 'flowchart-cicd',
    name: 'CI/CD Pipeline',
    description: 'Complete continuous integration and deployment workflow',
    category: 'flowchart',
    code: `flowchart LR
    A[Code Commit] --> B[Build]
    B --> C{Tests Pass?}
    C -->|Yes| D[Security Scan]
    C -->|No| E[Notify Developer]
    D --> F{Scan Clean?}
    F -->|Yes| G[Deploy to Staging]
    F -->|No| H[Security Review]
    G --> I[Integration Tests]
    I --> J{Tests Pass?}
    J -->|Yes| K[Deploy to Production]
    J -->|No| L[Rollback]
    E --> A
    H --> G
    L --> G`,
    tags: ['cicd', 'devops', 'pipeline', 'deployment'],
    complexity: 'intermediate'
  },
  {
    id: 'flowchart-auth',
    name: 'User Authentication Flow',
    description: 'Complete user login and registration process',
    category: 'flowchart',
    code: `flowchart TD
    A[User Visits Site] --> B{Logged In?}
    B -->|Yes| C[Dashboard]
    B -->|No| D[Login Page]
    D --> E{Has Account?}
    E -->|Yes| F[Enter Credentials]
    E -->|No| G[Registration Form]
    F --> H{Valid Credentials?}
    H -->|Yes| I[Generate JWT]
    H -->|No| J[Show Error]
    G --> K{Valid Data?}
    K -->|Yes| L[Create Account]
    K -->|No| M[Show Validation Errors]
    I --> C
    J --> F
    L --> I
    M --> G`,
    tags: ['authentication', 'login', 'security', 'user'],
    complexity: 'intermediate'
  },

  // Sequence Diagram Templates
  {
    id: 'sequence-api',
    name: 'API Request/Response',
    description: 'Standard REST API interaction pattern',
    category: 'sequence',
    code: `sequenceDiagram
    participant Client
    participant API
    participant Database
    
    Client->>+API: POST /api/users
    API->>+Database: INSERT user
    Database-->>-API: User created
    API-->>-Client: 201 Created
    
    Client->>+API: GET /api/users/123
    API->>+Database: SELECT user
    Database-->>-API: User data
    API-->>-Client: 200 OK`,
    tags: ['api', 'rest', 'database', 'http'],
    complexity: 'basic'
  },
  {
    id: 'sequence-oauth',
    name: 'OAuth 2.0 Flow',
    description: 'Complete OAuth authorization code flow',
    category: 'sequence',
    code: `sequenceDiagram
    participant User
    participant Client
    participant AuthServer
    participant ResourceServer
    
    User->>Client: Click "Login"
    Client->>AuthServer: Authorization Request
    AuthServer->>User: Login Form
    User->>AuthServer: Credentials
    AuthServer->>User: Authorization Code
    User->>Client: Authorization Code
    Client->>AuthServer: Token Request + Code
    AuthServer->>Client: Access Token
    Client->>ResourceServer: API Request + Token
    ResourceServer->>Client: Protected Resource`,
    tags: ['oauth', 'authentication', 'security', 'authorization'],
    complexity: 'advanced'
  },

  // Class Diagram Templates
  {
    id: 'class-ecommerce',
    name: 'E-commerce Model',
    description: 'Basic e-commerce domain model with relationships',
    category: 'class',
    code: `classDiagram
    class User {
        +String id
        +String email
        +String name
        +Date createdAt
        +login()
        +logout()
    }
    
    class Product {
        +String id
        +String name
        +Decimal price
        +Integer stock
        +String description
        +updateStock()
        +setPrice()
    }
    
    class Order {
        +String id
        +String userId
        +Date orderDate
        +OrderStatus status
        +Decimal total
        +addItem()
        +calculateTotal()
        +updateStatus()
    }
    
    class OrderItem {
        +String productId
        +Integer quantity
        +Decimal unitPrice
    }
    
    User ||--o{ Order : places
    Order ||--o{ OrderItem : contains
    Product ||--o{ OrderItem : "ordered as"`,
    tags: ['ecommerce', 'domain', 'model', 'database'],
    complexity: 'intermediate'
  },

  // Gantt Chart Templates
  {
    id: 'gantt-release',
    name: 'Product Release Plan',
    description: 'Software release timeline with milestones',
    category: 'gantt',
    code: `gantt
    title Product Release Timeline
    dateFormat YYYY-MM-DD
    section Planning
    Requirements Gathering    :done, req, 2024-01-01, 2024-01-15
    Design Phase             :done, design, after req, 20d
    Architecture Review      :done, arch, after design, 5d
    
    section Development
    Backend Development      :active, backend, 2024-02-10, 45d
    Frontend Development     :frontend, after arch, 40d
    API Integration         :api, after backend, 15d
    
    section Testing
    Unit Testing            :testing, after frontend, 10d
    Integration Testing     :integration, after api, 15d
    User Acceptance Testing :uat, after integration, 10d
    
    section Release
    Production Deployment   :milestone, deploy, after uat, 1d
    Post-Launch Monitoring  :monitor, after deploy, 7d`,
    tags: ['project', 'timeline', 'release', 'planning'],
    complexity: 'intermediate'
  },

  // State Diagram Templates
  {
    id: 'state-order',
    name: 'Order State Machine',
    description: 'E-commerce order lifecycle state transitions',
    category: 'state',
    code: `stateDiagram-v2
    [*] --> Pending
    Pending --> Processing : payment_confirmed
    Pending --> Cancelled : payment_failed
    Processing --> Shipped : items_packed
    Processing --> Cancelled : out_of_stock
    Shipped --> Delivered : delivery_confirmed
    Shipped --> Returned : return_requested
    Delivered --> [*]
    Cancelled --> [*]
    Returned --> Refunded : refund_processed
    Refunded --> [*]`,
    tags: ['state', 'order', 'ecommerce', 'lifecycle'],
    complexity: 'intermediate'
  },

  // ER Diagram Templates
  {
    id: 'er-blog',
    name: 'Blog Database Schema',
    description: 'Complete blog system entity relationships',
    category: 'er',
    code: `erDiagram
    USER {
        int id PK
        string email UK
        string username UK
        string password_hash
        datetime created_at
        datetime updated_at
    }
    
    POST {
        int id PK
        int author_id FK
        string title
        text content
        string slug UK
        enum status
        datetime published_at
        datetime created_at
        datetime updated_at
    }
    
    CATEGORY {
        int id PK
        string name UK
        string slug UK
        text description
    }
    
    TAG {
        int id PK
        string name UK
        string color
    }
    
    COMMENT {
        int id PK
        int post_id FK
        int user_id FK
        text content
        datetime created_at
    }
    
    USER ||--o{ POST : writes
    POST }o--o{ CATEGORY : belongs_to
    POST }o--o{ TAG : tagged_with
    POST ||--o{ COMMENT : has
    USER ||--o{ COMMENT : writes`,
    tags: ['database', 'blog', 'schema', 'relationships'],
    complexity: 'advanced'
  },

  // Journey Diagram Templates
  {
    id: 'journey-customer',
    name: 'Customer Journey Map',
    description: 'User experience journey through product discovery',
    category: 'journey',
    code: `journey
    title Customer Purchase Journey
    section Discovery
      Visit Website     : 5: Customer
      Browse Products   : 3: Customer
      Read Reviews      : 4: Customer
    section Evaluation
      Compare Options   : 2: Customer
      Check Pricing     : 3: Customer
      Contact Support   : 4: Customer, Support
    section Purchase
      Add to Cart       : 5: Customer
      Checkout Process  : 3: Customer
      Payment          : 4: Customer, Payment
    section Post-Purchase
      Order Confirmation: 5: Customer
      Shipping Updates  : 4: Customer, Logistics
      Product Delivery  : 5: Customer, Logistics
      Follow-up Survey  : 3: Customer, Support`,
    tags: ['journey', 'customer', 'experience', 'ux'],
    complexity: 'intermediate'
  },

  // Git Graph Templates
  {
    id: 'gitgraph-feature',
    name: 'Feature Branch Workflow',
    description: 'Git branching strategy with feature development',
    category: 'gitgraph',
    code: `gitgraph
    commit id: "Initial commit"
    branch develop
    checkout develop
    commit id: "Setup project structure"
    
    branch feature/user-auth
    checkout feature/user-auth
    commit id: "Add login form"
    commit id: "Implement authentication"
    commit id: "Add password validation"
    
    checkout develop
    merge feature/user-auth
    commit id: "Update documentation"
    
    branch feature/dashboard
    checkout feature/dashboard
    commit id: "Create dashboard layout"
    commit id: "Add user widgets"
    
    checkout develop
    branch hotfix/security-patch
    checkout hotfix/security-patch
    commit id: "Fix security vulnerability"
    
    checkout main
    merge hotfix/security-patch
    checkout develop
    merge hotfix/security-patch
    
    merge feature/dashboard
    checkout main
    merge develop
    commit id: "Release v1.0.0"`,
    tags: ['git', 'branching', 'workflow', 'version-control'],
    complexity: 'advanced'
  },

  // Pie Chart Templates
  {
    id: 'pie-market',
    name: 'Market Share Analysis',
    description: 'Market share distribution visualization',
    category: 'pie',
    code: `pie title Market Share Q4 2024
    "Chrome" : 65.2
    "Safari" : 18.8
    "Edge" : 8.1
    "Firefox" : 5.9
    "Other" : 2.0`,
    tags: ['pie', 'market', 'analysis', 'data'],
    complexity: 'basic'
  },

  // Mindmap Templates
  {
    id: 'mindmap-project',
    name: 'Project Planning Mindmap',
    description: 'Comprehensive project planning structure',
    category: 'mindmap',
    code: `mindmap
  root((Project Planning))
    Requirements
      Functional
        User Stories
        Use Cases
      Non-Functional
        Performance
        Security
        Scalability
    Design
      Architecture
        Frontend
        Backend
        Database
      UI/UX
        Wireframes
        Prototypes
        User Testing
    Development
      Sprint Planning
      Code Reviews
      Testing
        Unit Tests
        Integration Tests
        E2E Tests
    Deployment
      CI/CD Pipeline
      Staging Environment
      Production Release
      Monitoring`,
    tags: ['mindmap', 'planning', 'project', 'structure'],
    complexity: 'intermediate'
  },

  // Timeline Templates
  {
    id: 'timeline-startup',
    name: 'Startup Milestone Timeline',
    description: 'Key milestones in startup development',
    category: 'timeline',
    code: `timeline
    title Startup Development Timeline
    
    section Ideation
        2024-01 : Concept Development
               : Market Research
               : Competitor Analysis
    
    section MVP Development
        2024-03 : Technical Architecture
               : Core Feature Development
               : Initial Testing
        
        2024-05 : Beta Release
               : User Feedback Collection
               : Product Iteration
    
    section Growth
        2024-07 : Public Launch
               : Marketing Campaign
               : User Acquisition
        
        2024-09 : Series A Funding
               : Team Expansion
               : Feature Enhancement
    
    section Scale
        2024-12 : International Expansion
               : Enterprise Features
               : Strategic Partnerships`,
    tags: ['timeline', 'startup', 'milestones', 'business'],
    complexity: 'intermediate'
  }
];

export const TEMPLATE_CATEGORIES = [
  { id: 'flowchart', name: 'Flowcharts', icon: 'GitBranch' },
  { id: 'sequence', name: 'Sequence Diagrams', icon: 'ArrowRightLeft' },
  { id: 'class', name: 'Class Diagrams', icon: 'Box' },
  { id: 'gantt', name: 'Gantt Charts', icon: 'Calendar' },
  { id: 'state', name: 'State Diagrams', icon: 'Circle' },
  { id: 'er', name: 'ER Diagrams', icon: 'Database' },
  { id: 'journey', name: 'User Journeys', icon: 'Map' },
  { id: 'gitgraph', name: 'Git Graphs', icon: 'GitBranch' },
  { id: 'pie', name: 'Pie Charts', icon: 'PieChart' },
  { id: 'mindmap', name: 'Mind Maps', icon: 'Brain' },
  { id: 'timeline', name: 'Timelines', icon: 'Clock' }
] as const;

/**
 * Searches templates by query string
 */
export function searchTemplates(query: string): DiagramTemplate[] {
  if (!query.trim()) {
    return DIAGRAM_TEMPLATES;
  }

  const searchTerm = query.toLowerCase();
  return DIAGRAM_TEMPLATES.filter(template => 
    template.name.toLowerCase().includes(searchTerm) ||
    template.description.toLowerCase().includes(searchTerm) ||
    template.tags.some(tag => tag.toLowerCase().includes(searchTerm)) ||
    template.category.toLowerCase().includes(searchTerm)
  );
}

/**
 * Gets templates by category
 */
export function getTemplatesByCategory(category: string): DiagramTemplate[] {
  return DIAGRAM_TEMPLATES.filter(template => template.category === category);
}

/**
 * Gets a template by ID
 */
export function getTemplateById(id: string): DiagramTemplate | undefined {
  return DIAGRAM_TEMPLATES.find(template => template.id === id);
}