# 📊 Data Import Guide for Slatko Confectionery Management

## 🎯 Quick Start - 3 Easy Steps

Your app now has a **"Import Data"** section in the sidebar. Here's how to get your existing data in:

### **Step 1: Prepare Your Data in Excel/Sheets**

#### **Materials Import**
1. Open Excel/Google Sheets
2. Create columns with these EXACT headers:
   ```
   name | unit | stock | cost_per_unit | supplier | min_stock_level | notes
   ```
3. Fill in your materials data:
   ```
   Flour - All Purpose | kg | 50 | 1.20 | Main Supplier | 10 | Standard baking flour
   Sugar - Granulated | kg | 30 | 0.80 | Sweet Supplies | 5 | White sugar
   Butter - Unsalted | kg | 20 | 4.50 | Dairy Farm | 5 | Premium butter
   ```

#### **Clients Import**
1. Create columns:
   ```
   name | business_name | email | phone | address | credit_limit | payment_term_days | risk_level | notes
   ```
2. Fill in your clients:
   ```
   Cafe Central | Cafe Central Downtown | orders@cafecentral.com | +1-555-0201 | 123 Main St | 1000.00 | 30 | LOW | Regular orders
   Restaurant Bella | Bella Vista Fine Dining | purchasing@bella.com | +1-555-0202 | 456 Oak Ave | 2000.00 | 15 | LOW | High-end desserts
   ```

#### **Purchase History Import**
1. Create columns:
   ```
   supplier | date | status | notes | material_name | quantity | unit_cost | total_cost
   ```
2. Fill in your purchases:
   ```
   Main Supplier | 2024-11-01 | received | Weekly delivery | Flour - All Purpose | 25 | 1.20 | 30.00
   Main Supplier | 2024-11-01 | received | Weekly delivery | Sugar - Granulated | 10 | 0.80 | 8.00
   ```

### **Step 2: Convert to CSV and Import**

1. **Save as CSV**:
   - File → Save As → CSV (Comma delimited)
   - Or copy the data to clipboard

2. **Open Your App**:
   - Go to your deployed Slatko app
   - Click "Import Data" in the sidebar
   - Choose the tab (Materials/Clients/Purchases)

3. **Import the Data**:
   - Paste your CSV data in the text area
   - Click "Import [Type]" button
   - Wait for success message

### **Step 3: Verify Your Data**

- **Materials**: Check "Materials" section
- **Clients**: Check "Clients" section  
- **Purchases**: Check "Purchases" section

## 📋 Data Format Requirements

### **Important Notes**

- **Dates**: Use YYYY-MM-DD format (e.g., 2024-11-01)
- **Numbers**: Use decimal points, not commas (1.20, not 1,20)
- **Risk Levels**: Must be LOW, MEDIUM, or HIGH
- **Status**: Must be pending, received, or cancelled
- **Commas in text**: Use quotes "Text with, commas"

### **Material Names for Purchases**
Make sure the `material_name` in purchases matches EXACTLY the `name` in materials. The system will link them automatically.

## 🚀 Bulk Import Tips

### **For Large Lists**
- Import in batches of 50-100 items at a time
- Test with a few items first
- Keep backups of your original data

### **If Import Fails**
1. Check the format matches the template exactly
2. Make sure there are no empty rows
3. Verify dates are in YYYY-MM-DD format
4. Check that risk_level is LOW/MEDIUM/HIGH
5. Try importing fewer items at once

## 📱 Mobile Access After Import

Once imported, your staff can:
- ✅ See all materials in mobile interface
- ✅ Select clients from your imported list
- ✅ View purchase history and costs
- ✅ Create orders with your existing products
- ✅ Track inventory levels you've set

## 🔄 Ongoing Data Management

After the initial import:
- **Add new items**: Use the regular "Add" buttons in each section
- **Bulk updates**: Export to CSV, modify, and re-import
- **Mobile updates**: Staff can update stock levels on phones
- **Automatic sync**: All changes sync in real-time

Your bakery data is now ready for mobile operations! 🍰📱