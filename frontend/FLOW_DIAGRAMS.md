<<<<<<< HEAD
 # Frontend Flow Diagrams - Visual Guide

## 🎯 Quick Reference Flow

### 1. Login to Dashboard Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    USER VISITS APPLICATION                    │
└───────────────────────────┬───────────────────────────────────┘
                            │
                            ▼
                    ┌───────────────┐
                    │  Welcome Page │
                    └───────┬───────┘
                            │
                            ▼
                    ┌───────────────┐
                    │  Login Page   │
                    │               │
                    │  Fields:      │
                    │  • Email      │
                    │  • Password   │
                    │  • Remember Me│
                    └───────┬───────┘
                            │
                            ▼
            ┌───────────────────────────────┐
            │  POST /api/accounts/login/     │
            │  { email, password }          │
            └───────────────┬───────────────┘
                            │
                            ▼
            ┌───────────────────────────────┐
            │  Response: {                   │
            │    tokens: {                   │
            │      access: "...",           │
            │      refresh: "..."           │
            │    },                         │
            │    user: { ... }              │
            │  }                            │
            └───────────────┬───────────────┘
                            │
                            ▼
            ┌───────────────────────────────┐
            │  Store in localStorage:       │
            │  • accessToken                │
            │  • refreshToken               │
            │  • user                       │
            └───────────────┬───────────────┘
                            │
                            ▼
                    ┌───────────────┐
                    │   Dashboard   │
                    └───────────────┘
```

---

## 📊 Sidebar Navigation Structure

```
┌─────────────────────────────────────────────────────────────┐
│                        SIDEBAR MENU                          │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  📊 Dashboard                                                │
│                                                               │
│  🔍 Asset Discovery ▼                                        │
│     ├─ 👣 Subdomains                                         │
│     ├─ 🗺️ Endpoints                                          │
│     ├─ 🔌 Open Ports                                         │
│     ├─ 📁 Directories                                        │
│     └─ 🔧 Technologies                                        │
│                                                               │
│  🐞 Vulnerabilities (Placeholder)                            │
│                                                               │
│  🔒 SSL Certificate                                           │
│                                                               │
│  🛒 Marketplace (Placeholder)                                │
│                                                               │
│  ⚙️ Settings (Placeholder)                                   │
│                                                               │
│  🚪 Sign Out                                                  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 Complete User Journey

```
START
  │
  ├─► Welcome Page
  │     │
  │     ├─► Not Logged In ──► Login Page
  │     │                        │
  │     │                        ├─► Enter Credentials
  │     │                        │
  │     │                        ├─► API Call
  │     │                        │
  │     │                        ├─► Store Tokens
  │     │                        │
  │     │                        └─► Dashboard
  │     │
  │     └─► Already Logged In ──► Dashboard
  │
  └─► Dashboard
        │
        ├─► View Statistics
        │     • Critical: 12
        │     • High: 24
        │     • Medium: 36
        │     • Low: 8
        │
        ├─► Recent Vulnerabilities Table
        │
        └─► Quick Actions
              • Start New Scan
              • Generate Report
              • Run Security Check

        ┌─────────────────────────────────────┐
        │     SIDEBAR NAVIGATION              │
        └─────────────────────────────────────┘
                  │
                  ├─► Subdomains Page
                  │     │
                  │     ├─► Fetch: GET /subdomains/
                  │     │
                  │     ├─► Display Table:
                  │     │     • Domain
                  │     │     • Status
                  │     │     • Technologies
                  │     │     • IP Addresses
                  │     │     • Ports
                  │     │     • WAF/CDN
                  │     │
                  │     └─► Actions:
                  │           • Search
                  │           • Export Excel
                  │           • Refresh
                  │
                  ├─► Endpoints Page
                  │     │
                  │     ├─► Fetch: GET /endpoints/
                  │     │
                  │     ├─► Display Table:
                  │     │     • HTTP URL
                  │     │     • Subdomain
                  │     │     • Status Code
                  │     │     • Technologies
                  │     │     • Content Type
                  │     │     • Content Length
                  │     │
                  │     └─► Actions:
                  │           • Search
                  │           • Export Excel
                  │           • Refresh
                  │
                  ├─► Open Ports Page
                  │     │
                  │     ├─► Fetch: GET /open-ports/
                  │     │
                  │     ├─► Display Table:
                  │     │     • Domain
                  │     │     • Ports (array)
                  │     │
                  │     └─► Actions:
                  │           • Search
                  │           • Export Excel
                  │           • Refresh
                  │
                  ├─► Directories Page
                  │     │
                  │     ├─► Fetch: GET /directories/
                  │     │
                  │     ├─► Display Table:
                  │     │     • URL
                  │     │     • Subdomain
                  │     │     • Content Type
                  │     │     • Status
                  │     │
                  │     └─► Actions:
                  │           • Search
                  │           • Export Excel
                  │           • Refresh
                  │
                  ├─► Technologies Page
                  │     │
                  │     ├─► Fetch: GET /technologies/
                  │     │
                  │     ├─► Display Table:
                  │     │     • Domain
                  │     │     • Technologies (array)
                  │     │
                  │     └─► Actions:
                  │           • Search
                  │           • Export Excel
                  │           • Refresh
                  │
                  ├─► SSL Certificate Page
                  │
                  └─► Sign Out
                        │
                        ├─► API Call: POST /logout/
                        │
                        ├─► Clear localStorage
                        │
                        └─► Redirect to Login
```

---

## 📋 Data Flow Diagram

### Subdomains Page Data Flow

```
┌──────────────┐
│   User       │
│   Clicks     │
│   Subdomains │
└──────┬───────┘
       │
       ▼
┌─────────────────────────────────────┐
│  Component: DigitalFootprintsPage   │
│                                     │
│  1. Check for accessToken           │
│  2. Set loading = true              │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│  API Request:                       │
│  GET /api/attacksurface/subdomains/ │
│  ?org_id=2                          │
│                                     │
│  Headers:                           │
│  Authorization: Bearer {token}      │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│  API Response:                      │
│  {                                  │
│    count: 150,                      │
│    next: "http://...?page=2",      │
│    results: [                       │
│      {                              │
│        id: 1,                       │
│        domain: "sub.example.com",   │
│        status: "Active",            │
│        title: "Home Page",          │
│        technologies: ["React", ...],│
│        ip: ["192.168.1.1", ...],    │
│        ports: [80, 443, ...],       │
│        waf: "Cloudflare",           │
│        cdn: "Cloudflare",           │
│        created_at: "2024-01-01...", │
│        updated_at: "2024-01-02..."  │
│      }, ...                         │
│    ]                                │
│  }                                  │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│  Process Pagination:                │
│  • Loop through all pages           │
│  • Combine all results              │
│  • Store in state                  │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│  Display in Table:                  │
│  • Render rows with data            │
│  • Show max 3 items per cell        │
│  • Add "+X" for more items          │
│  • Enable search filter             │
│  • Add export button                │
└─────────────────────────────────────┘
```

---

## 🔐 Authentication Flow Detail

```
┌─────────────────────────────────────────────────────────────┐
│                    AUTHENTICATION FLOW                       │
└─────────────────────────────────────────────────────────────┘

1. INITIAL REQUEST
   ┌─────────────┐
   │   Request   │
   └──────┬──────┘
          │
          ▼
   ┌──────────────────────┐
   │ Check localStorage   │
   │ for accessToken      │
   └──────┬───────────────┘
          │
          ├─► Token Found ──► Add to Header ──► Send Request
          │
          └─► No Token ──► Send Request (no auth)

2. RESPONSE HANDLING
   ┌─────────────┐
   │  Response   │
   └──────┬──────┘
          │
          ├─► 200 OK ──► Success ──► Display Data
          │
          └─► 401 Unauthorized
                │
                ▼
          ┌──────────────────────┐
          │ Token Refresh Flow  │
          └──────┬──────────────┘
                 │
                 ├─► Get refreshToken from localStorage
                 │
                 ├─► POST /token/refresh/
                 │   { refresh: "..." }
                 │
                 ├─► Response: { access: "new_token" }
                 │
                 ├─► Update accessToken in localStorage
                 │
                 └─► Retry Original Request
                     │
                     ├─► Success ──► Display Data
                     │
                     └─► Still 401 ──► Clear Tokens ──► Redirect to Login
```

---

## 📊 Page Structure Overview

### Dashboard Layout

```
┌─────────────────────────────────────────────────────────────┐
│                         HEADER                               │
│  Infotech Sentinel    [Features] [Marketplace] [User] [Out] │
└─────────────────────────────────────────────────────────────┘
┌──────────┬──────────────────────────────────────────────────┐
│          │                                                  │
│ SIDEBAR  │              MAIN CONTENT AREA                    │
│          │                                                  │
│ • Dash   │  ┌──────────────────────────────────────────┐   │
│ • Asset  │  │  Statistics Cards (4 cards)               │   │
│   - Sub  │  │  [Critical] [High] [Medium] [Low]         │   │
│   - End  │  └──────────────────────────────────────────┘   │
│   - Port │                                                  │
│   - Dir  │  ┌──────────────────────────────────────────┐   │
│   - Tech │  │  Recent Vulnerabilities Table            │   │
│ • Vuln   │  │  [Title | Severity | Status | Time]     │   │
│ • SSL    │  └──────────────────────────────────────────┘   │
│ • Market │                                                  │
│ • Set    │  ┌──────────────┬──────────────────────────┐   │
│ • Out    │  │ Quick Actions │  Recent Activity         │   │
│          │  │ • New Scan    │  • Notification 1       │   │
│          │  │ • Report      │  • Notification 2       │   │
│          │  │ • Check       │  • Notification 3       │   │
│          │  └──────────────┴──────────────────────────┘   │
└──────────┴──────────────────────────────────────────────────┘
```

### Data Page Layout (Subdomains/Endpoints/etc.)

```
┌─────────────────────────────────────────────────────────────┐
│                         HEADER                               │
└─────────────────────────────────────────────────────────────┘
┌──────────┬──────────────────────────────────────────────────┐
│          │                                                  │
│ SIDEBAR  │              MAIN CONTENT AREA                    │
│          │                                                  │
│          │  ┌──────────────────────────────────────────┐   │
│          │  │  Page Title          [Refresh] [Export]  │   │
│          │  └──────────────────────────────────────────┘   │
│          │                                                  │
│          │  ┌──────────────────────────────────────────┐   │
│          │  │  Search Box: [___________________]        │   │
│          │  └──────────────────────────────────────────┘   │
│          │                                                  │
│          │  ┌──────────────────────────────────────────┐   │
│          │  │  Data Table (Scrollable)                 │   │
│          │  │  ┌────┬────────┬──────┬──────────┐       │   │
│          │  │  │ SNo│ Field1 │Field2│ Field3  │       │   │
│          │  │  ├────┼────────┼──────┼──────────┤       │   │
│          │  │  │ 1  │ Data  │ Data │ Data    │       │   │
│          │  │  │ 2  │ Data  │ Data │ Data    │       │   │
│          │  │  │ ...│ ...    │ ...  │ ...     │       │   │
│          │  │  └────┴────────┴──────┴──────────┘       │   │
│          │  └──────────────────────────────────────────┘   │
│          │                                                  │
└──────────┴──────────────────────────────────────────────────┘
```

---

## 🔍 Search & Filter Flow

```
User Types in Search Box
        │
        ▼
┌───────────────────────┐
│  OnChange Event       │
│  Update searchTerm    │
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│  Filter Data Array   │
│  • Convert to lower  │
│  • Check each field  │
│  • Match search term │
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│  Update Table Display │
│  • Show filtered rows │
│  • Hide non-matching │
└───────────────────────┘
```

---

## 📤 Export to Excel Flow

```
User Clicks Export Button
        │
        ▼
┌───────────────────────┐
│  Create ExcelJS      │
│  Workbook            │
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│  Add Worksheet        │
│  • Set column headers│
│  • Define widths     │
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│  Loop Through Data   │
│  • Add each row      │
│  • Format values     │
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│  Style Header Row    │
│  • Bold font         │
│  • Gray background   │
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│  Generate Buffer     │
│  • Convert to blob   │
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│  Download File        │
│  • Use file-saver    │
│  • Name: resource_date.xlsx│
└───────────────────────┘
```

---

## 🎨 Component Hierarchy

```
App
│
├─► Header (Always Visible)
│   ├─► App Name
│   ├─► Navigation Buttons
│   └─► User Info / Login Buttons
│
└─► Routes
    │
    ├─► WelcomePage (/)
    │
    ├─► LoginPage (/login)
    │   └─► Login Form
    │
    ├─► SignUpPage (/signup)
    │   └─► Registration Form
    │
    ├─► DashboardPage (/dashboard)
    │   ├─► Sidebar
    │   └─► Dashboard Content
    │       ├─► Statistics Cards
    │       ├─► Vulnerabilities Table
    │       └─► Quick Actions
    │
    ├─► DigitalFootprintsPage (/subdomains)
    │   ├─► Sidebar
    │   └─► Subdomains Content
    │       ├─► Search Box
    │       ├─► Data Table
    │       └─► Export Button
    │
    ├─► EndpointsPage (/endpoints)
    │   ├─► Sidebar
    │   └─► Endpoints Content
    │
    ├─► OpenPortsPage (/open-ports)
    │   ├─► Sidebar
    │   └─► Open Ports Content
    │
    ├─► DirectoriesPage (/directories)
    │   ├─► Sidebar
    │   └─► Directories Content
    │
    ├─► TechnologiesPage (/technologies)
    │   ├─► Sidebar
    │   └─► Technologies Content
    │
    └─► SSLCertificatePage (/ssl-certificates)
        ├─► Sidebar
        └─► SSL Certificate Content
```

---

## 📝 Key Data Structures

### User Object (stored in localStorage)
```json
{
  "id": 1,
  "name": "John Doe",
  "email": "john@example.com",
  "organization": "Company Name"
}
```

### Subdomain Object (API Response)
```json
{
  "id": 1,
  "domain": "sub.example.com",
  "status": "Active",
  "title": "Home Page",
  "technologies": ["React", "Node.js"],
  "ip": ["192.168.1.1", "10.0.0.1"],
  "ports": [80, 443, 8080],
  "waf": "Cloudflare",
  "cdn": "Cloudflare",
  "screenshot": "http://...",
  "location": "US",
  "endpoints_count": 5,
  "vulnerabilities_count": 2,
  "content_type": "text/html",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-02T00:00:00Z"
}
```

### Endpoint Object (API Response)
```json
{
  "id": 1,
  "http_url": "https://sub.example.com/api/users",
  "subdomain_name": "sub.example.com",
  "http_status": 200,
  "content_type": "application/json",
  "content_length": 1024,
  "title": "API Endpoint",
  "is_alive": true,
  "technologies": ["Express", "MongoDB"],
  "discovered_at": "2024-01-01T00:00:00Z",
  "last_scan": "2024-01-02T00:00:00Z"
}
```

---

**End of Flow Diagrams**
=======
 # Frontend Flow Diagrams - Visual Guide

## 🎯 Quick Reference Flow

### 1. Login to Dashboard Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    USER VISITS APPLICATION                    │
└───────────────────────────┬───────────────────────────────────┘
                            │
                            ▼
                    ┌───────────────┐
                    │  Welcome Page │
                    └───────┬───────┘
                            │
                            ▼
                    ┌───────────────┐
                    │  Login Page   │
                    │               │
                    │  Fields:      │
                    │  • Email      │
                    │  • Password   │
                    │  • Remember Me│
                    └───────┬───────┘
                            │
                            ▼
            ┌───────────────────────────────┐
            │  POST /api/accounts/login/     │
            │  { email, password }          │
            └───────────────┬───────────────┘
                            │
                            ▼
            ┌───────────────────────────────┐
            │  Response: {                   │
            │    tokens: {                   │
            │      access: "...",           │
            │      refresh: "..."           │
            │    },                         │
            │    user: { ... }              │
            │  }                            │
            └───────────────┬───────────────┘
                            │
                            ▼
            ┌───────────────────────────────┐
            │  Store in localStorage:       │
            │  • accessToken                │
            │  • refreshToken               │
            │  • user                       │
            └───────────────┬───────────────┘
                            │
                            ▼
                    ┌───────────────┐
                    │   Dashboard   │
                    └───────────────┘
```

---

## 📊 Sidebar Navigation Structure

```
┌─────────────────────────────────────────────────────────────┐
│                        SIDEBAR MENU                          │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  📊 Dashboard                                                │
│                                                               │
│  🔍 Asset Discovery ▼                                        │
│     ├─ 👣 Subdomains                                         │
│     ├─ 🗺️ Endpoints                                          │
│     ├─ 🔌 Open Ports                                         │
│     ├─ 📁 Directories                                        │
│     └─ 🔧 Technologies                                        │
│                                                               │
│  🐞 Vulnerabilities (Placeholder)                            │
│                                                               │
│  🔒 SSL Certificate                                           │
│                                                               │
│  🛒 Marketplace (Placeholder)                                │
│                                                               │
│  ⚙️ Settings (Placeholder)                                   │
│                                                               │
│  🚪 Sign Out                                                  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 Complete User Journey

```
START
  │
  ├─► Welcome Page
  │     │
  │     ├─► Not Logged In ──► Login Page
  │     │                        │
  │     │                        ├─► Enter Credentials
  │     │                        │
  │     │                        ├─► API Call
  │     │                        │
  │     │                        ├─► Store Tokens
  │     │                        │
  │     │                        └─► Dashboard
  │     │
  │     └─► Already Logged In ──► Dashboard
  │
  └─► Dashboard
        │
        ├─► View Statistics
        │     • Critical: 12
        │     • High: 24
        │     • Medium: 36
        │     • Low: 8
        │
        ├─► Recent Vulnerabilities Table
        │
        └─► Quick Actions
              • Start New Scan
              • Generate Report
              • Run Security Check

        ┌─────────────────────────────────────┐
        │     SIDEBAR NAVIGATION              │
        └─────────────────────────────────────┘
                  │
                  ├─► Subdomains Page
                  │     │
                  │     ├─► Fetch: GET /subdomains/
                  │     │
                  │     ├─► Display Table:
                  │     │     • Domain
                  │     │     • Status
                  │     │     • Technologies
                  │     │     • IP Addresses
                  │     │     • Ports
                  │     │     • WAF/CDN
                  │     │
                  │     └─► Actions:
                  │           • Search
                  │           • Export Excel
                  │           • Refresh
                  │
                  ├─► Endpoints Page
                  │     │
                  │     ├─► Fetch: GET /endpoints/
                  │     │
                  │     ├─► Display Table:
                  │     │     • HTTP URL
                  │     │     • Subdomain
                  │     │     • Status Code
                  │     │     • Technologies
                  │     │     • Content Type
                  │     │     • Content Length
                  │     │
                  │     └─► Actions:
                  │           • Search
                  │           • Export Excel
                  │           • Refresh
                  │
                  ├─► Open Ports Page
                  │     │
                  │     ├─► Fetch: GET /open-ports/
                  │     │
                  │     ├─► Display Table:
                  │     │     • Domain
                  │     │     • Ports (array)
                  │     │
                  │     └─► Actions:
                  │           • Search
                  │           • Export Excel
                  │           • Refresh
                  │
                  ├─► Directories Page
                  │     │
                  │     ├─► Fetch: GET /directories/
                  │     │
                  │     ├─► Display Table:
                  │     │     • URL
                  │     │     • Subdomain
                  │     │     • Content Type
                  │     │     • Status
                  │     │
                  │     └─► Actions:
                  │           • Search
                  │           • Export Excel
                  │           • Refresh
                  │
                  ├─► Technologies Page
                  │     │
                  │     ├─► Fetch: GET /technologies/
                  │     │
                  │     ├─► Display Table:
                  │     │     • Domain
                  │     │     • Technologies (array)
                  │     │
                  │     └─► Actions:
                  │           • Search
                  │           • Export Excel
                  │           • Refresh
                  │
                  ├─► SSL Certificate Page
                  │
                  └─► Sign Out
                        │
                        ├─► API Call: POST /logout/
                        │
                        ├─► Clear localStorage
                        │
                        └─► Redirect to Login
```

---

## 📋 Data Flow Diagram

### Subdomains Page Data Flow

```
┌──────────────┐
│   User       │
│   Clicks     │
│   Subdomains │
└──────┬───────┘
       │
       ▼
┌─────────────────────────────────────┐
│  Component: DigitalFootprintsPage   │
│                                     │
│  1. Check for accessToken           │
│  2. Set loading = true              │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│  API Request:                       │
│  GET /api/attacksurface/subdomains/ │
│  ?org_id=2                          │
│                                     │
│  Headers:                           │
│  Authorization: Bearer {token}      │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│  API Response:                      │
│  {                                  │
│    count: 150,                      │
│    next: "http://...?page=2",      │
│    results: [                       │
│      {                              │
│        id: 1,                       │
│        domain: "sub.example.com",   │
│        status: "Active",            │
│        title: "Home Page",          │
│        technologies: ["React", ...],│
│        ip: ["192.168.1.1", ...],    │
│        ports: [80, 443, ...],       │
│        waf: "Cloudflare",           │
│        cdn: "Cloudflare",           │
│        created_at: "2024-01-01...", │
│        updated_at: "2024-01-02..."  │
│      }, ...                         │
│    ]                                │
│  }                                  │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│  Process Pagination:                │
│  • Loop through all pages           │
│  • Combine all results              │
│  • Store in state                  │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│  Display in Table:                  │
│  • Render rows with data            │
│  • Show max 3 items per cell        │
│  • Add "+X" for more items          │
│  • Enable search filter             │
│  • Add export button                │
└─────────────────────────────────────┘
```

---

## 🔐 Authentication Flow Detail

```
┌─────────────────────────────────────────────────────────────┐
│                    AUTHENTICATION FLOW                       │
└─────────────────────────────────────────────────────────────┘

1. INITIAL REQUEST
   ┌─────────────┐
   │   Request   │
   └──────┬──────┘
          │
          ▼
   ┌──────────────────────┐
   │ Check localStorage   │
   │ for accessToken      │
   └──────┬───────────────┘
          │
          ├─► Token Found ──► Add to Header ──► Send Request
          │
          └─► No Token ──► Send Request (no auth)

2. RESPONSE HANDLING
   ┌─────────────┐
   │  Response   │
   └──────┬──────┘
          │
          ├─► 200 OK ──► Success ──► Display Data
          │
          └─► 401 Unauthorized
                │
                ▼
          ┌──────────────────────┐
          │ Token Refresh Flow  │
          └──────┬──────────────┘
                 │
                 ├─► Get refreshToken from localStorage
                 │
                 ├─► POST /token/refresh/
                 │   { refresh: "..." }
                 │
                 ├─► Response: { access: "new_token" }
                 │
                 ├─► Update accessToken in localStorage
                 │
                 └─► Retry Original Request
                     │
                     ├─► Success ──► Display Data
                     │
                     └─► Still 401 ──► Clear Tokens ──► Redirect to Login
```

---

## 📊 Page Structure Overview

### Dashboard Layout

```
┌─────────────────────────────────────────────────────────────┐
│                         HEADER                               │
│  Infotech Sentinel    [Features] [Marketplace] [User] [Out] │
└─────────────────────────────────────────────────────────────┘
┌──────────┬──────────────────────────────────────────────────┐
│          │                                                  │
│ SIDEBAR  │              MAIN CONTENT AREA                    │
│          │                                                  │
│ • Dash   │  ┌──────────────────────────────────────────┐   │
│ • Asset  │  │  Statistics Cards (4 cards)               │   │
│   - Sub  │  │  [Critical] [High] [Medium] [Low]         │   │
│   - End  │  └──────────────────────────────────────────┘   │
│   - Port │                                                  │
│   - Dir  │  ┌──────────────────────────────────────────┐   │
│   - Tech │  │  Recent Vulnerabilities Table            │   │
│ • Vuln   │  │  [Title | Severity | Status | Time]     │   │
│ • SSL    │  └──────────────────────────────────────────┘   │
│ • Market │                                                  │
│ • Set    │  ┌──────────────┬──────────────────────────┐   │
│ • Out    │  │ Quick Actions │  Recent Activity         │   │
│          │  │ • New Scan    │  • Notification 1       │   │
│          │  │ • Report      │  • Notification 2       │   │
│          │  │ • Check       │  • Notification 3       │   │
│          │  └──────────────┴──────────────────────────┘   │
└──────────┴──────────────────────────────────────────────────┘
```

### Data Page Layout (Subdomains/Endpoints/etc.)

```
┌─────────────────────────────────────────────────────────────┐
│                         HEADER                               │
└─────────────────────────────────────────────────────────────┘
┌──────────┬──────────────────────────────────────────────────┐
│          │                                                  │
│ SIDEBAR  │              MAIN CONTENT AREA                    │
│          │                                                  │
│          │  ┌──────────────────────────────────────────┐   │
│          │  │  Page Title          [Refresh] [Export]  │   │
│          │  └──────────────────────────────────────────┘   │
│          │                                                  │
│          │  ┌──────────────────────────────────────────┐   │
│          │  │  Search Box: [___________________]        │   │
│          │  └──────────────────────────────────────────┘   │
│          │                                                  │
│          │  ┌──────────────────────────────────────────┐   │
│          │  │  Data Table (Scrollable)                 │   │
│          │  │  ┌────┬────────┬──────┬──────────┐       │   │
│          │  │  │ SNo│ Field1 │Field2│ Field3  │       │   │
│          │  │  ├────┼────────┼──────┼──────────┤       │   │
│          │  │  │ 1  │ Data  │ Data │ Data    │       │   │
│          │  │  │ 2  │ Data  │ Data │ Data    │       │   │
│          │  │  │ ...│ ...    │ ...  │ ...     │       │   │
│          │  │  └────┴────────┴──────┴──────────┘       │   │
│          │  └──────────────────────────────────────────┘   │
│          │                                                  │
└──────────┴──────────────────────────────────────────────────┘
```

---

## 🔍 Search & Filter Flow

```
User Types in Search Box
        │
        ▼
┌───────────────────────┐
│  OnChange Event       │
│  Update searchTerm    │
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│  Filter Data Array   │
│  • Convert to lower  │
│  • Check each field  │
│  • Match search term │
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│  Update Table Display │
│  • Show filtered rows │
│  • Hide non-matching │
└───────────────────────┘
```

---

## 📤 Export to Excel Flow

```
User Clicks Export Button
        │
        ▼
┌───────────────────────┐
│  Create ExcelJS      │
│  Workbook            │
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│  Add Worksheet        │
│  • Set column headers│
│  • Define widths     │
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│  Loop Through Data   │
│  • Add each row      │
│  • Format values     │
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│  Style Header Row    │
│  • Bold font         │
│  • Gray background   │
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│  Generate Buffer     │
│  • Convert to blob   │
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│  Download File        │
│  • Use file-saver    │
│  • Name: resource_date.xlsx│
└───────────────────────┘
```

---

## 🎨 Component Hierarchy

```
App
│
├─► Header (Always Visible)
│   ├─► App Name
│   ├─► Navigation Buttons
│   └─► User Info / Login Buttons
│
└─► Routes
    │
    ├─► WelcomePage (/)
    │
    ├─► LoginPage (/login)
    │   └─► Login Form
    │
    ├─► SignUpPage (/signup)
    │   └─► Registration Form
    │
    ├─► DashboardPage (/dashboard)
    │   ├─► Sidebar
    │   └─► Dashboard Content
    │       ├─► Statistics Cards
    │       ├─► Vulnerabilities Table
    │       └─► Quick Actions
    │
    ├─► DigitalFootprintsPage (/subdomains)
    │   ├─► Sidebar
    │   └─► Subdomains Content
    │       ├─► Search Box
    │       ├─► Data Table
    │       └─► Export Button
    │
    ├─► EndpointsPage (/endpoints)
    │   ├─► Sidebar
    │   └─► Endpoints Content
    │
    ├─► OpenPortsPage (/open-ports)
    │   ├─► Sidebar
    │   └─► Open Ports Content
    │
    ├─► DirectoriesPage (/directories)
    │   ├─► Sidebar
    │   └─► Directories Content
    │
    ├─► TechnologiesPage (/technologies)
    │   ├─► Sidebar
    │   └─► Technologies Content
    │
    └─► SSLCertificatePage (/ssl-certificates)
        ├─► Sidebar
        └─► SSL Certificate Content
```

---

## 📝 Key Data Structures

### User Object (stored in localStorage)
```json
{
  "id": 1,
  "name": "John Doe",
  "email": "john@example.com",
  "organization": "Company Name"
}
```

### Subdomain Object (API Response)
```json
{
  "id": 1,
  "domain": "sub.example.com",
  "status": "Active",
  "title": "Home Page",
  "technologies": ["React", "Node.js"],
  "ip": ["192.168.1.1", "10.0.0.1"],
  "ports": [80, 443, 8080],
  "waf": "Cloudflare",
  "cdn": "Cloudflare",
  "screenshot": "http://...",
  "location": "US",
  "endpoints_count": 5,
  "vulnerabilities_count": 2,
  "content_type": "text/html",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-02T00:00:00Z"
}
```

### Endpoint Object (API Response)
```json
{
  "id": 1,
  "http_url": "https://sub.example.com/api/users",
  "subdomain_name": "sub.example.com",
  "http_status": 200,
  "content_type": "application/json",
  "content_length": 1024,
  "title": "API Endpoint",
  "is_alive": true,
  "technologies": ["Express", "MongoDB"],
  "discovered_at": "2024-01-01T00:00:00Z",
  "last_scan": "2024-01-02T00:00:00Z"
}
```

---

**End of Flow Diagrams**
>>>>>>> latest
