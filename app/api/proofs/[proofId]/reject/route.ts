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
		return NextResponse.json({ error: 'Request body is required.' }, { status: 400 });
	}

	if (!body.note) {
		return NextResponse.json({ error: 'note is required.' }, { status: 400 });
	}

	const { error } = await supabase.rpc('rpc_payment_proof_reject', {
		p_proof_id: proofId,
		p_review_note: body.note
	});

	if (error) {
		return NextResponse.json({ error: error.message }, { status: 400 });
	}

	return NextResponse.json({ success: true });
}
