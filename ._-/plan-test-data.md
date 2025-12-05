# Test Data Generation Plan

## Goal
Create a script to populate the database with realistic test data to validate:
- Calculation accuracy across many transactions
- UI performance with larger datasets
- Monthly grouping and filtering
- Settlement transaction behavior
- Balance calculations at scale

## Approach

### Option 1: Simple Seed Script (Recommended)
**Pros:** Quick, deterministic, easy to debug
**Cons:** Less realistic patterns

Create `src/scripts/seed.ts`:
- Generate 50-100 transactions across 3-6 months
- Mix of expenses (70%) and settlements (30%)
- Random amounts between $5-$500
- Random payers (Adam/Eve)
- Random dates within date range
- Realistic descriptions from predefined list

### Option 2: Realistic Pattern Generator
**Pros:** More realistic expense patterns
**Cons:** More complex, harder to verify calculations

Generate data with patterns:
- Weekly groceries ($80-$150)
- Monthly rent/bills (fixed amounts)
- Random dining ($20-$80)
- Occasional large purchases ($200-$500)
- Settlements to balance periodically

## Implementation Plan

### Step 1: Create Seed Script
File: `src/scripts/seed.ts`

Features:
- Clear existing test data (optional flag)
- Generate configurable number of transactions
- Span configurable date range
- Mix of transaction types
- Predefined description categories (groceries, dining, utilities, entertainment, etc.)
- Random but realistic amounts
- Summary output showing what was created

### Step 2: Add NPM Script
```json
"seed": "tsx src/scripts/seed.ts",
"seed:fresh": "tsx src/scripts/seed.ts --clear"
```

### Step 3: Transaction Categories

**Groceries (30%):** $40-$150
- "Whole Foods", "Trader Joe's", "Safeway", "Farmer's Market"

**Dining (25%):** $15-$80
- "Dinner at [Restaurant]", "Lunch", "Coffee", "Takeout"

**Utilities (10%):** $50-$200
- "Electric Bill", "Internet", "Water", "Gas"

**Transportation (10%):** $20-$100
- "Gas", "Uber", "Lyft", "Parking"

**Entertainment (10%):** $10-$150
- "Movies", "Concert", "Museum", "Streaming Services"

**Shopping (10%):** $25-$300
- "Clothing", "Amazon Order", "Target", "Household Items"

**Settlement (5%):** Variable
- "[Payer] pays [Recipient] back"

### Step 4: Date Distribution
- Start: 6 months ago
- End: Today
- Distribution:
  - 60% in last 2 months (more recent = more activity)
  - 30% in months 3-4
  - 10% in months 5-6

### Step 5: Validation
After seeding:
- Query total transactions created
- Show breakdown by type (expense vs settlement)
- Show breakdown by payer
- Calculate and display final balance
- Show monthly transaction counts

## Usage Example

```bash
# Generate 100 random transactions
npm run seed

# Clear database and generate fresh 200 transactions
npm run seed:fresh -- --count 200

# Generate specific date range
npm run seed -- --start-date 2024-01-01 --end-date 2024-12-31 --count 150
```

## Expected Output

```
🌱 Seeding database with test data...

Configuration:
- Count: 100 transactions
- Date range: 2024-06-05 to 2024-12-05
- Clear existing: false

Generating transactions...
✓ Created 100 transactions

Summary:
- Expenses: 70 (Adam: 36, Eve: 34)
- Settlements: 30 (Adam: 14, Eve: 16)
- Date range: 2024-06-05 to 2024-12-05
- Total amount: $12,847.50
- Final balance: Eve owes Adam $342.25

Monthly breakdown:
- 2024-06: 8 transactions
- 2024-07: 12 transactions
- 2024-08: 15 transactions
- 2024-09: 18 transactions
- 2024-10: 22 transactions
- 2024-11: 25 transactions

✅ Seeding complete!
```

## Safety Considerations

1. **Never run on production database** - Add environment check
2. **Confirmation prompt** - Especially for --clear flag
3. **Dry run mode** - Show what would be created without inserting
4. **Backup reminder** - Warn user to backup before clearing data

## Testing the Seed Data

After seeding:
1. Check UI loads quickly with 100+ transactions
2. Verify balance calculations are correct
3. Test month filtering works properly
4. Confirm settlements display correctly
5. Verify delete functionality still works
6. Check form submission performance

## Code Structure

```typescript
interface SeedConfig {
  count: number;
  startDate: Date;
  endDate: Date;
  clear: boolean;
  dryRun: boolean;
}

interface TransactionTemplate {
  category: string;
  descriptions: string[];
  minAmount: number;
  maxAmount: number;
  weight: number; // probability weight
}

function generateTransaction(date: Date): NewTransaction
function selectRandomPayer(): Payer
function selectRandomCategory(): TransactionTemplate
function generateRandomAmount(min: number, max: number): string
function generateRandomDate(start: Date, end: Date): Date
function parseArgs(): SeedConfig
async function clearTransactions(): Promise<void>
async function seed(config: SeedConfig): Promise<void>
```

## Next Steps

1. Create `src/scripts/seed.ts` with basic implementation
2. Add npm scripts for seeding
3. Test with small dataset (10 transactions)
4. Verify calculations are correct
5. Scale up to 100+ transactions
6. Document usage in README
