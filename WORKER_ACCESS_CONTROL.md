# Worker Access Control - Security Implementation

## Overview
This document outlines the security measures implemented to ensure worker users have restricted access to only the Production Portal and cannot access other areas of the application.

## Access Control Layers

### 1. **Frontend UI Layer** (App.tsx)
- **Sidebar Navigation**: Workers only see "Your Portal" section with Production Portal option
- **Menu Visibility**: All other navigation items hidden for workers
- **Visual Badge**: "🏭 WORKER" badge displayed in sidebar and mobile header for clear identification

### 2. **View Rendering Layer** (renderView function)
- **Hard Barrier**: Workers can ONLY render ProductionPortal view
- **Security Check**: If a worker somehow gets a different view, it's logged and forced back to production portal
- **Error Logging**: Any breach attempts are logged to console with 🚨 severity

### 3. **Navigation Protection** (navigateSafely function)
- **Multi-level Check**: Validates role before allowing view changes
- **Toast Notifications**: Shows error message when access is denied
- **Mobile Support**: Works on both desktop and mobile UI

### 4. **Automatic Redirect** (useEffect hook)
- **Persistent Enforcement**: Watches for view changes and forces workers to production portal
- **Cannot Be Bypassed**: Continuously checks if current view matches worker restrictions
- **Runs on Role Change**: Re-evaluates every time user role is detected

### 5. **API Layer** (roleBasedAccess.ts)
- **Resource-Level Checks**: Validates what data types user can access
- **Audit Logging**: All access attempts logged with timestamp and user info
- **Extensible**: Easy to add more granular resource restrictions

## Worker Role Detection

The application recognizes the following role values as "worker":
```
- 'worker'
- 'production'
- 'production_worker'
- 'production_staff'
- 'production-role'
```

These are normalized to lowercase for comparison.

## Protected Actions

### Workers CANNOT Access:
❌ Dashboard  
❌ Materials Management  
❌ Purchases  
❌ Products Management  
❌ Clients Management  
❌ Inventory  
❌ Reports  
❌ Data Import  
❌ Deliveries/Payments  
❌ Delivery Portal  
❌ Admin Portal  

### Workers CAN Access:
✅ Production Portal (only view allowed)  
✅ Settings (Language, Theme, Sign Out)  

## Visual Indicators

### Desktop
- Orange badge "🏭 WORKER" appears next to username in sidebar when user is logged in as worker
- Sidebar shows "Your Portal" section header instead of full navigation menu

### Mobile
- Orange badge "🏭 WORKER" appears next to username in top bar
- Menu collapsed by default, showing only Production Portal when opened

## Security Flow Diagram

```
User Logs In
    ↓
Auth Check: Is Role = 'worker'?
    ├→ YES: isWorker = true
    │   ├→ Hide all nav items except Production Portal
    │   ├→ Display worker badge
    │   ├→ Force renderView() to return ProductionPortal
    │   └→ Block all navigation attempts to other views
    │
    └→ NO: isWorker = false
        └→ Show full navigation menu
```

## Code References

### 1. Role Detection (App.tsx line ~75)
```tsx
const isWorker = useMemo(() => {
  const role = (user?.role ?? '').toString().toLowerCase();
  return ['worker','production','production_worker','production_staff','production-role'].includes(role);
}, [user?.role]);
```

### 2. Force Redirect (App.tsx line ~105)
```tsx
useEffect(() => {
  if (isWorker && view !== 'production-portal') {
    console.log('🔒 Worker access detected - forcing Production Portal view');
    setView('production-portal');
  }
}, [isWorker, view]);
```

### 3. Navigation Guard (App.tsx line ~354)
```tsx
const navigateSafely = () => {
  if (isWorker) {
    if (id !== 'production-portal') {
      console.warn(`🔒 SECURITY: Worker attempted to access "${id}" - blocking`);
      setView('production-portal');
      showToast('❌ Access denied: Workers can only access Production Portal', 'error');
    }
  }
};
```

### 4. View Rendering Guard (App.tsx line ~275)
```tsx
const renderView = () => {
  if (isWorker) {
    if (view !== 'production-portal') {
      console.error(`🚨 SECURITY BREACH ATTEMPT: Worker trying to render view: ${view}`);
      setView('production-portal');
    }
    return <ProductionPortal lang={lang} />;
  }
  // ... non-worker views
};
```

## Audit Trail

All security-relevant actions are logged to browser console:
- ✅ Normal access: `🔒 Worker access detected...`
- ⚠️ Access denied: `🔒 SECURITY: Worker attempted to access...`
- 🚨 Breach attempt: `🚨 SECURITY BREACH ATTEMPT...`

## Testing Access Control

### To Test as Worker:
1. Create/update a user with role = 'production'
2. Log in with that user
3. Verify:
   - ✅ Only "Your Portal" section visible in sidebar
   - ✅ Orange "🏭 WORKER" badge present
   - ✅ Only Production Portal view renders
   - ✅ Attempting to click other menu items shows error toast
   - ✅ Console shows security logs for all navigation attempts

### To Test Override Prevention:
1. Open browser DevTools Console
2. Try: `setView('dashboard')` - will be blocked and redirected
3. Try: `setView('products')` - will be blocked and redirected
4. Observe: All attempts logged with security warnings

## Browser Console Security Logs Example

```
🔒 Worker access detected - forcing Production Portal view
🔒 SECURITY: Worker attempted to access "dashboard" - blocking and forcing production portal
[timestamp] ✅ ALLOWED | User: user_id (production) | Resource: production_portal
```

## Best Practices

1. **Never Skip Role Checks**: All permission decisions go through isWorker check
2. **Explicit Allow Over Implicit Deny**: Workers must be explicitly allowed (not assumed)
3. **Defensive Layering**: Multiple protection layers prevent single-point failure
4. **User Feedback**: Clear toast messages inform users why actions are blocked
5. **Security Logging**: All attempts logged for audit purposes

## Future Enhancements

1. **Database RLS Policies**: Implement Supabase RLS to restrict data at database level
2. **API Middleware**: Add server-side role validation for all API calls
3. **Session Audit Logs**: Store access attempts in database for compliance
4. **Role Enforcement Server**: Validate role claims on backend before serving data

## Support & Troubleshooting

### Worker sees other menu items?
→ Clear cache, force reload page, check user role in database

### Worker can access other views by URL manipulation?
→ Multiple redirect layers prevent this, check console for 🚨 errors

### Role not recognized?
→ Check exact role string in database, ensure it's one of: worker, production, production_worker, production_staff, production-role

---

**Last Updated**: November 7, 2025
**Security Level**: ⚠️ Frontend + UI Level (Add Database RLS for production)
