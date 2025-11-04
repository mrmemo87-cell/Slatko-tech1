import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

interface RequestBody {
	items?: unknown;
	reason?: string;
}

export async function POST(
	req: NextRequest,
	{ params }: { params: { id: string } }
) {
	const supabase = createRouteHandlerClient({ cookies });
	const orderId = params.id;

	let body: RequestBody = {};
	try {
		body = await req.json();
	} catch (error) {
		return NextResponse.json({ error: 'Request body is required.' }, { status: 400 });
	}

	if (!Array.isArray(body.items)) {
		return NextResponse.json({ error: 'items must be an array.' }, { status: 400 });
	}

	const { error } = await supabase.rpc('rpc_delivery_adjust_items', {
		p_order_id: orderId,
		p_delivered_items: body.items,
		p_reason: body.reason ?? null
	});

	if (error) {
		return NextResponse.json({ error: error.message }, { status: 400 });
	}

	return NextResponse.json({ success: true });
}
