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

## WhatsApp Integration

### Overview

The system supports automated WhatsApp notifications via Twilio for enhanced customer and vendor communication. Four message types are supported:

- **Sales Invoice**: Notify retailers about new invoices with amount details
- **Purchase Invoice**: Inform vendors about invoice generation and payment terms
- **Payment Reminder**: Send automated reminders for outstanding payments
- **Payment Notification**: Confirm payment received with transaction details

All messages include professional business branding with your company name, contact details, and addresses when configured in tenant settings.

### Template Configuration

Templates must be created and approved in Twilio Console before use. Each template supports rich variable substitution for personalized messaging.

**Important Notes about Template Variables:**
- Twilio placeholder positions are fixed ({{1}}, {{2}}, etc.) and cannot be removed conditionally
- The system passes empty strings for optional values when data is missing
- Template phrasing should avoid dangling separators when optional fields are empty
- Consider separate lines for contact person and phone instead of combined formats

#### Sales Invoice Template
```
🧾 *Invoice Generated - {{1}}*

Hi {{2}}, 

Your invoice {{3}} dated {{4}} has been generated.

💰 *Amount Details:*
• Total Amount: {{5}}
• Outstanding: {{6}}

Contact Person: {{7}}
Phone: {{8}}
Address: {{9}}

For any queries, please contact us.

Thanks,
{{1}}
```

**Variable Mapping:**
| Position | Variable | Description | Example |
|----------|----------|-------------|---------|
| {{1}} | businessName | Your business name | "Mumbai Fruit Market" |
| {{2}} | retailerName | Customer name | "ABC Retailers" |
| {{3}} | invoiceNumber | Invoice number | "INV-2024-001" |
| {{4}} | invoiceDate | Invoice date | "15 Oct 2024" |
| {{5}} | totalAmount | Total invoice amount | "₹25,450.00" |
| {{6}} | udhaaarAmount | Outstanding amount | "₹15,270.00" |
| {{7}} | contactPerson | Retailer contact person | "Mr. Sharma" |
| {{8}} | businessPhone | Your business phone | "+91 98765 43210" |
| {{9}} | retailerAddress | Retailer address (alias: address) | "456 Retail St, Mumbai" |

#### Purchase Invoice Template
```
📋 *Purchase Invoice - {{1}}*

Dear {{2}},

Your invoice {{3}} dated {{4}} has been processed.

💰 *Payment Details:*
• Net Amount: {{5}}
• Balance Due: {{6}}

Contact Person: {{7}}
Phone: {{8}}
Address: {{9}}

Payment will be processed as per terms.

Best regards,
{{1}}
```

**Variable Mapping:**
| Position | Variable | Description | Example |
|----------|----------|-------------|---------|
| {{1}} | businessName | Your business name | "Mumbai Fruit Market" |
| {{2}} | vendorName | Vendor name | "Fresh Fruits Supplier" |
| {{3}} | invoiceNumber | Invoice number | "PI-2024-001" |
| {{4}} | invoiceDate | Invoice date | "15 Oct 2024" |
| {{5}} | netAmount | Net payable amount | "₹18,750.00" |
| {{6}} | balanceAmount | Outstanding balance | "₹12,500.00" |
| {{7}} | contactPerson | Vendor contact person | "Mr. Patel" |
| {{8}} | businessPhone | Your business phone | "+91 98765 43210" |
| {{9}} | vendorAddress | Vendor address (alias: address) | "789 Vendor St, Pune" |

#### Payment Reminder Template
```
⏰ *Payment Reminder - {{1}}*

Dear {{2}},

This is a friendly reminder for invoice {{3}}.

💰 *Outstanding Amount: {{4}}*
📅 Due Date: {{5}}

Contact Person: {{6}}
Phone: {{7}}
Address: {{8}}

Please arrange payment at your earliest convenience.

Thanks,
{{1}}
```

**Variable Mapping:**
| Position | Variable | Description | Example |
|----------|----------|-------------|---------|
| {{1}} | businessName | Your business name | "Mumbai Fruit Market" |
| {{2}} | recipientName | Customer/vendor name | "ABC Retailers" |
| {{3}} | invoiceNumber | Invoice number | "INV-2024-001" |
| {{4}} | udhaaarAmount | Outstanding amount | "₹15,270.00" |
| {{5}} | dueDate | Payment due date | "22 Oct 2024" |
| {{6}} | contactPerson | Recipient contact person | "Mr. Sharma" |
| {{7}} | businessPhone | Your business phone | "+91 98765 43210" |
| {{8}} | recipientAddress | Recipient address (alias: address) | "456 Client St, Mumbai" |

#### Payment Notification Template
```
✅ *Payment Received - {{1}}*

Dear {{2}},

We confirm receipt of your payment for invoice {{3}}.

💰 *Payment Details:*
• Amount: {{4}}
• Date: {{5}}
• Mode: {{6}}

Contact Person: {{7}}
Phone: {{8}}
Address: {{9}}

Thank you for your business!

Best regards,
{{1}}
```

**Variable Mapping:**
| Position | Variable | Description | Example |
|----------|----------|-------------|---------|
| {{1}} | businessName | Your business name | "Mumbai Fruit Market" |
| {{2}} | recipientName | Customer/vendor name | "ABC Retailers" |
| {{3}} | invoiceNumber | Invoice number | "INV-2024-001" |
| {{4}} | paymentAmount | Payment amount | "₹10,000.00" |
| {{5}} | paymentDate | Payment date | "20 Oct 2024" |
| {{6}} | paymentMode | Payment method | "Bank Transfer" |
| {{7}} | contactPerson | Recipient contact person | "Mr. Sharma" |
| {{8}} | businessPhone | Your business phone | "+91 98765 43210" |
| {{9}} | recipientAddress | Recipient address (alias: address) | "456 Client St, Mumbai" |

### Template Variables Reference

| Category | Variable | Type | Format | Required | Description |
|----------|----------|------|--------|----------|-------------|
| **Tenant Details** | businessName | String | Max 50 chars | Optional | Your business name from tenant settings |
| | businessPhone | String | E.164 format | Optional | Your contact phone from tenant settings |
| | businessAddress | String | Max 100 chars | Optional | Your business address (normalized) |
| **Invoice Details** | invoiceNumber | String | - | Yes | Invoice identifier |
| | invoiceDate | String | dd MMM yyyy | Yes | Invoice creation date |
| | totalAmount | String | ₹X,XXX.XX | Yes | Sales invoice total |
| | udhaaarAmount | String | ₹X,XXX.XX | Yes | Outstanding amount |
| | netAmount | String | ₹X,XXX.XX | Yes | Purchase invoice net amount |
| | balanceAmount | String | ₹X,XXX.XX | Yes | Purchase invoice balance |
| **Payment Details** | paymentAmount | String | ₹X,XXX.XX | Yes | Payment amount received |
| | paymentDate | String | dd MMM yyyy | Yes | Payment transaction date |
| | paymentMode | String | - | Yes | Payment method used |
| | dueDate | String | dd MMM yyyy | Yes | Payment due date |
| **Contact Details** | contactPerson | String | Max 50 chars | Optional | Vendor/retailer contact person |
| | retailerAddress | String | Max 100 chars | Optional | Retailer address (normalized) |
| | vendorAddress | String | Max 100 chars | Optional | Vendor address (normalized) |
| | recipientAddress | String | Max 100 chars | Optional | Recipient address (normalized) |
| | address | String | Max 100 chars | Optional | Generic address field |

### Setup Instructions

1. **Create Twilio Account**
   - Sign up at [Twilio Console](https://console.twilio.com)
   - Verify your account and get Account SID & Auth Token

2. **Set up WhatsApp Business**
   - Request WhatsApp Business API access through Twilio
   - Complete business verification process
   - Get approved WhatsApp sender number

3. **Create Message Templates**
   - Go to Messaging > Content Templates in Twilio Console
   - Create templates using the formats above
   - Submit for WhatsApp approval (may take 24-48 hours)
   - Copy ContentSid values once approved

4. **Configure Environment Variables**
   - Add Twilio credentials to `.env` file
   - Set template ContentSids for each message type
   - Ensure WhatsApp sender number includes `whatsapp:` prefix

5. **Configure Tenant Settings**
   - Access Settings page in the application
   - Enable WhatsApp integration
   - Add business phone and address for branding
   - Configure scheduler preferences if needed

6. **Test Configuration**
   - Start with Twilio sandbox for testing
   - Send test messages to verify templates work
   - Test with and without optional fields (contact person, addresses)
   - Verify variable substitution and formatting

### Variable Formatting

The system automatically formats variables for optimal WhatsApp display:

- **Currency**: All amounts formatted as ₹X,XXX.XX (Indian Rupee with thousand separators)
- **Dates**: Formatted as "dd MMM yyyy" (e.g., "15 Oct 2024")
- **Addresses**: Multi-line addresses normalized to single line, maximum 100 characters
- **Names**: Truncated to 50 characters maximum with "..." suffix if needed
- **Optional Fields**: Only included in messages when data is available in the database

**Address Normalization:**
- Newlines replaced with spaces
- Multiple spaces collapsed to single space
- Whitespace trimmed
- Truncated with "..." if over 100 characters

**Text Truncation:**
- Business names and contact persons: 50 character limit
- Addresses: 100 character limit
- Graceful truncation with "..." indicator

For technical implementation details, see `server/src/services/whatsapp/template-builder.ts`.

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