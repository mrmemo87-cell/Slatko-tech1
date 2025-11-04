# Minimal REST Endpoints

If you're not calling Supabase RPCs directly from the client, expose the following minimal routes and forward to the corresponding RPC functions.

```
POST /api/orders/:id/delivery/adjust
  body: { items: OrderItem[], reason?: string }
  effect: rpc_delivery_adjust_items

POST /api/orders/:id/production/stage
  body: { stage: ProductionStage }
  effect: rpc_production_set_stage

POST /api/orders/:id/delivery/stage
  body: { stage: DeliveryStage }
  effect: rpc_delivery_set_stage

POST /api/orders/:id/settlement/returns
  body: { amount: number, note?: string }
  effect: rpc_settlement_apply_returns

POST /api/orders/:id/payment/choose
  body: { method: PaymentMethod }
  effect: rpc_payment_choose

POST /api/orders/:id/proofs
  body: { filePath: string, mime?: string, size?: number, note?: string, autoApprove?: boolean }
  effect: rpc_payment_upload_proof

POST /api/proofs/:proofId/approve
  body: { note?: string }
  effect: rpc_payment_proof_approve

POST /api/proofs/:proofId/reject
  body: { note: string }
  effect: rpc_payment_proof_reject

POST /api/orders/:id/complete
  effect: rpc_order_complete
```
