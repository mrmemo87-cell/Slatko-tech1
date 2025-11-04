// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createRouteHandlerClient({ cookies });
  const orderId = params.id;

  const { filePath, mime, size, note, autoApprove = true } = await req.json();

  // NOTE: file upload to the 'payment-proofs' bucket should be handled separately;
  // here we only write the DB record via RPC.
  const { data, error } = await supabase.rpc('rpc_payment_upload_proof', {
    p_order_id: orderId,
    p_file_path: filePath,
    p_mime: mime ?? null,
    p_size: size ?? null,
    p_note: note ?? null,
    p_auto_approve: autoApprove,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ proofId: data }, { status: 200 });
}
