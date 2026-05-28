# Frontend Complete Diagrams - Flow & Architecture

## 📋 Table of Contents
1. [Flow Diagrams](#flow-diagrams)
2. [Architecture Diagrams](#architecture-diagrams)

---

# 🎯 FLOW DIAGRAMS

## Complete User Journey Flow

```mermaid
flowchart TD
    Start([👤 User Opens Application]):::startNode
    Start --> Welcome{Welcome Page}
    
    Welcome -->|Not Logged In| Login[🔐 Login Page]:::loginNode
    Welcome -->|Already Logged In| Dashboard[📊 Dashboard]:::dashboardNode
    
    Login --> Email[📧 Enter Email]:::inputNode
    Login --> Password[🔑 Enter Password]:::inputNode
    Login --> Remember[☑️ Remember Me]:::inputNode
    
    Email --> Validate{✅ Form Validation}
    Password --> Validate
    Remember --> Validate
    
    Validate -->|❌ Invalid| Error[⚠️ Show Error]:::errorNode
    Error --> Login
    
    Validate -->|✅ Valid| APICall[🌐 Send Login Request]:::apiNode
    APICall --> Response{📥 API Response}
    
    Response -->|✅ Success| StoreTokens[💾 Store Tokens]:::successNode
    Response -->|❌ Error| ShowError[⚠️ Show Error Message]:::errorNode
    ShowError --> Login
    
    StoreTokens --> Navigate[➡️ Navigate to Dashboard]:::navigateNode
    Navigate --> Dashboard
    
    Dashboard --> Sidebar[📋 Sidebar Menu]:::sidebarNode
    
    Sidebar -->|Click| Subdomains[👣 Subdomains Page]:::pageNode
    Sidebar -->|Click| Endpoints[🗺️ Endpoints Page]:::pageNode
    Sidebar -->|Click| OpenPorts[🔌 Open Ports Page]:::pageNode
    Sidebar -->|Click| Directories[📁 Directories Page]:::pageNode
    Sidebar -->|Click| Technologies[🔧 Technologies Page]:::pageNode
    Sidebar -->|Click| SSL[🔒 SSL Certificate Page]:::pageNode
    Sidebar -->|Click| Logout[🚪 Sign Out]:::logoutNode
    
    Subdomains --> FetchSub[📡 Fetch Subdomains Data]:::fetchNode
    Endpoints --> FetchEnd[📡 Fetch Endpoints Data]:::fetchNode
    OpenPorts --> FetchPorts[📡 Fetch Open Ports Data]:::fetchNode
    Directories --> FetchDir[📡 Fetch Directories Data]:::fetchNode
    Technologies --> FetchTech[📡 Fetch Technologies Data]:::fetchNode
    
    FetchSub --> DisplaySub[📊 Display Data Table]:::displayNode
    FetchEnd --> DisplayEnd[📊 Display Data Table]:::displayNode
    FetchPorts --> DisplayPorts[📊 Display Data Table]:::displayNode
    FetchDir --> DisplayDir[📊 Display Data Table]:::displayNode
    FetchTech --> DisplayTech[📊 Display Data Table]:::displayNode
    
    DisplaySub --> Actions1[🔍 Search / 📥 Export / 🔄 Refresh]:::actionNode
    DisplayEnd --> Actions2[🔍 Search / 📥 Export / 🔄 Refresh]:::actionNode
    DisplayPorts --> Actions3[🔍 Search / 📥 Export / 🔄 Refresh]:::actionNode
    DisplayDir --> Actions4[🔍 Search / 📥 Export / 🔄 Refresh]:::actionNode
    DisplayTech --> Actions5[🔍 Search / 📥 Export / 🔄 Refresh]:::actionNode
    
    Logout --> APILogout[🌐 Send Logout Request]:::apiNode
    APILogout --> ClearTokens[🗑️ Clear All Data]:::clearNode
    ClearTokens --> Login
    
    classDef startNode fill:#4CAF50,stroke:#2E7D32,stroke-width:3px,color:#fff
    classDef loginNode fill:#2196F3,stroke:#1565C0,stroke-width:2px,color:#fff
    classDef dashboardNode fill:#FF9800,stroke:#E65100,stroke-width:2px,color:#fff
    classDef inputNode fill:#9C27B0,stroke:#6A1B9A,stroke-width:2px,color:#fff
    classDef errorNode fill:#F44336,stroke:#C62828,stroke-width:2px,color:#fff
    classDef apiNode fill:#00BCD4,stroke:#00838F,stroke-width:2px,color:#fff
    classDef successNode fill:#4CAF50,stroke:#2E7D32,stroke-width:2px,color:#fff
    classDef navigateNode fill:#FFC107,stroke:#F57C00,stroke-width:2px,color:#000
    classDef sidebarNode fill:#795548,stroke:#5D4037,stroke-width:2px,color:#fff
    classDef pageNode fill:#607D8B,stroke:#37474F,stroke-width:2px,color:#fff
    classDef fetchNode fill:#3F51B5,stroke:#283593,stroke-width:2px,color:#fff
    classDef displayNode fill:#009688,stroke:#00695C,stroke-width:2px,color:#fff
    classDef actionNode fill:#E91E63,stroke:#AD1457,stroke-width:2px,color:#fff
    classDef logoutNode fill:#F44336,stroke:#C62828,stroke-width:2px,color:#fff
    classDef clearNode fill:#9E9E9E,stroke:#616161,stroke-width:2px,color:#fff
```

---

## Login Process Flow

```mermaid
sequenceDiagram
    participant U as 👤 User
    participant LP as 🔐 Login Page
    participant API as 🌐 Backend API
    participant LS as 💾 Local Storage
    participant D as 📊 Dashboard
    
    Note over U,D: Login Process Flow
    
    U->>LP: 1. Visit Application
    LP->>U: 2. Display Login Form
    
    U->>LP: 3. Enter Email & Password
    LP->>LP: 4. Validate Form
    
    alt Form Valid
        LP->>API: 5. POST /api/accounts/login/
        Note right of API: {email, password}
        
        alt Login Success
            API->>LP: 6. Return Tokens & User Data
            Note right of API: {accessToken, refreshToken, user}
            
            LP->>LS: 7. Store accessToken
            LP->>LS: 8. Store refreshToken
            LP->>LS: 9. Store user data
            
            LP->>D: 10. Navigate to Dashboard
            D->>U: 11. Show Dashboard
        else Login Failed
            API->>LP: 6. Return Error
            LP->>U: 7. Show Error Message
        end
    else Form Invalid
        LP->>U: 5. Show Validation Error
    end
```

---

## Dashboard to Pages Navigation Flow

```mermaid
flowchart LR
    D[📊 Dashboard]:::dashboard
    D --> S[📋 Sidebar Menu]:::sidebar
    
    S --> SM[🔍 Asset Discovery]:::submenu
    
    SM --> S1[👣 Subdomains]:::page1
    SM --> S2[🗺️ Endpoints]:::page2
    SM --> S3[🔌 Open Ports]:::page3
    SM --> S4[📁 Directories]:::page4
    SM --> S5[🔧 Technologies]:::page5
    
    S --> V[🐞 Vulnerabilities]:::placeholder
    S --> SSL[🔒 SSL Certificate]:::page6
    S --> M[🛒 Marketplace]:::placeholder
    S --> SET[⚙️ Settings]:::placeholder
    S --> OUT[🚪 Sign Out]:::logout
    
    S1 --> T1[📊 Data Table]:::table
    S2 --> T2[📊 Data Table]:::table
    S3 --> T3[📊 Data Table]:::table
    S4 --> T4[📊 Data Table]:::table
    S5 --> T5[📊 Data Table]:::table
    
    T1 --> A1[🔍 Search<br/>📥 Export<br/>🔄 Refresh]:::actions
    T2 --> A2[🔍 Search<br/>📥 Export<br/>🔄 Refresh]:::actions
    T3 --> A3[🔍 Search<br/>📥 Export<br/>🔄 Refresh]:::actions
    T4 --> A4[🔍 Search<br/>📥 Export<br/>🔄 Refresh]:::actions
    T5 --> A5[🔍 Search<br/>📥 Export<br/>🔄 Refresh]:::actions
    
    classDef dashboard fill:#FF9800,stroke:#E65100,stroke-width:3px,color:#fff
    classDef sidebar fill:#795548,stroke:#5D4037,stroke-width:2px,color:#fff
    classDef submenu fill:#9C27B0,stroke:#6A1B9A,stroke-width:2px,color:#fff
    classDef page1 fill:#2196F3,stroke:#1565C0,stroke-width:2px,color:#fff
    classDef page2 fill:#00BCD4,stroke:#00838F,stroke-width:2px,color:#fff
    classDef page3 fill:#4CAF50,stroke:#2E7D32,stroke-width:2px,color:#fff
    classDef page4 fill:#FFC107,stroke:#F57C00,stroke-width:2px,color:#000
    classDef page5 fill:#FF5722,stroke:#D84315,stroke-width:2px,color:#fff
    classDef page6 fill:#9C27B0,stroke:#6A1B9A,stroke-width:2px,color:#fff
    classDef placeholder fill:#9E9E9E,stroke:#616161,stroke-width:2px,color:#fff
    classDef logout fill:#F44336,stroke:#C62828,stroke-width:2px,color:#fff
    classDef table fill:#009688,stroke:#00695C,stroke-width:2px,color:#fff
    classDef actions fill:#E91E63,stroke:#AD1457,stroke-width:2px,color:#fff
```

---

## Data Fetching Flow

```mermaid
flowchart TD
    User[👤 User Clicks Page]:::user
    User --> Check{🔍 Check Token}:::check
    
    Check -->|✅ Token Found| API[🌐 API Request]:::api
    Check -->|❌ No Token| Login[🔐 Redirect to Login]:::login
    
    API --> Request[📤 GET Request]:::request
    Request --> Headers[📋 Add Headers]:::headers
    Headers --> Auth[🔑 Authorization: Bearer Token]:::auth
    
    Auth --> Server[🖥️ Backend Server]:::server
    Server --> Response{📥 Response}:::response
    
    Response -->|✅ Success| Data[📊 Receive Data]:::data
    Response -->|❌ Error 401| Refresh[🔄 Try Token Refresh]:::refresh
    Response -->|❌ Other Error| Error[⚠️ Show Error]:::error
    
    Refresh --> RefreshAPI[🌐 POST /token/refresh/]:::refreshApi
    RefreshAPI --> RefreshResponse{📥 Refresh Response}:::refreshResp
    
    RefreshResponse -->|✅ Success| UpdateToken[💾 Update Token]:::update
    RefreshResponse -->|❌ Failed| Clear[🗑️ Clear Tokens]:::clear
    
    UpdateToken --> Retry[🔄 Retry Original Request]:::retry
    Retry --> Server
    
    Clear --> Login
    
    Data --> Process[⚙️ Process Data]:::process
    Process --> Pagination{📄 More Pages?}:::pagination
    
    Pagination -->|Yes| NextPage[📄 Fetch Next Page]:::next
    NextPage --> API
    
    Pagination -->|No| Combine[🔗 Combine All Data]:::combine
    Combine --> Display[📊 Display in Table]:::display
    Display --> User
    
    Error --> User
    
    classDef user fill:#4CAF50,stroke:#2E7D32,stroke-width:3px,color:#fff
    classDef check fill:#FFC107,stroke:#F57C00,stroke-width:2px,color:#000
    classDef api fill:#2196F3,stroke:#1565C0,stroke-width:2px,color:#fff
    classDef login fill:#F44336,stroke:#C62828,stroke-width:2px,color:#fff
    classDef request fill:#00BCD4,stroke:#00838F,stroke-width:2px,color:#fff
    classDef headers fill:#9C27B0,stroke:#6A1B9A,stroke-width:2px,color:#fff
    classDef auth fill:#FF9800,stroke:#E65100,stroke-width:2px,color:#fff
    classDef server fill:#607D8B,stroke:#37474F,stroke-width:2px,color:#fff
    classDef response fill:#009688,stroke:#00695C,stroke-width:2px,color:#fff
    classDef data fill:#4CAF50,stroke:#2E7D32,stroke-width:2px,color:#fff
    classDef refresh fill:#FFC107,stroke:#F57C00,stroke-width:2px,color:#000
    classDef refreshApi fill:#2196F3,stroke:#1565C0,stroke-width:2px,color:#fff
    classDef refreshResp fill:#009688,stroke:#00695C,stroke-width:2px,color:#fff
    classDef update fill:#4CAF50,stroke:#2E7D32,stroke-width:2px,color:#fff
    classDef clear fill:#9E9E9E,stroke:#616161,stroke-width:2px,color:#fff
    classDef retry fill:#FF9800,stroke:#E65100,stroke-width:2px,color:#fff
    classDef process fill:#795548,stroke:#5D4037,stroke-width:2px,color:#fff
    classDef pagination fill:#E91E63,stroke:#AD1457,stroke-width:2px,color:#fff
    classDef next fill:#00BCD4,stroke:#00838F,stroke-width:2px,color:#fff
    classDef combine fill:#9C27B0,stroke:#6A1B9A,stroke-width:2px,color:#fff
    classDef display fill:#009688,stroke:#00695C,stroke-width:2px,color:#fff
    classDef error fill:#F44336,stroke:#C62828,stroke-width:2px,color:#fff
```

---

## Search & Filter Flow

```mermaid
flowchart LR
    Input[⌨️ User Types]:::input
    Input --> Update[🔄 Update Search Term]:::update
    Update --> Filter[🔍 Filter Data Array]:::filter
    
    Filter --> Check1{Check Domain?}:::check1
    Filter --> Check2{Check Title?}:::check2
    Filter --> Check3{Check IP?}:::check3
    
    Check1 -->|Match| Include1[✅ Include]:::include
    Check2 -->|Match| Include2[✅ Include]:::include
    Check3 -->|Match| Include3[✅ Include]:::include
    
    Check1 -->|No Match| Exclude1[❌ Exclude]:::exclude
    Check2 -->|No Match| Exclude2[❌ Exclude]:::exclude
    Check3 -->|No Match| Exclude3[❌ Exclude]:::exclude
    
    Include1 --> Display[📊 Display Filtered Results]:::display
    Include2 --> Display
    Include3 --> Display
    
    Exclude1 --> Display
    Exclude2 --> Display
    Exclude3 --> Display
    
    classDef input fill:#2196F3,stroke:#1565C0,stroke-width:2px,color:#fff
    classDef update fill:#00BCD4,stroke:#00838F,stroke-width:2px,color:#fff
    classDef filter fill:#9C27B0,stroke:#6A1B9A,stroke-width:2px,color:#fff
    classDef check1 fill:#FFC107,stroke:#F57C00,stroke-width:2px,color:#000
    classDef check2 fill:#FFC107,stroke:#F57C00,stroke-width:2px,color:#000
    classDef check3 fill:#FFC107,stroke:#F57C00,stroke-width:2px,color:#000
    classDef include fill:#4CAF50,stroke:#2E7D32,stroke-width:2px,color:#fff
    classDef exclude fill:#F44336,stroke:#C62828,stroke-width:2px,color:#fff
    classDef display fill:#009688,stroke:#00695C,stroke-width:2px,color:#fff
```

---

## Export to Excel Flow

```mermaid
flowchart TD
    Click[👆 User Clicks Export]:::click
    Click --> Create[📝 Create Excel Workbook]:::create
    
    Create --> Worksheet[📋 Add Worksheet]:::worksheet
    Worksheet --> Headers[📑 Set Column Headers]:::headers
    
    Headers --> Loop[🔄 Loop Through Data]:::loop
    Loop --> Row[📊 Add Row]:::row
    
    Row --> Format[✨ Format Values]:::format
    Format --> More{More Rows?}:::more
    
    More -->|Yes| Loop
    More -->|No| Style[🎨 Style Header Row]:::style
    
    Style --> Generate[⚙️ Generate Buffer]:::generate
    Generate --> Blob[📦 Create Blob]:::blob
    Blob --> Download[⬇️ Download File]:::download
    Download --> Done[✅ Complete]:::done
    
    classDef click fill:#2196F3,stroke:#1565C0,stroke-width:2px,color:#fff
    classDef create fill:#4CAF50,stroke:#2E7D32,stroke-width:2px,color:#fff
    classDef worksheet fill:#00BCD4,stroke:#00838F,stroke-width:2px,color:#fff
    classDef headers fill:#9C27B0,stroke:#6A1B9A,stroke-width:2px,color:#fff
    classDef loop fill:#FF9800,stroke:#E65100,stroke-width:2px,color:#fff
    classDef row fill:#607D8B,stroke:#37474F,stroke-width:2px,color:#fff
    classDef format fill:#FFC107,stroke:#F57C00,stroke-width:2px,color:#000
    classDef more fill:#E91E63,stroke:#AD1457,stroke-width:2px,color:#fff
    classDef style fill:#795548,stroke:#5D4037,stroke-width:2px,color:#fff
    classDef generate fill:#009688,stroke:#00695C,stroke-width:2px,color:#fff
    classDef blob fill:#FF5722,stroke:#D84315,stroke-width:2px,color:#fff
    classDef download fill:#4CAF50,stroke:#2E7D32,stroke-width:2px,color:#fff
    classDef done fill:#4CAF50,stroke:#2E7D32,stroke-width:3px,color:#fff
```

---

# 🏗️ ARCHITECTURE DIAGRAMS

## High-Level Architecture Overview

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

## Component Architecture

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

## API Integration Architecture

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

## Data Flow Architecture

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

## UI Layout Architecture

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

## Authentication Architecture

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

## Technology Stack Architecture

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

## Request-Response Cycle

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

## 🎨 Color Legend

### Flow Diagram Colors
| Color | Meaning | Used For |
|-------|---------|----------|
| 🟢 **Green** | Success, Completion | Successful operations, data display |
| 🔵 **Blue** | Information, Process | API calls, data fetching, navigation |
| 🟠 **Orange** | Warning, Important | Dashboard, important actions |
| 🔴 **Red** | Error, Danger | Errors, logout, security |
| 🟣 **Purple** | Input, User Action | User inputs, forms, storage |
| 🟡 **Yellow** | Warning, Check | Validation, checks |
| ⚫ **Gray** | Neutral | Placeholder items, backend |
| 🟤 **Brown** | Navigation | Sidebar, menus |
| 🔷 **Cyan** | Data Processing | Data processing, formatting |
| 🔶 **Pink** | Actions | User interactions |

### Architecture Diagram Colors
| Color | Component Type | Examples |
|-------|---------------|----------|
| 🟢 **Green** | Data/Storage | Data display, storage |
| 🔵 **Blue** | Core Components | React, routing, API |
| 🟠 **Orange** | UI Components | Header, dashboard |
| 🔴 **Red** | Authentication | Login, security |
| 🟣 **Purple** | Storage/State | Local storage, state |
| 🟡 **Yellow** | Processing | Data processing |
| ⚫ **Gray** | Backend | Django, database |
| 🟤 **Brown** | Navigation | Sidebar, menus |
| 🔷 **Cyan** | Services | API services |
| 🔶 **Pink** | User Interaction | User actions |

---

## 📝 Key Points for Client Presentation

### Flow Diagrams Show:
1. **User Journey** - Complete flow from login to data viewing
2. **Login Process** - Step-by-step authentication
3. **Navigation** - How users move between pages
4. **Data Fetching** - How data is loaded and displayed
5. **User Actions** - Search, export, refresh functionality

### Architecture Diagrams Show:
1. **System Structure** - How components are organized
2. **Component Hierarchy** - Parent-child relationships
3. **API Integration** - How frontend connects to backend
4. **Data Flow** - How data moves through the system
5. **Technology Stack** - Technologies used

---

**Document Purpose:** Complete flow and architecture diagrams for frontend application  
**Last Updated:** 2024
