# Read-me-first for Copilot

## Implementation goals (for Copilot / GPT-5-codex)
We’re building a 3-portal order lifecycle (Sales → Production → Delivery) with settlement logic:
- Orders are **created on Sales portal**.
- Production moves orders: Received → Preparing → Ready to Pick.
- Delivery moves: Ready for Pick → My Route → Settlement → Completed.
- **Delivery can adjust the actual delivered items** (add/remove) so billing reflects reality.
- Settlement usually closes **previous unpaid invoice** (minus returns), then record payment choice for **current** order:
  - Pay now for this exact order = **SRAZU**
  - Pay later by Cash next time = **LATER_CASH**
  - Pay later by Bank transfer = **LATER_BANK**
- Completed orders show a **badge**:
  - **Paid (green)** or **Unpaid (red)**.
- **Unpaid** can be flipped to **Paid** by uploading **proof of transfer** (photo/PDF) and **Save**.
  - Optionally require **moderation** (awaiting_confirmation → approve/reject).

## Naming note
If the existing Supabase schema uses different names for tables/functions, adapt by:
- Replacing table/function names but **keeping the same behaviors and columns**.
- Keep all enums & triggers equivalent.
- If a function doesn’t exist (e.g., `storage.create_bucket`), use the supported variant in your Supabase version.

## Minimal units we need
- Postgres enums + tables
- RPCs (SQL functions)
- Triggers to keep totals & badges in sync
- Storage bucket for proofs
- Basic RLS stubs (adapt to your auth roles)
- (Optional) REST handlers or Edge Functions
