# Slatko Confectionery Management - Mobile Deployment

## Quick Deploy to Vercel

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Deploy the App**:
   ```bash
   # From project directory
   vercel --prod
   ```

3. **Set Environment Variables** in Vercel Dashboard:
   - `VITE_SUPABASE_URL`: `https://wfbvvbqzvolkbktvpnaq.supabase.co`
   - `VITE_SUPABASE_ANON_KEY`: `[your-anon-key]`

## Alternative: Deploy to Netlify

1. **Build the project**:
   ```bash
   npm run build
   ```

2. **Drag & Drop** the `dist` folder to [netlify.com/drop](https://app.netlify.com/drop)

3. **Set Environment Variables** in Site Settings:
   - `VITE_SUPABASE_URL`: `https://wfbvvbqzvolkbktvpnaq.supabase.co`
   - `VITE_SUPABASE_ANON_KEY`: `[your-anon-key]`

## Mobile Access

Once deployed, staff can:
1. Visit the app URL on their phones
2. Create accounts with email/password
3. Install as PWA (Add to Home Screen)
4. Use offline when internet is poor

## Features Ready for Mobile Use

- ✅ **Quick Order Creation**: 3 clicks to create delivery orders
- ✅ **Fast Production Batches**: 2 clicks to start production
- ✅ **Mobile Payments**: Touch-optimized payment processing
- ✅ **Offline Support**: Core functions work without internet
- ✅ **Real-time Updates**: Changes sync across all devices
- ✅ **PWA Installation**: Works like native mobile app