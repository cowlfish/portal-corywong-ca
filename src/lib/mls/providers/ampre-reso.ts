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
      `&$top=${BATCH_SIZE}`;

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
      hasMore: rows.length === BATCH_SIZE,
    };
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

  private async request(path: string): Promise<Record<string, unknown>> {
    const url = path.startsWith("http")
      ? path
      : `${this.config.apiUrl}${path}`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.config.apiToken}`,
        Accept: "application/json",
      },
    });

    if (res.status === 429) {
      const retryAfter = res.headers.get("X-Rate-Limit-Retry-After-Seconds");
      const waitMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : 5000;
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      return this.request(path);
    }

    if (!res.ok) {
      throw new Error(`AMPRE API error: ${res.status} ${await res.text()}`);
    }

    return res.json() as Promise<Record<string, unknown>>;
  }

  // ── Helpers ────────────────────────────────────────────────────────

  private str(val: unknown): string | undefined {
    if (val == null) return undefined;
    if (Array.isArray(val)) return val.length > 0 ? val.join(", ") : undefined;
    return String(val);
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
      soldPrice: raw.ClosePrice ? Number(raw.ClosePrice) : undefined,
      originalPrice: raw.OriginalListPrice
        ? Number(raw.OriginalListPrice)
        : undefined,
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

      latitude: raw.Latitude ? Number(raw.Latitude) : undefined,
      longitude: raw.Longitude ? Number(raw.Longitude) : undefined,

      bedrooms: raw.BedroomsTotal ? Number(raw.BedroomsTotal) : undefined,
      bedroomsPlus: raw.BedroomsAboveGrade
        ? Number(raw.BedroomsAboveGrade)
        : undefined,
      bathrooms: raw.BathroomsTotalInteger
        ? Number(raw.BathroomsTotalInteger)
        : undefined,
      bathroomsHalf: raw.BathroomsHalf ? Number(raw.BathroomsHalf) : undefined,
      sqft: raw.BuildingAreaTotal ? Number(raw.BuildingAreaTotal) : undefined,
      sqftRangeMin: this.parseSqftRange(this.str(raw.LivingAreaRange))?.[0],
      sqftRangeMax: this.parseSqftRange(this.str(raw.LivingAreaRange))?.[1],
      lotSizeSqft: raw.LotSizeArea ? Number(raw.LotSizeArea) : undefined,
      lotFrontage: raw.LotWidth ? Number(raw.LotWidth) : undefined,
      lotDepth: raw.LotDepth ? Number(raw.LotDepth) : undefined,
      yearBuilt: raw.YearBuilt ? Number(raw.YearBuilt) : undefined,
      stories: raw.StoriesTotal ? Number(raw.StoriesTotal) : undefined,
      parkingSpaces: raw.ParkingTotal ? Number(raw.ParkingTotal) : undefined,
      garageType: this.str(raw.GarageType),
      garageSpaces: raw.GarageSpaces ? Number(raw.GarageSpaces) : undefined,

      maintenanceFee: raw.AssociationFee
        ? Number(raw.AssociationFee)
        : undefined,
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

      taxAmount: raw.TaxAnnualAmount ? Number(raw.TaxAnnualAmount) : undefined,
      taxYear: raw.TaxYear ? Number(raw.TaxYear) : undefined,
      assessedValue: raw.TaxAssessedValue
        ? Number(raw.TaxAssessedValue)
        : undefined,

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
      roomArea: r.RoomArea ? Number(r.RoomArea) : undefined,
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
