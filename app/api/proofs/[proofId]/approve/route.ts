import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

interface RequestBody {
	note?: string;
}

export async function POST(
	req: NextRequest,
	{ params }: { params: { proofId: string } }
) {
	const supabase = createRouteHandlerClient({ cookies });
	const proofId = params.proofId;

	let body: RequestBody = {};
	try {
		body = await req.json();
	} catch (error) {
		// Swallow parsing errors to allow empty bodies.
	}

	const { error } = await supabase.rpc('rpc_payment_proof_approve', {
		p_proof_id: proofId,
		p_review_note: body?.note ?? null
	});

	if (error) {
		return NextResponse.json({ error: error.message }, { status: 400 });
	}

	return NextResponse.json({ success: true });
}
