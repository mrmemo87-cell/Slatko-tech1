import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

interface RequestBody {
	method?: string;
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

	if (!body.method) {
		return NextResponse.json({ error: 'method is required.' }, { status: 400 });
	}

	const { error } = await supabase.rpc('rpc_payment_choose', {
		p_order_id: orderId,
		p_method: body.method
	});

	if (error) {
		return NextResponse.json({ error: error.message }, { status: 400 });
	}

	return NextResponse.json({ success: true });
}
