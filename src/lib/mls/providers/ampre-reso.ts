import type {
  MlsFeedProvider,
  MlsFeedProviderConfig,
  MlsFeedDelta,
  MlsFeedListing,
  MlsFeedPhoto,
  MlsFeedRoom,
  MlsFeedOpenHouse,
  ReplicationCursor,
} from "../types";

const BATCH_SIZE = 10_000;
// AMPRE caps $top at 100 when $expand is used; 50 keeps each response ~1.5 MB, since
// long responses are sometimes cut off mid-stream
const DELTA_PAGE_SIZE = 50;
const MAX_ATTEMPTS = 3;
// Property records don't include photos unless Media is expanded. One size is enough.
const PHOTO_FILTER = "MediaCategory eq 'Photo' and ImageSizeDescription eq 'Large'";
const PHOTO_FIELDS = "MediaKey,MediaCategory,MediaURL,Order,ShortDescription,ImageWidth,ImageHeight,PreferredPhotoYN";
const MEDIA_EXPAND = `Media($select=${PHOTO_FIELDS};$filter=${PHOTO_FILTER};$orderby=Order)`;

export class AmpreResoProvider implements MlsFeedProvider {
  name = "ampre-reso";
  private config!: MlsFeedProviderConfig;

  async initialize(config: MlsFeedProviderConfig): Promise<void> {
    this.config = config;
  }

  async testConnection(): Promise<{ ok: boolean; message: string }> {
    try {
      const res = await this.request(
        "/Property?$top=1&$select=ListingKey,StandardStatus"
      );
      const rows = (res.value ?? []) as Record<string, unknown>[];
      if (rows.length > 0) {
        return {
          ok: true,
          message: `Connected. Sample: ${rows[0].ListingKey}`,
        };
      }
      return { ok: true, message: "Connected (no listings returned)" };
    } catch (err) {
      return {
        ok: false,
        message: err instanceof Error ? err.message : String(err),
      };
    }
  }

  async fetchDelta(cursor: ReplicationCursor | null): Promise<MlsFeedDelta> {
    const filter = cursor
      ? `ModificationTimestamp gt ${cursor.lastTimestamp} or ` +
        `(ModificationTimestamp eq ${cursor.lastTimestamp} and ListingKey gt '${cursor.lastKey}')`
      : `StandardStatus eq 'Active'`;

    const url =
      `/Property?$filter=${encodeURIComponent(filter)}` +
      `&$orderby=${encodeURIComponent("ModificationTimestamp asc,ListingKey asc")}` +
      `&$expand=${encodeURIComponent(MEDIA_EXPAND)}` +
      `&$top=${DELTA_PAGE_SIZE}`;

    const data = await this.request(url);
    const rows = (data.value ?? []) as Record<string, unknown>[];
    const listings = rows.map((r) => this.mapListing(r));

    let newCursor: ReplicationCursor | null = null;
    if (listings.length > 0) {
      const last = listings[listings.length - 1];
      newCursor = {
        lastTimestamp: last.feedUpdatedAt.toISOString(),
        lastKey: last.listingKey,
      };
    }

    return {
      listings,
      deletedMlsNumbers: [],
      cursor: newCursor,
      hasMore: rows.length === DELTA_PAGE_SIZE,
    };
  }

  async fetchAllListingKeys(): Promise<Set<string>> {
    const keys = new Set<string>();
    let after: string | null = null;
    for (;;) {
      const filter: string = after ? `&$filter=${encodeURIComponent(`ListingKey gt '${after}'`)}` : "";
      const data = await this.request(`/Property?$select=ListingKey&$orderby=ListingKey&$top=${BATCH_SIZE}${filter}`);
      const rows = (data.value ?? []) as { ListingKey: string }[];
      for (const r of rows) keys.add(r.ListingKey);
      if (rows.length < BATCH_SIZE) return keys;
      after = rows[rows.length - 1].ListingKey;
    }
  }

  async fetchListingPhotos(listingKey: string): Promise<MlsFeedPhoto[]> {
    const filter = `ResourceRecordKey eq '${listingKey.replace(/'/g, "''")}' and ${PHOTO_FILTER}`;
    const data = await this.request(
      `/Media?$filter=${encodeURIComponent(filter)}&$select=${PHOTO_FIELDS}&$orderby=Order&$top=100`
    );
    return this.mapPhotos(data.value as Record<string, unknown>[] | undefined);
  }

  async *fetchFullSync(batchSize = BATCH_SIZE): AsyncGenerator<MlsFeedDelta> {
    let cursor: ReplicationCursor | null = null;
    let hasMore = true;

    while (hasMore) {
      const filter = cursor
        ? `ModificationTimestamp gt ${cursor.lastTimestamp} or ` +
          `(ModificationTimestamp eq ${cursor.lastTimestamp} and ListingKey gt '${cursor.lastKey}')`
        : `StandardStatus eq 'Active'`;

      const url =
        `/Property?$filter=${encodeURIComponent(filter)}` +
        `&$orderby=${encodeURIComponent("ModificationTimestamp asc,ListingKey asc")}` +
        `&$top=${batchSize}`;

      const data = await this.request(url);
      const rows = (data.value ?? []) as Record<string, unknown>[];
      const listings = rows.map((r) => this.mapListing(r));

      if (listings.length > 0) {
        const last = listings[listings.length - 1];
        cursor = {
          lastTimestamp: last.feedUpdatedAt.toISOString(),
          lastKey: last.listingKey,
        };
      }

      hasMore = rows.length === batchSize;

      yield {
        listings,
        deletedMlsNumbers: [],
        cursor,
        hasMore,
      };
    }
  }

  // ── HTTP ──────────────────────────────────────────────────────────

  private async request(path: string, attempt = 1): Promise<Record<string, unknown>> {
    const url = path.startsWith("http")
      ? path
      : `${this.config.apiUrl}${path}`;

    let res: Response;
    let body: Record<string, unknown>;
    try {
      res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${this.config.apiToken}`,
          Accept: "application/json",
        },
      });

      if (res.status === 429) {
        const retryAfter = res.headers.get("X-Rate-Limit-Retry-After-Seconds");
        const waitMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : 5000;
        await new Promise((resolve) => setTimeout(resolve, waitMs));
        return this.request(path, attempt);
      }

      if (!res.ok) {
        throw Object.assign(new Error(`AMPRE API error: ${res.status} ${await res.text()}`), {
          status: res.status,
        });
      }

      body = (await res.json()) as Record<string, unknown>;
    } catch (err) {
      // AMPRE occasionally closes the connection mid-response on large pages, or returns a
      // 5xx when its own database pool is busy. Retry those; 4xx (bad filter, auth) won't
      // succeed on retry.
      const status = (err as { status?: number }).status;
      const retryable = status === undefined || status >= 500;
      if (!retryable || attempt >= MAX_ATTEMPTS) throw err;
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      return this.request(path, attempt + 1);
    }

    return body;
  }


  // ── Helpers ────────────────────────────────────────────────────────

  private str(val: unknown): string | undefined {
    if (val == null) return undefined;
    if (Array.isArray(val)) return val.length > 0 ? val.join(", ") : undefined;
    // Some feed values carry stray whitespace ("Semi-Detached ")
    return String(val).trim() || undefined;
  }

  // ── Mapping (RESO Data Dictionary → internal types) ───────────────

  private mapListing(raw: Record<string, unknown>): MlsFeedListing {
    return {
      listingKey: String(raw.ListingKey ?? ""),
      mlsNumber: String(raw.ListingId ?? raw.ListingKey ?? ""),
      boardId: this.str(raw.OriginatingSystemName),
      status: this.mapStatus(this.str(raw.StandardStatus)),
      statusChangeAt: raw.StatusChangeTimestamp
        ? new Date(raw.StatusChangeTimestamp as string)
        : undefined,
      listPrice: Number(raw.ListPrice ?? 0),
      soldPrice: this.dec(raw.ClosePrice, 10),
      originalPrice: this.dec(raw.OriginalListPrice, 10),
      propertyType: this.str(raw.PropertyType),
      propertySubType: this.str(raw.PropertySubType),
      transactionType: this.str(raw.TransactionType),

      streetNumber: this.str(raw.StreetNumber),
      streetName: this.str(raw.StreetName),
      streetSuffix: this.str(raw.StreetSuffix),
      streetDirection: this.str(raw.StreetDirPrefix),
      unitNumber: this.str(raw.UnitNumber),
      city: this.str(raw.City),
      province: this.str(raw.StateOrProvince),
      postalCode: this.str(raw.PostalCode),
      country: this.str(raw.Country),
      municipality: this.str(raw.Municipality ?? raw.CountyOrParish),
      community: this.str(raw.CommunityName),
      neighbourhood: this.str(raw.SubdivisionName),
      area: this.str(raw.MLSAreaMajor),

      latitude: this.dec(raw.Latitude, 3),
      longitude: this.dec(raw.Longitude, 3),

      bedrooms: raw.BedroomsTotal ? Number(raw.BedroomsTotal) : undefined,
      bedroomsPlus: raw.BedroomsAboveGrade
        ? Number(raw.BedroomsAboveGrade)
        : undefined,
      bathrooms: raw.BathroomsTotalInteger
        ? Number(raw.BathroomsTotalInteger)
        : undefined,
      bathroomsHalf: raw.BathroomsHalf ? Number(raw.BathroomsHalf) : undefined,
      sqft: this.dec(raw.BuildingAreaTotal, 8),
      sqftRangeMin: this.parseSqftRange(this.str(raw.LivingAreaRange))?.[0],
      sqftRangeMax: this.parseSqftRange(this.str(raw.LivingAreaRange))?.[1],
      lotSizeSqft: this.dec(raw.LotSizeArea, 10),
      lotFrontage: this.dec(raw.LotWidth, 6),
      lotDepth: this.dec(raw.LotDepth, 6),
      yearBuilt: raw.YearBuilt ? Number(raw.YearBuilt) : undefined,
      stories: this.dec(raw.StoriesTotal, 3),
      parkingSpaces: raw.ParkingTotal ? Number(raw.ParkingTotal) : undefined,
      garageType: this.str(raw.GarageType),
      garageSpaces: raw.GarageSpaces ? Number(raw.GarageSpaces) : undefined,

      maintenanceFee: this.dec(raw.AssociationFee, 8),
      condoExposure: this.str(raw.DirectionFaces),
      condoStyle: this.str(raw.ArchitecturalStyle),
      balcony: this.str(raw.Balcony),
      locker: this.str(raw.Locker),

      listDate: raw.ListingContractDate
        ? new Date(raw.ListingContractDate as string)
        : undefined,
      soldDate: raw.CloseDate ? new Date(raw.CloseDate as string) : undefined,
      expiryDate: raw.ExpirationDate
        ? new Date(raw.ExpirationDate as string)
        : undefined,
      daysOnMarket: raw.DaysOnMarket ? Number(raw.DaysOnMarket) : undefined,
      virtualTourUrl: this.str(raw.VirtualTourURLUnbranded ?? raw.VirtualTourURLBranded),
      publicRemarks: this.str(raw.PublicRemarks),
      extrasRemarks: this.str(raw.Extras),
      featuresRemarks: this.str(raw.Features),

      taxAmount: this.dec(raw.TaxAnnualAmount, 8),
      taxYear: raw.TaxYear ? Number(raw.TaxYear) : undefined,
      assessedValue: this.dec(raw.TaxAssessedValue, 10),

      listAgentName: this.str(raw.ListAgentFullName),
      listAgentId: this.str(raw.ListAgentMlsId),
      listOfficeName: this.str(raw.ListOfficeName),
      listOfficeId: this.str(raw.ListOfficeMlsId),
      coListAgentName: this.str(raw.CoListAgentFullName),
      coListAgentId: this.str(raw.CoListAgentMlsId),

      feedSourceId: this.str(raw.ListingKey),
      feedUpdatedAt: new Date(
        (raw.ModificationTimestamp as string) ?? new Date().toISOString()
      ),
      majorChangeTimestamp: raw.MajorChangeTimestamp
        ? new Date(raw.MajorChangeTimestamp as string)
        : undefined,
      photosChangeTimestamp: raw.PhotosChangeTimestamp
        ? new Date(raw.PhotosChangeTimestamp as string)
        : undefined,
      rawPayload: raw,

      photos: this.mapPhotos(raw.Media as Record<string, unknown>[] | undefined),
      rooms: this.mapRooms(
        raw.PropertyRooms as Record<string, unknown>[] | undefined
      ),
      openHouses: this.mapOpenHouses(
        raw.OpenHouse as Record<string, unknown>[] | undefined
      ),
    };
  }

  private parseSqftRange(
    range?: string
  ): [number, number] | undefined {
    if (!range) return undefined;
    const parts = range.split("-").map((s) => parseInt(s.trim(), 10));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      return [parts[0], parts[1]];
    }
    return undefined;
  }

  // A number that fits a Decimal column with this many integer digits, or undefined.
  // Listing brokerages enter placeholder values (e.g. taxes of 888888888) that would
  // otherwise overflow the column and fail the whole listing.
  private dec(value: unknown, integerDigits: number): number | undefined {
    if (value === null || value === undefined || value === "") return undefined;
    const n = Number(value);
    if (!Number.isFinite(n) || n === 0 || Math.abs(n) >= 10 ** integerDigits) return undefined;
    return n;
  }

  private mapStatus(status?: string): MlsFeedListing["status"] {
    const map: Record<string, MlsFeedListing["status"]> = {
      Active: "Active",
      "Active Under Contract": "Active",
      Closed: "Sold",
      Expired: "Expired",
      Cancelled: "Terminated",
      Withdrawn: "Suspended",
      Delete: "Deleted",
      Pending: "Active",
    };
    return map[status ?? ""] ?? "Active";
  }

  private mapPhotos(media?: Record<string, unknown>[]): MlsFeedPhoto[] {
    if (!media) return [];
    return media
      .filter((m) => m.MediaCategory === "Photo")
      .map((m, i) => ({
        mediaKey: String(m.MediaKey ?? ""),
        photoUrl: String(m.MediaURL ?? ""),
        displayOrder: Number(m.Order ?? i),
        caption: m.ShortDescription as string | undefined,
        mediaType: m.MimeType as string | undefined,
        width: m.ImageWidth ? Number(m.ImageWidth) : undefined,
        height: m.ImageHeight ? Number(m.ImageHeight) : undefined,
      }));
  }

  private mapRooms(rooms?: Record<string, unknown>[]): MlsFeedRoom[] {
    if (!rooms) return [];
    return rooms.map((r) => ({
      roomKey: String(r.RoomKey ?? ""),
      roomType: r.RoomType as string | undefined,
      roomLevel: r.RoomLevel as string | undefined,
      roomDimensions: r.RoomDimensions as string | undefined,
      roomArea: this.dec(r.RoomArea, 8),
      roomDescription: r.RoomDescription as string | undefined,
    }));
  }

  private mapOpenHouses(
    openHouses?: Record<string, unknown>[]
  ): MlsFeedOpenHouse[] {
    if (!openHouses) return [];
    return openHouses.map((oh) => ({
      startDate: new Date(oh.OpenHouseStartTime as string),
      endDate: new Date(oh.OpenHouseEndTime as string),
      remarks: oh.OpenHouseRemarks as string | undefined,
      type: oh.OpenHouseType as string | undefined,
    }));
  }
}
