import { supabase } from '../config/supabase';
import type {
	DeliveryStage,
	OrderItem,
	PaymentMethod,
	ProductionStage
} from '../lib/types';

async function runRpc(name: string, params: Record<string, unknown>) {
  const { data, error } = await supabase.rpc(name as never, params as never);
  if (error) {
    throw new Error(error.message);
  }
  return data;
}

export async function productionSetStage(orderId: string, stage: ProductionStage) {
  await runRpc('rpc_production_set_stage', {
    p_order_id: orderId,
    p_stage: stage
  });
}

export async function deliverySetStage(
  orderId: string,
  stage: DeliveryStage,
  options: { assignIfPick?: boolean } = {}
) {
  await runRpc('rpc_delivery_set_stage', {
    p_order_id: orderId,
    p_stage: stage,
    p_assign_if_pick: options.assignIfPick ?? false
  });
}

export async function deliveryAdjustItems(orderId: string, items: OrderItem[], reason?: string) {
  await runRpc('rpc_delivery_adjust_items', {
    p_order_id: orderId,
    p_delivered_items: items,
    p_reason: reason ?? null
  });
}

export async function settlementApplyReturns(orderId: string, amount: number, note?: string) {
  await runRpc('rpc_settlement_apply_returns', {
    p_order_id: orderId,
    p_returns: amount,
    p_note: note ?? null
  });
}

export async function choosePaymentMethod(orderId: string, method: PaymentMethod) {
  await runRpc('rpc_payment_choose', {
    p_order_id: orderId,
    p_method: method
  });
}

export async function completeOrder(orderId: string) {
  await runRpc('rpc_order_complete', {
    p_order_id: orderId
  });
}

export async function approvePaymentProof(proofId: string, note?: string) {
  await runRpc('rpc_payment_proof_approve', {
    p_proof_id: proofId,
    p_review_note: note ?? null
  });
}

export async function rejectPaymentProof(proofId: string, note: string) {
  await runRpc('rpc_payment_proof_reject', {
    p_proof_id: proofId,
    p_review_note: note
  });
}

