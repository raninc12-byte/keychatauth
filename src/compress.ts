// Compression helpers built on the standard CompressionStream API (deflate-raw).
//
// Stored payloads carry a one-byte header so tiny messages that would grow when
// compressed are kept as plain UTF-8 instead:
//   0x00 = raw UTF-8, 0x01 = deflate-raw
const RAW = 0;
const DEFLATE = 1;

async function pipe(data: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
	const out = new Response(new Blob([data]).stream().pipeThrough(stream));
	return new Uint8Array(await out.arrayBuffer());
}

export const deflate = (data: Uint8Array) => pipe(data, new CompressionStream("deflate-raw"));
export const inflate = (data: Uint8Array) => pipe(data, new DecompressionStream("deflate-raw"));

/** Compress text for storage, choosing whichever encoding is smaller. */
export async function packText(text: string): Promise<Uint8Array> {
	const raw = new TextEncoder().encode(text);
	const packed = await deflate(raw);
	const useDeflate = packed.length < raw.length;
	const body = useDeflate ? packed : raw;
	const out = new Uint8Array(body.length + 1);
	out[0] = useDeflate ? DEFLATE : RAW;
	out.set(body, 1);
	return out;
}

export async function unpackText(stored: ArrayBuffer | Uint8Array): Promise<string> {
	const buf = stored instanceof Uint8Array ? stored : new Uint8Array(stored);
	const body = buf.subarray(1);
	const bytes = buf[0] === DEFLATE ? await inflate(body) : body;
	return new TextDecoder().decode(bytes);
}

/** Compress a JSON value for sending as one binary WebSocket frame. */
export async function packJSON(value: unknown): Promise<Uint8Array> {
	return deflate(new TextEncoder().encode(JSON.stringify(value)));
}
