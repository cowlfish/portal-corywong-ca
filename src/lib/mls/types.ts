export interface MlsFeedListing {
  listingKey: string;
  mlsNumber: string;
  boardId?: string;
  status: "Active" | "Sold" | "Terminated" | "Expired" | "Suspended" | "Deleted";
  statusChangeAt?: Date;
  listPrice: number;
  soldPrice?: number;
  originalPrice?: number;
  propertyType?: string;
  propertySubType?: string;
  transactionType?: string;

  streetNumber?: string;
  streetName?: string;
  streetSuffix?: string;
  streetDirection?: string;
  unitNumber?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  country?: string;
  municipality?: string;
  community?: string;
  neighbourhood?: string;
  area?: string;

  latitude?: number;
  longitude?: number;

  bedrooms?: number;
  bedroomsPlus?: number;
  bathrooms?: number;
  bathroomsHalf?: number;
  sqft?: number;
  sqftRangeMin?: number;
  sqftRangeMax?: number;
  lotSizeSqft?: number;
  lotFrontage?: number;
  lotDepth?: number;
  yearBuilt?: number;
  stories?: number;
  parkingSpaces?: number;
  garageType?: string;
  garageSpaces?: number;

  maintenanceFee?: number;
  condoExposure?: string;
  condoStyle?: string;
  balcony?: string;
  locker?: string;

  listDate?: Date;
  soldDate?: Date;
  expiryDate?: Date;
  daysOnMarket?: number;
  virtualTourUrl?: string;
  publicRemarks?: string;
  extrasRemarks?: string;
  featuresRemarks?: string;

  taxAmount?: number;
  taxYear?: number;
  assessedValue?: number;

  listAgentName?: string;
  listAgentId?: string;
  listOfficeName?: string;
  listOfficeId?: string;
  coListAgentName?: string;
  coListAgentId?: string;

  feedSourceId?: string;
  feedUpdatedAt: Date;
  majorChangeTimestamp?: Date;
  photosChangeTimestamp?: Date;
  rawPayload?: Record<string, unknown>;

  photos?: MlsFeedPhoto[];
  rooms?: MlsFeedRoom[];
  openHouses?: MlsFeedOpenHouse[];
}

export interface MlsFeedPhoto {
  mediaKey: string;
  photoUrl: string;
  displayOrder: number;
  caption?: string;
  mediaType?: string;
  width?: number;
  height?: number;
}

export interface MlsFeedRoom {
  roomKey: string;
  roomType?: string;
  roomLevel?: string;
  roomDimensions?: string;
  roomArea?: number;
  roomDescription?: string;
}

export interface MlsFeedOpenHouse {
  startDate: Date;
  endDate: Date;
  remarks?: string;
  type?: string;
}

export interface ReplicationCursor {
  lastTimestamp: string;
  lastKey: string;
}

export interface MlsFeedDelta {
  listings: MlsFeedListing[];
  deletedMlsNumbers: string[];
  cursor: ReplicationCursor | null;
  hasMore: boolean;
}

export interface MlsFeedProviderConfig {
  apiUrl: string;
  apiKey?: string;
  apiToken?: string;
  apiSecret?: string;
  boardId?: string;
}

export interface MlsFeedProvider {
  name: string;
  initialize(config: MlsFeedProviderConfig): Promise<void>;
  fetchDelta(cursor: ReplicationCursor | null): Promise<MlsFeedDelta>;
  fetchFullSync(batchSize?: number): AsyncGenerator<MlsFeedDelta>;
  testConnection(): Promise<{ ok: boolean; message: string }>;
}
