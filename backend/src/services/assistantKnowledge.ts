// Shared knowledge base and reply post-processing for the Flash Claim AI
// assistants (the global chat widget and the per-claim chat). Keeping both
// assistants on one module means they describe the system the same way and
// format replies identically.

// Routes the assistant may offer as clickable shortcuts. Anything else the
// model puts in a NAV line is discarded before the reply reaches the client,
// so it can never steer users to arbitrary URLs.
const ALLOWED_ROUTE_PREFIXES = [
  '/dashboard',
  '/vehicles',
  '/policies',
  '/claims',
  '/profile',
  '/login',
  '/register',
];

export interface NavigationSuggestion {
  label: string;
  route: string;
}

export interface TicketData {
  subject: string;
  message: string;
  claimId?: string;
}

export const SYSTEM_KNOWLEDGE = `ABOUT FLASH CLAIM
Flash Claim is a vehicle insurance claims platform used in Sri Lanka. Three parties work together in it:
- Policyholders register at /register and log in at /login, then manage their vehicles, policies and claims.
- The insurance company works from the /admin area: it verifies vehicles, attaches policies, reviews claims, approves or rejects them and confirms the final claimable amount.
- Garages work from the /garage area: they review assigned claims and submit repair estimates.
All money is in Sri Lankan Rupees (Rs. / LKR).

SYSTEM ARCHITECTURE
- Frontend: React 19 + Vite + Tailwind CSS v4, lucide-react icons, react-router pages.
- Backend: Express 5 REST API with Prisma ORM on SQLite, JWT authentication (tokens last 7 days).
- AI: Google Gemini with automatic model fallback (if one model fails, the next is tried). It powers vehicle detection, damage analysis, document verification and this chat assistant.

MAIN POLICYHOLDER PAGES (these are the navigation shortcuts you can offer)
- /dashboard — overview of vehicles, active claims and policy summary
- /vehicles — registered vehicles; /vehicles/new — add a vehicle with AI auto-detection; /vehicles/<id> — one vehicle's detail
- /policies — insurance policies
- /claims — all claims and their statuses; /claims/new — file a new claim; /claims/<id> — one claim's detail (photos, AI analysis, estimates, documents)
- /profile — personal details

VEHICLE REGISTRATION AND AI DETECTION
- A user adds a vehicle on /vehicles/new. Uploading a photo lets the AI auto-fill make, model, approximate year, color, license plate (when readable) and the vehicle type.
- Vehicle types: CAR, SUV_PICKUP (SUV / crossover / pickup), VAN, LORRY_TRUCK, BUS, MOTORCYCLE, THREE_WHEELER (tuk-tuk), TRACTOR, OTHER.
- Detection reports confidence HIGH (clearly identifiable), MEDIUM (partially obscured) or LOW (unclear or not a vehicle). Low confidence is not a problem — the user simply types the details manually.
- New vehicles start PENDING. The insurance company verifies each one (VERIFIED or REJECTED) and sets its valuation in Rs. — the maximum any claim for that vehicle can pay out.

INSURANCE POLICIES
- Insurance is attached per vehicle, not per user: one vehicle carries one policy.
- A policy has a provider name, policy number, coverage type (for example Comprehensive or Third Party), a deductible (Rs. subtracted from every claim), a coverage percent (share of the remaining cost the policy pays), a premium and validity dates.
- Claims can only be filed for a VERIFIED vehicle that has a policy. The company creates policies from its plan templates; users cannot add their own.

CLAIM LIFECYCLE (statuses, in order)
1. DRAFT — being prepared. Incident details, photos, documents and the garage choice can still be edited.
2. SUBMITTED — sent to the insurance company with no garage assigned yet. AI damage analysis runs automatically at this point.
3. GARAGE_REVIEW — a garage has been assigned and is inspecting the vehicle.
4. UNDER_REVIEW — the insurance company reviews the AI analysis, the estimates, the documents and the garage estimate.
5. GARAGE_ESTIMATED — the garage has submitted its structured repair estimate.
6. APPROVED or REJECTED — the company's decision. On approval the final claimable amount is confirmed; an admin can set a final value that overrides the computed estimate.
7. COMPLETED — the claim is settled and closed.
Only DRAFT claims can be edited, and at least one photo is required before a claim can be submitted.

FILING A CLAIM (steps to guide a user through)
1. Open /claims/new (Claims page, then New Claim).
2. Pick a verified vehicle that has a policy, then enter the incident date, location, description and weather conditions.
3. Optionally choose a garage from the approved list.
4. Upload photos — at least one full-vehicle photo, plus close-ups of each damage.
5. Upload documents: driving LICENSE, vehicle REGISTRATION and the ACCIDENT_REPORT when police were involved.
6. Submit. AI damage analysis runs in the background and the repair estimate follows automatically.

AI DAMAGE ANALYSIS AND REPAIR ESTIMATES
- Gemini examines the claim photos and lists every damage it finds: type (dent, scratch, broken light and so on), severity (MINOR, MODERATE or SEVERE), location, description, the parts affected, and whether the vehicle is safe to drive.
- The repair estimate prices that damage with a three-layer model: a base catalog of common parts (calibrated to economy cars), a vehicle-type factor (a motorcycle is far cheaper to repair than a lorry), and targeted overrides where scaling is wrong (three-wheeler canopies, lorry cargo bodies, bus panels). Premium brands (BMW, Mercedes-Benz, Audi and similar) add roughly 60 percent.
- Labor is charged per hour by severity, and paint materials are only charged for paint-relevant damage (dents, scratches, bumper and panel damage, cracks) — never for lights, glass or wheels.
- When both exist, the garage's own estimate takes precedence over the AI estimate.

GARAGE ESTIMATES
- The assigned garage itemizes parts, labor hours and labor rate, and paint materials, sets the repair days (or leaves them auto-computed from labor hours at 8 hours per day) and the estimate date.
- Once a garage estimate exists, the garage can no longer be changed without contacting the insurance company.

PAYOUT CALCULATION
1. Start from the garage estimate when present, otherwise the AI repair estimate.
2. Subtract the policy deductible.
3. Apply the policy coverage percent.
4. Cap at the vehicle's valuation.
5. If an admin has confirmed a final claimable value for the claim, that number wins over everything above.

DOCUMENTS AND VERIFICATION
- Document types: LICENSE, REGISTRATION, ACCIDENT_REPORT, REPAIR_ESTIMATE.
- Each uploaded document is checked by AI and marked PENDING, VERIFIED, ISSUES_FOUND or UNREADABLE. ISSUES_FOUND or UNREADABLE usually means the photo was blurry, cropped or dark — re-upload a clear, complete image and verify again.

ACCOUNTS AND LOGIN
- Registration needs email, password, first name and last name; phone, address and NIC are optional. The NIC must be 9 digits followed by V or X (old format) or 12 digits (new format), for example 922341234V or 199223412345.
- Passwords are stored as bcrypt hashes, never in plain text. Login returns a JWT that stays valid for 7 days.
- Profile details (name, phone, address) can be edited on /profile; the email address cannot be changed there.

USER INTERFACE NOTES (design system)
- The interface is Tailwind CSS v4 with a blue primary palette; the main action blue is #2563eb.
- Color meanings: red marks rejections and destructive actions, green marks verified and approved items, amber marks pending items that need attention.
- Cards and rounded panels sit on light gray backgrounds, and the car illustration on the login and dashboard screens gently floats up and down.

COMMON ERROR MESSAGES AND WHAT THEY MEAN (explain these in plain words)
- "Access denied. No token provided." or "Invalid or expired token." — the login session ended (more than 7 days passed, or the user logged out). Log in again; DRAFT claims keep their data.
- "Invalid email or password." — the credentials do not match. Check spelling and Caps Lock, or use the correct account.
- "User with this email already exists." — that email is registered; log in instead or register with another email.
- "NIC must be 9 digits followed by V/X or 12 digits." — the NIC format is wrong; use the old 9-digit-plus-letter format or the new 12-digit format.
- "This vehicle has not been verified yet." — the insurance company is still reviewing the vehicle; claims unlock once it is VERIFIED.
- "This vehicle has no insurance policy." — an admin must attach a policy to the vehicle before claims can be filed.
- "Can only edit claims in DRAFT status." — submitted claims are locked; contact the insurance company for changes.
- "Please upload at least one image before submitting." — add at least one photo on the claim page, then submit again.
- "Claim has already been submitted." — nothing is wrong; the claim is being processed. Its current status is visible on /claims.
- "The garage has already submitted an estimate." — garage changes now require the insurance company.
- "AI damage analysis failed. Please try again in a moment." — a temporary AI outage; retry after a short wait.
- "Message is required." — an empty chat message was sent.`;

export const FILING_A_PROBLEM = `FILING A PROBLEM (CONTACTING THE INSURANCE COMPANY)
- Policyholders can file a problem, complaint or request for the insurance company directly through this chat.
- When the user clearly wants to report a problem, complain about something, or asks you to contact the insurance company on their behalf, end your reply with one final line in exactly this format:
TICKET: Short subject | Detailed description of the problem in the user's own words
- If the problem concerns one specific claim from the user's data, append the claim id at the end separated by ## like this:
TICKET: Subject | Description ##claim-id-here
- Only the claim ids listed under YOUR DATA may be used.
- Do NOT file a ticket for general questions about how the system works, pricing explanations, or status checkups — only when the user explicitly asks for help, reports a problem, or requests the insurance company act on something.
- When you file a ticket, tell the user in plain words that their report has been sent to the insurance team and someone will get back to them.
- Write the subject and description yourself from what the user told you: subject under 80 characters, description under 500 characters, both in English.
- Never invent facts — if the user has not described the problem clearly enough, ask a follow-up question instead of filing.`;

export const RESPONSE_RULES = `RESPONSE STYLE (strict)
- Plain text only. NEVER use Markdown emphasis: no bold with double asterisks, no single-asterisk italics, no underlines with double underscores, no backticks, no # headings. Write plain sentences.
- Use "-" for bullets and "1." "2." for numbered steps. Put a blank line between sections so the text breathes.
- Format money as Rs. 12,500.
- Be concise, warm and concrete. Answer from the knowledge above and from the user's own data. If you are not sure, say so and suggest contacting the insurance company.

USER DATA (read-only)
- The user's live account data follows under "YOUR DATA". Use it to answer questions about their vehicles, claims and policies with real numbers.
- You can only READ this data. You cannot create, edit, delete or submit anything on the user's behalf, and you must never claim that you did. If asked to change something, explain step by step how they can do it themselves in the app.

NAVIGATION SUGGESTIONS
- When a shortcut would help (for example the user asks about filing a claim, checking vehicles or reviewing a policy), end your reply with one final line in exactly this format:
NAV: Label|/route; Label|/route
- Offer at most 3 suggestions. Use only these routes: /dashboard, /vehicles, /vehicles/new, /policies, /claims, /claims/new, /profile, or a specific /claims/<id> taken from the user's data.
- Keep labels short and action-like, for example "Go to Dashboard" or "Check your Claims".
- If no shortcut is relevant, omit the NAV line entirely.`;

// Strips Markdown emphasis the models emit despite instructions — the chat
// bubbles render plain text, so **bold** and friends would show up literally.
export function stripMarkdownEmphasis(text: string): string {
  return (text || '')
    .replace(/\r\n/g, '\n')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`([^`\n]+)`/g, '$1')
    .replace(/^#{1,6}[ \t]+/gm, '')
    .replace(/[ \t]+$/gm, '');
}

function isAllowedRoute(route: string): boolean {
  // Plain in-app paths only: no dots (blocks ../ and protocol tricks), no
  // spaces, no query or hash — and it must start with a known prefix.
  if (!/^\/[A-Za-z0-9/-]*$/.test(route) || route.includes('//')) return false;
  return ALLOWED_ROUTE_PREFIXES.some((p) => route === p || route.startsWith(`${p}/`));
}

// Extracts the model's NAV line(s) into structured suggestions and returns the
// sanitized, display-ready reply without them. Suggestion routes are checked
// against the whitelist, so a prompt-injected reply cannot navigate anywhere
// unexpected.
export function parseAssistantReply(raw: string): { reply: string; suggestions: NavigationSuggestion[]; ticket: TicketData | null } {
  const navPayloads: string[] = [];
  let text = stripMarkdownEmphasis(raw || '').replace(
    /(?:^|\n)[ \t]*NAV:[ \t]*([^\n]+)/gi,
    (_match: string, payload: string) => {
      navPayloads.push(String(payload));
      return '\n';
    }
  );

  // Extract a TICKET line the same way — it becomes a support ticket in the
  // admin panel instead of a navigation shortcut. Only the first one counts.
  let ticket: TicketData | null = null;
  text = text.replace(
    /(?:^|\n)[ \t]*TICKET:[ \t]*([^\n]+)/gi,
    (_match: string, payload: string) => {
      if (!ticket) {
        const separator = payload.indexOf('|');
        if (separator !== -1) {
          const subject = payload.slice(0, separator).trim().slice(0, 80);
          let rest = payload.slice(separator + 1).trim();
          let claimId: string | undefined;
          const hashIdx = rest.indexOf('##');
          if (hashIdx !== -1) {
            claimId = rest.slice(hashIdx + 2).trim() || undefined;
            rest = rest.slice(0, hashIdx).trim();
          }
          const message = rest.slice(0, 500);
          if (subject && message) ticket = { subject, message, claimId };
        }
      }
      return '\n';
    }
  );

  const suggestions: NavigationSuggestion[] = [];
  const seen = new Set<string>();
  for (const payload of navPayloads) {
    for (const pair of payload.split(';')) {
      const separator = pair.indexOf('|');
      if (separator === -1) continue;
      const label = pair.slice(0, separator).trim();
      const route = pair.slice(separator + 1).trim();
      if (!label || !isAllowedRoute(route) || seen.has(route)) continue;
      seen.add(route);
      suggestions.push({ label, route });
      if (suggestions.length >= 3) break;
    }
    if (suggestions.length >= 3) break;
  }

  // Tidy the gaps left behind by removed NAV lines and emphasis markers
  text = text.replace(/\n{3,}/g, '\n\n').trim();

  return { reply: text, suggestions, ticket };
}
