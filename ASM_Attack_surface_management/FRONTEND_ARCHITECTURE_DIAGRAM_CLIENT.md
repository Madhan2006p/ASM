# Frontend Architecture Diagram - Client Presentation

## 🏗️ Application Architecture Overview

### High-Level Architecture

```mermaid
graph TB
    subgraph "🌐 Browser"
        subgraph "📱 Frontend Application"
            Header[📋 Header Component]:::header
            Routes[🛣️ Router]:::router
            Pages[📄 Pages]:::pages
            Sidebar[📋 Sidebar Component]:::sidebar
            API[🔌 API Service]:::api
        end
        
        subgraph "💾 Browser Storage"
            LocalStorage[📦 Local Storage]:::storage
        end
    end
    
    subgraph "🖥️ Backend Server"
        Django[🐍 Django REST API]:::django
        Database[(🗄️ Database)]:::database
    end
    
    Header --> Routes
    Routes --> Pages
    Pages --> Sidebar
    Pages --> API
    API --> LocalStorage
    API --> Django
    Django --> Database
    LocalStorage --> API
    
    classDef header fill:#FF9800,stroke:#E65100,stroke-width:3px,color:#fff
    classDef router fill:#2196F3,stroke:#1565C0,stroke-width:3px,color:#fff
    classDef pages fill:#4CAF50,stroke:#2E7D32,stroke-width:3px,color:#fff
    classDef sidebar fill:#795548,stroke:#5D4037,stroke-width:3px,color:#fff
    classDef api fill:#00BCD4,stroke:#00838F,stroke-width:3px,color:#fff
    classDef storage fill:#9C27B0,stroke:#6A1B9A,stroke-width:3px,color:#fff
    classDef django fill:#607D8B,stroke:#37474F,stroke-width:3px,color:#fff
    classDef database fill:#009688,stroke:#00695C,stroke-width:3px,color:#fff
```

---

## 📦 Component Architecture

### Component Structure

```mermaid
graph TD
    App[🚀 App Component]:::app
    
    App --> Header[📋 Header]:::header
    App --> Router[🛣️ React Router]:::router
    
    Router --> Welcome[👋 Welcome Page]:::welcome
    Router --> Login[🔐 Login Page]:::login
    Router --> SignUp[📝 Sign Up Page]:::signup
    Router --> Dashboard[📊 Dashboard Page]:::dashboard
    Router --> Subdomains[👣 Subdomains Page]:::subdomains
    Router --> Endpoints[🗺️ Endpoints Page]:::endpoints
    Router --> OpenPorts[🔌 Open Ports Page]:::openports
    Router --> Directories[📁 Directories Page]:::directories
    Router --> Technologies[🔧 Technologies Page]:::technologies
    Router --> SSL[🔒 SSL Certificate Page]:::ssl
    
    Dashboard --> Sidebar[📋 Sidebar Component]:::sidebar
    Subdomains --> Sidebar
    Endpoints --> Sidebar
    OpenPorts --> Sidebar
    Directories --> Sidebar
    Technologies --> Sidebar
    SSL --> Sidebar
    
    Login --> APIService[🔌 API Service]:::api
    SignUp --> APIService
    Dashboard --> APIService
    Subdomains --> APIService
    Endpoints --> APIService
    OpenPorts --> APIService
    Directories --> APIService
    Technologies --> APIService
    
    APIService --> Storage[💾 Local Storage]:::storage
    APIService --> Backend[🖥️ Backend API]:::backend
    
    classDef app fill:#E91E63,stroke:#AD1457,stroke-width:4px,color:#fff
    classDef header fill:#FF9800,stroke:#E65100,stroke-width:3px,color:#fff
    classDef router fill:#2196F3,stroke:#1565C0,stroke-width:3px,color:#fff
    classDef welcome fill:#4CAF50,stroke:#2E7D32,stroke-width:2px,color:#fff
    classDef login fill:#F44336,stroke:#C62828,stroke-width:2px,color:#fff
    classDef signup fill:#9C27B0,stroke:#6A1B9A,stroke-width:2px,color:#fff
    classDef dashboard fill:#FF9800,stroke:#E65100,stroke-width:2px,color:#fff
    classDef subdomains fill:#2196F3,stroke:#1565C0,stroke-width:2px,color:#fff
    classDef endpoints fill:#00BCD4,stroke:#00838F,stroke-width:2px,color:#fff
    classDef openports fill:#4CAF50,stroke:#2E7D32,stroke-width:2px,color:#fff
    classDef directories fill:#FFC107,stroke:#F57C00,stroke-width:2px,color:#000
    classDef technologies fill:#FF5722,stroke:#D84315,stroke-width:2px,color:#fff
    classDef ssl fill:#9C27B0,stroke:#6A1B9A,stroke-width:2px,color:#fff
    classDef sidebar fill:#795548,stroke:#5D4037,stroke-width:2px,color:#fff
    classDef api fill:#607D8B,stroke:#37474F,stroke-width:2px,color:#fff
    classDef storage fill:#9C27B0,stroke:#6A1B9A,stroke-width:2px,color:#fff
    classDef backend fill:#009688,stroke:#00695C,stroke-width:2px,color:#fff
```

---

## 🔌 API Integration Architecture

### API Service Layer

```mermaid
graph LR
    subgraph "📄 Pages"
        P1[Login Page]:::page
        P2[Dashboard]:::page
        P3[Data Pages]:::page
    end
    
    subgraph "🔌 API Service Layer"
        API[API Service]:::api
        Interceptor[Request Interceptor]:::interceptor
        Refresh[Token Refresh]:::refresh
    end
    
    subgraph "💾 Storage"
        Token[Access Token]:::token
        RefreshToken[Refresh Token]:::refreshToken
        User[User Data]:::user
    end
    
    subgraph "🌐 Backend"
        LoginAPI[Login API]:::loginapi
        DataAPI[Data APIs]:::dataapi
        RefreshAPI[Refresh API]:::refreshapi
    end
    
    P1 --> API
    P2 --> API
    P3 --> API
    
    API --> Interceptor
    Interceptor --> Token
    Interceptor --> RefreshToken
    
    API -->|Login| LoginAPI
    API -->|Get Data| DataAPI
    API -->|401 Error| Refresh
    Refresh --> RefreshAPI
    Refresh --> Token
    
    LoginAPI --> User
    DataAPI --> P2
    DataAPI --> P3
    
    classDef page fill:#2196F3,stroke:#1565C0,stroke-width:2px,color:#fff
    classDef api fill:#00BCD4,stroke:#00838F,stroke-width:2px,color:#fff
    classDef interceptor fill:#FFC107,stroke:#F57C00,stroke-width:2px,color:#000
    classDef refresh fill:#FF9800,stroke:#E65100,stroke-width:2px,color:#fff
    classDef token fill:#4CAF50,stroke:#2E7D32,stroke-width:2px,color:#fff
    classDef refreshToken fill:#9C27B0,stroke:#6A1B9A,stroke-width:2px,color:#fff
    classDef user fill:#795548,stroke:#5D4037,stroke-width:2px,color:#fff
    classDef loginapi fill:#F44336,stroke:#C62828,stroke-width:2px,color:#fff
    classDef dataapi fill:#009688,stroke:#00695C,stroke-width:2px,color:#fff
    classDef refreshapi fill:#FF5722,stroke:#D84315,stroke-width:2px,color:#fff
```

---

## 📊 Data Flow Architecture

### Data Flow from Backend to UI

```mermaid
flowchart TD
    Backend[🖥️ Backend API]:::backend
    Backend --> Response[📥 API Response]:::response
    
    Response --> Process[⚙️ Process Data]:::process
    Process --> Pagination{📄 Pagination?}:::pagination
    
    Pagination -->|Yes| Next[📄 Fetch Next Page]:::next
    Next --> Backend
    
    Pagination -->|No| Combine[🔗 Combine All Data]:::combine
    Combine --> State[💾 Update State]:::state
    
    State --> Filter[🔍 Apply Filters]:::filter
    Filter --> Display[📊 Render Table]:::display
    
    Display --> User[👤 User Views Data]:::user
    
    User --> Search[🔍 User Searches]:::search
    Search --> Filter
    
    User --> Export[📥 User Exports]:::export
    Export --> Excel[📊 Generate Excel]:::excel
    Excel --> Download[⬇️ Download File]:::download
    
    classDef backend fill:#009688,stroke:#00695C,stroke-width:3px,color:#fff
    classDef response fill:#00BCD4,stroke:#00838F,stroke-width:2px,color:#fff
    classDef process fill:#795548,stroke:#5D4037,stroke-width:2px,color:#fff
    classDef pagination fill:#E91E63,stroke:#AD1457,stroke-width:2px,color:#fff
    classDef next fill:#2196F3,stroke:#1565C0,stroke-width:2px,color:#fff
    classDef combine fill:#9C27B0,stroke:#6A1B9A,stroke-width:2px,color:#fff
    classDef state fill:#4CAF50,stroke:#2E7D32,stroke-width:2px,color:#fff
    classDef filter fill:#FFC107,stroke:#F57C00,stroke-width:2px,color:#000
    classDef display fill:#FF9800,stroke:#E65100,stroke-width:2px,color:#fff
    classDef user fill:#607D8B,stroke:#37474F,stroke-width:2px,color:#fff
    classDef search fill:#2196F3,stroke:#1565C0,stroke-width:2px,color:#fff
    classDef export fill:#FF5722,stroke:#D84315,stroke-width:2px,color:#fff
    classDef excel fill:#4CAF50,stroke:#2E7D32,stroke-width:2px,color:#fff
    classDef download fill:#009688,stroke:#00695C,stroke-width:2px,color:#fff
```

---

## 🎨 UI Layout Architecture

### Page Layout Structure

```mermaid
graph TB
    subgraph "🖥️ Browser Window"
        subgraph "📋 Header Section"
            Header[Header Component]:::header
            Header --> Logo[App Logo]:::logo
            Header --> Nav[Navigation Buttons]:::nav
            Header --> UserInfo[User Info]:::userinfo
        end
        
        subgraph "📄 Main Content Area"
            subgraph "📋 Left Sidebar"
                Sidebar[Sidebar Component]:::sidebar
                Sidebar --> Menu1[Dashboard]:::menu
                Sidebar --> Menu2[Asset Discovery]:::menu
                Sidebar --> Menu3[Other Menus]:::menu
            end
            
            subgraph "📊 Content Area"
                Content[Page Content]:::content
                Content --> Title[Page Title]:::title
                Content --> Actions[Action Buttons]:::actions
                Content --> Search[Search Box]:::search
                Content --> Table[Data Table]:::table
            end
        end
    end
    
    classDef header fill:#FF9800,stroke:#E65100,stroke-width:3px,color:#fff
    classDef logo fill:#2196F3,stroke:#1565C0,stroke-width:2px,color:#fff
    classDef nav fill:#00BCD4,stroke:#00838F,stroke-width:2px,color:#fff
    classDef userinfo fill:#9C27B0,stroke:#6A1B9A,stroke-width:2px,color:#fff
    classDef sidebar fill:#795548,stroke:#5D4037,stroke-width:3px,color:#fff
    classDef menu fill:#607D8B,stroke:#37474F,stroke-width:2px,color:#fff
    classDef content fill:#4CAF50,stroke:#2E7D32,stroke-width:3px,color:#fff
    classDef title fill:#FFC107,stroke:#F57C00,stroke-width:2px,color:#000
    classDef actions fill:#E91E63,stroke:#AD1457,stroke-width:2px,color:#fff
    classDef search fill:#2196F3,stroke:#1565C0,stroke-width:2px,color:#fff
    classDef table fill:#009688,stroke:#00695C,stroke-width:2px,color:#fff
```

---

## 🔐 Authentication Architecture

### Authentication Flow Architecture

```mermaid
graph TD
    subgraph "🔐 Authentication Layer"
        Login[Login Component]:::login
        Auth[Auth Service]:::auth
        Token[Token Manager]:::token
    end
    
    subgraph "💾 Storage Layer"
        LocalStorage[Local Storage]:::storage
        AccessToken[Access Token]:::accesstoken
        RefreshToken[Refresh Token]:::refreshtoken
        UserData[User Data]:::userdata
    end
    
    subgraph "🌐 API Layer"
        Request[API Request]:::request
        Interceptor[Request Interceptor]:::interceptor
        Response[Response Handler]:::response
    end
    
    subgraph "🖥️ Backend"
        LoginAPI[Login Endpoint]:::loginapi
        RefreshAPI[Refresh Endpoint]:::refreshapi
        ProtectedAPI[Protected Endpoints]:::protectedapi
    end
    
    Login --> Auth
    Auth --> Token
    Token --> LocalStorage
    
    LocalStorage --> AccessToken
    LocalStorage --> RefreshToken
    LocalStorage --> UserData
    
    Request --> Interceptor
    Interceptor --> AccessToken
    Interceptor --> Request
    
    Request -->|Login| LoginAPI
    Request -->|Get Data| ProtectedAPI
    Request -->|401 Error| Response
    
    Response --> RefreshAPI
    RefreshAPI --> AccessToken
    RefreshAPI --> Request
    
    ProtectedAPI --> Response
    
    classDef login fill:#F44336,stroke:#C62828,stroke-width:3px,color:#fff
    classDef auth fill:#2196F3,stroke:#1565C0,stroke-width:2px,color:#fff
    classDef token fill:#FF9800,stroke:#E65100,stroke-width:2px,color:#fff
    classDef storage fill:#9C27B0,stroke:#6A1B9A,stroke-width:3px,color:#fff
    classDef accesstoken fill:#4CAF50,stroke:#2E7D32,stroke-width:2px,color:#fff
    classDef refreshtoken fill:#FFC107,stroke:#F57C00,stroke-width:2px,color:#000
    classDef userdata fill:#795548,stroke:#5D4037,stroke-width:2px,color:#fff
    classDef request fill:#00BCD4,stroke:#00838F,stroke-width:2px,color:#fff
    classDef interceptor fill:#E91E63,stroke:#AD1457,stroke-width:2px,color:#fff
    classDef response fill:#009688,stroke:#00695C,stroke-width:2px,color:#fff
    classDef loginapi fill:#F44336,stroke:#C62828,stroke-width:2px,color:#fff
    classDef refreshapi fill:#FF5722,stroke:#D84315,stroke-width:2px,color:#fff
    classDef protectedapi fill:#607D8B,stroke:#37474F,stroke-width:2px,color:#fff
```

---

## 📱 Component Hierarchy

### Detailed Component Tree

```mermaid
graph TD
    App[🚀 App]:::app
    
    App --> Header[📋 Header]:::header
    App --> Router[🛣️ Router]:::router
    
    Router --> Welcome[Welcome]:::page
    Router --> Login[Login]:::page
    Router --> SignUp[SignUp]:::page
    Router --> Dashboard[Dashboard]:::page
    Router --> Subdomains[Subdomains]:::page
    Router --> Endpoints[Endpoints]:::page
    Router --> OpenPorts[OpenPorts]:::page
    Router --> Directories[Directories]:::page
    Router --> Technologies[Technologies]:::page
    Router --> SSL[SSL Certificate]:::page
    
    Dashboard --> Sidebar[Sidebar]:::component
    Subdomains --> Sidebar
    Endpoints --> Sidebar
    OpenPorts --> Sidebar
    Directories --> Sidebar
    Technologies --> Sidebar
    SSL --> Sidebar
    
    Dashboard --> Stats[Statistics Cards]:::component
    Dashboard --> Table[Vulnerabilities Table]:::component
    Dashboard --> Actions[Quick Actions]:::component
    
    Subdomains --> Search[Search Box]:::component
    Subdomains --> DataTable[Data Table]:::component
    Subdomains --> Export[Export Button]:::component
    Subdomains --> Modal[Modal]:::component
    
    Endpoints --> Search
    Endpoints --> DataTable
    Endpoints --> Export
    Endpoints --> Modal
    
    OpenPorts --> Search
    OpenPorts --> DataTable
    OpenPorts --> Export
    OpenPorts --> Modal
    
    Directories --> Search
    Directories --> DataTable
    Directories --> Export
    
    Technologies --> Search
    Technologies --> DataTable
    Technologies --> Export
    Technologies --> Modal
    
    classDef app fill:#E91E63,stroke:#AD1457,stroke-width:4px,color:#fff
    classDef header fill:#FF9800,stroke:#E65100,stroke-width:3px,color:#fff
    classDef router fill:#2196F3,stroke:#1565C0,stroke-width:3px,color:#fff
    classDef page fill:#4CAF50,stroke:#2E7D32,stroke-width:2px,color:#fff
    classDef component fill:#00BCD4,stroke:#00838F,stroke-width:2px,color:#fff
```

---

## 🛠️ Technology Stack Architecture

### Frontend Technology Stack

```mermaid
graph TB
    subgraph "🎨 UI Framework"
        React[⚛️ React]:::react
        Bootstrap[🎨 React Bootstrap]:::bootstrap
    end
    
    subgraph "🛣️ Routing"
        Router[React Router]:::router
    end
    
    subgraph "🔌 API Communication"
        Axios[Axios]:::axios
    end
    
    subgraph "💾 State Management"
        LocalStorage[Local Storage]:::storage
        State[React State]:::state
    end
    
    subgraph "📊 Data Processing"
        ExcelJS[ExcelJS]:::excel
        FileSaver[File Saver]:::filesaver
    end
    
    subgraph "🌐 Backend"
        Django[Django REST API]:::django
    end
    
    React --> Bootstrap
    React --> Router
    React --> Axios
    React --> LocalStorage
    React --> State
    React --> ExcelJS
    React --> FileSaver
    
    Axios --> Django
    
    classDef react fill:#61DAFB,stroke:#20232A,stroke-width:3px,color:#000
    classDef bootstrap fill:#7952B3,stroke:#563D7C,stroke-width:2px,color:#fff
    classDef router fill:#CA4245,stroke:#8B2635,stroke-width:2px,color:#fff
    classDef axios fill:#5A29E4,stroke:#3D1E99,stroke-width:2px,color:#fff
    classDef storage fill:#9C27B0,stroke:#6A1B9A,stroke-width:2px,color:#fff
    classDef state fill:#00BCD4,stroke:#00838F,stroke-width:2px,color:#fff
    classDef excel fill:#217346,stroke:#185A37,stroke-width:2px,color:#fff
    classDef filesaver fill:#4CAF50,stroke:#2E7D32,stroke-width:2px,color:#fff
    classDef django fill:#092E20,stroke:#0D4A2F,stroke-width:2px,color:#fff
```

---

## 🔄 Request-Response Cycle

### Complete Request Cycle

```mermaid
sequenceDiagram
    participant U as 👤 User
    participant P as 📄 Page
    participant API as 🔌 API Service
    participant LS as 💾 Storage
    participant B as 🖥️ Backend
    
    Note over U,B: Request-Response Cycle
    
    U->>P: 1. User Action
    P->>API: 2. Call API Function
    API->>LS: 3. Get Access Token
    LS->>API: 4. Return Token
    
    API->>API: 5. Add Token to Header
    API->>B: 6. Send HTTP Request
    
    alt Request Success
        B->>API: 7. Return Data (200)
        API->>P: 8. Return Data
        P->>U: 9. Display Data
    else Token Expired (401)
        B->>API: 7. Return 401 Error
        API->>LS: 8. Get Refresh Token
        LS->>API: 9. Return Refresh Token
        API->>B: 10. POST /token/refresh/
        B->>API: 11. Return New Access Token
        API->>LS: 12. Update Access Token
        API->>B: 13. Retry Original Request
        B->>API: 14. Return Data (200)
        API->>P: 15. Return Data
        P->>U: 16. Display Data
    else Other Error
        B->>API: 7. Return Error
        API->>P: 8. Return Error
        P->>U: 9. Show Error Message
    end
```

---

## 📊 Data Processing Architecture

### Data Processing Pipeline

```mermaid
flowchart LR
    Backend[🖥️ Backend API]:::backend
    Backend --> Raw[📥 Raw JSON Data]:::raw
    
    Raw --> Parse[🔍 Parse Data]:::parse
    Parse --> Validate[✅ Validate Data]:::validate
    
    Validate -->|Valid| Transform[🔄 Transform Data]:::transform
    Validate -->|Invalid| Error[❌ Handle Error]:::error
    
    Transform --> Paginate[📄 Handle Pagination]:::paginate
    Paginate --> Combine[🔗 Combine Pages]:::combine
    
    Combine --> Filter[🔍 Apply Filters]:::filter
    Filter --> Sort[📊 Sort Data]:::sort
    
    Sort --> Display[📊 Display in UI]:::display
    
    Display --> User[👤 User Interaction]:::user
    User --> Export[📥 Export Request]:::export
    Export --> Format[📋 Format for Excel]:::format
    Format --> Generate[⚙️ Generate File]:::generate
    Generate --> Download[⬇️ Download]:::download
    
    classDef backend fill:#009688,stroke:#00695C,stroke-width:3px,color:#fff
    classDef raw fill:#00BCD4,stroke:#00838F,stroke-width:2px,color:#fff
    classDef parse fill:#2196F3,stroke:#1565C0,stroke-width:2px,color:#fff
    classDef validate fill:#FFC107,stroke:#F57C00,stroke-width:2px,color:#000
    classDef transform fill:#9C27B0,stroke:#6A1B9A,stroke-width:2px,color:#fff
    classDef error fill:#F44336,stroke:#C62828,stroke-width:2px,color:#fff
    classDef paginate fill:#E91E63,stroke:#AD1457,stroke-width:2px,color:#fff
    classDef combine fill:#795548,stroke:#5D4037,stroke-width:2px,color:#fff
    classDef filter fill:#FF9800,stroke:#E65100,stroke-width:2px,color:#fff
    classDef sort fill:#607D8B,stroke:#37474F,stroke-width:2px,color:#fff
    classDef display fill:#4CAF50,stroke:#2E7D32,stroke-width:2px,color:#fff
    classDef user fill:#9C27B0,stroke:#6A1B9A,stroke-width:2px,color:#fff
    classDef export fill:#FF5722,stroke:#D84315,stroke-width:2px,color:#fff
    classDef format fill:#009688,stroke:#00695C,stroke-width:2px,color:#fff
    classDef generate fill:#00BCD4,stroke:#00838F,stroke-width:2px,color:#fff
    classDef download fill:#4CAF50,stroke:#2E7D32,stroke-width:2px,color:#fff
```

---

## 🎨 Color Legend for Architecture

### Architecture Diagram Colors

| Color | Component Type | Examples |
|-------|---------------|----------|
| 🟢 **Green** | Data/Storage | Data display, storage, success states |
| 🔵 **Blue** | Core Components | React, routing, API services |
| 🟠 **Orange** | UI Components | Header, dashboard, important UI |
| 🔴 **Red** | Authentication | Login, errors, security |
| 🟣 **Purple** | Storage/State | Local storage, state management |
| 🟡 **Yellow** | Processing | Data processing, validation |
| ⚫ **Gray** | Backend | Django, database, server |
| 🟤 **Brown** | Navigation | Sidebar, menus, navigation |
| 🔷 **Cyan** | Services | API services, utilities |
| 🔶 **Pink** | User Interaction | User actions, interactions |

---

## 📝 Key Architecture Points for Client

### 1. **Modular Design**
- Separate components for each feature
- Reusable components across pages
- Clean separation of concerns

### 2. **API Integration**
- Centralized API service
- Automatic token management
- Error handling built-in

### 3. **State Management**
- React state for UI
- Local storage for persistence
- Automatic synchronization

### 4. **Security**
- Token-based authentication
- Secure storage
- Auto-refresh mechanism

### 5. **User Experience**
- Fast loading with pagination
- Real-time search
- Easy data export

### 6. **Scalability**
- Component-based architecture
- Easy to add new pages
- Modular API integration

---

**Document Purpose:** Client-friendly architecture diagrams for frontend application  
**Last Updated:** 2024
