declare module 'next/server' {
	export type NextRequest = Request;

	export class NextResponse extends Response {
		static json(body: unknown, init?: ResponseInit): NextResponse;
	}
}

declare module 'next/headers' {
	type CookieValue = {
		name: string;
		value: string;
		expires?: Date;
		domain?: string;
		path?: string;
		httpOnly?: boolean;
		secure?: boolean;
		sameSite?: 'strict' | 'lax' | 'none';
	};

	interface CookieStore {
		get(name: string): CookieValue | undefined;
		set(name: string, value: string, options?: Partial<CookieValue>): void;
		delete(name: string): void;
	}

	export function cookies(): CookieStore;
}
