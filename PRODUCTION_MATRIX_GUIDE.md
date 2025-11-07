# 🍳 Production Matrix - Quick Guide

## What It Does

The **Production Matrix** is a visual grid that shows exactly what you need to cook for each client on a specific day. It makes production planning instant and easy.

## Visual Layout

```
╔════════════════╦══════════╦══════════╦══════════╦═══════════╗
║ Products       ║ Client A ║ Client B ║ Client C ║   TOTAL   ║
╠════════════════╬══════════╬══════════╬══════════╬═══════════╣
║ Chocolate Cake ║    5     ║    2     ║    —     ║     7     ║
║ Cheesecake     ║    3     ║    —     ║    4     ║     7     ║
║ Dubai Bar      ║   10     ║    5     ║    2     ║    17     ║
║ Tiramisu       ║    —     ║    3     ║    1     ║     4     ║
╠════════════════╬══════════╬══════════╬══════════╬═══════════╣
║ Actions        ║  🍳 Start ║  🍳 Start ║  🍳 Start ║ 🔥 START  ║
║                ║  Cooking ║  Cooking ║  Cooking ║    ALL    ║
╚════════════════╩══════════╩══════════╩══════════╩═══════════╝
```

## How to Use

### 1. Select a Date
- At the top right, choose which day's orders you want to prepare
- Options show: "Today", "Tomorrow", or specific dates with pending orders
- The matrix automatically updates to show that day's orders

### 2. Read the Matrix
- **Rows** = Products you need to make
- **Columns** = Clients who ordered
- **Numbers** = Quantity for that product + client combination
- **"—"** = Client didn't order this product
- **TOTAL column** = Total quantity to make for all clients

### 3. Start Cooking

#### Option A: Cook for One Client
```
1. Find the client's column
2. Click the green "🍳 Start Cooking" button under their name
3. System creates production batches for ALL their products
4. Toast message confirms: "✅ Started cooking 3 products for Client A!"
```

#### Option B: Cook Everything
```
1. Click the purple "🔥 START ALL" button in the TOTAL column
2. System creates production batches for ALL products for ALL clients
3. Toast message confirms: "✅ Started cooking 4 products for all clients!"
```

## What Happens When You Click "Start Cooking"

1. **System creates production batches** automatically
   - One batch per product
   - Quantity = exact amount needed for that client (or all clients)
   - Date = the selected delivery date
   - Status = "In Progress"
   - Notes = Shows which client it's for

2. **Production View Updates**
   - New batches appear in Production view
   - Workers can see what to make
   - Status can be updated (In Progress → Completed)

3. **Inventory Tracked**
   - Completed batches add to inventory
   - Ready for delivery when the date arrives

## Example Workflow

### Scenario: Today is Monday, preparing for Tuesday deliveries

```
Step 1: Open Dashboard
   ↓
Step 2: Production Matrix shows automatically (top of dashboard)
   ↓
Step 3: Date selector shows "Tomorrow (2025-11-08)"
   ↓
Step 4: Matrix displays:
        Client A needs: 5 Chocolate Cakes, 3 Cheesecakes
        Client B needs: 2 Chocolate Cakes, 5 Dubai Bars
        Client C needs: 4 Cheesecakes, 2 Dubai Bars
   ↓
Step 5: Click "🍳 Start Cooking" under Client A
   ↓
Step 6: System creates 2 production batches:
        - Batch 1: 5 Chocolate Cakes for Client A
        - Batch 2: 3 Cheesecakes for Client A
   ↓
Step 7: Toast confirms: "✅ Started cooking 2 products for Client A!"
   ↓
Step 8: Workers see these batches in Production view
   ↓
Step 9: They bake, update status to "Completed"
   ↓
Step 10: On Tuesday, deliver to Client A ✓
```

## Mobile View

On phones, the table scrolls horizontally:
- Product names stay fixed on the left (sticky)
- Swipe left/right to see all clients
- Buttons remain accessible at the bottom

## Summary Footer

At the bottom of the matrix, you see:
- **Total Products:** How many different items to make
- **Total Clients:** How many customers ordering
- **Total Items:** Grand total quantity across all products

## Benefits

### ✅ Before Production Matrix:
```
❌ Look at each delivery individually
❌ Manually count quantities per product
❌ Write down what to make
❌ Risk forgetting items
❌ Create production batches one by one
```

### ✅ After Production Matrix:
```
✅ See ALL orders at a glance
✅ Automatic quantity totals
✅ Visual grid - nothing missed
✅ One-click production start
✅ Batches created instantly
```

## Tips

1. **Start early in the day** - Check the matrix first thing to see what needs cooking
2. **Use "START ALL"** if you want to batch-cook everything at once
3. **Individual buttons** give you flexibility - cook for urgent clients first
4. **Total column** helps you see which products need the most quantity
5. **Date selector** lets you plan ahead for multiple days

## Technical Details

### What Gets Created:
When you click "Start Cooking" for a client:
```json
{
  "productId": "product-123",
  "quantity": 5,
  "date": "2025-11-08",
  "status": "In Progress",
  "notes": "For Client A - 2025-11-08"
}
```

### Database Updates:
- `production_batches` table gets new records
- React Query automatically refetches data
- Production view updates in real-time
- No page refresh needed

## Troubleshooting

### "No orders for [date]"
- No pending deliveries scheduled for that date
- Check if deliveries exist and status is "Pending"

### "No Pending Orders"
- All deliveries are already Paid/Settled/Cancelled
- Create new deliveries using Quick Order button

### Button shows "..."
- Production batches are being created
- Wait for toast confirmation
- Should complete in 1-2 seconds

---

**The Production Matrix saves you time and ensures nothing is forgotten!** 🍰✨

Location: Dashboard → Top of page (right after stats cards)
