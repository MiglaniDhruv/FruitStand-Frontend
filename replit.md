# Overview

The APMC Commission Merchant Accounting System is a comprehensive digital solution designed to replace physical bookkeeping for commission merchants in APMC fruit markets. The system manages the complete vendor-side operations including vendor management, commodity tracking, purchase invoice generation, payment processing, stock management, and ledger maintenance. Built as a full-stack web application, it provides real-time analytics and automated accounting features to streamline operations that were previously managed through manual books (Board Book, Cashbook, Vapari Book, Udhaar Book).

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript for type safety and modern development
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query for server state management and caching
- **UI Framework**: Shadcn/ui components built on Radix UI primitives for accessible, customizable components
- **Styling**: Tailwind CSS with CSS variables for theming and responsive design
- **Form Handling**: React Hook Form with Zod validation for robust form management
- **Build Tool**: Vite for fast development and optimized production builds

## Backend Architecture
- **Runtime**: Node.js with Express.js framework for RESTful API endpoints
- **Language**: TypeScript for full-stack type safety
- **Authentication**: JWT-based authentication with bcrypt password hashing
- **Database ORM**: Drizzle ORM for type-safe database operations
- **API Design**: RESTful endpoints with role-based access control (Admin, Operator, Accountant)
- **Session Management**: Express sessions with PostgreSQL session storage

## Database Architecture
- **Database**: PostgreSQL for ACID compliance and complex relational data
- **Connection**: Neon serverless PostgreSQL for scalable cloud database
- **Schema Management**: Drizzle Kit for database migrations and schema management
- **Data Models**: 
  - Users with role-based permissions
  - Vendors with contact and financial information
  - Commodities with quality grades and pricing
  - Purchase invoices with line items and calculations
  - Payments with multiple modes (Cash, Bank, UPI, Cheque)
  - Stock tracking in multiple units (Crates, Kgs)
  - Bank accounts and financial ledgers

## Authentication & Authorization
- **Authentication Method**: JWT tokens stored in localStorage
- **Password Security**: Bcrypt hashing with salt rounds
- **Role-Based Access**: Three user roles with different permission levels
- **Protected Routes**: Frontend route protection with authentication checks
- **API Security**: Middleware-based token verification for API endpoints

## Business Logic Implementation
- **Commission Calculation**: Automated percentage-based commission calculation on purchases
- **Stock Management**: Real-time stock updates with dual unit tracking (Crates/Kgs)
- **Payment Tracking**: Multiple payment modes with partial payment support
- **Ledger Automation**: Automatic updates to vendor ledgers, cashbook, and bankbook
- **Invoice Generation**: Purchase invoice creation with line items and freight/labor charges

## Development Environment
- **Development Server**: Vite dev server with HMR for fast development
- **Production Build**: ESBuild for server bundling and Vite for client optimization
- **Type Checking**: TypeScript compiler with strict mode enabled
- **Code Organization**: Monorepo structure with shared types between client and server

# External Dependencies

## Database Services
- **Neon Database**: Serverless PostgreSQL hosting with connection pooling
- **Drizzle ORM**: Type-safe database toolkit with migration support

## UI Component Libraries
- **Radix UI**: Accessible component primitives for complex UI interactions
- **Shadcn/ui**: Pre-built component library based on Radix UI
- **Lucide React**: Icon library for consistent iconography

## Development Tools
- **Vite**: Fast build tool with React plugin support
- **TanStack Query**: Server state management with caching and synchronization
- **React Hook Form**: Performant form library with validation
- **Zod**: TypeScript-first schema validation
- **Tailwind CSS**: Utility-first CSS framework

## Authentication & Security
- **jsonwebtoken**: JWT token generation and verification
- **bcrypt**: Password hashing and comparison
- **connect-pg-simple**: PostgreSQL session store for Express

## Date & Utility Libraries
- **date-fns**: Modern date utility library for formatting and manipulation
- **clsx & tailwind-merge**: Conditional CSS class management
- **class-variance-authority**: Utility for creating component variants

## Deployment Platform
- **Replit**: Cloud development and hosting platform with integrated database and deployment