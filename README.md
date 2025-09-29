# Commission Merchant Accounting System

A comprehensive tenant-aware accounting system designed for commission merchants in fruit markets (APMC). This system provides multi-tenant architecture with complete business isolation, allowing multiple organizations to manage their fruit trading operations independently.

## Features

- **Multi-Tenant Architecture**: Complete data isolation between organizations
- **Role-Based Access Control**: Admin, Operator, and Accountant roles with granular permissions
- **Comprehensive Business Management**:
  - Vendor and retailer management
  - Purchase and sales invoice tracking
  - Payment processing (Cash, Bank, UPI, Cheque)
  - Stock management with real-time tracking
  - Financial ledgers (Cashbook, Bankbook)
  - Crate lending and return system
  - Expense tracking and categorization

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- PostgreSQL database
- npm or yarn package manager

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables (create `.env` file):
   ```env
   DATABASE_URL=your_postgresql_connection_string
   JWT_SECRET=your_jwt_secret_key
   PORT=5000
   ```

4. Initialize the database schema:
   ```bash
   npm run db:push
   ```

## Database Setup

### Basic Initialization

For a minimal setup with a demo tenant:

```bash
npm run db:init
```

This creates:
- Demo tenant with slug `demo`
- Admin user (`admin` / `admin123`)

### Comprehensive Test Data

For full testing capabilities with realistic business scenarios:

```bash
npm run seed:tenants
```

This creates three complete tenant organizations with sample data:

#### Available Test Tenants

1. **Mumbai Fruit Market** (`mumbai-fruits`)
   - **Scenario**: Established business
   - **Master Data**: 5 vendors, 8 fruit items, 4 retailers, 3 bank accounts, 8 expense categories
   - **Transactions**: 15 purchase invoices, 12 sales invoices, 8 expense entries, 6 crate transactions
   - **Financial Records**: Complete cashbook/bankbook entries, stock movements, payment tracking
   - **URL**: `http://localhost:5000/mumbai-fruits`

2. **Pune Fresh Produce** (`pune-fresh`)
   - **Scenario**: Growing business
   - **Master Data**: 3 vendors, 6 fruit items, 3 retailers, 3 bank accounts, 8 expense categories
   - **Transactions**: 8 purchase invoices, 6 sales invoices, 5 expense entries, 4 crate transactions
   - **Financial Records**: Mixed payment statuses, developing supplier relationships
   - **URL**: `http://localhost:5000/pune-fresh`

3. **Nashik Organic Hub** (`nashik-organic`)
   - **Scenario**: New business
   - **Master Data**: 2 vendors, 4 fruit items, 1 retailer, 3 bank accounts, 8 expense categories
   - **Transactions**: 3 purchase invoices, 2 sales invoices, 2 expense entries, 1 crate transaction
   - **Financial Records**: Minimal history, premium organic focus, basic operations
   - **URL**: `http://localhost:5000/nashik-organic`

#### Test Users (All Tenants)

Each tenant has three users with different access levels:

| Role | Username | Password | Access Level |
|------|----------|----------|--------------|
| Admin | `admin@{tenant}` | `password123` | Full system access |
| Operator | `operator@{tenant}` | `password123` | Operations management |
| Accountant | `accounts@{tenant}` | `password123` | Financial operations |

*Replace `{tenant}` with the actual domain (e.g., `admin@mumbaifruits.com`)*

### Database Reset

To reset the database and reload with fresh test data:

```bash
npm run db:reset
```

## Development Workflow

### Starting the Development Server

```bash
npm run dev
```

The server will start on `http://localhost:5000`

### Accessing Different Tenants

The system uses slug-based routing:

- Demo tenant: `http://localhost:5000/demo`
- Mumbai Fruits: `http://localhost:5000/mumbai-fruits`
- Pune Fresh: `http://localhost:5000/pune-fresh`
- Nashik Organic: `http://localhost:5000/nashik-organic`

### Available NPM Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run db:push` | Push schema changes to database |
| `npm run db:init` | Basic initialization (demo tenant only) |
| `npm run seed:tenants` | Create comprehensive test data |
| `npm run db:reset` | Reset database and reseed with test data |
| `npm run check` | TypeScript type checking |
| `npm run test` | Run tests |

## Architecture

### Tenant Isolation

The system implements complete tenant isolation:

- **Database Level**: All tables include `tenantId` with foreign key constraints
- **Application Level**: Middleware ensures users can only access their tenant's data
- **URL Structure**: Tenant slug in URL path provides context
- **Authentication**: JWT tokens include tenant information

### Permission System

Three predefined roles with specific permissions:

- **Admin**: Complete access to all features including user management
- **Operator**: Day-to-day operations (invoices, stock, vendors, retailers)
- **Accountant**: Financial operations (payments, reports, ledgers)

### API Structure

All API endpoints are tenant-aware:

```
GET /api/{tenant-slug}/vendors
POST /api/{tenant-slug}/invoices
PUT /api/{tenant-slug}/payments/{id}
```

## Business Data Overview

### Master Data Generated
- **Vendors**: 2-5 suppliers per tenant (established business has 5, growing has 3, new has 2)
- **Items**: 4-8 fruit products (Apple, Orange, Banana, Mango, Grapes, Pomegranate, Watermelon, Pineapple)
- **Retailers**: 1-4 customers with varying credit limits (₹15,000 to ₹100,000)
- **Bank Accounts**: 3 accounts per tenant (SBI, HDFC, ICICI with realistic balances)
- **Expense Categories**: 8 standard categories (Transportation, Labour, Market Fees, etc.)

### Transactional Data Generated
- **Purchase Invoices**: 3-15 invoices with commission calculations (8.5% commission, 3% labour, freight charges)
- **Sales Invoices**: 2-12 customer billing records with item breakdowns and weight tracking
- **Payments**: Multi-mode payments (Cash 60%, Bank 40%, UPI, Cheque) with partial payment scenarios
- **Stock Management**: Real-time inventory with IN/OUT movements, crate/box/kg tracking
- **Crate Transactions**: 1-6 lending/return records with ₹10 per crate deposit tracking
- **Financial Books**: Comprehensive cashbook and bankbook entries with running balances and transaction history

## Testing Different Scenarios

### Established Business (Mumbai Fruits)
- **Transaction Volume**: 15 purchase invoices (₹25,000 avg), 12 sales invoices (₹15,000 avg)
- **Payment Patterns**: 70% paid invoices, multiple payment modes, complex vendor relationships
- **Stock Levels**: Higher inventory volumes (50-250 kg per transaction)
- **Financial Records**: Comprehensive cashbook/bankbook with ₹50,000+ bank balances

### Growing Business (Pune Fresh)
- **Transaction Volume**: 8 purchase invoices (₹15,000 avg), 6 sales invoices (₹9,000 avg)
- **Payment Patterns**: Mixed payment statuses, developing credit relationships
- **Stock Levels**: Medium inventory (balanced growth scenarios)
- **Financial Records**: Moderate transaction history with growing supplier base

### New Business (Nashik Organic)
- **Transaction Volume**: 3 purchase invoices (₹8,000 avg), 2 sales invoices (₹4,000 avg)
- **Payment Patterns**: Basic operations, fewer outstanding balances
- **Stock Levels**: Smaller inventory, premium organic product focus
- **Financial Records**: Minimal transaction history, starting business operations

## Troubleshooting

### Common Issues

1. **Database Connection**: Ensure PostgreSQL is running and connection string is correct
2. **Missing Tables**: Run `npm run db:push` to create/update schema
3. **No Test Data**: Run `npm run seed:tenants` for comprehensive test data
4. **Tenant Access**: Ensure URL includes tenant slug (e.g., `/mumbai-fruits`)
5. **Authentication**: Check JWT token includes correct tenant information

### Reset Everything

If you encounter issues, you can completely reset:

```bash
npm run db:reset
```

This will:
1. Force push the latest schema
2. Remove all existing data
3. Create fresh test data for all tenants

## Production Deployment

For production deployment:

1. Build the application:
   ```bash
   npm run build
   ```

2. Start the production server:
   ```bash
   npm run start
   ```

3. Use only `npm run db:init` for production (creates minimal demo tenant)
4. Never use `npm run seed:tenants` in production (test data only)

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Verify your database connection and schema
3. Ensure you're using the correct tenant URLs
4. Check that test data is properly seeded for development

## License

MIT License - see LICENSE file for details.