/** POST /api/studio: the Studio's own requests (behind the door and the sign-in) */
import type { APIRoute } from 'astro';
import { handleOwner } from '../server/runtime';

export const prerender = false;
export const POST: APIRoute = ({ request, cookies }) => handleOwner(request, cookies);
