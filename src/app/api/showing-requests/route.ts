import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { jsonSuccess, jsonError } from "@/lib/api-helpers";
import { notifyAgent } from "@/lib/notify";
import { NOT_COMMERCIAL } from "@/lib/mls/listing-scope";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clean(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  return v ? v.slice(0, max) : null;
}

// Public: visitors don't need an account to ask for a showing.
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body) return jsonError("Invalid request", 400);

  // Honeypot: real visitors never see or fill this field
  if (body.website) return jsonSuccess({ ok: true }, 201);

  const session = await getSessionUser();
  const name = clean(body.name, 120);
  const email = clean(body.email, 200)?.toLowerCase() ?? null;
  const phone = clean(body.phone, 40);
  const preferredTimes = clean(body.preferredTimes, 1000);
  const message = clean(body.message, 2000);
  const listingId = clean(body.listingId, 64);

  if (!name || !email || !preferredTimes || !listingId) {
    return jsonError("Name, email and preferred times are required", 400);
  }
  if (!EMAIL_RE.test(email)) return jsonError("Please enter a valid email address", 400);

  const listing = await prisma.mlsListing.findFirst({
    where: { id: listingId, status: "ACTIVE", AND: [NOT_COMMERCIAL] },
    select: { id: true, mlsNumber: true, unitNumber: true, streetNumber: true, streetName: true, city: true, listPrice: true },
  });
  if (!listing) return jsonError("This listing is no longer available", 404);

  // Same person, same listing, within 10 minutes: treat as a double submit
  const recent = await prisma.showingRequest.findFirst({
    where: { email, listingId: listing.id, createdAt: { gt: new Date(Date.now() - 10 * 60 * 1000) } },
    select: { id: true },
  });
  if (recent) return jsonSuccess({ ok: true, id: recent.id }, 200);

  const showingRequest = await prisma.showingRequest.create({
    data: {
      listingId: listing.id,
      userId: session?.userId ?? null,
      name,
      email,
      phone,
      preferredTimes,
      message,
    },
  });

  const address = [listing.unitNumber && `${listing.unitNumber} -`, listing.streetNumber, listing.streetName]
    .filter(Boolean)
    .join(" ");
  const price = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(
    Number(listing.listPrice)
  );
  notifyAgent({
    subject: `Showing request: ${address}, ${listing.city ?? ""} from ${name}`,
    fields: [
      ["Name", name],
      ["Email", email],
      ["Phone", phone],
      ["Signed in", session ? "Yes (portal client)" : "No (visitor)"],
      ["Listing", `${address}, ${listing.city ?? ""} · ${price} · MLS® ${listing.mlsNumber}`],
      ["Preferred times", preferredTimes],
      ["Message", message],
    ],
    actionPath: "/agent/requests",
    actionLabel: "Open showing requests",
    replyTo: { email, name },
  });

  return jsonSuccess({ ok: true, id: showingRequest.id }, 201);
}
